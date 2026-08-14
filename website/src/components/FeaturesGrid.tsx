import React from 'react';
import { FileText, Reply, Edit3, CheckSquare, ShieldCheck, LayoutDashboard, Zap, Lock } from 'lucide-react';

export function FeaturesGrid() {
  const features = [
    {
      icon: FileText,
      title: '3-Bullet Summaries',
      badge: 'FR1',
      desc: 'Condenses dense email threads, newsletters, and long discussions into 3 crisp, executive takeaways in under 2 seconds.',
      color: 'var(--primary)',
      bg: 'var(--primary-soft)',
    },
    {
      icon: Reply,
      title: 'Smart Reply Suggestions',
      badge: 'FR2',
      desc: 'Generates context-aware reply options with multiple tones (Professional, Concise, Follow-up) ready to insert with 1 click.',
      color: 'var(--cyan)',
      bg: 'var(--cyan-soft)',
    },
    {
      icon: Edit3,
      title: 'Full Draft Generator',
      badge: 'FR9',
      desc: 'Transform short instructions or key bullet points into complete, well-structured emails with professional greetings and sign-offs.',
      color: 'var(--emerald)',
      bg: 'var(--emerald-soft)',
    },
    {
      icon: CheckSquare,
      title: 'Task & Deadline Extraction',
      badge: 'FR5',
      desc: 'Automatically identifies actionable tasks, explicit assignees, and deadlines, syncing them into your Supabase task manager.',
      color: 'var(--amber)',
      bg: 'var(--amber-soft)',
    },
    {
      icon: ShieldCheck,
      title: 'Phishing & Spam Shield',
      badge: 'Security',
      desc: 'Scans suspicious hyperlinks, analyzes sender domain integrity, and checks email bodies against deceptive phishing patterns.',
      color: 'var(--danger)',
      bg: 'var(--danger-soft)',
    },
    {
      icon: LayoutDashboard,
      title: 'Smart Home Dashboard',
      badge: 'New',
      desc: 'A unified glanceable hub in your extension popup showing pending tasks, high-priority action items, and AI shortcuts.',
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.12)',
    },
  ];

  return (
    <section id="features" className="section" style={{ position: 'relative' }}>
      <div className="container">
        
        {/* Section Heading */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Capabilities
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: 16 }}>
            Engineered for Modern Email Productivity
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Every feature is purpose-built to eliminate repetitive inbox friction without leaving Gmail.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                    <Icon size={20} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                    {item.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, color: '#FFFFFF' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
