import { useMemo, useState } from 'react';
import { matchJob } from './jobMatch.js';
import Icon from './Icon';

export default function JobMatchPanel({ resume, onNavigate }) {
  const [description, setDescription] = useState('');
  const [custom, setCustom] = useState('');
  const [selected, setSelected] = useState(null);
  const [updated, setUpdated] = useState(false);
  const result = useMemo(() => matchJob(resume, description, custom.split(',')), [resume, description, custom]);
  const found = result.terms.filter(term => term.evidence.length);
  const evidence = result.terms.find(term => term.term === selected) || found[0];
  return <section className="job-match" aria-label="Local job match">
    <header className="mode-heading"><div><p className="eyebrow">A MORE FOCUSED APPLICATION</p><h1>Job Match</h1><p>Compare your résumé with a job description.</p></div><span className="local-badge"><Icon name="lock" size={14} />Local analysis</span></header>
    <p className="match-disclaimer">A keyword comparison, not an ATS score or a prediction of interview chances. Matches use exact words, phrases and a small set of known aliases—not semantic similarity.</p>
    <div className="match-input-card"><div className="match-card-heading"><h2>Job description</h2><button onClick={() => { setDescription(''); setCustom(''); setSelected(null); setUpdated(false); }}>Clear</button></div>
      <label className="sr-only" htmlFor="job-description">Job description</label><textarea id="job-description" value={description} onChange={e => { setDescription(e.target.value); setUpdated(false); }} placeholder="Paste the job description here…" />
      <label className="match-custom">Additional keywords (comma-separated)<input value={custom} onChange={e => { setCustom(e.target.value); setUpdated(false); }} placeholder="e.g. user research, Figma" /></label>
      <div className="match-input-footer"><span><Icon name="lock" size={14} />Job text stays in this browser</span><button className="primary-action" onClick={() => { setSelected(found[0]?.term || null); setUpdated(true); }}>Update comparison</button></div>
    </div>
    <div className="match-summary" aria-live="polite"><strong>{result.terms.length ? `${found.length} of ${result.terms.length} recognized keywords found` : 'Ready when you are'}</strong><p>{result.terms.length ? 'Review the evidence below. Only add skills and experience you genuinely have.' : 'Paste a job description to begin. Add custom phrases for terms outside the built-in vocabulary.'}</p>{updated && <small>Comparison updated. Résumé edits also update results automatically.</small>}</div>
    <div className="match-keywords"><h2>Found in your résumé</h2><div className="keyword-chips">{found.map(({ term }) => <button key={term} aria-pressed={evidence?.term === term} className={evidence?.term === term ? 'selected' : ''} onClick={() => setSelected(term)}>{term}</button>)}</div>{!found.length && <p>No recognized matches yet.</p>}<h2>Not found yet</h2><div className="keyword-chips missing">{result.missing.map(term => <span key={term}>{term}</span>)}</div>{result.terms.length > 0 && !result.missing.length && <p>All recognized terms have evidence.</p>}</div>
    {evidence && <section className="match-evidence" aria-label="Selected keyword evidence"><p className="eyebrow">EVIDENCE IN YOUR RÉSUMÉ</p><h2>{evidence.term}</h2>{evidence.evidence.map((item, i) => <div className="evidence-item" key={`${item.sectionId}-${i}`}><span>{item.section}</span><blockquote>{item.text}</blockquote><button onClick={() => onNavigate(item.sectionId)}>Edit {item.section === 'Summary' ? 'Personal' : item.section}<Icon name="edit" size={14} /></button></div>)}</section>}
  </section>;
}
