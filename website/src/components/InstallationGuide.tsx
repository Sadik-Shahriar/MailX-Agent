import React, { useState } from 'react';
import { Download, FolderArchive, Settings, CheckCircle2, Copy, ExternalLink } from 'lucide-react';

export function InstallationGuide() {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyExtensionsUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const steps = [
    {
      step: '01',
      title: 'Download & Unzip',
      desc: 'Download the production MailX extension archive and extract the zip file to your preferred folder.',
      icon: FolderArchive,
      action: (
        <a href="/mailx-extension.zip" download="mailx-extension.zip" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, marginTop: 12 }}>
          <Download size={14} />
          <span>Download .zip (750 KB)</span>
        </a>
      ),
    },
    {
      step: '02',
      title: 'Enable Developer Mode',
      desc: 'Open Chrome or Chromium browser, navigate to your extension manager, and toggle on Developer Mode in the top right.',
      icon: Settings,
      action: (
        <button
          onClick={copyExtensionsUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Copy size={13} />
          <span>{copiedUrl ? 'Copied chrome://extensions' : 'Copy chrome://extensions'}</span>
        </button>
      ),
    },
    {
      step: '03',
      title: 'Load Unpacked Extension',
      desc: 'Click "Load unpacked" and select the unzipped dist folder. Open Gmail (mail.google.com) and start using MailX!',
      icon: CheckCircle2,
      action: (
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--primary-soft)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--cyan)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>Open Gmail</span>
          <ExternalLink size={13} />
        </a>
      ),
    },
  ];

  return (
    <section id="install" className="section" style={{ position: 'relative' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--emerald-soft)', color: 'var(--emerald)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Free 30-Second Setup
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: 16 }}>
            Install MailX in 3 Simple Steps
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Compatible with Google Chrome, Microsoft Edge, Brave, Opera, and any Chromium-based browser.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1060, margin: '0 auto' }}>
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                    <Icon size={22} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'rgba(255, 255, 255, 0.15)' }}>
                    {item.step}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, marginBottom: 8, color: '#FFFFFF' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6, flex: 1 }}>{item.desc}</p>
                
                <div style={{ marginTop: 16 }}>
                  {item.action}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
