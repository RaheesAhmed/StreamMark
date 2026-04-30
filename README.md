# StreamMark

Beautiful terminal markdown renderer with first-class streaming support.

Built for LLM/agent output — renders tokens as they arrive without ever showing broken markdown.

## Install

```bash
npm install streammark
```

> **Peer deps:** `chalk@^5`, `string-width@^7`

## Usage

### One-shot render

```js
import { render, print } from 'streammark';

// Get ANSI string back
const ansi = render('# Hello\n\nThis is **streammark**', { theme: 'dracula' });
console.log(ansi);

// Or print directly
print('# Hello\n\nThis is **streammark**', { theme: 'nord' });
```

### Streaming (LLM/agent output)

```js
import { MarkdownStream } from 'streammark';

const md = new MarkdownStream({ theme: 'dark' });

// Anthropic SDK
const stream = await anthropic.messages.stream({ ... });
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    md.write(chunk.delta.text);
  }
}
md.end();

// OpenAI SDK
const stream = await openai.chat.completions.create({ stream: true, ... });
for await (const chunk of stream) {
  md.write(chunk.choices[0]?.delta?.content ?? '');
}
md.end();
```


## Themes

| Theme | Description |
|-------|-------------|
| `dark` | Default dark, high contrast |
| `dracula` | Dracula palette |
| `nord` | Nord palette |
| `light` | Clean light theme |

```js
// Pass theme name
new MarkdownStream({ theme: 'dracula' });

// Or bring your own theme object
import { themes } from 'streammark';
const myTheme = { ...themes.dark, h1: { color: '#FF0000', bold: true } };
new MarkdownStream({ theme: myTheme });
```

## Streaming Behaviour

| Element | Behaviour |
|---------|-----------|
| Headings, HR | Rendered immediately when line is complete |
| Paragraphs | Rendered line-by-line as newlines arrive |
| Code blocks | **Buffered** until closing ` ``` ` — then rendered with syntax highlighting |
| Tables | **Buffered** until table ends — then rendered with borders |
| Blockquotes | **Buffered** until block ends |
| Lists | **Buffered** until paragraph boundary (supports checkboxes) |
| Alerts | **Buffered** and rendered with styled boxes |

## GitHub-Style Alerts

Beautiful styled alert boxes for important callouts:

```markdown
> [!NOTE]
> Useful information that users should know.

> [!TIP]
> Helpful advice for doing things better.

> [!IMPORTANT]
> Key information users need to know.

> [!WARNING]
> Urgent info that needs immediate attention.

> [!CAUTION]
> Advises about risks or negative outcomes.
```

Alerts support full **inline markdown** including `code`, *italic*, and **bold** text.

## Syntax Highlighting

Supported: `js`, `ts`, `jsx`, `tsx`, `python`, `bash`, `sh`, `json`, `css`, `zsh`

No external deps — built-in token-based highlighter.

## API

### `render(markdown, opts?) → string`
Render a complete markdown string. Returns ANSI-styled string.

### `print(markdown, opts?)`
Render and write to stdout.

### `new MarkdownStream(opts?)`
Streaming renderer.
- `opts.theme` — theme name or object (default: `'dark'`)
- `opts.output` — writable stream (default: `process.stdout`)

#### `.write(chunk: string)`
Feed a chunk (can be a single character/token).

#### `.end()`
Flush remaining content and finalize.

#### `.pipe(asyncIterable)`
Convenience: pipe any async iterable of string chunks.

## Features

- **GitHub-style alerts** — `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!CAUTION]`
- **Streaming-first** — Renders tokens as they arrive from LLMs
- **4 beautiful themes** — dark, dracula, nord, light
- **Syntax highlighting** — JavaScript, TypeScript, Python, Bash, JSON, CSS
- **Tables & blockquotes** — Box-drawing borders and styled quotes
- **Checkboxes** — Support for `- [x]` and `- [ ]` task lists
- **Zero dependencies** — Built-in tokenizer, no external parsers
