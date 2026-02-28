// ─── Inkdown Demo ─────────────────────────────────────────────────────────────
import { render, print, MarkdownStream } from './src/index.js';

const SAMPLE_MARKDOWN = `
# Inkdown Terminal Renderer

A **beautiful**, streaming-first markdown renderer for the terminal.

## Features

- 🎨 4 built-in themes: \`dark\`, \`dracula\`, \`nord\`, \`light\`  
- ⚡ Streaming support — render as LLM tokens arrive
- 🔍 Syntax highlighting for JS, Python, Bash, JSON, CSS
- 📊 Tables, blockquotes, lists, headings, HR

## Installation

\`\`\`bash
npm install inkdown
\`\`\`

## Basic Usage

\`\`\`javascript
import { render, print, MarkdownStream } from 'inkdown';

// One-shot render
console.log(render('# Hello World', { theme: 'dracula' }));

// Streaming from an LLM
const md = new MarkdownStream({ theme: 'nord' });
for await (const chunk of llmStream) {
  md.write(chunk.delta.text);
}
md.end();
\`\`\`

## Code Highlighting

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n."""
    seq = [0, 1]
    while seq[-1] + seq[-2] <= n:
        seq.append(seq[-1] + seq[-2])
    return seq

result = fibonacci(100)
print(f"Found {len(result)} numbers")
\`\`\`

## API Reference

| Method | Signature | Description |
|--------|-----------|-------------|
| render | \`render(md, opts)\` | Returns ANSI string |
| print  | \`print(md, opts)\`  | Writes to stdout |
| write  | \`stream.write(chunk)\` | Feed a chunk |
| end    | \`stream.end()\`     | Flush and finish |

## Blockquotes

> **Note:** This is optimised for LLM/agent output streams where you receive
> one token at a time. Code blocks and tables are buffered until complete —
> everything else renders immediately.

---

*Built for OpenAgent and any streaming AI tool.*
`;

// ── Demo 1: One-shot render ───────────────────────────────────────────────────
console.clear();
console.log('\n=== ONE-SHOT RENDER (dark theme) ===\n');
print(SAMPLE_MARKDOWN, { theme: "dracula" });

// ── Demo 2: Streaming simulation ─────────────────────────────────────────────
async function streamingDemo() {
  console.log('\n\n=== STREAMING SIMULATION (dracula theme) ===\n');
  console.log('Simulating token-by-token stream from an LLM...\n');

  const md = new MarkdownStream({ theme: 'dracula' });

  const text = `## Streaming Response

This text is being streamed **token by token**, just like a real LLM response.

\`\`\`javascript
const result = await agent.run({
  task: "Build a REST API",
  agents: ["backend", "security", "qa"],
});
console.log(result.output);
\`\`\`

The code block above was buffered until the closing fence, then rendered all at once with full syntax highlighting.

| Agent | Status | Time |
|-------|--------|------|
| backend | ✅ done | 4.2s |
| security | ✅ done | 2.1s |
| qa | ✅ done | 3.8s |
`;

  // Simulate token-by-token streaming (random chunk sizes 1-8 chars)
  let i = 0;
  while (i < text.length) {
    const chunkSize = Math.floor(Math.random() * 7) + 1;
    const chunk = text.slice(i, i + chunkSize);
    md.write(chunk);
    await new Promise(r => setTimeout(r, 12)); // simulate network delay
    i += chunkSize;
  }

  md.end();
}

await streamingDemo();

// ── Demo 3: All themes ────────────────────────────────────────────────────────
const THEME_SAMPLE = `### Theme: {name}
A heading in **bold**, some \`inline code\`, and *italic text*.
> A blockquote for flavour
- List item one
- List item two with \`code\`
`;

console.log('\n\n=== THEME SHOWCASE ===\n');
for (const theme of ['dark', 'dracula', 'nord', 'light']) {
  print(THEME_SAMPLE.replace('{name}', theme), { theme });
}
