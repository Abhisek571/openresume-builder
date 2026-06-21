import React from 'react';

export default function Editor({ resume, setResume }) {
  const setPersonal = (field, value) =>
    setResume({ ...resume, personal: { ...resume.personal, [field]: value } });

  const setExp = (id, field, value) =>
    setResume({
      ...resume,
      experience: resume.experience.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });

  const setBullets = (id, text) =>
    setExp(id, 'bullets', text.split('\n').filter(Boolean));

  const addExp = () =>
    setResume({
      ...resume,
      experience: [
        ...resume.experience,
        { id: Date.now(), role: '', company: '', start: '', end: '', bullets: [] },
      ],
    });

  const removeExp = (id) =>
    setResume({ ...resume, experience: resume.experience.filter((e) => e.id !== id) });

  const setEdu = (id, field, value) =>
    setResume({
      ...resume,
      education: resume.education.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });

  const addEdu = () =>
    setResume({
      ...resume,
      education: [
        ...resume.education,
        { id: Date.now(), degree: '', school: '', start: '', end: '' },
      ],
    });

  const removeEdu = (id) =>
    setResume({ ...resume, education: resume.education.filter((e) => e.id !== id) });

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

      <h2>Experience <button onClick={addExp}>+ Add</button></h2>
      {resume.experience.map((x) => (
        <div className="card" key={x.id}>
          <input placeholder="Role" value={x.role} onChange={(e) => setExp(x.id, 'role', e.target.value)} />
          <input placeholder="Company" value={x.company} onChange={(e) => setExp(x.id, 'company', e.target.value)} />
          <div className="row">
            <input placeholder="Start" value={x.start} onChange={(e) => setExp(x.id, 'start', e.target.value)} />
            <input placeholder="End" value={x.end} onChange={(e) => setExp(x.id, 'end', e.target.value)} />
          </div>
          <textarea
            placeholder="One bullet per line"
            value={x.bullets.join('\n')}
            onChange={(e) => setBullets(x.id, e.target.value)}
          />
          <button className="danger" onClick={() => removeExp(x.id)}>Remove</button>
        </div>
      ))}

      <h2>Education <button onClick={addEdu}>+ Add</button></h2>
      {resume.education.map((x) => (
        <div className="card" key={x.id}>
          <input placeholder="Degree" value={x.degree} onChange={(e) => setEdu(x.id, 'degree', e.target.value)} />
          <input placeholder="School" value={x.school} onChange={(e) => setEdu(x.id, 'school', e.target.value)} />
          <div className="row">
            <input placeholder="Start" value={x.start} onChange={(e) => setEdu(x.id, 'start', e.target.value)} />
            <input placeholder="End" value={x.end} onChange={(e) => setEdu(x.id, 'end', e.target.value)} />
          </div>
          <button className="danger" onClick={() => removeEdu(x.id)}>Remove</button>
        </div>
      ))}

      <h2>Skills</h2>
      <textarea
        placeholder="Comma separated"
        value={resume.skills.join(', ')}
        onChange={(e) =>
          setResume({ ...resume, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
        }
      />
    </div>
  );
}
