import React, { useRef } from 'react';
import { SECTION_TYPES } from './data.js';

export default function Editor({ resume, setResume, activeSection }) {
  // Functional setResume(prev => ...) everywhere below, NOT setResume({...resume, ...}).
  // The format toolbar (Bold/Italic/"1.") stashes these update functions in a ref at
  // focus-time and calls them later, by which point further typing has moved `resume`
  // on — closing over the prop directly would silently overwrite newer edits with that
  // stale snapshot. The functional form always reads the latest state at call time.
  const setPersonal = (field, value) =>
    setResume((prev) => ({ ...prev, personal: { ...prev.personal, [field]: value } }));

  const updateSection = (id, updater) =>
    setResume((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? updater(s) : s)),
    }));

  const setTitle = (id, title) => updateSection(id, (s) => ({ ...s, title }));
  const setItems = (id, items) => updateSection(id, (s) => ({ ...s, items }));

  const updateItem = (sectionId, itemId, field, value) =>
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
    }));

  // Keep blank lines while typing (e.g. the line you're about to type a new
  // bullet on after pressing Enter) — Preview filters them out at render time.
  const setBullets = (sectionId, itemId, text) =>
    updateItem(sectionId, itemId, 'bullets', text.split('\n'));

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

  // Bold/Italic/list toolbar — operates on whichever formattable textarea
  // was last focused, tracked via these refs rather than per-field state,
  // since there can be many bullet textareas (one per entry) sharing one
  // toolbar. activeToggleRef is only set for bullet fields (null for
  // Summary, which isn't a list), so the list button just no-ops there.
  const activeFieldRef = useRef(null);
  const activeUpdateRef = useRef(null);
  const activeToggleRef = useRef(null);

  const registerFormattable = (updateFn, toggleListStyle = null) => (e) => {
    activeFieldRef.current = e.target;
    activeUpdateRef.current = updateFn;
    activeToggleRef.current = toggleListStyle;
  };

  const applyFormat = (marker) => {
    const el = activeFieldRef.current;
    const update = activeUpdateRef.current;
    if (!el || !update) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || 'text';
    const newValue = value.slice(0, s) + marker + selected + marker + value.slice(e);
    update(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + marker.length, s + marker.length + selected.length);
    });
  };

  const toggleBulletStyle = (sectionId, itemId) =>
    updateSection(sectionId, (s) => ({
      ...s,
      items: s.items.map((it) =>
        it.id === itemId ? { ...it, bulletStyle: it.bulletStyle === 'numbered' ? 'bullet' : 'numbered' } : it
      ),
    }));

  const toggleSectionBulletStyle = (sectionId) =>
    updateSection(sectionId, (s) => ({ ...s, bulletStyle: s.bulletStyle === 'numbered' ? 'bullet' : 'numbered' }));

  // Word/LibreOffice-style list editing for bullet textareas: Tab/Shift+Tab
  // indents/outdents the current line by one sub-bullet level (2 spaces —
  // the same leading-space convention Preview already uses to detect sub
  // bullets), Enter on an indented line continues at that same level instead
  // of resetting to top-level, Enter on an empty indented line outdents
  // instead of adding a deeper blank line, and Backspace right at the start
  // of an indented line's text outdents instead of merging into the line above.
  const handleBulletKeyDown = (setValue) => (e) => {
    const el = e.target;
    const { selectionStart: s, selectionEnd: en, value: v } = el;
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const indentOf = (text) => (text.match(/^ */) || [''])[0];

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const remove = Math.min(2, indentOf(v.slice(lineStart)).length);
        if (remove === 0) return;
        setValue(v.slice(0, lineStart) + v.slice(lineStart + remove));
        const pos = (p) => Math.max(lineStart, p - remove);
        requestAnimationFrame(() => el.setSelectionRange(pos(s), pos(en)));
      } else {
        setValue(v.slice(0, lineStart) + '  ' + v.slice(lineStart));
        requestAnimationFrame(() => el.setSelectionRange(s + 2, en + 2));
      }
      return;
    }

    if (e.key === 'Enter' && s === en) {
      const lineEnd = v.indexOf('\n', s) === -1 ? v.length : v.indexOf('\n', s);
      const line = v.slice(lineStart, lineEnd);
      const indent = indentOf(line);
      if (!indent) return; // top-level line: default newline is already correct

      e.preventDefault();
      if (line.trim() === '') {
        const newIndent = indent.slice(0, Math.max(0, indent.length - 2));
        setValue(v.slice(0, lineStart) + newIndent + v.slice(lineEnd));
        const pos = lineStart + newIndent.length;
        requestAnimationFrame(() => el.setSelectionRange(pos, pos));
      } else {
        setValue(v.slice(0, s) + '\n' + indent + v.slice(s));
        const pos = s + 1 + indent.length;
        requestAnimationFrame(() => el.setSelectionRange(pos, pos));
      }
      return;
    }

    if (e.key === 'Backspace' && s === en) {
      const indent = indentOf(v.slice(lineStart));
      if (indent.length > 0 && s === lineStart + indent.length) {
        e.preventDefault();
        const remove = Math.min(2, indent.length);
        setValue(v.slice(0, lineStart) + v.slice(lineStart + remove));
        const pos = s - remove;
        requestAnimationFrame(() => el.setSelectionRange(pos, pos));
      }
    }
  };

  const FormatToolbar = () => (
    <div className="format-toolbar">
      <button type="button" title="Bold selected text" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('**')}>
        <strong>B</strong>
      </button>
      <button type="button" title="Italicize selected text" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('*')}>
        <em>I</em>
      </button>
      <button
        type="button"
        title="Toggle numbered list (1, 2, 3…) vs. bulleted, for the focused list field"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => activeToggleRef.current && activeToggleRef.current()}
      >
        1.
      </button>
      <span className="format-hint">Select text in Summary or a bullet field for B/I. In a bullet field: Tab/Shift+Tab indents/outdents a sub-bullet, Enter continues the list. Click "1." to switch the focused list between bulleted and numbered.</span>
    </div>
  );

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
        <FormatToolbar />
        <h2>Personal</h2>
        <input placeholder="Name" value={p.name} onChange={(e) => setPersonal('name', e.target.value)} />
        <input placeholder="Title" value={p.title} onChange={(e) => setPersonal('title', e.target.value)} />
        <input placeholder="Email" value={p.email} onChange={(e) => setPersonal('email', e.target.value)} />
        <input placeholder="Phone" value={p.phone} onChange={(e) => setPersonal('phone', e.target.value)} />
        <input placeholder="Location" value={p.location} onChange={(e) => setPersonal('location', e.target.value)} />
        <input placeholder="Website" value={p.website} onChange={(e) => setPersonal('website', e.target.value)} />
        <textarea
          placeholder="Summary"
          value={p.summary}
          onFocus={registerFormattable((v) => setPersonal('summary', v))}
          onChange={(e) => setPersonal('summary', e.target.value)}
        />
      </div>
    );
  }

  const section = resume.sections.find((s) => s.id === activeSection);
  if (!section) return <div className="editor"><p>Section not found.</p></div>;

  return (
    <div className="editor">
      <FormatToolbar />
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
          placeholder="One bullet per line (Tab/Shift+Tab to indent a sub-bullet)"
          value={section.items.join('\n')}
          onFocus={registerFormattable(
            (v) => setItems(section.id, v.split('\n')),
            () => toggleSectionBulletStyle(section.id)
          )}
          onChange={(e) => setItems(section.id, e.target.value.split('\n'))}
          onKeyDown={handleBulletKeyDown((v) => setItems(section.id, v.split('\n')))}
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
            placeholder="One bullet per line (Tab/Shift+Tab to indent a sub-bullet)"
            value={x.bullets.join('\n')}
            onFocus={registerFormattable((v) => setBullets(section.id, x.id, v), () => toggleBulletStyle(section.id, x.id))}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
            onKeyDown={handleBulletKeyDown((v) => setBullets(section.id, x.id, v))}
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
            placeholder="One bullet per line (optional; Tab/Shift+Tab to indent a sub-bullet)"
            value={(x.bullets || []).join('\n')}
            onFocus={registerFormattable((v) => setBullets(section.id, x.id, v), () => toggleBulletStyle(section.id, x.id))}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
            onKeyDown={handleBulletKeyDown((v) => setBullets(section.id, x.id, v))}
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
            placeholder="One bullet per line (Tab/Shift+Tab to indent a sub-bullet)"
            value={x.bullets.join('\n')}
            onFocus={registerFormattable((v) => setBullets(section.id, x.id, v), () => toggleBulletStyle(section.id, x.id))}
            onChange={(e) => setBullets(section.id, x.id, e.target.value)}
            onKeyDown={handleBulletKeyDown((v) => setBullets(section.id, x.id, v))}
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
