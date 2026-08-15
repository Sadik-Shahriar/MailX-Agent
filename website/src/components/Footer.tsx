import React from 'react';
import { Github, Download, Heart, Zap, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-hairline)', padding: '56px 0 32px', background: 'var(--bg-main)' }}>
      <div className="container">
        
        {/* Main Footer Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 36 }}>
          
          {/* Brand Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/mailx-logo.png" alt="MailX Logo" style={{ width: 30, height: 30, borderRadius: 6 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>
                Mail<span style={{ color: 'var(--brand-primary)' }}>X</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>The AI Email Copilot for Gmail</p>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <a href="#features" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Features
            </a>
            <a href="#architecture" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Architecture
            </a>
            <a href="#install" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Install
            </a>
            <a href="#security" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Security
            </a>
            <a href="#team" style={{ transition: 'color 0.15s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              Team
            </a>
            <a
              href="https://github.com/Sadik-Shahriar/MailX-Agent"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <Github size={13} />
              <span>GitHub</span>
            </a>
          </div>

          {/* Download CTA */}
          <a
            href="/mailx-extension.zip"
            download="mailx-extension.zip"
            className="btn-primary"
            style={{ padding: '7px 15px', fontSize: 12.5 }}
          >
            <Download size={13} />
            <span>Download .zip</span>
          </a>

        </div>

        {/* Bottom Attribution */}
        <div
          style={{
            paddingTop: 24,
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <p>© 2026 MailX &bull; East West University CSE412 Section 5</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot" style={{ width: 5, height: 5 }} />
            <span>Powered by <strong>OpenCode Zen API</strong>, FastAPI & Supabase PostgreSQL</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
