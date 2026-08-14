import React from 'react';
import { Download, Sparkles, ShieldCheck, Zap, ArrowRight, Play } from 'lucide-react';

export function Hero() {
  return (
    <section style={{ paddingTop: 140, paddingBottom: 60, position: 'relative' }}>
      <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
        
        {/* Eyebrow Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 'var(--radius-pill)', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: 24 }}>
          <Sparkles size={14} color="var(--cyan)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>
            Next-Gen AI Email Assistant &bull; Section 5, Summer 2026
          </span>
        </div>

        {/* Main Headline */}
        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 68px)', lineHeight: 1.1, fontWeight: 800, maxWidth: 960, margin: '0 auto 24px', letterSpacing: '-0.035em' }}>
          Your Gmail Inbox, <br />
          <span className="gradient-text">Supercharged by AI.</span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 'clamp(16px, 1.8vw, 19px)', color: 'var(--text-secondary)', maxWidth: 680, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Summarize long email threads into 3 key takeaways, generate tailored replies, extract actionable deadlines, and detect phishing threats — directly inside your Gmail workspace.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
          <a href="/mailx-extension.zip" download="mailx-extension.zip" className="btn-primary" style={{ padding: '15px 32px', fontSize: 16 }}>
            <Download size={18} />
            <span>Download MailX Extension (.zip)</span>
          </a>
          
          <a href="#demo" className="btn-secondary" style={{ padding: '15px 28px', fontSize: 16 }}>
            <Play size={16} fill="currentColor" />
            <span>Try Live Simulator</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(16px, 4vw, 36px)', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="var(--emerald)" />
            <span>Zero Training on Private Emails</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="var(--primary)" />
            <span>FastAPI + DeepSeek AI Engine</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)' }} />
            <span>100% Free & Open Source</span>
          </div>
        </div>

      </div>
    </section>
  );
}
