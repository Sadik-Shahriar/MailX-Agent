import React from 'react';
import { Shield, Lock, Database, EyeOff } from 'lucide-react';

export function SecurityPrivacy() {
  const securityPillars = [
    {
      icon: EyeOff,
      title: 'Zero Training on Emails',
      desc: 'Your private email contents are processed ephemerally for instant inference and are never stored or used to train AI models.',
    },
    {
      icon: Database,
      title: 'Supabase PostgreSQL with RLS',
      desc: 'Preferences, tasks, and reminders are protected with strict Row Level Security (RLS) policies tied directly to your authenticated Google ID.',
    },
    {
      icon: Lock,
      title: 'Stateless Cloud Proxy',
      desc: 'The FastAPI backend serves as an encrypted, stateless proxy with rate limiting, timeouts, and sanitized headers.',
    },
  ];

  return (
    <section className="section" style={{ position: 'relative', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)' }}>
      <div className="container">
        
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--cyan-soft)', color: 'var(--cyan)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Trust & Architecture
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 16 }}>
            Privacy by Architecture, Not Just Promise
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            MailX was designed from ground up to ensure your personal and corporate email privacy is never compromised.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {securityPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: 17, color: '#FFFFFF' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
