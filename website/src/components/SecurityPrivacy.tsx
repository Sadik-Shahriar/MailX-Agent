import React from 'react';
import { ShieldCheck, Lock, Database, EyeOff, Server, KeyRound } from 'lucide-react';

export function SecurityPrivacy() {
  const securityPillars = [
    {
      icon: EyeOff,
      title: 'Zero Training on Private Emails',
      desc: 'Your private email contents are processed ephemerally in RAM strictly for inference and are never logged, persisted, or used to train any AI models.',
    },
    {
      icon: Database,
      title: 'Supabase PostgreSQL with RLS',
      desc: 'Preferences, task boards, and reminders are guarded by strict Row Level Security (RLS) policies tied directly to your authenticated Google user ID.',
    },
    {
      icon: Server,
      title: 'Stateless FastAPI Proxy Backend',
      desc: 'The Python backend (Port 8001) serves as an encrypted proxy keeping your OpenCode Zen API keys secure on server side rather than exposing them in client bundles.',
    },
    {
      icon: KeyRound,
      title: 'Client-Side Session Caching',
      desc: 'Temporary UI states and thread summaries leverage chrome.storage.session, ensuring sensitive context clears automatically when browser tabs close.',
    },
  ];

  return (
    <section id="security" className="section" style={{ position: 'relative', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-hairline)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 44px' }}>
          <div className="mono-tag mono-tag-zen" style={{ marginBottom: 12 }}>
            Zero-Trust Security & Privacy
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', marginBottom: 14 }}>
            Privacy by Architecture, Not Just Marketing.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            MailX was engineered from the ground up to ensure your personal, academic, and enterprise communication stays completely private.
          </p>
        </div>

        {/* 4 Security Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            maxWidth: 1080,
            margin: '0 auto',
          }}
        >
          {securityPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="card-panel"
                style={{
                  padding: '26px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-zen-soft)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-zen)',
                  }}
                >
                  <Icon size={18} />
                </div>

                <h3 style={{ fontSize: 16, color: '#FFFFFF' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
