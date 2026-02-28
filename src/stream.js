// ─── Inkdown Stream ───────────────────────────────────────────────────────────
// Stateful streaming renderer. Accepts chunks of text (as they arrive from
// an LLM/agent stream) and writes styled output to a writable stream —
// without ever printing broken/partial markdown.
//
// Strategy:
//   - Inline text  → render immediately as it arrives
//   - Code blocks  → buffer until closing ``` then render complete
//   - Block elements (tables, blockquotes) → buffer by paragraph boundary
//   - Headings, HRs → render as soon as the line is complete

import { Renderer } from './renderer.js';

const STATE = {
  NORMAL:     'normal',
  CODE_BLOCK: 'code_block',
  TABLE:      'table',
  BLOCKQUOTE: 'blockquote',
};

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
          // Closing fence — render the whole block
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
          // Table ended
          this._flushBlock();
          this._state = STATE.NORMAL;
          this._processLine(line); // re-process the non-table line
        }
        break;
      }

      // ── Inside a blockquote ──────────────────────────────────────────────
      case STATE.BLOCKQUOTE: {
        if (line.startsWith('> ')) {
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

        // Table start
        if (line.includes('|')) {
          this._state    = STATE.TABLE;
          this._blockBuf = [line];
          break;
        }

        // Blockquote
        if (line.startsWith('> ')) {
          this._state    = STATE.BLOCKQUOTE;
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

        // List items — buffer by paragraph (for nested lists to work)
        if (/^(\s*)[*\-+]\s/.test(line) || /^\d+\.\s/.test(line)) {
          this._blockBuf.push(line);
          break;
        }

        // Regular text / paragraph — accumulate and render line-by-line
        // (safe to render inline immediately since we have the full line)
        this._flushBlock();
        this._emit(this.renderer.render(line) + '\n');
        break;
      }
    }
  }

  _flushBlock(force = false) {
    if (!this._blockBuf.length) return;

    // Don't flush an open code block unless forced (stream ended)
    if (this._state === STATE.CODE_BLOCK && !force) return;

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
