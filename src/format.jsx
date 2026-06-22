import React from 'react';

// Minimal formatting syntax supported in Summary/bullet text: **bold** and
// *italic* (or _italic_). Kept intentionally small — this is plain-text
// storage with light markup, not a rich-text editor.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

export function renderFormatted(text) {
  if (!text) return text;
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
