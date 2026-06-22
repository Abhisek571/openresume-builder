import React from 'react';
import { renderFormatted } from './format.jsx';

function Bullets({ bullets, className, ordered }) {
  // The editor keeps blank lines around while typing (e.g. the line you're
  // about to fill in after pressing Enter) — drop them only here, at render time.
  const visible = (bullets || []).filter((b) => b.trim());
  if (visible.length === 0) return null;
  return (
    <ul className={[className, ordered ? 'ordered' : ''].filter(Boolean).join(' ')}>
      {visible.map((b, i) => (
        <li key={i} className={/^\s/.test(b) ? 'sub' : ''}>{renderFormatted(b.trim())}</li>
      ))}
    </ul>
  );
}

// --- Resumatic: bold name/dates row, italic role/location row, square+circle bullets ---

function ResumaticSection({ section }) {
  switch (section.type) {
    case 'experience':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.company}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-entry-sub">
                <em>{x.role}</em>
                <em>{x.location}</em>
              </div>
              <Bullets bullets={x.bullets} className="r-bullets" ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'projects':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.name}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-entry-sub">
                <em>{x.role}</em>
                <em>{x.link}</em>
              </div>
              <Bullets bullets={x.bullets} className="r-bullets" ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'education':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.school}</strong>
                <span>{x.end}</span>
              </div>
              <div className="r-entry-sub">
                <em>{x.degree}</em>
                <em>{x.location}</em>
              </div>
              <Bullets bullets={x.bullets} className="r-bullets" ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'certifications':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.name}</strong>
                <span>{x.date}</span>
              </div>
              <div className="r-entry-sub">
                <em>{x.issuer}</em>
              </div>
            </div>
          ))}
        </section>
      );
    case 'skills': {
      const skills = section.items.filter(Boolean);
      return skills.length > 0 ? (
        <section key={section.id}>
          <h3>{section.title}</h3>
          <p className="r-skills-text">{skills.join('; ')}</p>
        </section>
      ) : null;
    }
    case 'custom':
      return section.items.some((b) => b.trim()) ? (
        <section key={section.id}>
          <h3>{section.title}</h3>
          <Bullets bullets={section.items} className="r-bullets" ordered={section.bulletStyle === 'numbered'} />
        </section>
      ) : null;
    default:
      return null;
  }
}

function ResumaticPreview({ resume }) {
  const { personal: p, sections } = resume;

  return (
    <div className="resume-sheet tpl-resumatic">
      <div className="r-header">
        <h1>{p.name}</h1>
        <div className="r-contact">
          {[p.email, p.phone, p.location, p.website].filter(Boolean).join('  ❖  ')}
        </div>
      </div>

      {p.summary && (
        <section>
          <p className="r-summary">{renderFormatted(p.summary)}</p>
        </section>
      )}

      {sections.map((s) => <ResumaticSection section={s} key={s.id} />)}
    </div>
  );
}

// --- Classic / Modern: role/name+dates row, plain sub line, bulleted list ---

function StandardSection({ section }) {
  switch (section.type) {
    case 'experience':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.role}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-sub">{[x.company, x.location].filter(Boolean).join(' — ')}</div>
              <Bullets bullets={x.bullets} ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'projects':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.name}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-sub">{[x.role, x.link].filter(Boolean).join(' — ')}</div>
              <Bullets bullets={x.bullets} ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'education':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.degree}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-sub">{[x.school, x.location].filter(Boolean).join(' — ')}</div>
              <Bullets bullets={x.bullets} ordered={x.bulletStyle === 'numbered'} />
            </div>
          ))}
        </section>
      );
    case 'certifications':
      return (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.items.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.name}</strong>
                <span>{x.date}</span>
              </div>
              <div className="r-sub">{x.issuer}</div>
            </div>
          ))}
        </section>
      );
    case 'skills': {
      const skills = section.items.filter(Boolean);
      return skills.length > 0 ? (
        <section key={section.id}>
          <h3>{section.title}</h3>
          <div className="r-skills">
            {skills.map((sk, i) => <span className="r-chip" key={i}>{sk}</span>)}
          </div>
        </section>
      ) : null;
    }
    case 'custom':
      return section.items.some((b) => b.trim()) ? (
        <section key={section.id}>
          <h3>{section.title}</h3>
          <Bullets bullets={section.items} ordered={section.bulletStyle === 'numbered'} />
        </section>
      ) : null;
    default:
      return null;
  }
}

function StandardPreview({ resume, template }) {
  const { personal: p, sections } = resume;

  return (
    <div className={`resume-sheet tpl-${template}`}>
      <div className="r-header">
        <h1>{p.name}</h1>
        <div className="r-title">{p.title}</div>
        <div className="r-contact">
          {[p.email, p.phone, p.location, p.website].filter(Boolean).join('  •  ')}
        </div>
      </div>

      {p.summary && (
        <section>
          <h3>Summary</h3>
          <p>{renderFormatted(p.summary)}</p>
        </section>
      )}

      {sections.map((s) => <StandardSection section={s} key={s.id} />)}
    </div>
  );
}

export default function Preview({ resume, template }) {
  if (template === 'resumatic') return <ResumaticPreview resume={resume} />;
  return <StandardPreview resume={resume} template={template} />;
}
