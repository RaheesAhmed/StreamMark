# inkdown

Beautiful terminal markdown renderer with first-class streaming support.

Built for LLM/agent output — renders tokens as they arrive without ever showing broken markdown.

## Install

```bash
npm install inkdown
```

> **Peer deps:** `chalk@^5`, `string-width@^7`

## Usage

### One-shot render

```js
import { render, print } from 'inkdown';

// Get ANSI string back
const ansi = render('# Hello\n\nThis is **inkdown**', { theme: 'dracula' });
console.log(ansi);

// Or print directly
print('# Hello\n\nThis is **inkdown**', { theme: 'nord' });
```

### Streaming (LLM/agent output)

```js
import { MarkdownStream } from 'inkdown';

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

### Use with OpenAgent

```js
import { MarkdownStream } from 'inkdown';

agent.on('token', (token) => md.write(token));
agent.on('done',  ()      => md.end());
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
import { themes } from 'inkdown';
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
| Lists | **Buffered** until paragraph boundary |

## Syntax Highlighting

Supported: `js`, `ts`, `jsx`, `tsx`, `python`, `bash`, `sh`, `json`, `css`

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
