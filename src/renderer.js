// ─── Inkdown Renderer ─────────────────────────────────────────────────────────
// Converts markdown text into beautifully styled ANSI terminal output.
// No external markdown parser — hand-rolled for speed and streaming compatibility.

import chalk from 'chalk';

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyStyle(text, styleConfig) {
  let c = chalk;
  if (styleConfig.color)  c = c.hex(styleConfig.color);
  if (styleConfig.bg)     c = c.bgHex(styleConfig.bg);
  if (styleConfig.bold)         c = c.bold;
  if (styleConfig.italic)       c = c.italic;
  if (styleConfig.underline)    c = c.underline;
  if (styleConfig.strikethrough) c = c.strikethrough;
  return c(text);
}

function repeat(char, n) {
  return char.repeat(Math.max(0, n));
}

function termWidth() {
  return process.stdout.columns || 80;
}

// ── Basic Syntax Highlighter (token-based, no deps) ──────────────────────────

const TOKEN_RULES = {
  javascript: [
    { re: /\/\/.*$/m,                          type: 'comment' },
    { re: /\/\*[\s\S]*?\*\//,                  type: 'comment' },
    { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/, type: 'string' },
    { re: /\b(const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|import|export|default|from|of|in|new|this|typeof|instanceof|async|await|try|catch|finally|throw|null|undefined|true|false|void|delete|yield|super|extends|static)\b/, type: 'keyword' },
    { re: /\b\d+\.?\d*\b/,                     type: 'number' },
    { re: /\b([A-Z][a-zA-Z0-9_]*)\b/,          type: 'tag' },
    { re: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/, type: 'function' },
    { re: /[{}[\]().,;:]/,                     type: 'punctuation' },
    { re: /[+\-*/%=<>!&|^~?]/,               type: 'operator' },
  ],
  python: [
    { re: /#.*$/m,                             type: 'comment' },
    { re: /"""[\s\S]*?"""|'''[\s\S]*?'''/,    type: 'string' },
    { re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/, type: 'string' },
    { re: /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|pass|break|continue|and|or|not|in|is|lambda|yield|global|nonlocal|True|False|None|async|await)\b/, type: 'keyword' },
    { re: /\b\d+\.?\d*\b/,                    type: 'number' },
    { re: /\b([A-Z][a-zA-Z0-9_]*)\b/,         type: 'tag' },
    { re: /\b([a-z_][a-zA-Z0-9_]*)\s*(?=\()/, type: 'function' },
    { re: /[{}[\]().,;:]/,                    type: 'punctuation' },
    { re: /[+\-*/%=<>!&|^~?@]/,             type: 'operator' },
  ],
  bash: [
    { re: /#.*$/m,                             type: 'comment' },
    { re: /"(?:\\.|[^"\\])*"|'[^']*'/,        type: 'string' },
    { re: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|local|source|echo|cd|ls|mkdir|rm|cp|mv|grep|sed|awk|cat|pipe|sudo|chmod|chown)\b/, type: 'keyword' },
    { re: /\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/,  type: 'attribute' },
    { re: /\b\d+\b/,                          type: 'number' },
    { re: /[|&;><(){}[\]]/,                   type: 'operator' },
  ],
  json: [
    { re: /"(?:\\.|[^"\\])*"\s*:/,            type: 'attribute' },
    { re: /"(?:\\.|[^"\\])*"/,               type: 'string' },
    { re: /\b(true|false|null)\b/,            type: 'keyword' },
    { re: /\b\d+\.?\d*\b/,                   type: 'number' },
    { re: /[{}[\],]/,                         type: 'punctuation' },
  ],
  css: [
    { re: /\/\*[\s\S]*?\*\//,                 type: 'comment' },
    { re: /"[^"]*"|'[^']*'/,                  type: 'string' },
    { re: /[.#]?[a-zA-Z][a-zA-Z0-9_-]*\s*(?=\{)/, type: 'tag' },
    { re: /[a-zA-Z-]+\s*(?=:)/,              type: 'attribute' },
    { re: /:\s*([^;{]+)/,                    type: 'string' },
    { re: /#[0-9a-fA-F]{3,8}\b/,            type: 'number' },
    { re: /\b\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?\b/, type: 'number' },
    { re: /[{}:;]/,                          type: 'punctuation' },
  ],
  typescript: [], // alias handled below
};
TOKEN_RULES.ts  = TOKEN_RULES.typescript = TOKEN_RULES.javascript;
TOKEN_RULES.js  = TOKEN_RULES.javascript;
TOKEN_RULES.jsx = TOKEN_RULES.javascript;
TOKEN_RULES.tsx = TOKEN_RULES.javascript;
TOKEN_RULES.sh  = TOKEN_RULES.bash;
TOKEN_RULES.zsh = TOKEN_RULES.bash;
TOKEN_RULES.py  = TOKEN_RULES.python;

function highlightCode(code, lang, syntaxColors) {
  const rules = TOKEN_RULES[lang?.toLowerCase()];
  if (!rules || !rules.length) return code;

  const tokens = [];
  let remaining = code;
  let pos = 0;

  while (remaining.length > 0) {
    let bestMatch = null;
    let bestIndex = Infinity;
    let bestType = null;

    for (const { re, type } of rules) {
      const flagged = new RegExp(re.source, re.flags.includes('m') ? 'gm' : 'g');
      flagged.lastIndex = 0;
      const m = flagged.exec(remaining);
      if (m && m.index < bestIndex) {
        bestIndex = m.index;
        bestMatch = m[0];
        bestType  = type;
      }
    }

    if (!bestMatch) {
      tokens.push({ text: remaining, type: null });
      break;
    }

    if (bestIndex > 0) {
      tokens.push({ text: remaining.slice(0, bestIndex), type: null });
    }
    tokens.push({ text: bestMatch, type: bestType });
    remaining = remaining.slice(bestIndex + bestMatch.length);
  }

  return tokens.map(({ text, type }) => {
    if (!type || !syntaxColors[type]) return text;
    return chalk.hex(syntaxColors[type])(text);
  }).join('');
}

// ── Inline Renderer ───────────────────────────────────────────────────────────

function renderInline(text, theme) {
  // Process inline markdown: bold, italic, code, strikethrough, links
  let result = '';
  let i = 0;

  while (i < text.length) {
    // Bold+italic ***text***
    if (text.startsWith('***', i)) {
      const end = text.indexOf('***', i + 3);
      if (end !== -1) {
        const inner = renderInline(text.slice(i + 3, end), theme);
        result += chalk.bold.italic.hex(theme.bold.color)(inner);
        i = end + 3;
        continue;
      }
    }
    // Bold **text**
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        const inner = renderInline(text.slice(i + 2, end), theme);
        result += applyStyle(inner, theme.bold);
        i = end + 2;
        continue;
      }
    }
    // Italic *text* or _text_
    if ((text[i] === '*' || text[i] === '_') && text[i+1] !== text[i]) {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && text[end-1] !== ' ') {
        const inner = renderInline(text.slice(i + 1, end), theme);
        result += applyStyle(inner, theme.italic);
        i = end + 1;
        continue;
      }
    }
    // Strikethrough ~~text~~
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        result += applyStyle(inner, theme.strikethrough);
        i = end + 2;
        continue;
      }
    }
    // Inline code `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        const code = text.slice(i + 1, end);
        result += applyStyle(` ${code} `, theme.inlineCode);
        i = end + 1;
        continue;
      }
    }
    // Link [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = renderInline(text.slice(i + 1, closeBracket), theme);
          const url      = text.slice(closeBracket + 2, closeParen);
          result += applyStyle(linkText, theme.link);
          result += ' ' + applyStyle(`(${url})`, theme.linkHref);
          i = closeParen + 1;
          continue;
        }
      }
    }
    result += text[i];
    i++;
  }

  return result;
}

// ── Block Renderer ─────────────────────────────────────────────────────────────

export class Renderer {
  constructor(theme) {
    this.theme = theme;
  }

  /**
   * Render a complete markdown string to an ANSI-styled string.
   */
  render(markdown) {
    const lines = markdown.split('\n');
    const blocks = this._parseBlocks(lines);
    return blocks.map(b => this._renderBlock(b)).join('\n');
  }

  // ── Block parser ──────────────────────────────────────────────────────────

  _parseBlocks(lines) {
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      if (/^```/.test(line)) {
        const lang = line.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // consume closing ```
        blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
        i++;
        continue;
      }

      // Horizontal rule
      if (/^([-*_]){3,}\s*$/.test(line)) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].slice(2));
          i++;
        }
        blocks.push({ type: 'blockquote', lines: quoteLines });
        continue;
      }

      // Unordered list
      if (/^(\s*)[*\-+]\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^(\s*)[*\-+]\s/.test(lines[i])) {
          const m = lines[i].match(/^(\s*)[*\-+]\s+(.*)/);
          items.push({ indent: m[1].length, content: m[2] });
          i++;
        }
        blocks.push({ type: 'ul', items });
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(line)) {
        const items = [];
        let num = 1;
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          const m = lines[i].match(/^(\d+)\.\s+(.*)/);
          items.push({ num: num++, content: m[2] });
          i++;
        }
        blocks.push({ type: 'ol', items });
        continue;
      }

      // Table
      if (line.includes('|') && lines[i+1]?.match(/^\|?[\s\-|:]+\|?$/)) {
        const tableLines = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'table', lines: tableLines });
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        blocks.push({ type: 'empty' });
        i++;
        continue;
      }

      // Paragraph — collect consecutive non-special lines
      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^([-*_]){3,}\s*$/.test(lines[i]) &&
        !lines[i].startsWith('> ') &&
        !/^(\s*)[*\-+]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length) {
        blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
      }
    }

    return blocks;
  }

  // ── Block renderers ───────────────────────────────────────────────────────

  _renderBlock(block) {
    switch (block.type) {
      case 'heading':    return this._renderHeading(block);
      case 'code':       return this._renderCodeBlock(block);
      case 'blockquote': return this._renderBlockquote(block);
      case 'ul':         return this._renderUl(block);
      case 'ol':         return this._renderOl(block);
      case 'table':      return this._renderTable(block);
      case 'hr':         return this._renderHr();
      case 'paragraph':  return this._renderParagraph(block);
      case 'empty':      return '';
      default:           return '';
    }
  }

  _renderHeading({ level, content }) {
    const t = this.theme[`h${level}`];
    const width = termWidth();
    const rendered = renderInline(content, this.theme);

    const prefixes = ['', '▌ ', '  ◈ ', '  ── ', '  ─ ', '   · ', '   · '];
    const prefix = prefixes[level] || '';

    let line = applyStyle(prefix + rendered, t);

    // h1 gets a full-width underline, h2 gets a partial one
    if (level === 1) {
      const bar = chalk.hex(t.color)(repeat('─', width));
      return `\n${line}\n${bar}\n`;
    }
    if (level === 2) {
      const bar = chalk.hex(t.color)(repeat('─', Math.min(40, width)));
      return `\n${line}\n${bar}\n`;
    }
    return `\n${line}\n`;
  }

  _renderCodeBlock({ lang, content }) {
    const theme = this.theme;
    const width = termWidth();
    const highlighted = highlightCode(content, lang, theme.syntax);
    const lines = highlighted.split('\n');

    const topBar    = chalk.hex(theme.tableBorder.color)('╭' + repeat('─', width - 2) + '╮');
    const bottomBar = chalk.hex(theme.tableBorder.color)('╰' + repeat('─', width - 2) + '╯');

    const langLabel = lang
      ? chalk.hex(theme.codeLang.color)(` ${lang} `)
      : '';

    const header = chalk.hex(theme.tableBorder.color)('╭') +
      chalk.hex(theme.tableBorder.color)(repeat('─', 2)) +
      langLabel +
      chalk.hex(theme.tableBorder.color)(repeat('─', Math.max(0, width - 5 - (lang?.length || 0)))) +
      chalk.hex(theme.tableBorder.color)('╮');

    const codeLines = lines.map(line => {
      const bar = chalk.hex(theme.tableBorder.color)('│ ');
      const endBar = chalk.hex(theme.tableBorder.color)(' │');
      return bar + chalk.hex(theme.codeBlock.color)(line) + endBar;
    });

    return '\n' + header + '\n' + codeLines.join('\n') + '\n' + bottomBar + '\n';
  }

  _renderBlockquote({ lines }) {
    const theme = this.theme;
    const border = chalk.hex(theme.blockquote.border)('┃ ');
    return '\n' + lines.map(line => {
      return border + applyStyle(renderInline(line, theme), theme.blockquote);
    }).join('\n') + '\n';
  }

  _renderUl({ items }) {
    const theme = this.theme;
    const bullets = ['●', '○', '◆', '◇'];
    return '\n' + items.map(({ indent, content }) => {
      const level  = Math.floor(indent / 2);
      const bullet = chalk.hex(theme.bullet.color)(bullets[level % bullets.length]);
      const pad    = repeat(' ', indent + 2);
      return pad + bullet + ' ' + renderInline(content, theme);
    }).join('\n') + '\n';
  }

  _renderOl({ items }) {
    const theme = this.theme;
    return '\n' + items.map(({ num, content }) => {
      const n = applyStyle(`${num}.`, theme.number);
      return `  ${n} ${renderInline(content, theme)}`;
    }).join('\n') + '\n';
  }

  _renderTable({ lines }) {
    const theme = this.theme;

    // Parse rows
    const rows = lines
      .filter(l => !l.match(/^\|?[\s\-|:]+\|?$/))
      .map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

    if (!rows.length) return '';

    // Calculate column widths (visual width, accounting for future ANSI)
    const cols = rows[0].length;
    const colWidths = Array(cols).fill(0);
    rows.forEach(row => {
      row.forEach((cell, i) => {
        colWidths[i] = Math.max(colWidths[i], cell.length + 2);
      });
    });

    const borderColor = theme.tableBorder.color;
    const hor  = (l, m, r, f) =>
      chalk.hex(borderColor)(l + colWidths.map(w => repeat(f, w)).join(m) + r);

    const top    = hor('╭', '┬', '╮', '─');
    const mid    = hor('├', '┼', '┤', '─');
    const bottom = hor('╰', '┴', '╯', '─');

    const renderRow = (row, isHeader) => {
      const cells = row.map((cell, i) => {
        const pad = repeat(' ', colWidths[i] - cell.length - 1);
        const styled = isHeader
          ? applyStyle(cell, theme.tableHeader)
          : applyStyle(cell, theme.tableCell);
        return chalk.hex(borderColor)('│') + ' ' + styled + pad;
      });
      return cells.join('') + chalk.hex(borderColor)('│');
    };

    const [header, ...body] = rows;
    const result = [
      '',
      top,
      renderRow(header, true),
      mid,
      ...body.map(r => renderRow(r, false)),
      bottom,
      '',
    ];

    return result.join('\n');
  }

  _renderHr() {
    const width = termWidth();
    return '\n' + chalk.hex(this.theme.hr.color)(repeat('─', width)) + '\n';
  }

  _renderParagraph({ content }) {
    const rendered = renderInline(content, this.theme);
    return applyStyle('', this.theme.text) + rendered;
  }
}
