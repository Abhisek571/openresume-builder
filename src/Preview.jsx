import React from 'react';

export default function Preview({ resume, template }) {
  const { personal: p, experience, education, skills } = resume;

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
          <p>{p.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section>
          <h3>Experience</h3>
          {experience.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.role}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-sub">{x.company}</div>
              <ul>
                {x.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {education.length > 0 && (
        <section>
          <h3>Education</h3>
          {education.map((x) => (
            <div className="r-entry" key={x.id}>
              <div className="r-entry-head">
                <strong>{x.degree}</strong>
                <span>{x.start} – {x.end}</span>
              </div>
              <div className="r-sub">{x.school}</div>
            </div>
          ))}
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <h3>Skills</h3>
          <div className="r-skills">
            {skills.map((s, i) => <span className="r-chip" key={i}>{s}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}
