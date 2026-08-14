export function TeamSection() {
  const team = [
    { name: 'Raquib Uddin Sarkar', role: 'Full Stack & AI Architect' },
    { name: 'Md. Sadik Shahriar', role: 'Frontend & Cloud Lead' },
    { name: 'Chayan Das', role: 'Backend & Security Engineer' },
    { name: 'Shahriar Mahabub Oishik', role: 'Extension & Integration Engineer' },
  ];

  return (
    <section id="team" className="section" style={{ position: 'relative' }}>
      <div className="container">
        
        {/* Section Heading */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            East West University &bull; CSE412
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 16 }}>
            The Engineering Team
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Developed for Software Engineering (CSE412, Section 5), Summer 2026.
          </p>
        </div>

        {/* Team Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 1060, margin: '0 auto' }}>
          {team.map((member, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '24px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-display)', boxShadow: '0 4px 15px var(--primary-glow)' }}>
                {member.name.charAt(0)}
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>{member.name}</h4>
                <p style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 500 }}>{member.role}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
