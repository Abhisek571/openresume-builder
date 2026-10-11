import ViewportPopover from './ViewportPopover.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { emptyResume, normalizeResume } from './data.js';
import useHistory from './useHistory.js';
import SectionNav from './SectionNav.jsx';
import Icon from './Icon';
import PreviewPanel from './PreviewPanel';
import ResumeLibrary from './ResumeLibrary';
import Editor from './Editor.jsx';
import PaginatedPreview from './PaginatedPreview.jsx';
import TemplateGallery from './TemplateGallery.jsx';
import { appShortcut, APP_SHORTCUTS } from './shortcuts.js';
import JobMatchPanel from './JobMatchPanel.jsx';
import { exportJsonResume, importJsonResume } from './jsonResume.js';
import { createBackup, validateBackup, restoreBackup, RESCUE_KEY } from './browser/backup.js';
import { serializeText } from './textExport.js';
import { exportFilename } from './exportModel.js';
import { version as appVersion } from '../package.json';
import { downloadBlob, downloadResumeJson, downloadText } from './browser/downloads.js';
import { RESUME_FILE_ACCEPT, readResumeFile, readJsonDocumentFile } from './browser/resumeFiles.js';
import { printResume } from './browser/printing.js';
import { applyThemeSetting } from './browser/systemTheme.js';
import { formatVersion } from './version.js';
import { readThemeSetting, writeThemeSetting, THEME_SETTINGS } from './theme.js';
import {
  bootstrap,
  newProfileId,
  makeProfileMeta,
  uniqueName,
  copyName,
  findProfile,
  addProfileMeta,
  renameProfileMeta,
  removeProfileMeta,
  touchProfileMeta,
  setActiveProfile,
  writeIndex,
  readIndex,
  readBody,
  writeBody,
  readSnapshots,
  writeSnapshots,
  profileBodyKey,
  profileSnapshotsKey,
} from './profiles.js';

const SNAPSHOT_LIMIT = 20;

// Runs migration and loads the active profile once, on first render.
const boot = bootstrap(localStorage);

function bodyToResume(body) {
  return body ? normalizeResume(body) : JSON.parse(JSON.stringify(emptyResume));
}

export default function App() {
  const { value: resume, set: setResume, reset: resetHistory, undo, redo, canUndo, canRedo } =
    useHistory(() => bodyToResume(boot.body));
  const [template, setTemplate] = useState('resumatic');
  const [themeSetting, setThemeSetting] = useState(() => readThemeSetting(localStorage));
  const [status, setStatus] = useState('');
  const [activeSection, setActiveSection] = useState('personal');
  const [activeTab, setActiveTab] = useState('details');
  const [saveState, setSaveState] = useState('saved');
  const [profileIndex, setProfileIndex] = useState(boot.index);
  const [activeId, setActiveId] = useState(boot.activeId);
  const [snapshots, setSnapshots] = useState(() => readSnapshots(localStorage, boot.activeId));
  const [showSettings, setShowSettings] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const isFirstRender = useRef(true);
  const fileInputRef = useRef(null);
  const portableInputRef = useRef(null);
  const backupInputRef = useRef(null);
  const helpRef = useRef(null);
  const [mode, setMode] = useState('content');
  const [showLibrary, setShowLibrary] = useState(false);
  const openLibrary = () => setShowLibrary(true);
  // Set right before a profile switch so the autosave effect (which fires
  // because both `resume` and `activeId` change) doesn't count the load as an
  // edit and bump the just-loaded profile's updatedAt.
  const skipNextSave = useRef(false);
  const resumeRef = useRef(resume);
  resumeRef.current = resume;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeProfile = findProfile(profileIndex, activeId);

  // Autosave (debounced) — writes the active profile's body and bumps its
  // updatedAt, then shows "All changes saved" so the user can see their work
  // is persisted without an explicit Save button.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!activeId) return;
    setSaveState('saving');
    const t = setTimeout(() => {
      writeBody(localStorage, activeId, resume);
      setProfileIndex((idx) => {
        const next = touchProfileMeta(idx, activeId);
        writeIndex(localStorage, next);
        return next;
      });
      setSaveState('saved');
    }, 400);
    return () => clearTimeout(t);
  }, [resume, activeId]);

  // Flush any pending edit to storage immediately (before switch/duplicate/
  // delete) so the 400ms autosave debounce can't drop the last keystrokes.
  const flushActiveBody = () => {
    if (activeIdRef.current) writeBody(localStorage, activeIdRef.current, resumeRef.current);
  };

  const importResume = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = await readResumeFile(file);
      if (showLibrary) {
        flushActiveBody();
        const name = uniqueName(profileIndex.profiles.map(p => p.name), imported.personal.name || 'Imported resume');
        const meta = makeProfileMeta(name, newProfileId());
        const next = addProfileMeta(profileIndex, meta);
        localStorage.setItem(profileBodyKey(meta.id), JSON.stringify(imported));
        localStorage.setItem('resume-builder:profiles', JSON.stringify(next));
        setProfileIndex(next);
        activateProfile(meta.id, []);
        setStatus(`Imported as new profile "${name}".`);
      } else {
        setResume(imported);
        setActiveSection('personal');
        setStatus('Imported resume JSON.');
      }
    } catch (error) {
      setStatus(`Import failed: ${error.message}`);
    }
  };

  const exportJSON = () => {
    setShowExport(false);
    try {
      downloadResumeJson(resumeRef.current, exportFilename(resumeRef.current, 'json'));
      setStatus('Downloaded resume JSON.');
    } catch (error) {
      setStatus(`JSON export failed: ${error.message}`);
    }
  };

  // Apply and follow the browser/OS theme. The resume's paper tokens remain
  // independent, so app appearance never changes printed output.
  useEffect(() => {
    return applyThemeSetting(themeSetting);
  }, [themeSetting]);

  const changeTheme = (setting) => setThemeSetting(writeThemeSetting(localStorage, setting));



  // Undo/redo can remove the section the editor pane is showing; fall back
  // to Personal instead of leaving a dead "Section not found" pane.
  useEffect(() => {
    if (activeSection !== 'personal' && !resume.sections.some((s) => s.id === activeSection)) {
      setActiveSection('personal');
    }
  }, [resume, activeSection]);

  const exportPDF = () => {
    setShowExport(false);
    try {
      printResume();
      setStatus('Print dialog opened. Choose Save as PDF to export.');
    } catch (error) {
      setStatus(`Printing failed: ${error.message}`);
    }
  };

  const exportDOCX = async () => {
    setShowExport(false);
    try {
      // Loaded on demand so the docx library stays out of the main bundle.
      const { docxBlob } = await import('./docxExport.js');
      const blob = await docxBlob(resumeRef.current);
      downloadBlob(blob, exportFilename(resumeRef.current, 'docx'));
      setStatus('Downloaded DOCX.');
    } catch (err) {
      setStatus(`DOCX export failed: ${err.message}`);
    }
  };

  const exportTXT = () => {
    setShowExport(false);
    try {
      downloadText(serializeText(resumeRef.current), exportFilename(resumeRef.current, 'txt'));
      setStatus('Downloaded plain text.');
    } catch (error) {
      setStatus(`Text export failed: ${error.message}`);
    }
  };



  const persistSnapshots = (next) => {
    setSnapshots(next);
    if (activeId) writeSnapshots(localStorage, activeId, next);
  };

  const makeSnapshot = () => {
    const snap = { id: Date.now(), name: '', label: new Date().toLocaleString(), data: resume };
    persistSnapshots([snap, ...snapshots].slice(0, SNAPSHOT_LIMIT));
    setStatus('Snapshot saved.');
  };

  const renameSnapshot = (id, name) =>
    persistSnapshots(snapshots.map((s) => (s.id === id ? { ...s, name } : s)));

  const restoreSnapshot = (snap) => {
    const ok = window.confirm(
      `Restore snapshot "${snap.name || snap.label}" (${snap.label})?\n\nThis replaces everything currently in the editor. Changes made since this snapshot was taken will be lost unless you've snapshotted them too.`
    );
    if (!ok) return;
    setResume(normalizeResume(snap.data));
    setActiveSection('personal');
    setShowSnapshots(false);
    setStatus('Snapshot restored.');
  };

  const deleteSnapshot = (id) => {
    const ok = window.confirm('Delete this snapshot? This cannot be undone.');
    if (!ok) return;
    persistSnapshots(snapshots.filter((s) => s.id !== id));
  };

  // ---- Profiles -------------------------------------------------------------
  // Load a profile into the editor: point state at it and start a fresh undo
  // session (switching profiles must not let Ctrl+Z rewind into another
  // document). `skipNextSave` stops the resulting render from being counted as
  // an edit against the freshly-loaded profile.
  const activateProfile = (id, snaps) => {
    skipNextSave.current = true;
    setActiveId(id);
    resetHistory(bodyToResume(readBody(localStorage, id)));
    setSnapshots(snaps ?? readSnapshots(localStorage, id));
    setActiveSection('personal');
    setMode('content');
    setActiveTab('details');
    setShowLibrary(false);
  };

  const switchProfile = (id) => {
    setShowProfiles(false);
    if (id === activeId) return;
    flushActiveBody();
    const next = setActiveProfile(profileIndex, id);
    setProfileIndex(next);
    writeIndex(localStorage, next);
    activateProfile(id);
    setStatus(`Switched to "${findProfile(next, id).name}".`);
  };

  const newProfile = () => {
    setShowProfiles(false);
    flushActiveBody();
    const name = uniqueName(profileIndex.profiles.map((p) => p.name), 'Untitled resume');
    const meta = makeProfileMeta(name, newProfileId());
    const blank = JSON.parse(JSON.stringify(emptyResume));
    writeBody(localStorage, meta.id, blank);
    writeSnapshots(localStorage, meta.id, []);
    const next = addProfileMeta(profileIndex, meta);
    setProfileIndex(next);
    writeIndex(localStorage, next);
    activateProfile(meta.id, []);
    setStatus(`Created "${name}".`);
  };

  const duplicateProfile = () => {
    setShowProfiles(false);
    flushActiveBody();
    const source = findProfile(profileIndex, activeId);
    const name = copyName(profileIndex.profiles.map((p) => p.name), source ? source.name : 'Resume');
    const meta = makeProfileMeta(name, newProfileId());
    const body = JSON.parse(JSON.stringify(resumeRef.current));
    writeBody(localStorage, meta.id, body);
    writeSnapshots(localStorage, meta.id, []);
    const next = addProfileMeta(profileIndex, meta);
    setProfileIndex(next);
    writeIndex(localStorage, next);
    activateProfile(meta.id, []);
    setStatus(`Duplicated to "${name}".`);
  };

  const renameActiveProfile = () => {
    setShowProfiles(false);
    const current = findProfile(profileIndex, activeId);
    if (!current) return;
    const input = window.prompt('Rename this profile:', current.name);
    if (input == null) return;
    const trimmed = input.trim();
    if (!trimmed || trimmed === current.name) return;
    const others = profileIndex.profiles.filter((p) => p.id !== activeId).map((p) => p.name);
    const next = renameProfileMeta(profileIndex, activeId, uniqueName(others, trimmed));
    setProfileIndex(next);
    writeIndex(localStorage, next);
    setStatus('Profile renamed.');
  };

  const deleteActiveProfile = () => {
    if (profileIndex.profiles.length <= 1) {
      window.alert("You can't delete your only profile. Create another first.");
      return;
    }
    const target = findProfile(profileIndex, activeId);
    const ok = window.confirm(
      `Delete profile "${target.name}"?\n\nA final snapshot of it is saved under the profile you land on, as insurance. This can't be undone.`
    );
    if (!ok) return;
    flushActiveBody();
    const body = bodyToResume(readBody(localStorage, activeId));
    const next = removeProfileMeta(profileIndex, activeId);
    const landingId = next.activeProfileId;
    localStorage.removeItem(profileBodyKey(activeId));
    localStorage.removeItem(profileSnapshotsKey(activeId));
    setProfileIndex(next);
    writeIndex(localStorage, next);
    // Free insurance: drop the deleted resume's content as a snapshot under the
    // profile we land on, so a mis-click is recoverable via Snapshot Restore.
    const finalSnap = {
      id: Date.now(),
      name: `Deleted: ${target.name}`,
      label: new Date().toLocaleString(),
      data: body,
    };
    const landingSnaps = [finalSnap, ...readSnapshots(localStorage, landingId)].slice(0, SNAPSHOT_LIMIT);
    writeSnapshots(localStorage, landingId, landingSnaps);
    activateProfile(landingId, landingSnaps);
    setShowProfiles(false);
    setStatus(`Deleted "${target.name}".`);
  };

  const resetResume = () => {
    const ok = window.confirm('Reset to a blank resume? This replaces everything currently in the editor.');
    if (!ok) return;
    setResume(JSON.parse(JSON.stringify(emptyResume)));
    setActiveSection('personal');
    setShowSettings(false);
    setStatus('Resume reset.');
  };

  const clearSnapshots = () => {
    const ok = window.confirm('Delete all snapshots? This cannot be undone.');
    if (!ok) return;
    persistSnapshots([]);
    setShowSettings(false);
  };

  const exportPortable = () => {
    setShowExport(false);
    try {
      downloadResumeJson(exportJsonResume(resumeRef.current), exportFilename(resumeRef.current, 'json').replace(/\.json$/, '-jsonresume.json'));
      setStatus('Downloaded JSON Resume 1.0. Custom sections use metadata; use Back up for exact recovery.');
    } catch (error) { setStatus(`Export failed: ${error.message}`); }
  };

  const importPortable = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { resume: imported, notices } = importJsonResume(await readJsonDocumentFile(file));
      const currentIndex = readIndex(localStorage) || profileIndex;
      const name = uniqueName(currentIndex.profiles.map((p) => p.name), imported.personal.name || file.name.replace(/\.json$/i, '') || 'Imported resume');
      flushActiveBody();
      const meta = makeProfileMeta(name, newProfileId());
      const next = addProfileMeta(currentIndex, meta);
      // Write the body before the index so a quota failure never activates an empty profile.
      localStorage.setItem(profileBodyKey(meta.id), JSON.stringify(imported));
      localStorage.setItem('resume-builder:profiles', JSON.stringify(next));
      setProfileIndex(next);
      activateProfile(meta.id, []);
      setActiveTab('details');
      setStatus(`Imported as new profile "${name}". ${notices.length ? `${notices.length} unsupported fields preserved in custom sections—review before exporting.` : 'Review the mapped fields before exporting.'}`);
    } catch (error) { setStatus(`JSON Resume import failed: ${error.message}`); }
  };

  const exportBackup = () => {
    try {
      flushActiveBody();
      downloadResumeJson(createBackup(localStorage), 'openresume-backup.json');
      setStatus('Downloaded all profiles, snapshots and saved settings. Keep this file somewhere safe.');
    } catch (error) { setStatus(`Backup failed: ${error.message}`); }
  };

  const downloadRescue = () => {
    try {
      const rescue = localStorage.getItem(RESCUE_KEY);
      if (!rescue) throw new Error('No restore rescue copy is available yet.');
      downloadResumeJson(JSON.parse(rescue), 'openresume-rescue.json');
      setStatus('Downloaded last restore rescue copy.');
    } catch (error) { setStatus(error.message); }
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const backup = await readJsonDocumentFile(file, 50);
      const summary = validateBackup(backup);
      if (!window.confirm(`Replace all profiles and saved settings with ${summary.profiles} profiles and ${summary.snapshots} snapshots? A rescue copy of the current data will be saved first.`)) return;
      flushActiveBody();
      restoreBackup(localStorage, backup, (rescue) => downloadResumeJson(rescue, 'openresume-rescue.json'));
      // Replace React state in this turn so pending autosave effects are cleaned up.
      const restored = bootstrap(localStorage);
      setProfileIndex(restored.index);
      activateProfile(restored.activeId, readSnapshots(localStorage, restored.activeId));
      setThemeSetting(readThemeSetting(localStorage));
      setShowSettings(false);
      setStatus(`Restored ${summary.profiles} profiles and ${summary.snapshots} snapshots. Rescue copy retained.`);
    } catch (error) { setStatus(`Restore failed: ${error.message}`); }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (helpRef.current?.open) return;
      const editing = event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
      const action = appShortcut(event, editing);
      if (!action) return;
      event.preventDefault();
      const commands = {
        undo, redo, snapshot: makeSnapshot, open: () => fileInputRef.current?.click(), print: exportPDF,
        help: () => helpRef.current?.showModal(),
        save: () => { flushActiveBody(); setStatus('Saved active profile.'); },
      };
      try { commands[action](); }
      catch (error) { setStatus(`Command failed: ${error.message}`); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className={`app quiet-workspace ${showLibrary ? 'library-view' : ''}`}>
      <input
        ref={fileInputRef}
        className="resume-file-input"
        type="file"
        accept={RESUME_FILE_ACCEPT}
        onChange={importResume}
        aria-label="Native resume file"
      />
      <input ref={portableInputRef} className="resume-file-input" type="file" accept={RESUME_FILE_ACCEPT} onChange={importPortable} aria-label="JSON Resume file" />
      <input ref={backupInputRef} className="resume-file-input" type="file" accept={RESUME_FILE_ACCEPT} onChange={importBackup} aria-label="Backup file" />
      <header className="toolbar">
        <div className="toolbar-row toolbar-row-actions">
          <div className="document-context"><small>My résumés / {showLibrary ? "Workspace" : "Editing"}</small><strong>{showLibrary ? "Your workspace" : activeProfile?.name}</strong></div>
          <div className="toolbar-group">
            <button className="icon-btn" title="Settings" onClick={() => { setShowSettings((v) => !v); setShowSnapshots(false); }}>
              <Icon name="settings" />
            </button>
            {showSettings && (
              <div className="popover settings-popover">
                <div className="popover-header">
                  <strong>Settings</strong>
                  <button className="popover-close" onClick={() => setShowSettings(false)}>×</button>
                </div>
                <p className="popover-hint">Changes autosave automatically to this device.</p>
                <p className="popover-hint">Appearance</p>
                <div className="theme-toggle" role="group" aria-label="Appearance">
                  {THEME_SETTINGS.map((t) => (
                    <button
                      key={t}
                      className={themeSetting === t ? 'active' : ''}
                      aria-pressed={themeSetting === t}
                      onClick={() => changeTheme(t)}
                    >
                      {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                    </button>
                  ))}
                </div>
                <p className="popover-hint">OpenResume Builder v{formatVersion(appVersion)}</p>
                <button className="popover-action" onClick={exportBackup}>Back up all profiles</button>
                <button className="popover-action" onClick={() => backupInputRef.current?.click()}>Restore backup…</button>
                <button className="popover-action" onClick={downloadRescue}>Download last rescue copy</button>
                <button className="popover-action" onClick={() => helpRef.current?.showModal()}>Keyboard shortcuts</button>
                <button className="popover-action danger" onClick={resetResume}>Reset resume to blank</button>
              </div>
            )}
          </div>

          <div className="toolbar-group">
            <button
              className="profile-switch-btn"
              title="Switch resume profile"
              onClick={() => { setShowProfiles((v) => !v); setShowSettings(false); setShowSnapshots(false); setShowExport(false); }}
            >
              <Icon name="document" size={16} /> {activeProfile ? activeProfile.name : 'Resume'} ▾
            </button>
            {showProfiles && (
              <div className="popover profiles-popover">
                <div className="popover-header">
                  <strong>Resume profiles</strong>
                  <button className="popover-close" onClick={() => setShowProfiles(false)}>×</button>
                </div>
                <ul className="profile-list">
                  {profileIndex.profiles.map((p) => (
                    <li key={p.id}>
                      <button
                        className={`profile-item${p.id === activeId ? ' active' : ''}`}
                        onClick={() => switchProfile(p.id)}
                      >
                        <span className="profile-item-name">{p.name}</span>
                        <span className="profile-item-meta">
                          {p.id === activeId ? 'current · ' : ''}updated {new Date(p.updatedAt).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="profile-actions">
                  <button className="popover-action" onClick={newProfile}>New</button>
                  <button className="popover-action" onClick={duplicateProfile}>Duplicate</button>
                  <button className="popover-action" onClick={renameActiveProfile}>Rename</button>
                  <button
                    className="popover-action danger"
                    disabled={profileIndex.profiles.length <= 1}
                    onClick={deleteActiveProfile}
                  >
                    Delete
                  </button>
                </div>
                <p className="popover-hint">Duplicate to tailor a copy for a specific job.</p>
              </div>
            )}
          </div>

          <div className="toolbar-left">
            <span className={`save-status ${saveState}`}>
              {saveState === 'saving' ? 'Saving…' : 'Saved on this device'}
            </span>
          </div>

          <div className="toolbar-group">
            <button onClick={() => { setShowSnapshots((v) => !v); setShowSettings(false); }}>
              <Icon name="history" size={16} /> History ({snapshots.length})
            </button>
            {showSnapshots && (
              <ViewportPopover className="popover snapshots-popover">
                <div className="popover-header">
                  <strong>History — saved snapshots</strong>
                  <button className="popover-close" onClick={() => setShowSnapshots(false)}>×</button>
                </div>
                <button className="popover-action danger" disabled={snapshots.length === 0} onClick={clearSnapshots}>
                  Clear All Snapshots
                </button>
                {snapshots.length === 0 ? (
                  <p className="popover-hint">No snapshots yet — take one before making risky changes.</p>
                ) : (
                  <table className="snapshot-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Date &amp; Time</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s, i) => (
                        <tr key={s.id}>
                          <td>{i + 1}</td>
                          <td>
                            <input
                              className="snapshot-name-input"
                              placeholder="Untitled"
                              value={s.name || ''}
                              onChange={(e) => renameSnapshot(s.id, e.target.value)}
                            />
                          </td>
                          <td>{s.label}</td>
                          <td>
                            <div className="snapshot-actions">
                              <button onClick={() => restoreSnapshot(s)}>Restore</button>
                              <button className="danger" onClick={() => deleteSnapshot(s.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ViewportPopover>
            )}
          </div>
          <div className="tabs-group">


            <div className="toolbar-group">
              <button onClick={() => { setShowExport((v) => !v); setShowSettings(false); setShowSnapshots(false); }}>
                Export ▾
              </button>
              {showExport && (
                <div className="popover export-popover">
                  <div className="popover-header">
                    <strong>Export resume</strong>
                    <button className="popover-close" onClick={() => setShowExport(false)}>×</button>
                  </div>
                  <button className="popover-action" onClick={exportJSON}>JSON (.json)</button>
                  <button className="popover-action" onClick={exportPortable}>JSON Resume 1.0 (.json)</button>
                  <button className="popover-action" onClick={exportPDF}>Print / PDF</button>
                  <button className="popover-action" onClick={exportDOCX}>Word (.docx)</button>
                  <button className="popover-action" onClick={exportTXT}>Plain text (.txt)</button>
                  <p className="popover-hint">Plain text is the most ATS-safe format.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <details className="document-actions"><summary>Document actions</summary><div className="toolbar-row">
          <div className="toolbar-group">
            <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>↶</button>
            <button className="icon-btn" title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>↷</button>
            <button onClick={makeSnapshot}>Save snapshot</button>
            <button onClick={() => fileInputRef.current?.click()}>Import JSON</button>
            <button onClick={() => portableInputRef.current?.click()}>Import JSON Resume</button>

          </div>


          <div className="spacer" />


        </div></details>
        <span className="status" role="status">{status}</span>
      </header>

      <dialog ref={helpRef} className="shortcuts-dialog" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <dl>{APP_SHORTCUTS.map((shortcut) => <React.Fragment key={shortcut.label}><dt><kbd>{shortcut.label}</kbd></dt><dd>{shortcut.description}</dd></React.Fragment>)}</dl>
        <p>Ctrl/Cmd+B and Ctrl/Cmd+I format supported editor fields. Escape closes this dialog. Browser-reserved shortcuts may vary.</p>
        <button onClick={() => helpRef.current?.close()}>Close shortcuts</button>
      </dialog>
      <main className={`workspace quiet-main ${showLibrary ? 'library-main' : ''}`}>
        <aside className="workspace-sidebar" aria-label="Workspace navigation">
          <button className="brand" onClick={openLibrary} aria-label="OpenResume home"><Icon name="document" size={25} /><span>OpenResume</span></button>
          <p className="eyebrow">WORKSPACE</p>
          <button className={`workspace-home ${showLibrary ? 'active' : ''}`} onClick={openLibrary}><Icon name="grid" />My résumés</button>
          <div className="sidebar-document"><Icon name="document" /><span>{activeProfile?.name || 'My Resume'}<small>{resume.personal.title || 'Your next chapter'}</small></span></div>
          {!showLibrary && <><p className="eyebrow">RÉSUMÉ SECTIONS</p><SectionNav resume={resume} setResume={setResume} activeSection={mode === 'content' ? activeSection : null} setActiveSection={(id) => { setActiveSection(id); setMode('content'); setActiveTab('details'); }} /></>}
          <div className="sidebar-footer"><Icon name="lock" size={15} /><span>Private by design<small>Your work stays in this browser</small></span></div>
        </aside>
        {showLibrary ? <ResumeLibrary profiles={profileIndex.profiles} activeProfileId={activeId} resumeForProfile={(id) => id === activeId ? resume : bodyToResume(readBody(localStorage, id))} template={template} onOpen={(id) => { switchProfile(id); setShowLibrary(false); setMode('content'); setActiveTab('details'); }} onCreate={newProfile} onImport={() => fileInputRef.current?.click()} onBackup={exportBackup} /> :
          <div className={`workspace-document ${activeTab === 'preview' ? 'preview-expanded' : ''}`}>
            <div className="workspace-modebar"><nav className="mode-tabs" aria-label="Editor mode">{[['content', 'Content', 'edit'], ['design', 'Design', 'design'], ['match', 'Job Match', 'search']].map(([id, label, icon]) => <button key={id} className={mode === id ? 'active' : ''} aria-pressed={mode === id} onClick={() => { setMode(id); setActiveTab('details'); }}><Icon name={icon} size={16} />{label}</button>)}</nav><span className="modebar-note">{mode === 'match' ? 'Local analysis' : 'Make it yours.'}</span></div>
            <div className="workspace-columns">
              <section className="workspace-edit" hidden={activeTab === 'preview'}>
                {mode === 'content' && <><header className="mode-heading content-heading"><p className="eyebrow">TELL YOUR STORY</p><h1>{activeSection === 'personal' ? 'Personal details' : resume.sections.find(section => section.id === activeSection)?.title}</h1><p>{activeSection === 'personal' ? 'Make a clear first impression.' : 'Show what you did, and the difference it made.'}</p></header><Editor resume={resume} setResume={setResume} activeSection={activeSection} /></>}
                {mode === 'design' && <><header className="mode-heading"><p className="eyebrow">A THOUGHTFUL FIRST IMPRESSION</p><h1>Design</h1><p>A clean layout. Your experience at its best.</p></header><section className="design-settings"><h2>Choose a template</h2><p>Same content, a different point of view.</p><TemplateGallery resume={resume} template={template} setTemplate={setTemplate} /><div className="design-note"><Icon name="document" /><div><h3>Ready for the page</h3><p>Each template has its own typography and layout. Your preview uses the same template as your PDF export.</p></div></div></section></>}
                <div hidden={mode !== 'match'}><JobMatchPanel resume={resume} onNavigate={(id) => { setActiveSection(id); setMode('content'); }} /></div>
              </section>
              <PreviewPanel resume={resume} template={template} expanded={activeTab === 'preview'} onToggleExpanded={() => setActiveTab(tab => tab === 'preview' ? 'details' : 'preview')} />
            </div>
          </div>}
      </main>
      <section className="print-resume" aria-hidden="true">
        <PaginatedPreview resume={resume} template={template} />
      </section>
    </div>
  );
}
