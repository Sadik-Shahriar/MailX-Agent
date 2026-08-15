import React from 'react';
import { Cpu, Database, Globe, Lock, ShieldCheck, Terminal, Server, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export function ArchitectureSection() {
  const stackItems = [
    {
      label: 'AI Inference Engine',
      tech: 'OpenCode Zen API',
      model: 'Zen Free Flash Models',
      desc: 'Free, low-latency, high-throughput LLM gateway for instant email analysis and contextual reply generation.',
      icon: Zap,
      color: 'var(--accent-zen)',
      border: 'rgba(16, 185, 129, 0.3)'
    },
    {
      label: 'Proxy Backend',
      tech: 'FastAPI (Python 3.13)',
      model: 'Port 8001 (Uvicorn)',
      desc: 'Stateless, lightweight asynchronous proxy that strips PII, enforces rate limits, and relays requests without storing emails.',
      icon: Server,
      color: 'var(--brand-primary)',
      border: 'rgba(59, 130, 246, 0.3)'
    },
    {
      label: 'Database & Auth',
      tech: 'Supabase PostgreSQL',
      model: 'Google OAuth + RLS',
      desc: 'Stores user preferences, extracted task boards, and reminders protected by strict Row Level Security policies.',
      icon: Database,
      color: 'var(--accent-amber)',
      border: 'rgba(245, 158, 11, 0.3)'
    },
    {
      label: 'Client Extension',
      tech: 'CRXJS + React 18 + Vite',
      model: 'Port 5174 / Manifest V3',
      desc: 'Injected Gmail DOM content scripts and a React SPA popup with ephemeral chrome.storage.session caching.',
      icon: Globe,
      color: '#A855F7',
      border: 'rgba(168, 85, 247, 0.3)'
    },
  ];

  return (
    <section id="architecture" className="section" style={{ position: 'relative', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-hairline)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 48px' }}>
          <div className="mono-tag mono-tag-zen" style={{ marginBottom: 12 }}>
            Technical Architecture
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 44px)', marginBottom: 14 }}>
            Built on OpenCode Zen API & Supabase.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            A privacy-conscious decoupled design separating Gmail client DOM injection from secure LLM inference.
          </p>
        </div>

        {/* 4 Architectural Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginBottom: 48,
          }}
        >
          {stackItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="card-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="mono-tag" style={{ fontSize: 10 }}>
                    {item.model}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <h4 style={{ fontSize: 16, color: '#FFFFFF', marginBottom: 8 }}>{item.tech}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Pipeline Flow Diagram Card */}
        <div className="card-panel-raised" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 18, color: '#FFFFFF', marginBottom: 4 }}>Data Pipeline & Request Lifecycle</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>How a thread summary or smart reply travels through MailX</p>
            </div>
            <span className="mono-tag mono-tag-zen">
              Latency: &lt; 250ms Average
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              position: 'relative',
            }}
          >
            {/* Step 1 */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: 6 }}>
                STEP 01
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>Gmail DOM Trigger</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                User clicks floating action pill in Gmail. Extension extracts clean email body text in memory.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: 6 }}>
                STEP 02
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>FastAPI Proxy</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Background worker relays payload to <code style={{ color: 'var(--accent-zen)' }}>127.0.0.1:8001/chat</code> with sanitized headers.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-zen)', fontWeight: 700, marginBottom: 6 }}>
                STEP 03
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>OpenCode Zen API</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                OpenCode Zen API processes prompts at high speeds using free community models and returns structured JSON.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 6 }}>
                STEP 04
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>DOM Render & Sync</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Results injected into Gmail UI; tasks & reminders optionally written to Supabase with RLS.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
