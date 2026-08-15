import React, { useState } from 'react';
import { Download, Terminal, ShieldCheck, CheckCircle2, Sparkles, Zap, ArrowRight, Layers, FileText, Reply, CheckSquare, ShieldAlert } from 'lucide-react';

export function Hero() {
  const [activeTab, setActiveTab] = useState<'summary' | 'reply' | 'tasks' | 'security'>('summary');

  return (
    <section style={{ paddingTop: 130, paddingBottom: 64, position: 'relative' }}>
      <div className="container">
        
        {/* Top Eyebrow */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span className="status-dot" />
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
              CSE412 Software Engineering &bull; Section 5 &bull; Powered by <strong style={{ color: 'var(--text-primary)' }}>OpenCode Zen API</strong>
            </span>
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto 32px' }}>
          <h1 style={{ fontSize: 'clamp(34px, 4.8vw, 62px)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.12, marginBottom: 20 }}>
            The Native AI Copilot for Gmail Power Users.
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: 'var(--text-secondary)', maxWidth: 660, margin: '0 auto', lineHeight: 1.6 }}>
            Distill dense email threads into 3 key takeaways, generate context-aware replies in one click, extract deadlines to Supabase, and audit link security—injected directly into Gmail.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 44 }}>
          <a
            href="/mailx-extension.zip"
            download="mailx-extension.zip"
            className="btn-primary"
            style={{ padding: '13px 28px', fontSize: 15 }}
          >
            <Download size={17} />
            <span>Download Extension (.zip)</span>
          </a>

          <a
            href="#features"
            className="btn-secondary"
            style={{ padding: '13px 24px', fontSize: 15 }}
          >
            <span>Explore All 7+ Features</span>
            <ArrowRight size={15} />
          </a>
        </div>

        {/* Tech Stack Trust Metadata Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(14px, 3vw, 32px)',
            flexWrap: 'wrap',
            marginBottom: 56,
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            maxWidth: 960,
            margin: '0 auto 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Zap size={14} color="var(--accent-zen)" />
            <span><strong>OpenCode Zen API</strong> (Free High-Speed Models)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Layers size={14} color="var(--brand-primary)" />
            <span><strong>Supabase PostgreSQL</strong> + Row Level Security</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <ShieldCheck size={14} color="var(--accent-zen)" />
            <span><strong>Zero Data Retention</strong> on Private Emails</span>
          </div>
        </div>

        {/* Signature Element: Gmail In-Situ Action Inspector */}
        <div className="card-panel-raised" style={{ maxWidth: 1040, margin: '0 auto', overflow: 'hidden' }}>
          
          {/* Mockup Window Chrome Header */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-hairline)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Window Dots & Tab */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>mail.google.com</span>
                <span>/</span>
                <span>inbox/thread-84920</span>
              </div>
            </div>

            {/* Injected Feature Inspector Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-main)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <button
                onClick={() => setActiveTab('summary')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'summary' ? 'var(--brand-primary)' : 'transparent',
                  color: activeTab === 'summary' ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <FileText size={12} />
                <span>FR1: Summarize</span>
              </button>

              <button
                onClick={() => setActiveTab('reply')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'reply' ? 'var(--brand-primary)' : 'transparent',
                  color: activeTab === 'reply' ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <Reply size={12} />
                <span>FR2: Smart Reply</span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'tasks' ? 'var(--brand-primary)' : 'transparent',
                  color: activeTab === 'tasks' ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <CheckSquare size={12} />
                <span>FR5: Task Extract</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'security' ? 'var(--brand-primary)' : 'transparent',
                  color: activeTab === 'security' ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldAlert size={12} />
                <span>Security</span>
              </button>
            </div>
          </div>

          {/* Email View Body */}
          <div style={{ padding: '24px 28px', background: 'var(--bg-main)' }}>
            
            {/* Mock Gmail Subject Line & Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border-hairline)', paddingBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 18, color: '#FFFFFF' }}>Project Release v1.0: Final Architecture & Production Review</h3>
                  <span className="mono-tag mono-tag-blue" style={{ fontSize: 10 }}>Urgent &bull; FR4</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  From: <strong>prof.instructor@ewubd.edu</strong> &bull; To: <strong>mailx-team@cse412.edu</strong> &bull; Today at 10:45 AM
                </div>
              </div>

              {/* Injected MailX Action Trigger */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono-tag mono-tag-zen" style={{ fontSize: 11, padding: '4px 8px' }}>
                  <Zap size={12} />
                  OpenCode Zen Active
                </span>
              </div>
            </div>

            {/* Email Raw Excerpt */}
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20, padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              "Hi team, please review the finalized architecture blueprint for our CSE412 delivery. Sadik needs to finish the CI/CD pipeline and Supabase RLS policies by Thursday 5:00 PM. Raquib will verify all automated backend API tests, while Oishik reviews system diagrams and Chayan finalizes user validation metrics."
            </div>

            {/* MailX Injected Overlay Content based on Active Tab */}
            {activeTab === 'summary' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-sm)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--brand-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                      <FileText size={13} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>MailX 3-Bullet Executive Summary</span>
                  </div>
                  <span className="mono-tag" style={{ fontSize: 10 }}>Inference: 140ms</span>
                </div>
                <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li><strong>Project Milestone:</strong> Final CSE412 architecture review requires sign-off from all 4 engineering leads before Thursday.</li>
                  <li><strong>Core Assignments:</strong> Sadik manages CI/CD & Supabase RLS, Raquib executes backend test suites, Oishik verifies architecture, and Chayan leads product validation.</li>
                  <li><strong>Hard Deadline:</strong> Deliverable synchronization deadline set for Thursday at 5:00 PM BST.</li>
                </ul>
              </div>
            )}

            {activeTab === 'reply' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--accent-zen-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-zen)' }}>
                      <Reply size={13} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>1-Click Smart Reply Options (OpenCode Zen)</span>
                  </div>
                  <span className="mono-tag" style={{ fontSize: 10 }}>Context-Aware</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700, marginBottom: 4 }}>1. Professional Acknowledgment</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>"Understood. The team is on schedule to finalize CI/CD, RLS policies, and test suites ahead of Thursday 5 PM."</p>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-zen)', fontWeight: 700, marginBottom: 4 }}>2. Direct Status Update</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>"Noted. All 4 members are aligned on their modules. We will attach the signed architecture verification by Thursday morning."</p>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 4 }}>3. Request Brief Sync</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>"Thanks for the reminder. Could we do a quick 10-minute sync Wednesday afternoon to review the schema changes?"</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--accent-amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
                      <CheckSquare size={13} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Extracted Action Items &rarr; Supabase Sync</span>
                  </div>
                  <span className="mono-tag mono-tag-amber" style={{ fontSize: 10 }}>4 Tasks Detected</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)', fontSize: 12 }}>
                    <span><strong>Sadik:</strong> Deploy CI/CD & Supabase RLS policies</span>
                    <span className="mono-tag" style={{ color: 'var(--accent-amber)' }}>Due: Thursday 5:00 PM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)', fontSize: 12 }}>
                    <span><strong>Raquib:</strong> Execute backend API & LLM proxy test suites</span>
                    <span className="mono-tag" style={{ color: 'var(--text-secondary)' }}>Due: Thursday 12:00 PM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)', fontSize: 12 }}>
                    <span><strong>Oishik & Chayan:</strong> Review system architecture & validation metrics</span>
                    <span className="mono-tag" style={{ color: 'var(--text-secondary)' }}>Due: Thursday 3:00 PM</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--accent-zen-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-zen)' }}>
                      <ShieldCheck size={13} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Domain & Link Integrity Audit</span>
                  </div>
                  <span className="mono-tag mono-tag-zen" style={{ fontSize: 10 }}>Score: 100/100 Safe</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
                  <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Sender Authentication</div>
                    <div style={{ color: 'var(--accent-zen)', fontWeight: 600 }}>SPF, DKIM & DMARC Passed</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Embedded Links</div>
                    <div style={{ color: 'var(--accent-zen)', fontWeight: 600 }}>0 Deceptive Redirects</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-hairline)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Privacy Guarantee</div>
                    <div style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>0 Data Saved on Server</div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
