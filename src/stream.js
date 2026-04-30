// ─── Inkdown Stream ───────────────────────────────────────────────────────────
// Stateful streaming renderer. Accepts chunks of text (as they arrive from
// an LLM/agent stream) and writes styled output to a writable stream —
// without ever printing broken/partial markdown.
//
// Strategy:
//   - Inline text  → render immediately as it arrives
//   - Code blocks  → buffer until closing ``` then render complete
//   - Block elements (tables, blockquotes, alerts) → buffer by paragraph boundary
//   - Headings, HRs → render as soon as the line is complete
//   - Alerts (GitHub-style) → detect [!TYPE] and render with special styling

import { Renderer } from './renderer.js';

const STATE = {
  NORMAL:     'normal',
  CODE_BLOCK: 'code_block',
  TABLE:      'table',
  BLOCKQUOTE: 'blockquote',
  LIST:       'list',
  ALERT:      'alert',
};

// Alert type detection regex
const ALERT_REGEX = /^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/i;

export class MarkdownStream {
  /**
   * @param {object} opts
   * @param {object} opts.theme       - Theme object from themes.js
   * @param {NodeJS.WriteStream} opts.output  - Where to write output (default: process.stdout)
   * @param {boolean} opts.newline    - Add trailing newline on end() (default: true)
   */
  constructor({ theme, output = process.stdout, newline = true } = {}) {
    this.renderer = new Renderer(theme);
    this.output   = output;
    this.newline  = newline;

    this._state      = STATE.NORMAL;
    this._lineBuffer = '';     // chars not yet newline-terminated
    this._blockBuf   = [];     // lines buffered for complex blocks
    this._codeLang   = '';
  }

  /**
   * Feed a chunk of text (may be partial, e.g. a single token from an LLM stream).
   * @param {string} chunk
   */
  write(chunk) {
    // Append chunk to the incomplete line buffer
    this._lineBuffer += chunk;

    // Process all complete lines
    const newlineIdx = this._lineBuffer.lastIndexOf('\n');
    if (newlineIdx === -1) {
      // No complete line yet — for normal state, we can still stream inline text
      if (this._state === STATE.NORMAL && !this._lineBuffer.startsWith('```') && !this._lineBuffer.startsWith('|')) {
        // Speculative inline render (no newline-dependent structure)
        // We'll handle it properly when the line ends
      }
      return;
    }

    const completeText = this._lineBuffer.slice(0, newlineIdx + 1);
    this._lineBuffer   = this._lineBuffer.slice(newlineIdx + 1);

    const lines = completeText.split('\n');
    // Last element is '' (due to trailing \n), remove it
    if (lines[lines.length - 1] === '') lines.pop();

    for (const line of lines) {
      this._processLine(line);
    }
  }

  /**
   * Signal end of stream. Flushes any buffered content.
   */
  end() {
    // Flush any remaining content in lineBuffer
    if (this._lineBuffer.trim()) {
      this._processLine(this._lineBuffer);
      this._lineBuffer = '';
    }

    // Flush any open block
    this._flushBlock(true);

    if (this.newline) this.output.write('\n');
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _processLine(line) {
    switch (this._state) {

      // ── Inside a code block ──────────────────────────────────────────────
      case STATE.CODE_BLOCK: {
        if (line.startsWith('```')) {
          this._blockBuf.push(line);
          const code = this._blockBuf.join('\n');
          this._emit(this.renderer.render(code));
          this._blockBuf = [];
          this._state = STATE.NORMAL;
        } else {
          this._blockBuf.push(line);
        }
        break;
      }

      // ── Inside a table ───────────────────────────────────────────────────
      case STATE.TABLE: {
        if (line.includes('|')) {
          this._blockBuf.push(line);
        } else {
          this._flushBlock();
          this._state = STATE.NORMAL;
          this._processLine(line);
        }
        break;
      }

      // ── Inside a blockquote or alert ─────────────────────────────────────
      case STATE.BLOCKQUOTE:
      case STATE.ALERT: {
        if (line.startsWith('> ')) {
          this._blockBuf.push(line);
        } else {
          this._flushBlock();
          this._state = STATE.NORMAL;
          this._processLine(line);
        }
        break;
      }

      // ── Inside a list ────────────────────────────────────────────────────
      case STATE.LIST: {
        if (this._isListItem(line) || this._isContinuation(line)) {
          this._blockBuf.push(line);
        } else {
          this._flushBlock();
          this._state = STATE.NORMAL;
          this._processLine(line);
        }
        break;
      }

      // ── Normal state ─────────────────────────────────────────────────────
      case STATE.NORMAL: {
        // Opening code fence
        if (line.startsWith('```')) {
          this._flushBlock();
          this._state    = STATE.CODE_BLOCK;
          this._codeLang = line.slice(3).trim();
          this._blockBuf = [line];
          break;
        }

        // Table start (needs separator line to confirm)
        if (line.includes('|') && !line.startsWith('>')) {
          this._state    = STATE.TABLE;
          this._blockBuf = [line];
          break;
        }

        // Alert/Blockquote detection
        if (line.startsWith('> ')) {
          const content = line.slice(2);
          // Check if it's a GitHub-style alert
          if (ALERT_REGEX.test(content)) {
            this._state = STATE.ALERT;
          } else {
            this._state = STATE.BLOCKQUOTE;
          }
          this._blockBuf = [line];
          break;
        }

        // Empty line — flush any accumulated paragraph
        if (line.trim() === '') {
          this._flushBlock();
          this.output.write('\n');
          break;
        }

        // Heading — immediate render
        if (/^#{1,6}\s/.test(line)) {
          this._flushBlock();
          this._emit(this.renderer.render(line));
          break;
        }

        // HR — immediate render
        if (/^([-*_]){3,}\s*$/.test(line)) {
          this._flushBlock();
          this._emit(this.renderer.render(line));
          break;
        }

        // List items — enter list state for proper nesting
        if (this._isListItem(line)) {
          this._state    = STATE.LIST;
          this._blockBuf = [line];
          break;
        }

        // Regular text / paragraph — flush and render immediately
        this._flushBlock();
        this._emit(this.renderer.render(line) + '\n');
        break;
      }
    }
  }

  _isListItem(line) {
    return /^(\s*)[*\-+](?:\s|\[x\]|\[ \])\s/.test(line) || // Unordered: -, *, + with checkbox support
           /^(\s*)\d+\.\s/.test(line);                        // Ordered: 1., 2., etc.
  }

  _isContinuation(line) {
    // Lines that continue a list item (indented or blank within list context)
    if (line.trim() === '') return true;
    return /^(\s+).+$/.test(line) && !this._isListItem(line);
  }

  _flushBlock(force = false) {
    if (!this._blockBuf.length) return;

    // Don't flush an open code block unless forced (stream ended)
    if (this._state === STATE.CODE_BLOCK && !force) return;

    // Don't flush incomplete alerts/blockquotes/tables/lists unless forced
    if ([STATE.ALERT, STATE.BLOCKQUOTE, STATE.TABLE, STATE.LIST].includes(this._state) && !force) {
      // Check if we have enough content to render
      if (this._state === STATE.TABLE && this._blockBuf.length < 2) {
        // Table needs at least 2 rows to be valid, wait for more
        return;
      }
    }

    const md = this._blockBuf.join('\n');
    this._emit(this.renderer.render(md));
    this._blockBuf = [];

    if (force) this._state = STATE.NORMAL;
  }

  _emit(text) {
    if (text && text.trim()) {
      this.output.write(text.trim() + '\n');
    }
  }
}
