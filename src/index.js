// ─── Inkdown ──────────────────────────────────────────────────────────────────
// Beautiful terminal markdown renderer with first-class streaming support.
//
// Usage:
//
//   // One-shot render
//   import { render } from 'inkdown';
//   console.log(render('# Hello\n\nThis is **inkdown**'));
//
//   // Streaming (e.g. from an LLM)
//   import { MarkdownStream } from 'inkdown';
//   const md = new MarkdownStream({ theme: 'dracula' });
//   for await (const chunk of llmStream) md.write(chunk);
//   md.end();

import { getTheme } from './themes.js';
import { Renderer }  from './renderer.js';
import { MarkdownStream as _MarkdownStream } from './stream.js';

export { themes } from './themes.js';

/**
 * One-shot: render a full markdown string and return the ANSI-styled result.
 *
 * @param {string} markdown
 * @param {{ theme?: string|object }} opts
 * @returns {string}
 */
export function render(markdown, { theme = 'dark' } = {}) {
  const t = typeof theme === 'string' ? getTheme(theme) : theme;
  return new Renderer(t).render(markdown);
}

/**
 * One-shot: render and immediately print to stdout.
 *
 * @param {string} markdown
 * @param {{ theme?: string|object }} opts
 */
export function print(markdown, opts = {}) {
  process.stdout.write(render(markdown, opts) + '\n');
}

/**
 * Streaming renderer — feed chunks as they arrive from an LLM/agent stream.
 *
 * @example
 * const md = new MarkdownStream({ theme: 'dracula' });
 * for await (const chunk of stream) md.write(chunk.delta.text);
 * md.end();
 */
export class MarkdownStream {
  /**
   * @param {{ theme?: string|object, output?: NodeJS.WriteStream }} opts
   */
  constructor({ theme = 'dark', output = process.stdout } = {}) {
    const t = typeof theme === 'string' ? getTheme(theme) : theme;
    this._inner = new _MarkdownStream({ theme: t, output });
  }

  /** Feed a chunk of text */
  write(chunk) { this._inner.write(chunk); }

  /** Flush and finalise */
  end()        { this._inner.end(); }

  /**
   * Convenience: pipe a Node.js Readable stream of text chunks.
   * @param {AsyncIterable<string>} readable
   */
  async pipe(readable) {
    for await (const chunk of readable) {
      this.write(typeof chunk === 'string' ? chunk : chunk.toString());
    }
    this.end();
  }
}

export default { render, print, MarkdownStream };
