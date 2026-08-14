import React, { useState, useEffect } from 'react';
import { Download, Sparkles, Github, Layers } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(11, 17, 32, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        padding: '16px 0',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/mailx-logo.png"
            alt="MailX Logo"
            style={{ width: 34, height: 34, borderRadius: 8 }}
            onError={(e) => {
              // Fallback icon if logo not loaded
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
              Mail<span style={{ color: 'var(--primary)' }}>X</span>
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, background: 'var(--primary-soft)', color: 'var(--cyan)', padding: '2px 6px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              v0.1.0
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
          <a href="#demo" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Interactive Demo
          </a>
          <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Features
          </a>
          <a href="#install" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Installation
          </a>
          <a href="#team" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Team
          </a>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="https://github.com/Sadik-Shahriar/MailX-Agent"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <Github size={18} />
          </a>

          <a href="/mailx-extension.zip" download="mailx-extension.zip" className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
            <Download size={15} />
            <span>Download Extension</span>
          </a>
        </div>

      </div>
    </nav>
  );
}
