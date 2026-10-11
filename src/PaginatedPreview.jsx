import { useLayoutEffect, useRef, useState } from 'react';
import Preview from './Preview.jsx';
import { paginatePreview } from './browser/pagination.js';

export default function PaginatedPreview({ resume, template, scale }) {
  const sourceRef = useRef(null);
  const pagesRef = useRef(null);
  const [oversized, setOversized] = useState(false);
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (scale != null) {
      root.style.setProperty('--preview-scale', String(scale));
      return;
    }
    const pane = root.parentElement;
    const fit = () => {
      const style = getComputedStyle(pane);
      const available = pane.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (available > 0) root.style.setProperty('--preview-scale', String(Math.min(1, available / (210 * 96 / 25.4))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [scale]);
  useLayoutEffect(() => {
    let disposed = false;
    const layout = () => {
      if (disposed || !sourceRef.current.firstElementChild.offsetWidth) return;
      // Fractional CSS zoom rounds font metrics. Measure at physical page scale
      // so narrow editing panes cannot pack extra entries compared with print.
      const target = pagesRef.current;
      const zoom = target.style.zoom;
      target.style.zoom = '1';
      try {
        const result = paginatePreview(sourceRef.current.firstElementChild, target);
        setOversized(result.oversized);
        rootRef.current.style.setProperty('--pages-height', `${target.offsetHeight}px`);
      } finally { target.style.zoom = zoom; }
    };
    layout();
    document.fonts?.ready.then(layout);
    return () => { disposed = true; };
  }, [resume, template]);
  return (
    <div className={`paged-preview ${scale != null ? 'controlled-preview' : ''}`} ref={rootRef}>
      <div className="pagination-source" ref={sourceRef} aria-hidden="true" inert=""><Preview resume={resume} template={template} /></div>
      {oversized && <p className="pagination-warning">One paragraph or bullet is taller than a page. It remains intact here; the browser will split it when printing. Shorten it for matching page boundaries.</p>}
      <div className="paged-pages" ref={pagesRef} />
    </div>
  );
}
