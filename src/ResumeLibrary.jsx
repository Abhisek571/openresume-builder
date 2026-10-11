import { useState } from 'react';
import Icon from './Icon';
import Preview from './Preview';

export default function ResumeLibrary({ profiles, activeProfileId, resumeForProfile, template, onOpen, onCreate, onImport, onBackup }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const visible = profiles.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).toSorted((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : new Date(b.updatedAt) - new Date(a.updatedAt));
  return <section className="resume-library">
    <div className="library-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>My résumés</h1><p>A little preparation. A world of possibilities.</p></div><div className="library-actions"><button onClick={onImport}>Import résumé</button><button className="primary-action" onClick={onCreate}><Icon name="plus" />New résumé</button></div></div>
    <div className="library-filters"><label className="library-search"><Icon name="search" /><input aria-label="Search résumés" placeholder="Search résumés…" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Sort by <select aria-label="Sort résumés" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently edited</option><option value="name">Name</option></select></label><span>{visible.length} {visible.length === 1 ? 'résumé' : 'résumés'}</span></div>
    <div className="library-grid">{visible.map(profile => <button className="resume-library-card" key={profile.id} onClick={() => onOpen(profile.id)}>
      <div className="library-document"><div className="library-thumb-inner" aria-hidden="true" inert=""><Preview resume={resumeForProfile(profile.id)} template={template} /></div></div>
      <div className="library-card-caption"><strong>{profile.name}</strong>{profile.id === activeProfileId && <span className="local-badge">Current</span>}<small>Edited {new Date(profile.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
    </button>)}<button className="new-resume-card" onClick={onCreate}><Icon name="plus" size={30} /><strong>Create a new résumé</strong><span>Start with a clean page</span></button></div>
    {!visible.length && query && <p role="status">No résumés match “{query}”. Try another name.</p>}
    <aside className="library-backup"><Icon name="lock" size={22} /><div><strong>Your work stays with you.</strong><p>Saved in this browser, on this device. Back up your résumés, settings and saved snapshots to keep a portable copy.</p></div><button onClick={onBackup}>Back up all profiles</button></aside>
  </section>;
}
