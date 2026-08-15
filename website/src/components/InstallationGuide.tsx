import React, { useState } from 'react';
import { Download, FolderArchive, Settings, CheckCircle2, Copy, ExternalLink, Terminal } from 'lucide-react';

export function InstallationGuide() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const copyExtensionsUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyDevCmd = () => {
    navigator.clipboard.writeText('cd extension && npm run dev');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const steps = [
    {
      step: '01',
      title: 'Download Extension Bundle',
      desc: 'Grab the latest pre-built production extension ZIP archive (or build from source using our GitHub repository).',
      icon: FolderArchive,
      action: (
        <a
          href="/mailx-extension.zip"
          download="mailx-extension.zip"
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: 12.5, marginTop: 12 }}
        >
          <Download size={13} />
          <span>Download mailx-extension.zip</span>
        </a>
      ),
    },
    {
      step: '02',
      title: 'Enable Chrome Developer Mode',
      desc: 'Open Chrome or any Chromium browser (Edge, Brave, Opera), navigate to the extensions page, and toggle "Developer Mode" ON in top-right.',
      icon: Settings,
      action: (
        <button
          onClick={copyExtensionsUrl}
          className="btn-secondary"
          style={{ padding: '7px 14px', fontSize: 12, marginTop: 12 }}
        >
          <Copy size={12} />
          <span>{copiedUrl ? 'Copied chrome://extensions' : 'Copy chrome://extensions'}</span>
        </button>
      ),
    },
    {
      step: '03',
      title: 'Load Unpacked & Launch Gmail',
      desc: 'Click "Load unpacked", select your extracted dist folder, and open Gmail. MailX will automatically hook into your email stream.',
      icon: CheckCircle2,
      action: (
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
          style={{ padding: '7px 14px', fontSize: 12, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>Open mail.google.com</span>
          <ExternalLink size={12} />
        </a>
      ),
    },
  ];

  return (
    <section id="install" className="section" style={{ position: 'relative', borderTop: '1px solid var(--border-hairline)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
          <div className="mono-tag mono-tag-zen" style={{ marginBottom: 12 }}>
            Setup & Deployment
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', marginBottom: 14 }}>
            Get MailX Running in Under 60 Seconds.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            No complex sign-ups required. Works seamlessly on Google Chrome, Brave, Microsoft Edge, and Opera.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            maxWidth: 1040,
            margin: '0 auto 48px',
          }}
        >
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="card-panel"
                style={{
                  padding: '28px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-hairline)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--text-muted)' }}>
                      {item.step}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 17, marginBottom: 8, color: '#FFFFFF' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
                </div>

                <div>
                  {item.action}
                </div>
              </div>
            );
          })}
        </div>

        {/* Developer / Local Setup Terminal Snippet */}
        <div
          className="card-panel"
          style={{
            maxWidth: 1040,
            margin: '0 auto',
            padding: '20px 24px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={15} color="var(--brand-primary)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                For Developers & Contributors (Running from Source)
              </span>
            </div>
            <button
              onClick={copyDevCmd}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Copy size={12} />
              <span>{copiedCmd ? 'Copied command!' : 'Copy run command'}</span>
            </button>
          </div>

          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              color: '#A5B4FC',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '12px 16px',
              borderRadius: 6,
              overflowX: 'auto',
              border: '1px solid var(--border-hairline)',
              lineHeight: 1.6,
            }}
          >
            <code>{`# 1. Start FastAPI proxy backend (Port 8001)
cd backend && python -m uvicorn main:app --reload --port 8001

# 2. Start extension development server (Port 5174)
cd extension && npm run dev`}</code>
          </pre>
        </div>

      </div>
    </section>
  );
}
