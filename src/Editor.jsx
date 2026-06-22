import React from 'react';
import { SECTION_TYPES } from './data.js';

export default function Editor({ resume, setResume, activeSection }) {
  const setPersonal = (field, value) =>
    setResume({ ...resume, personal: { ...resume.personal, [field]: value } });

  const updateSection = (id, updater) =>
    setResume({
      ...resume,
      sections: resume.sections.map((s) => (s.id === id ? updater(s) : s)),
    });

  const setTitle = (id, title) => updateSection(id, (s) => ({ ...s, title }));
  const setItems = (id, items) => updateSection(id, (s) => ({ ...s, items }));

  const updateItem = (sectionId, itemId, field, value) =>
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
    }));

  const setBullets = (sectionId, itemId, text) =>
    updateItem(sectionId, itemId, 'bullets', text.split('\n').filter(Boolean));

  const addItem = (section) =>
    updateSection(section.id, (s) => ({ ...s, items: [...s.items, SECTION_TYPES[s.type].newItem()] }));

  const removeItem = (sectionId, itemId) =>
    updateSection(sectionId, (s) => ({ ...s, items: s.items.filter((it) => it.id !== itemId) }));

  const moveItem = (sectionId, index, dir) =>
    updateSection(sectionId, (s) => {
      const j = index + dir;
      if (j < 0 || j >= s.items.length) return s;
      const items = [...s.items];
      [items[index], items[j]] = [items[j], items[index]];
      return { ...s, items };
    });

  const CardControls = ({ index, total, onRemove }) => (
    <div className="card-controls">
      <button title="Move up" disabled={index === 0} onClick={() => moveItem(section.id, index, -1)}>▲</button>
      <button title="Move down" disabled={index === total - 1} onClick={() => moveItem(section.id, index, 1)}>▼</button>
      <button className="danger" onClick={onRemove}>Remove</button>
    </div>
  );

  if (activeSection === 'personal') {
    const p = resume.personal;
    return (
      <div className="editor">
        <h2>Personal</h2>
        <input placeholder="Name" value={p.name} onChange={(e) => setPersonal('name', e.target.value)} />
        <input placeholder="Title" value={p.title} onChange={(e) => setPersonal('title', e.target.value)} />
        <input placeholder="Email" value={p.email} onChange={(e) => setPersonal('email', e.target.value)} />
        <input placeholder="Phone" value={p.phone} onChange={(e) => setPersonal('phone', e.target.value)} />
        <input placeholder="Location" value={p.location} onChange={(e) => setPersonal('location', e.target.value)} />
        <input placeholder="Website" value={p.website} onChange={(e) => setPersonal('website', e.target.value)} />
        <textarea placeholder="Summary" value={p.summary} onChange={(e) => setPersonal('summary', e.target.value)} />
      </div>
    );
  }

  const section = resume.sections.find((s) => s.id === activeSection);
  if (!section) return <div className="editor"><p>Section not found.</p></div>;

  return (
    <div className="editor">
      <h2>
        <input
          className="section-title-input"
          value={section.title}
          onChange={(e) => setTitle(section.id, e.target.value)}
        />
      </h2>

      {section.type === 'skills' && (
        <div className="skills-list">
          {section.items.map((skill, i) => (
            <div className="skill-row" key={i}>
              <input
                placeholder="Skill"
                value={skill}
                onChange={(e) => {
                  const items = [...section.items];
                  items[i] = e.target.value;
                  setItems(section.id, items);
                }}
              />
              <button className="danger" title="Remove" onClick={() => setItems(section.id, section.items.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <button onClick={() => setItems(section.id, [...section.items, ''])}>+ Add Skill</button>
        </div>
      )}

      {section.type === 'custom' && (
        <textarea
          placeholder="One bullet per line (indent a line with a leading space for a sub-bullet)"
          value={section.items.join('\n')}
          onChange={(e) => setItems(section.id, e.target.value.split('\n').filter(Boolean))}
        />
      )}

      {section.type === 'experience' && section.items.map((x, i) => (
        <div className="card" key={x.id}>
          <CardControls index={i} total={section.items.length} onRemove={() => removeItem(section.id, x.id)} />
          <input placeholder="Company" value={x.company} onChange={(e) => updateItem(section.id, x.id, 'company', e.target.value)} />
          <div className="row">
            <input placeholder="Role" value={x.role} onChange={(e) => updateItem(section.id, x.id, 'role', e.target.value)} />
            <input placeholder="City, ST" value={x.location} onChange={(e) => updateItem(section.id, x.id, 'location', e.target.value)} />
          </div>
          <div className="row">
            <input placeholder="Start" value={x.start} onChange={(e) => updateItem(section.id, x.id, 'start', e.target.value)} />
            <input placeholder="End" value={x.end} onChange={(e) => updateItem(section.id, x.id, 'end', e.target.value)} />
          </div>
          <textarea
            placeholder="One bullet per line (indent a line with a leading space for a sub-bullet)"
            value={x.bullets.join('\n')}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
          />
        </div>
      ))}

      {section.type === 'education' && section.items.map((x, i) => (
        <div className="card" key={x.id}>
          <CardControls index={i} total={section.items.length} onRemove={() => removeItem(section.id, x.id)} />
          <input placeholder="School" value={x.school} onChange={(e) => updateItem(section.id, x.id, 'school', e.target.value)} />
          <div className="row">
            <input placeholder="Degree" value={x.degree} onChange={(e) => updateItem(section.id, x.id, 'degree', e.target.value)} />
            <input placeholder="City, ST" value={x.location} onChange={(e) => updateItem(section.id, x.id, 'location', e.target.value)} />
          </div>
          <div className="row">
            <input placeholder="Start" value={x.start} onChange={(e) => updateItem(section.id, x.id, 'start', e.target.value)} />
            <input placeholder="End" value={x.end} onChange={(e) => updateItem(section.id, x.id, 'end', e.target.value)} />
          </div>
          <textarea
            placeholder="One bullet per line (optional)"
            value={(x.bullets || []).join('\n')}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
          />
        </div>
      ))}

      {section.type === 'projects' && section.items.map((x, i) => (
        <div className="card" key={x.id}>
          <CardControls index={i} total={section.items.length} onRemove={() => removeItem(section.id, x.id)} />
          <input placeholder="Project name" value={x.name} onChange={(e) => updateItem(section.id, x.id, 'name', e.target.value)} />
          <div className="row">
            <input placeholder="Role (optional)" value={x.role} onChange={(e) => updateItem(section.id, x.id, 'role', e.target.value)} />
            <input placeholder="Link (optional)" value={x.link} onChange={(e) => updateItem(section.id, x.id, 'link', e.target.value)} />
          </div>
          <div className="row">
            <input placeholder="Start" value={x.start} onChange={(e) => updateItem(section.id, x.id, 'start', e.target.value)} />
            <input placeholder="End" value={x.end} onChange={(e) => updateItem(section.id, x.id, 'end', e.target.value)} />
          </div>
          <textarea
            placeholder="One bullet per line"
            value={x.bullets.join('\n')}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
          />
        </div>
      ))}

      {section.type === 'certifications' && section.items.map((x, i) => (
        <div className="card" key={x.id}>
          <CardControls index={i} total={section.items.length} onRemove={() => removeItem(section.id, x.id)} />
          <input placeholder="Certification name" value={x.name} onChange={(e) => updateItem(section.id, x.id, 'name', e.target.value)} />
          <div className="row">
            <input placeholder="Issuer" value={x.issuer} onChange={(e) => updateItem(section.id, x.id, 'issuer', e.target.value)} />
            <input placeholder="Date" value={x.date} onChange={(e) => updateItem(section.id, x.id, 'date', e.target.value)} />
          </div>
        </div>
      ))}

      {SECTION_TYPES[section.type].newItem && (
        <button onClick={() => addItem(section)}>+ Add {SECTION_TYPES[section.type].label.replace(/s$/, '')}</button>
      )}
    </div>
  );
}
