import React, { useState } from 'react';
import { 
  FileText, 
  Reply, 
  Edit3, 
  CheckSquare, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Sparkles,
  Inbox,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

export function FeaturesGrid() {
  const [filter, setFilter] = useState<'all' | 'ai' | 'tasks' | 'security'>('all');

  const features = [
    {
      id: 'FR1',
      category: 'ai',
      icon: FileText,
      title: '3-Bullet Thread Summarization',
      badge: 'Core FR1',
      badgeClass: 'mono-tag-blue',
      summary: 'Condenses multi-party conversations into 3 crisp, executive takeaways in under 2 seconds.',
      details: [
        'Extracts key decisions, blocker mentions, and project status.',
        'Eliminates need to read 20+ message nested email chains.',
        'Runs directly in the Gmail message header via OpenCode Zen.'
      ],
      tag: 'Fast Inference'
    },
    {
      id: 'FR2',
      category: 'ai',
      icon: Reply,
      title: 'Multi-Tone Smart Replies',
      badge: 'Core FR2',
      badgeClass: 'mono-tag-blue',
      summary: 'Generates 3 context-aware response variations tailored to the email sender and conversation tone.',
      details: [
        'Preset tones: Professional, Direct & Concise, Action Next Steps.',
        '1-click insertion straight into the active Gmail reply box.',
        'Understands thread nuance, questions asked, and tone.'
      ],
      tag: '1-Click Insert'
    },
    {
      id: 'FR9',
      category: 'ai',
      icon: Edit3,
      title: 'AI Draft Studio',
      badge: 'Core FR9',
      badgeClass: 'mono-tag-zen',
      summary: 'Transforms short prompts, bullet points, or instructions into articulate, ready-to-send emails.',
      details: [
        'Formulates proper greetings, clear body paragraphs, and professional signatures.',
        'Configurable tone sliders (Formal, Casual, Persuasive, Technical).',
        'Directly populates Gmail compose modal with formatted text.'
      ],
      tag: 'Compose Engine'
    },
    {
      id: 'FR5',
      category: 'tasks',
      icon: CheckSquare,
      title: 'Task & Deadline Extraction',
      badge: 'Core FR5',
      badgeClass: 'mono-tag-amber',
      summary: 'Automatically recognizes action items, assigned team members, and explicit due dates.',
      details: [
        'Parses calendar deadlines, time expressions, and deliverables.',
        'One-click synchronization with your Supabase PostgreSQL task manager.',
        'Filterable by pending, completed, or high-urgency status.'
      ],
      tag: 'Supabase Sync'
    },
    {
      id: 'FR4',
      category: 'tasks',
      icon: AlertTriangle,
      title: 'Priority & Urgency Classification',
      badge: 'Core FR4',
      badgeClass: 'mono-tag-amber',
      summary: 'Explicit priority triage categorizing emails by urgency score and actionable impact.',
      details: [
        'Flags critical supervisor requests and immediate blocker emails.',
        'Lowers inbox noise by identifying newsletters and automated digests.',
        'Color-coded urgency chips directly visible in Gmail thread headers.'
      ],
      tag: 'Triage Engine'
    },
    {
      id: 'FR6',
      category: 'tasks',
      icon: Clock,
      title: 'Follow-Up & Reminder System',
      badge: 'Core FR6',
      badgeClass: 'mono-tag-amber',
      summary: 'Automates tracking of sent requests and notifies you when crucial replies are delayed.',
      details: [
        'Custom reminder durations (24h, 48h, next week, or specific date).',
        'Integrated with extension popup notification center.',
        'Ensures critical inquiries never slip through the cracks.'
      ],
      tag: 'Nudge Tracking'
    },
    {
      id: 'FR10',
      category: 'ai',
      icon: BarChart3,
      title: 'Thread Intelligence & Insights',
      badge: 'Core FR10',
      badgeClass: 'mono-tag-blue',
      summary: 'Analyzes long-term sender communication patterns, thread length, and response time velocity.',
      details: [
        'Overview of message sentiment and communication frequency.',
        'Identifies recurring discussion topics across multi-week threads.',
        'Helps optimize personal email response habits.'
      ],
      tag: 'Analytics'
    },
    {
      id: 'SEC',
      category: 'security',
      icon: ShieldCheck,
      title: 'Phishing & Malicious Link Audit',
      badge: 'Security Suite',
      badgeClass: 'mono-tag-zen',
      summary: 'Scans hyperlinks and sender headers for spoofing, deceptive domains, or known scam patterns.',
      details: [
        'Verifies SPF, DKIM, and DMARC alignment on incoming mail headers.',
        'Inspects deceptive redirect URLs before you click.',
        'Non-intrusive advisory badge displayed at top of email.'
      ],
      tag: 'Zero-Trust'
    },
    {
      id: 'ARCH',
      category: 'security',
      icon: Layers,
      title: 'Zero-Training Privacy Model',
      badge: 'Architecture',
      badgeClass: 'mono-tag-zen',
      summary: 'Your email contents are processed ephemerally in memory and never stored or used to train models.',
      details: [
        'Supabase PostgreSQL database protected by strict Row Level Security (RLS).',
        'Stateful data cached only in chrome.storage.session during active browsing.',
        'FastAPI backend operates as a secure, stateless proxy.'
      ],
      tag: 'Privacy First'
    }
  ];

  const filteredFeatures = filter === 'all' 
    ? features 
    : features.filter(f => f.category === filter);

  return (
    <section id="features" className="section" style={{ position: 'relative', borderTop: '1px solid var(--border-hairline)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 40px' }}>
          <div className="mono-tag mono-tag-blue" style={{ marginBottom: 12 }}>
            Complete Capability Breakdown
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 44px)', marginBottom: 14 }}>
            Engineered for High-Density Productivity.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Every functional requirement in MailX is designed to remove repetitive inbox friction without leaving Gmail.
          </p>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              gap: 4,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'all' ? 'var(--brand-primary)' : 'transparent',
                color: filter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              All Features ({features.length})
            </button>
            <button
              onClick={() => setFilter('ai')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'ai' ? 'var(--brand-primary)' : 'transparent',
                color: filter === 'ai' ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              AI & Summaries
            </button>
            <button
              onClick={() => setFilter('tasks')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'tasks' ? 'var(--brand-primary)' : 'transparent',
                color: filter === 'tasks' ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              Tasks & Reminders
            </button>
            <button
              onClick={() => setFilter('security')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === 'security' ? 'var(--brand-primary)' : 'transparent',
                color: filter === 'security' ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              Security & Privacy
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: 20,
          }}
        >
          {filteredFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="card-panel"
                style={{
                  padding: '26px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div>
                  {/* Card Header: Icon + Badge + Code */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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
                        color: item.category === 'security' ? 'var(--accent-zen)' : 'var(--brand-primary)',
                      }}
                    >
                      <Icon size={19} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`mono-tag ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>

                  {/* Title & Short Summary */}
                  <h3 style={{ fontSize: 17, marginBottom: 8, color: '#FFFFFF' }}>{item.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                    {item.summary}
                  </p>

                  {/* Bullet points breakdown */}
                  <ul style={{ paddingLeft: 16, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {item.details.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                </div>

                {/* Footer Tag */}
                <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Module: {item.id}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
