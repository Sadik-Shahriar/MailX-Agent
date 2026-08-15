import React from 'react';
import { Github, Linkedin, Mail, Code, Terminal, CheckCircle2, Cpu, FileCheck } from 'lucide-react';

export function TeamSection() {
  const team = [
    {
      name: 'Raquib Uddin Sarkar',
      role: 'Fullstack + Tester',
      focus: 'Backend API Integration & Automated Testing Suites',
      initials: 'RS',
      github: 'https://github.com/Raquib-Uddin-Sarkar',
    },
    {
      name: 'Md. Sadik Shahriar',
      role: 'DevOps & Fullstack',
      focus: 'CI/CD Pipelines, Supabase Infrastructure & Extension Core',
      initials: 'SS',
      github: 'https://github.com/Sadik-Shahriar',
    },
    {
      name: 'Shahriar Mahabub Oishik',
      role: 'System Architect',
      focus: 'System Modeling, Sequence Flows & Architectural Blueprints',
      initials: 'SO',
      github: 'https://github.com/Shahriar-Mahabub-Oishik',
    },
    {
      name: 'Chayan Das',
      role: 'Product Manager',
      focus: 'Requirements Engineering, User Stories & Product Validation',
      initials: 'CD',
      github: 'https://github.com/Chayan-Das',
    },
  ];

  return (
    <section id="team" className="section" style={{ position: 'relative', borderTop: '1px solid var(--border-hairline)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 44px' }}>
          <div className="mono-tag mono-tag-blue" style={{ marginBottom: 12 }}>
            East West University &bull; CSE412
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', marginBottom: 14 }}>
            The Engineering Team.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Designed and built for Software Engineering (CSE412, Section 5), Summer 2026.
          </p>
        </div>

        {/* Team Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            maxWidth: 1040,
            margin: '0 auto',
          }}
        >
          {team.map((member, idx) => (
            <div
              key={idx}
              className="card-panel"
              style={{
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 14,
              }}
            >
              {/* Avatar Initial Circle */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--bg-surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {member.initials}
              </div>

              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                  {member.name}
                </h4>
                <div
                  className="mono-tag mono-tag-blue"
                  style={{ fontSize: 11, padding: '2px 8px', marginBottom: 8 }}
                >
                  {member.role}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {member.focus}
                </p>
              </div>

              {/* GitHub Link */}
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <a
                  href={member.github}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline"
                  style={{ padding: '5px 12px', fontSize: 11 }}
                >
                  <Github size={12} />
                  <span>Profile</span>
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
