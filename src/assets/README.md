# Emberwake Pixel

`emberwake-pixel.ttf` is original game typography under this repository's MIT license. Its 5×7 square glyphs include uppercase, lowercase with descenders, ASCII punctuation, curly quotes, dashes, arrows, ×, and the interface's diamond and ember symbols.

Regenerate the font with `node scripts/pixel-font.mjs`. The source contains the authored bitmap patterns and a dependency-free TrueType writer. The 800-unit em maps each bitmap cell to one CSS pixel at 8px, two at 16px, and so on; the interface uses those sizes for sharp edges. Uncovered languages use the local monospace fallback.
