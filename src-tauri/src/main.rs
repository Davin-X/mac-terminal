// Real macOS PTY backend using portable-pty.
// Each terminal tab = one native pty pair + zsh (or chosen shell).

use once_cell::sync::Lazy;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const OUTPUT_FLUSH_INTERVAL: Duration = Duration::from_millis(16);

struct Session {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>>,
    reader: Option<Box<dyn Read + Send>>,
}

static SESSIONS: Lazy<Mutex<HashMap<String, Session>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
fn create_terminal(
    rows: u16,
    cols: u16,
    shell: Option<String>,
    cwd: Option<String>,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let shell_path = shell
        .filter(|path| !path.trim().is_empty())
        .or_else(|| {
            std::env::var("SHELL")
                .ok()
                .filter(|path| !path.trim().is_empty())
        })
        .unwrap_or_else(|| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = std::env::var("HOME").ok() {
        cmd.cwd(home);
    }
    // login shell so .zprofile / .zshrc load normally
    if shell_path.ends_with("zsh") {
        cmd.arg("-l");
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();

    let master: Arc<Mutex<Box<dyn MasterPty + Send>>> = Arc::new(Mutex::new(pair.master));
    let reader = master
        .lock()
        .map_err(|e| e.to_string())?
        .try_clone_reader()
        .map_err(|e| e.to_string())?;
    let writer = master
        .lock()
        .map_err(|e| e.to_string())?
        .take_writer()
        .map_err(|e| e.to_string())?;
    let writer: Arc<Mutex<Box<dyn Write + Send>>> = Arc::new(Mutex::new(writer));

    SESSIONS
        .lock()
        .map_err(|_| "terminal session registry is unavailable".to_string())?
        .insert(
            id.clone(),
            Session {
                master: master.clone(),
                writer: writer.clone(),
                child: Arc::new(Mutex::new(Some(child))),
                reader: Some(reader),
            },
        );

    Ok(id)
}

#[tauri::command]
fn start_terminal(app: AppHandle, id: String) -> Result<(), String> {
    let reader = {
        let mut sessions = SESSIONS
            .lock()
            .map_err(|_| "terminal session registry is unavailable".to_string())?;
        let session = sessions
            .get_mut(&id)
            .ok_or_else(|| "no such terminal".to_string())?;
        session
            .reader
            .take()
            .ok_or_else(|| "terminal output has already started".to_string())?
    };

    // The frontend subscribes before this command starts the output pump, so the
    // shell's first prompt cannot be emitted before its listener exists.
    // The reader blocks waiting for more PTY data, so a separate receiver
    // flushes partial output on a timer rather than waiting for another read.
    let event_name = format!("pty-output-{}", id);
    let id_for_thread = id.clone();
    std::thread::spawn(move || {
        pump_output(reader, |payload| {
            if let Err(error) = app.emit(&event_name, payload) {
                eprintln!("mac-terminal: could not deliver PTY output: {error}");
            }
        });
        match SESSIONS.lock() {
            Ok(mut sessions) => {
                sessions.remove(&id_for_thread);
            }
            Err(_) => eprintln!("mac-terminal: terminal session registry is unavailable"),
        }
    });

    Ok(())
}

fn pump_output<R, F>(mut reader: R, mut emit: F)
where
    R: Read + Send + 'static,
    F: FnMut(String),
{
    let (sender, receiver) = mpsc::sync_channel(2);
    std::thread::spawn(move || {
        let mut buf = [0u8; 32768];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if sender.send(buf[..n].to_vec()).is_err() {
                        break;
                    }
                }
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => break,
            }
        }
    });

    let mut pending = Vec::with_capacity(65536);
    let mut last_flush = std::time::Instant::now();
    loop {
        let timeout = OUTPUT_FLUSH_INTERVAL.saturating_sub(last_flush.elapsed());
        match receiver.recv_timeout(timeout) {
            Ok(bytes) => {
                pending.extend_from_slice(&bytes);
                if pending.len() >= 65536 {
                    flush_output(&mut pending, false, &mut emit);
                    last_flush = std::time::Instant::now();
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                flush_output(&mut pending, false, &mut emit);
                last_flush = std::time::Instant::now();
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                flush_output(&mut pending, true, &mut emit);
                emit("__EXIT__".to_string());
                break;
            }
        }
    }
}

fn flush_output<F>(pending: &mut Vec<u8>, final_chunk: bool, emit: &mut F)
where
    F: FnMut(String),
{
    if !pending.is_empty() {
        let text = decode_output(pending, final_chunk);
        if !text.is_empty() {
            emit(text);
        }
    }
}

#[tauri::command]
fn write_terminal(id: String, data: String) -> Result<(), String> {
    // Clone the writer Arc under the map lock, then write WITHOUT holding
    // the map lock — otherwise a big paste blocks every other pane.
    let writer = {
        let sessions = SESSIONS
            .lock()
            .map_err(|_| "terminal session registry is unavailable".to_string())?;
        let s = sessions.get(&id).ok_or("no such terminal")?;
        s.writer.clone()
    };
    writer
        .lock()
        .map_err(|e| e.to_string())?
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn resize_terminal(id: String, rows: u16, cols: u16) -> Result<(), String> {
    if rows == 0 || cols == 0 {
        return Ok(()); // ignore transient zero sizes during layout
    }
    let master = {
        let sessions = SESSIONS
            .lock()
            .map_err(|_| "terminal session registry is unavailable".to_string())?;
        let s = sessions.get(&id).ok_or("no such terminal")?;
        s.master.clone()
    };
    master
        .lock()
        .map_err(|e| e.to_string())?
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_terminal(id: String) -> Result<(), String> {
    // Remove the session AND kill the child so no zombie PTYs linger.
    let session = SESSIONS
        .lock()
        .map_err(|_| "terminal session registry is unavailable".to_string())?
        .remove(&id);
    if let Some(s) = session {
        let mut child = s
            .child
            .lock()
            .map_err(|_| "terminal process state is unavailable".to_string())?;
        if let Some(mut process) = child.take() {
            match process.try_wait().map_err(|e| e.to_string())? {
                Some(_) => {}
                None => {
                    process.kill().map_err(|e| e.to_string())?;
                    process.wait().map_err(|e| e.to_string())?;
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let parsed = validate_external_url(&url)?;
    app.opener()
        .open_url(parsed.as_str(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_external_url(value: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(value).map_err(|_| "invalid link".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("only HTTP and HTTPS links can be opened".to_string());
    }
    Ok(parsed)
}

fn decode_output(pending: &mut Vec<u8>, final_chunk: bool) -> String {
    let incomplete_start = (!final_chunk)
        .then(|| {
            (1..=3).find_map(|length| {
                let start = pending.len().checked_sub(length)?;
                let error = std::str::from_utf8(&pending[start..]).err()?;
                (error.valid_up_to() == 0 && error.error_len().is_none()).then_some(start)
            })
        })
        .flatten();
    let incomplete = incomplete_start.map(|start| pending.split_off(start));
    let decoded = String::from_utf8_lossy(pending).into_owned();
    pending.clear();
    if let Some(incomplete) = incomplete {
        pending.extend(incomplete);
    }
    decoded
}

#[tauri::command]
fn default_shell() -> String {
    std::env::var("SHELL")
        .ok()
        .filter(|path| !path.trim().is_empty())
        .unwrap_or_else(|| "/bin/zsh".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            create_terminal,
            start_terminal,
            write_terminal,
            resize_terminal,
            close_terminal,
            default_shell,
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{decode_output, pump_output, validate_external_url};
    use std::io::{self, Read};
    use std::sync::mpsc;
    use std::time::Duration;

    struct IdleReader {
        initial: Option<Vec<u8>>,
        release: mpsc::Receiver<()>,
    }

    impl Read for IdleReader {
        fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
            if let Some(initial) = self.initial.take() {
                buf[..initial.len()].copy_from_slice(&initial);
                return Ok(initial.len());
            }
            let _ = self.release.recv();
            Ok(0)
        }
    }

    #[test]
    fn output_is_flushed_while_reader_is_idle() {
        let (release_tx, release_rx) = mpsc::channel();
        let (output_tx, output_rx) = mpsc::channel();
        std::thread::spawn(move || {
            pump_output(
                IdleReader {
                    initial: Some(b"prompt".to_vec()),
                    release: release_rx,
                },
                |chunk| {
                    let _ = output_tx.send(chunk);
                },
            );
        });

        let output = output_rx.recv_timeout(Duration::from_secs(1));
        let _ = release_tx.send(());

        assert_eq!(output.unwrap(), "prompt");
    }

    #[test]
    fn output_decoder_preserves_utf8_sequences_split_between_flushes() {
        let mut pending = vec![0xe2];
        assert_eq!(decode_output(&mut pending, false), "");
        assert_eq!(pending, vec![0xe2]);

        pending.extend_from_slice(&[0x9c, 0x93, b'!']);
        assert_eq!(decode_output(&mut pending, false), "✓!");
        assert!(pending.is_empty());
    }

    #[test]
    fn output_decoder_replaces_incomplete_utf8_at_exit() {
        let mut pending = vec![0xe2, 0x9c];
        assert_eq!(decode_output(&mut pending, true), "�");
        assert!(pending.is_empty());
    }

    #[test]
    fn external_links_are_limited_to_http_and_https() {
        assert!(validate_external_url("https://example.com/path").is_ok());
        assert!(validate_external_url("http://localhost:8080").is_ok());
        assert!(validate_external_url("file:///etc/passwd").is_err());
        assert!(validate_external_url("javascript:alert(1)").is_err());
        assert!(validate_external_url("not a URL").is_err());
    }
}
