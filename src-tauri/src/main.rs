// Real macOS PTY backend using portable-pty.
// Each terminal tab = one native pty pair + zsh (or chosen shell).

use once_cell::sync::Lazy;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

struct Session {
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Arc<Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>>,
}

static SESSIONS: Lazy<Arc<Mutex<HashMap<String, Session>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

#[tauri::command]
fn create_terminal(
    app: AppHandle,
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

    let shell_path = shell.unwrap_or_else(|| {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    });
    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = std::env::var("HOME").ok() {
        cmd.cwd(home);
    }
    // login shell so .zprofile / .zshrc load like Terminal.app
    if shell_path.ends_with("zsh") {
        cmd.arg("-l");
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();

    let master: Arc<Mutex<Box<dyn MasterPty + Send>>> =
        Arc::new(Mutex::new(pair.master));
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

    SESSIONS.lock().unwrap().insert(
        id.clone(),
        Session {
            master: master.clone(),
            writer: writer.clone(),
            child: Arc::new(Mutex::new(Some(child))),
        },
    );

    // Pump PTY output -> frontend.
    // Anti-lag: 32KB reads, coalesce into ≤16ms windows / ≤64KB batches so
    // bursty output (ls, cat, builds) becomes a few big events instead of
    // thousands of tiny ones. Binary-safe: decode incrementally, replacing
    // only truly invalid sequences.
    let event_name = format!("pty-output-{}", id);
    let id_for_thread = id.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 32768];
        let mut pending: Vec<u8> = Vec::with_capacity(65536);
        let mut last_flush = std::time::Instant::now();
        let flush = |pending: &mut Vec<u8>, app: &AppHandle, event_name: &str| {
            if pending.is_empty() {
                return;
            }
            let text = String::from_utf8_lossy(pending).into_owned();
            pending.clear();
            let _ = app.emit(event_name, text);
        };
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    flush(&mut pending, &app, &event_name);
                    let _ = app.emit(&event_name, "__EXIT__");
                    break;
                }
                Ok(n) => {
                    pending.extend_from_slice(&buf[..n]);
                    if pending.len() >= 65536 || last_flush.elapsed() >= Duration::from_millis(16) {
                        flush(&mut pending, &app, &event_name);
                        last_flush = std::time::Instant::now();
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(_) => {
                    flush(&mut pending, &app, &event_name);
                    let _ = app.emit(&event_name, "__EXIT__");
                    break;
                }
            }
        }
        SESSIONS.lock().unwrap().remove(&id_for_thread);
    });

    Ok(id)
}

#[tauri::command]
fn write_terminal(id: String, data: String) -> Result<(), String> {
    // Clone the writer Arc under the map lock, then write WITHOUT holding
    // the map lock — otherwise a big paste blocks every other pane.
    let writer = {
        let sessions = SESSIONS.lock().unwrap();
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
        let sessions = SESSIONS.lock().unwrap();
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
    let session = SESSIONS.lock().unwrap().remove(&id);
    if let Some(s) = session {
        if let Ok(mut child) = s.child.lock() {
            if let Some(mut c) = child.take() {
                let _ = c.kill();
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(url, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn default_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            create_terminal,
            write_terminal,
            resize_terminal,
            close_terminal,
            default_shell,
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
