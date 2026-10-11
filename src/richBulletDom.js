// DOM <-> marker-string helpers for RichBulletField. Kept in their own
// module so RichBulletField.jsx only exports its component (fast refresh).

const TOKEN = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;

export function buildLineElement(lineText) {
  const div = document.createElement('div');
  div.className = 'rb-line';
  if (lineText === '') {
    div.appendChild(document.createElement('br'));
    return div;
  }
  const parts = lineText.split(TOKEN).filter((p) => p !== '');
  for (const part of parts) {
    if (part.startsWith('***') && part.endsWith('***')) {
      const strong = document.createElement('strong');
      const em = document.createElement('em');
      em.textContent = part.slice(3, -3);
      strong.appendChild(em);
      div.appendChild(strong);
    } else if (part.startsWith('**') && part.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = part.slice(2, -2);
      div.appendChild(strong);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const em = document.createElement('em');
      em.textContent = part.slice(1, -1);
      div.appendChild(em);
    } else {
      div.appendChild(document.createTextNode(part));
    }
  }
  return div;
}

// Inverse of buildLineElement — walks one line's top-level children back
// into marker-string form. Tolerates both <strong>/<em> (what we create) and
// <b>/<i> (what execCommand actually inserts in Chromium).
export function lineElementToMarkerText(lineEl) {
  let out = '';
  for (const node of lineEl.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent;
      continue;
    }
    if (node.nodeName === 'BR') continue;
    const text = node.textContent;
    if (!text) continue; // drop empty inline elements (e.g. an empty <b></b> execCommand can leave behind)
    const name = node.nodeName;
    if (name === 'STRONG' || name === 'B') {
      const hasItalic = node.querySelector && node.querySelector('em, i');
      out += hasItalic ? `***${text}***` : `**${text}**`;
    } else if (name === 'EM' || name === 'I') {
      const hasBold = node.querySelector && node.querySelector('strong, b');
      out += hasBold ? `***${text}***` : `*${text}*`;
    } else {
      out += text;
    }
  }
  return out;
}

export function getLineElement(node, root) {
  let n = node;
  while (n && n !== root) {
    if (n.nodeType === Node.ELEMENT_NODE && n.classList && n.classList.contains('rb-line')) return n;
    n = n.parentNode;
  }
  return null;
}
