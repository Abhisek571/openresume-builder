import Preview from './Preview.jsx';

const TEMPLATES = [
  { id: 'resumatic', label: 'Resumatic', description: 'Balanced, clear and versatile' },
  { id: 'classic', label: 'Classic', description: 'Traditional and understated' },
  { id: 'modern', label: 'Modern', description: 'Contemporary with a subtle accent' },
];

// Live-rendered thumbnails (scaled-down actual previews) instead of static
// screenshots, so the gallery always reflects the resume you're editing.
export default function TemplateGallery({ resume, template, setTemplate }) {
  return (
    <div className="template-gallery">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          className={`template-card ${template === t.id ? 'active' : ''}`}
          aria-pressed={template === t.id}
          onClick={() => setTemplate(t.id)}
        >
          <div className="template-thumb">
            <div className="template-thumb-inner">
              <Preview resume={resume} template={t.id} />
            </div>
          </div>
          <div className="template-label">{t.label}<span>{template === t.id ? '✓' : ''}</span></div>
          <p className="template-description">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
