// ─── Inkdown Themes ───────────────────────────────────────────────────────────
// Each theme defines colors for every markdown element.
// Colors are chalk-compatible: hex strings or named chalk methods.

export const themes = {
  /**
   * Default dark theme — clean, high contrast
   */
  dark: {
    // Headings — progressively lighter
    h1: { color: '#C792EA', bold: true },
    h2: { color: '#82AAFF', bold: true },
    h3: { color: '#89DDFF', bold: true },
    h4: { color: '#C3E88D', bold: true },
    h5: { color: '#FFCB6B', bold: false },
    h6: { color: '#F07178', bold: false },

    // Body
    text:          { color: '#D4D4D4' },
    bold:          { color: '#FFFFFF', bold: true },
    italic:        { color: '#D4D4D4', italic: true },
    strikethrough: { color: '#666666', strikethrough: true },
    link:          { color: '#89DDFF', underline: true },
    linkHref:      { color: '#546E7A' },

    // Code
    inlineCode:    { color: '#C3E88D', bg: '#1E1E1E' },
    codeBlock:     { color: '#D4D4D4', bg: '#1A1A2E' },
    codeLang:      { color: '#546E7A' },

    // Structure
    blockquote:    { color: '#546E7A', border: '#C792EA' },
    hr:            { color: '#333333' },
    bullet:        { color: '#C792EA' },
    number:        { color: '#82AAFF' },

    // Tables
    tableHeader:   { color: '#FFFFFF', bold: true },
    tableBorder:   { color: '#333333' },
    tableCell:     { color: '#D4D4D4' },
    tableAlt:      { color: '#1E1E2E' },        // alt row bg hint

    // Code syntax (basic token coloring)
    syntax: {
      keyword:   '#C792EA',
      string:    '#C3E88D',
      number:    '#F78C6C',
      comment:   '#546E7A',
      function:  '#82AAFF',
      operator:  '#89DDFF',
      punctuation: '#89DDFF',
      tag:       '#F07178',
      attribute: '#FFCB6B',
    },
  },

  /**
   * Dracula theme
   */
  dracula: {
    h1: { color: '#FF79C6', bold: true },
    h2: { color: '#BD93F9', bold: true },
    h3: { color: '#8BE9FD', bold: true },
    h4: { color: '#50FA7B', bold: true },
    h5: { color: '#FFB86C', bold: false },
    h6: { color: '#FF5555', bold: false },

    text:          { color: '#F8F8F2' },
    bold:          { color: '#FFFFFF', bold: true },
    italic:        { color: '#F8F8F2', italic: true },
    strikethrough: { color: '#6272A4', strikethrough: true },
    link:          { color: '#8BE9FD', underline: true },
    linkHref:      { color: '#6272A4' },

    inlineCode:    { color: '#50FA7B', bg: '#282A36' },
    codeBlock:     { color: '#F8F8F2', bg: '#21222C' },
    codeLang:      { color: '#6272A4' },

    blockquote:    { color: '#6272A4', border: '#FF79C6' },
    hr:            { color: '#44475A' },
    bullet:        { color: '#FF79C6' },
    number:        { color: '#BD93F9' },

    tableHeader:   { color: '#FFFFFF', bold: true },
    tableBorder:   { color: '#44475A' },
    tableCell:     { color: '#F8F8F2' },
    tableAlt:      { color: '#282A36' },

    syntax: {
      keyword:     '#FF79C6',
      string:      '#F1FA8C',
      number:      '#BD93F9',
      comment:     '#6272A4',
      function:    '#50FA7B',
      operator:    '#FF79C6',
      punctuation: '#F8F8F2',
      tag:         '#FF5555',
      attribute:   '#FFB86C',
    },
  },

  /**
   * Nord theme
   */
  nord: {
    h1: { color: '#88C0D0', bold: true },
    h2: { color: '#81A1C1', bold: true },
    h3: { color: '#5E81AC', bold: true },
    h4: { color: '#A3BE8C', bold: true },
    h5: { color: '#EBCB8B', bold: false },
    h6: { color: '#BF616A', bold: false },

    text:          { color: '#D8DEE9' },
    bold:          { color: '#ECEFF4', bold: true },
    italic:        { color: '#D8DEE9', italic: true },
    strikethrough: { color: '#4C566A', strikethrough: true },
    link:          { color: '#88C0D0', underline: true },
    linkHref:      { color: '#4C566A' },

    inlineCode:    { color: '#A3BE8C', bg: '#2E3440' },
    codeBlock:     { color: '#D8DEE9', bg: '#242933' },
    codeLang:      { color: '#4C566A' },

    blockquote:    { color: '#4C566A', border: '#88C0D0' },
    hr:            { color: '#3B4252' },
    bullet:        { color: '#88C0D0' },
    number:        { color: '#81A1C1' },

    tableHeader:   { color: '#ECEFF4', bold: true },
    tableBorder:   { color: '#3B4252' },
    tableCell:     { color: '#D8DEE9' },
    tableAlt:      { color: '#2E3440' },

    syntax: {
      keyword:     '#81A1C1',
      string:      '#A3BE8C',
      number:      '#B48EAD',
      comment:     '#4C566A',
      function:    '#88C0D0',
      operator:    '#81A1C1',
      punctuation: '#ECEFF4',
      tag:         '#BF616A',
      attribute:   '#EBCB8B',
    },
  },

  /**
   * Light theme
   */
  light: {
    h1: { color: '#7C3AED', bold: true },
    h2: { color: '#2563EB', bold: true },
    h3: { color: '#0891B2', bold: true },
    h4: { color: '#16A34A', bold: true },
    h5: { color: '#D97706', bold: false },
    h6: { color: '#DC2626', bold: false },

    text:          { color: '#1F2937' },
    bold:          { color: '#111827', bold: true },
    italic:        { color: '#1F2937', italic: true },
    strikethrough: { color: '#9CA3AF', strikethrough: true },
    link:          { color: '#2563EB', underline: true },
    linkHref:      { color: '#9CA3AF' },

    inlineCode:    { color: '#7C3AED', bg: '#F3F4F6' },
    codeBlock:     { color: '#1F2937', bg: '#F9FAFB' },
    codeLang:      { color: '#9CA3AF' },

    blockquote:    { color: '#6B7280', border: '#7C3AED' },
    hr:            { color: '#E5E7EB' },
    bullet:        { color: '#7C3AED' },
    number:        { color: '#2563EB' },

    tableHeader:   { color: '#111827', bold: true },
    tableBorder:   { color: '#E5E7EB' },
    tableCell:     { color: '#1F2937' },
    tableAlt:      { color: '#F9FAFB' },

    syntax: {
      keyword:     '#7C3AED',
      string:      '#16A34A',
      number:      '#D97706',
      comment:     '#9CA3AF',
      function:    '#2563EB',
      operator:    '#0891B2',
      punctuation: '#1F2937',
      tag:         '#DC2626',
      attribute:   '#D97706',
    },
  },
};

export function getTheme(name) {
  return themes[name] || themes.dark;
}
