import React, { useState } from 'react';
import { Sparkles, FileText, Reply, Edit3, CheckSquare, Shield, Send, Check, CornerDownLeft, AlertTriangle } from 'lucide-react';

type FeatureTab = 'summarize' | 'reply' | 'draft' | 'tasks' | 'security' | 'chat';

export function InteractiveDemo() {
  const [activeFeature, setActiveFeature] = useState<FeatureTab>('summarize');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'user', text: 'When is the deadline for this project update?' },
    { role: 'assistant', text: 'The deadline mentioned in the email is **this Friday, Oct 24 at 5:00 PM EST**.' }
  ]);
  const [copied, setCopied] = useState(false);

  const sampleEmail = {
    sender: "Sarah Jenkins <sarah.j@techflow.io>",
    subject: "Q4 Roadmap Strategy & Budget Allocation Review",
    time: "Today, 10:42 AM",
    body: "Hi team,\n\nFollowing our executive sync yesterday, we need to finalize the Q4 engineering roadmap and budget allocation. Please review the updated spreadsheet by this Friday, Oct 24 at 5:00 PM EST.\n\nKey action items:\n1. Alex — submit the infrastructure cost estimate.\n2. Elena — confirm the mobile team headcount.\n3. Everyone — log your sprint capacity.\n\nLet me know if anyone needs extra clarification before our review meeting next Monday.",
  };

  const handleSendChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const userQ = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userQ }]);

    setTimeout(() => {
      let botA = "Based on Sarah's email, Alex needs to submit the infrastructure cost estimate and Elena needs to confirm mobile headcount before Friday 5 PM.";
      if (/cost|budget|infra/i.test(userQ)) {
        botA = "Alex is assigned to submit the infrastructure cost estimates for the Q4 budget.";
      } else if (/who|elena|alex/i.test(userQ)) {
        botA = "The assigned team members are Alex (infra cost) and Elena (mobile headcount).";
      } else if (/reply|draft/i.test(userQ)) {
        botA = "Here is a quick draft: 'Hi Sarah, received. We will finalize our sprint capacity and send over the budget breakdown before Friday.'";
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', text: botA }]);
    }, 400);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="demo" className="section" style={{ position: 'relative' }}>
      <div className="container">
        
        {/* Section Heading */}
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Interactive Simulator
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: 16 }}>
            Experience MailX in Action
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Click on any AI feature below to test how MailX analyzes and enhances emails directly inside Gmail.
          </p>
        </div>

        {/* Feature Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            { id: 'summarize', label: 'Summarize', icon: FileText },
            { id: 'reply', label: 'Smart Reply', icon: Reply },
            { id: 'draft', label: 'Draft Writer', icon: Edit3 },
            { id: 'tasks', label: 'Extract Tasks', icon: CheckSquare },
            { id: 'security', label: 'Security Shield', icon: Shield },
            { id: 'chat', label: 'Ask MailX', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFeature(item.id as FeatureTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: active ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)' : 'rgba(255, 255, 255, 0.04)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: active ? '0 0 20px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={15} color={active ? 'var(--cyan)' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* The Gmail Viewport Mockup */}
        <div
          className="glass-panel"
          style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--border-subtle)',
            maxWidth: 1060,
            margin: '0 auto',
          }}
        >
          {/* Mock Gmail Window Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#0F172A', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12, fontFamily: 'var(--font-mono)' }}>
                mail.google.com/mail/u/0/#inbox
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cyan)', background: 'var(--cyan-soft)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)' }} />
              MailX Active
            </div>
          </div>

          {/* Email Content + MailX Sidebar Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', minHeight: 460 }} className="demo-grid">
            
            {/* Left: Email Thread View */}
            <div style={{ padding: '24px 28px', borderRight: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#FFFFFF' }}>
                  {sampleEmail.subject}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sampleEmail.sender}</span>
                  <span>{sampleEmail.time}</span>
                </div>
              </div>

              {/* Email Body */}
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-line', flex: 1 }}>
                {sampleEmail.body}
              </div>

              {/* Mock Gmail Toolbar with MailX Injected Buttons */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontWeight: 600, marginRight: 4 }}>
                  [MailX Toolbar]
                </span>
                <button
                  onClick={() => setActiveFeature('summarize')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: activeFeature === 'summarize' ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  ⚡ Summarize
                </button>
                <button
                  onClick={() => setActiveFeature('reply')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: activeFeature === 'reply' ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  💬 Smart Reply
                </button>
                <button
                  onClick={() => setActiveFeature('tasks')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: activeFeature === 'tasks' ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  📋 Tasks
                </button>
              </div>
            </div>

            {/* Right: MailX Injected Panel Result */}
            <div style={{ padding: '24px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Panel Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={13} color="#FFFFFF" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                    {activeFeature === 'summarize' && 'AI Summary'}
                    {activeFeature === 'reply' && 'Smart Reply Suggestions'}
                    {activeFeature === 'draft' && 'AI Draft Generator'}
                    {activeFeature === 'tasks' && 'Extracted Tasks & Deadlines'}
                    {activeFeature === 'security' && 'Security & Phishing Analysis'}
                    {activeFeature === 'chat' && 'Ask MailX Assistant'}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DeepSeek v4</span>
              </div>

              {/* Dynamic Feature Content */}
              <div style={{ flex: 1 }}>
                
                {/* 1. Summarize View */}
                {activeFeature === 'summarize' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--primary-soft)', borderRadius: 6, width: 'fit-content' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>KEY TAKEAWAYS</span>
                    </div>
                    {[
                      "Review updated Q4 engineering roadmap and budget spreadsheet by Friday, Oct 24 at 5:00 PM EST.",
                      "Alex must provide infrastructure cost estimates; Elena must confirm mobile headcount.",
                      "Review meeting scheduled for next Monday; everyone must log sprint capacity."
                    ].map((bullet, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-surface-raised)', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12.5, lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{idx + 1}.</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Smart Reply View */}
                {activeFeature === 'reply' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { tone: 'Professional Affirmative', text: "Hi Sarah, thanks for the update. I'll review the Q4 roadmap and submit my sprint capacity before Friday 5 PM." },
                      { tone: 'Quick Acknowledgment', text: "Received Sarah! The team is currently updating the budget spreadsheet. We'll have everything ready for Monday's meeting." },
                      { tone: 'Request Clarification', text: "Hi Sarah, could you please grant access to the updated spreadsheet so we can log the infrastructure estimates?" }
                    ].map((reply, idx) => (
                      <div key={idx} style={{ padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase' }}>{reply.tone}</span>
                        <p style={{ fontSize: 12.5, color: 'var(--text-main)', margin: 0 }}>"{reply.text}"</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            onClick={() => handleCopy(reply.text)}
                            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                          >
                            {copied ? 'Copied ✓' : 'Insert into Gmail'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Draft View */}
                {activeFeature === 'draft' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-main)' }}>
                      <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--cyan)' }}>Subject: Re: Q4 Roadmap Strategy & Budget Allocation Review</p>
                      <p>Hi Sarah,</p>
                      <p style={{ marginTop: 6 }}>Thanks for sharing the update. I have reviewed the requirements and will ensure the team's sprint capacity and cost estimates are uploaded to the spreadsheet by Friday afternoon.</p>
                      <p style={{ marginTop: 6 }}>Looking forward to our sync on Monday.</p>
                      <p style={{ marginTop: 8 }}>Best regards,<br />Team</p>
                    </div>
                    <button onClick={() => handleCopy("Hi Sarah,\n\nThanks for sharing...")} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                      <span>Insert Draft into Gmail</span>
                    </button>
                  </div>
                )}

                {/* 4. Extract Tasks View */}
                {activeFeature === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { desc: 'Submit infrastructure cost estimate', assignee: 'Alex', due: 'Oct 24, 5:00 PM', priority: 'High', color: 'var(--danger)', bg: 'var(--danger-soft)' },
                      { desc: 'Confirm mobile team headcount', assignee: 'Elena', due: 'Oct 24, 5:00 PM', priority: 'High', color: 'var(--danger)', bg: 'var(--danger-soft)' },
                      { desc: 'Log sprint capacity into spreadsheet', assignee: 'Team', due: 'Oct 24', priority: 'Medium', color: 'var(--amber)', bg: 'var(--amber-soft)' },
                    ].map((task, idx) => (
                      <div key={idx} style={{ padding: '10px 12px', background: 'var(--bg-surface-raised)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>{task.desc}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>👤 {task.assignee} &bull; 📅 Due {task.due}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: task.bg, color: task.color, textTransform: 'uppercase' }}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Security View */}
                {activeFeature === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={16} color="#FFFFFF" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Clean & Verified Email</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>SPF & DKIM valid. No malicious links or spoofing detected.</div>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Security Parameters</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Sender Domain:</span>
                        <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>techflow.io (Trusted)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Spam Probability:</span>
                        <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>0.02% (Not Spam)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Ask MailX View */}
                {activeFeature === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            padding: '8px 12px',
                            borderRadius: 10,
                            fontSize: 12,
                            background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface-raised)',
                            color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-main)',
                            border: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                          }}
                        >
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about this email..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface-raised)',
                          color: '#FFFFFF',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        style={{
                          padding: '0 12px',
                          borderRadius: 8,
                          background: 'var(--primary)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
