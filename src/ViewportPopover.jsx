import { useLayoutEffect, useRef } from 'react';

// Keep toolbar popovers inside the viewport even when their anchor wraps.
export default function ViewportPopover({ className, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    const anchor = panel.parentElement;
    const place = () => {
      const margin = 12;
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = panel.getBoundingClientRect().width;
      const below = Math.max(0, height - rect.bottom - 8 - margin);
      const above = Math.max(0, rect.top - 8 - margin);
      const flip = below < Math.min(240, panel.scrollHeight) && above > below;
      const top = flip
        ? Math.max(margin, rect.top - 8 - Math.min(panel.scrollHeight, above))
        : Math.max(margin, Math.min(rect.bottom + 8, height - margin - 100));
      panel.style.left = `${Math.max(margin, Math.min(rect.right - panelWidth, width - panelWidth - margin))}px`;
      panel.style.top = `${top}px`;
      panel.style.maxHeight = `${Math.max(0, (flip ? rect.top - 8 : height - margin) - top)}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    observer.observe(panel);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, []);
  return <div ref={ref} className={className} style={{ position: 'fixed', overflow: 'auto', boxSizing: 'border-box' }}>{children}</div>;
}
