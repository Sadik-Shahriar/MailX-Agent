import React, { useState, useEffect } from 'react';
import { Download, Github, Terminal, ShieldCheck, Cpu } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.2s ease',
        background: scrolled ? 'rgba(9, 12, 16, 0.92)' : 'rgba(9, 12, 16, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid var(--border-hairline)' : '1px solid transparent',
        padding: '14px 0',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Identity */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/mailx-logo.png"
            alt="MailX Logo"
            style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
              Mail<span style={{ color: 'var(--brand-primary)' }}>X</span>
            </span>
            <span className="mono-tag mono-tag-zen" style={{ fontSize: 10, padding: '2px 6px' }}>
              <span className="status-dot" style={{ width: 5, height: 5 }} />
              OpenCode Zen
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden md:flex">
          <a
            href="#features"
            style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Features & Specs
          </a>
          <a
            href="#architecture"
            style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Architecture
          </a>
          <a
            href="#install"
            style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Install Guide
          </a>
          <a
            href="#security"
            style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Security
          </a>
          <a
            href="#team"
            style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Team
          </a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="https://github.com/Sadik-Shahriar/MailX-Agent"
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
            title="View GitHub Repository"
          >
            <Github size={15} />
            <span style={{ fontSize: 12 }}>GitHub</span>
          </a>

          <a
            href="/mailx-extension.zip"
            download="mailx-extension.zip"
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <Download size={14} />
            <span>Download .zip</span>
          </a>
        </div>

      </div>
    </header>
  );
}
