# Bundled terminal font

These four files are the **JetBrainsMono NL Nerd Font Mono** faces (Nerd Fonts
3.5.1), copied from the Nerd Fonts release and shipped inside the app.

| file | weight / style |
| --- | --- |
| `JetBrainsMonoNLNerdFontMono-Regular.ttf` | 400 normal |
| `JetBrainsMonoNLNerdFontMono-Bold.ttf` | 700 normal |
| `JetBrainsMonoNLNerdFontMono-Italic.ttf` | 400 italic |
| `JetBrainsMonoNLNerdFontMono-BoldItalic.ttf` | 700 italic |

They are exposed to the app as the CSS family **`Term Nerd Mono`** by the
`@font-face` rules at the top of `src/styles.css`.

## Why bundle instead of using the system font

Every Nerd Font name that was tried as a plain CSS `font-family` value silently
failed inside the app's `WKWebView`, so the terminal fell back to **Menlo** and
the icons were drawn from a system glyph cascade at the wrong width. Measured in
WKWebView (advance width of `i`, and of an icon glyph):

| CSS family | `i` | icon | result |
| --- | --- | --- | --- |
| `"Term Nerd Mono"` (`@font-face`) | 60.00 | 60.00 | correct — icons exactly one cell |
| `"JetBrainsMono Nerd Font Mono"` | 27.78 | 72.22 | family not found |
| `"JetBrainsMonoNL Nerd Font Mono"` | 27.78 | 72.22 | family not found |
| Menlo (what the app used to get) | 60.21 | 60.21 | no icons |

JetBrains Mono has an exact `0.6em` advance; Menlo's is `0.6023em`, which is how
the fallback was spotted. Bundling the font makes the terminal independent of
what happens to be installed on the machine.

## Regenerating

Drop new TTFs in this directory, keep the file names, and update the
`@font-face` block in `src/styles.css` if the family name changes.

## Licence

Both JetBrains Mono and the Nerd Fonts patching keep the fonts under the
**SIL Open Font License 1.1**:

- JetBrains Mono — <https://github.com/JetBrains/JetBrainsMono> (OFL 1.1)
- Nerd Fonts — <https://github.com/ryanoasis/nerd-fonts> (OFL 1.1)

The licence text is in `OFL.txt` and is also embedded in the fonts' name tables.
The OFL permits redistribution of the font software in this form; the reserved
font names `JetBrains Mono` and `JetBrainsMono Nerd Font` are **not** used as
the family name of the app's copy — it is exposed as `Term Nerd Mono`.
