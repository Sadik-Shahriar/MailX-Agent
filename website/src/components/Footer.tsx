import React from 'react';
import { Github, Download, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '60px 0 36px', background: 'var(--bg-main)' }}>
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 36 }}>
          
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/mailx-logo.png" alt="MailX Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                Mail<span style={{ color: 'var(--primary)' }}>X</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>The AI Email Copilot for Gmail</p>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <a href="#demo" style={{ transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>Demo</a>
            <a href="#features" style={{ transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>Features</a>
            <a href="#install" style={{ transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>Install</a>
            <a href="https://github.com/Sadik-Shahriar/MailX-Agent" target="_blank" rel="noreferrer" style={{ transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 4 }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <Github size={14} />
              <span>GitHub</span>
            </a>
          </div>

          {/* Download CTA */}
          <a href="/mailx-extension.zip" download="mailx-extension.zip" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>
            <Download size={14} />
            <span>Download .zip</span>
          </a>

        </div>

        {/* Bottom Attribution */}
        <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <p>© 2026 MailX Project &bull; East West University CSE412 Section 5</p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Built with React, FastAPI, Supabase & DeepSeek AI
          </p>
        </div>
      </div>
    </footer>
  );
}
