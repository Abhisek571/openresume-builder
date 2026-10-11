import { useLayoutEffect, useRef, useState } from 'react';
import PaginatedPreview from './PaginatedPreview';
import Icon from './Icon';

export default function PreviewPanel({ resume, template, expanded, onToggleExpanded }) {
  const viewport = useRef(null);
  const [fitScale, setFitScale] = useState(0.6);
  const [manualScale, setManualScale] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const scale = manualScale ?? fitScale;
  useLayoutEffect(() => {
    const element = viewport.current;
    const measure = () => {
      const sheet = element.querySelector('.paged-pages > .resume-sheet');
      if (!sheet) return;
      setFitScale(Math.max(0.15, Math.min(1, (element.clientWidth - 48) / sheet.offsetWidth, (element.clientHeight - 48) / sheet.offsetHeight)));
      setPageCount(element.querySelectorAll('.paged-pages > .resume-sheet').length);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const mutation = new MutationObserver(measure);
    mutation.observe(element, { childList: true, subtree: true });
    measure();
    return () => { observer.disconnect(); mutation.disconnect(); };
  }, []);
  return <section className={`preview-panel ${expanded ? 'expanded-preview' : ''}`} aria-label="Résumé preview">
    <header className="preview-toolbar">
      <div><strong>Preview</strong><span className="preview-template">{template.charAt(0).toUpperCase() + template.slice(1)} · A4</span></div>
      <div className="preview-tools">
        <button aria-label="Zoom out" disabled={scale <= 0.25} onClick={() => setManualScale(Math.max(0.25, scale - 0.1))}>−</button>
        <output className="zoom-value" aria-label="Preview zoom">{Math.round(scale * 100)}%</output>
        <button aria-label="Zoom in" disabled={scale >= 1.5} onClick={() => setManualScale(Math.min(1.5, scale + 0.1))}>+</button>
        <button onClick={() => setManualScale(null)}>Fit to page</button>
        <button onClick={onToggleExpanded} aria-label={expanded ? 'Close expanded preview' : 'Expand preview'}><Icon name={expanded ? 'back' : 'expand'} /><span>{expanded ? 'Close' : 'Expand preview'}</span></button>
      </div>
    </header>
    <div className={expanded ? 'final-preview-pane' : 'preview-pane'} ref={viewport}>
      <div className="preview-scaled"><PaginatedPreview resume={resume} template={template} scale={scale} /></div>
    </div>
    <footer className="preview-footer"><span>{pageCount} {pageCount === 1 ? 'page' : 'pages'} · A4</span><span>PDF uses this layout</span></footer>
  </section>;
}
