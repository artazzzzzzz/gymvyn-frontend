import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const API = import.meta.env.VITE_API_URL || '';

const accentColors = ['var(--text-cta)', '#1D9E75', '#BA7517', '#D85A30', '#534AB7', 'var(--success)'];

function CheckIcon({ color = 'white', size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function TrainerAssignPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Multi-step state
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [planType, setPlanType] = useState('workout');
  const [startDate, setStartDate] = useState(new Date());
  const [duration, setDuration] = useState(12);
  const [customDuration, setCustomDuration] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [replacingPlanId, setReplacingPlanId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [clientsRes, templatesRes] = await Promise.all([
        apiFetch(`/api/trainer/clients/${user.id}`),
        apiFetch(`/api/trainer/templates/${user.id}`)
      ]);
      const activeClients = (clientsRes || []).filter(c => c.status === 'active' && c.client_id);
      setClients(activeClients);
      setTemplates(templatesRes || []);
    } catch (err) {
      console.error('Load assign data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Process URL params after data loads
  useEffect(() => {
    const clientId = params.get('clientId');
    const type = params.get('type');
    const templateId = params.get('templateId');
    const replace = params.get('replace');

    if (type) setPlanType(type);
    if (replace) setReplacingPlanId(replace);

    if (clientId) {
      const client = clients.find(c => c.client_id === clientId);
      if (client) {
        setSelectedClient(client);
        setStep(2);
      }
    }

    if (templateId) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        setSelectedTemplate(tmpl);
        setStep(clientId ? 3 : 1);
      }
    }
  }, [clients, templates]);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration * 7);

  const prevDay = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 1);
    setStartDate(d);
  };
  const nextDay = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    setStartDate(d);
  };
  const isToday = startDate.toDateString() === new Date().toDateString();

  const filteredClients = clients.filter(c =>
    (c.client?.full_name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => t.type === planType);

  const handleAssign = async () => {
    try {
      setAssigning(true);
      const res = await fetch(`${API}/api/trainer/assign-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: user.id,
          client_id: selectedClient.client_id,
          template_id: selectedTemplate?.id || null,
          type: planType,
          name: selectedTemplate?.name || 'Custom Plan',
          plan_data: selectedTemplate?.template_data || {},
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          notes: message,
          replacing: replacingPlanId || null
        })
      });
      if (res.ok) setSuccess(true);
    } catch (e) {
      console.error('Assign plan error:', e);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <CheckIcon color="var(--success)" size={28} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Plan assigned!</h2>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 260, lineHeight: 1.6, marginBottom: 32 }}>
        {selectedClient?.client?.full_name} will see their new plan immediately in the app
      </p>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={() => navigate(`/trainer/client/${selectedClient?.client_id}`)}
          style={{ flex: 1, height: 48, borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          View client
        </button>
        <button
          onClick={() => navigate('/trainer/dashboard')}
          style={{ flex: 1, height: 48, borderRadius: 10, background: "var(--text-primary)", color: 'var(--bg-primary)', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );

  const stepNames = ['Client', 'Plan', 'Schedule'];
  const canNext = step === 1 ? !!selectedClient : step === 2 ? !!selectedTemplate : true;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '52px 16px 0' }}>
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          style={{ fontSize: 14, color: "var(--text-secondary)", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '16px 0' }}>
        {stepNames.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step > i + 1 ? "var(--text-primary)" : step === i + 1 ? "var(--text-primary)" : 'transparent',
                border: step <= i ? '1.5px solid var(--border-strong)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {step > i + 1
                  ? <CheckIcon color="white" size={12} />
                  : <span style={{ fontSize: 12, fontWeight: 500, color: step === i + 1 ? 'white' : "var(--text-tertiary)" }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{s}</span>
            </div>
            {i < 2 && (
              <div style={{
                height: 1, width: 40,
                background: step > i + 1 ? "var(--text-primary)" : 'var(--border)',
                margin: '0 4px', marginBottom: 16
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Step 1: Client ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Select client</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>Who are you assigning this plan to?</p>

            <input
              type="text"
              placeholder="Search clients…"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              style={{
                width: '100%', height: 40, borderRadius: 10,
                border: '0.5px solid var(--border)', padding: '0 12px',
                fontSize: 13, background: 'var(--bg-card)', outline: 'none',
                boxSizing: 'border-box', marginBottom: 12, display: 'block'
              }}
            />

            {filteredClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: "var(--text-tertiary)", fontSize: 13 }}>
                No active clients found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredClients.map(c => {
                  const isSelected = selectedClient?.client_id === c.client_id;
                  return (
                    <div
                      key={c.client_id}
                      onClick={() => setSelectedClient(c)}
                      style={{
                        height: 64, borderRadius: 10,
                        border: isSelected ? '0.5px solid var(--text-primary)' : '0.5px solid var(--border)',
                        background: isSelected ? 'var(--bg-primary)' : 'white',
                        display: 'flex', alignItems: 'center', padding: '0 16px',
                        gap: 12, cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--bg-pill)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, fontWeight: 600,
                        color: "var(--text-secondary)", flexShrink: 0
                      }}>
                        {(c.client?.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{c.client?.full_name || 'Client'}</div>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{c.client?.goal || '—'}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: isSelected ? 'none' : '1.5px solid var(--border-strong)',
                        background: isSelected ? "var(--text-primary)" : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {isSelected && <CheckIcon color="white" size={10} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Template ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Select plan</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>Choose a template or build a new one</p>

            {/* Plan type toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['workout', 'diet'].map(t => (
                <button key={t} onClick={() => { setPlanType(t); setSelectedTemplate(null); }} style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 13,
                  border: planType === t ? 'none' : '0.5px solid var(--border)',
                  background: planType === t ? "var(--text-primary)" : 'transparent',
                  color: planType === t ? 'white' : "var(--text-secondary)", cursor: 'pointer', textTransform: 'capitalize'
                }}>{t === 'workout' ? 'Workout' : 'Diet'}</button>
              ))}
            </div>

            {replacingPlanId && (
              <div style={{
                background: 'var(--warning-bg)', border: '0.5px solid var(--warning)',
                borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, color: 'var(--warning)'
              }}>
                Replacing existing plan. The client's current plan will be ended when the new one starts.
              </div>
            )}

            {filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: "var(--text-tertiary)", fontSize: 13 }}>
                No {planType} templates yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredTemplates.map((t, idx) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  const accent = accentColors[idx % 6];
                  const days = t.template_data?.days?.length || 0;
                  const exercises = t.template_data?.days?.reduce((sum, d) => sum + (d.exercises?.length || 0), 0) || 0;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      style={{
                        height: 80, borderRadius: 10,
                        border: isSelected ? '0.5px solid var(--text-primary)' : '0.5px solid var(--border)',
                        background: isSelected ? 'var(--bg-primary)' : 'white',
                        display: 'flex', alignItems: 'center',
                        padding: '0 16px', gap: 12, cursor: 'pointer'
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                          {planType === 'workout'
                            ? `${days} days · ${exercises} exercises`
                            : `${t.template_data?.calories || 0} kcal`
                          }
                        </div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: isSelected ? 'none' : '1.5px solid var(--border-strong)',
                        background: isSelected ? "var(--text-primary)" : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {isSelected && <CheckIcon color="white" size={10} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => navigate(planType === 'workout' ? '/trainer/templates/new' : '/trainer/diet-templates/new')}
              style={{
                width: '100%', marginTop: 10, padding: '12px 0',
                border: '1.5px dashed var(--border-strong)', borderRadius: 10,
                background: 'transparent', fontSize: 13, color: 'var(--text-cta)', cursor: 'pointer'
              }}
            >
              Build new {planType} template instead
            </button>
          </div>
        )}

        {/* ── Step 3: Schedule ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Schedule</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>When should the plan start?</p>

            {/* Start date nav */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', marginBottom: 12, border: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12 }}>Start date</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={prevDay} style={{ width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: "var(--text-secondary)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 500 }}>
                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {isToday ? 'Today' : startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                  </div>
                </div>
                <button onClick={nextDay} style={{ width: 40, height: 40, background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: "var(--text-secondary)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>
            </div>

            {/* Duration */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 12, border: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>Duration</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[4, 8, 12].map(w => (
                  <button key={w} onClick={() => { setDuration(w); setCustomDuration(false); }} style={{
                    height: 34, padding: '0 14px', borderRadius: 20, fontSize: 13,
                    border: !customDuration && duration === w ? 'none' : '0.5px solid var(--border)',
                    background: !customDuration && duration === w ? "var(--text-primary)" : 'transparent',
                    color: !customDuration && duration === w ? 'white' : "var(--text-secondary)", cursor: 'pointer'
                  }}>{w} weeks</button>
                ))}
                <button onClick={() => setCustomDuration(true)} style={{
                  height: 34, padding: '0 14px', borderRadius: 20, fontSize: 13,
                  border: customDuration ? 'none' : '0.5px solid var(--border)',
                  background: customDuration ? "var(--text-primary)" : 'transparent',
                  color: customDuration ? 'white' : "var(--text-secondary)", cursor: 'pointer'
                }}>Custom</button>
              </div>
              {customDuration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value) || 1)}
                    style={{
                      width: 60, height: 36, borderRadius: 8,
                      border: '0.5px solid var(--border)',
                      textAlign: 'center', fontSize: 14, outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>weeks</span>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-tertiary)" }}>
                Ends {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>Message to client (optional)</div>
              <textarea
                rows={3}
                placeholder="Any tips, instructions, or encouragement…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-primary)', border: 'none',
                  borderRadius: 8, padding: 12, fontSize: 13, color: "var(--text-secondary)",
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', display: 'block'
                }}
              />
            </div>

            {/* Summary card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '0.5px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
              {[
                { label: 'Client', value: selectedClient?.client?.full_name || '—' },
                { label: 'Plan', value: selectedTemplate?.name || 'Custom Plan' },
                { label: 'Type', value: planType === 'workout' ? 'Workout' : 'Diet' },
                { label: 'Start', value: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { label: 'Duration', value: `${duration} weeks` },
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none'
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '0.5px solid var(--border)',
        padding: '12px 16px 28px'
      }}>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              background: canNext ? "var(--text-primary)" : 'var(--border)',
              color: canNext ? 'white' : "var(--text-tertiary)",
              border: 'none', fontSize: 15, fontWeight: 500,
              cursor: canNext ? 'pointer' : 'not-allowed'
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleAssign}
            disabled={assigning}
            style={{
              width: '100%', height: 52, borderRadius: 12,
              background: assigning ? 'var(--text-tertiary)' : "var(--text-primary)",
              color: 'var(--bg-primary)', border: 'none', fontSize: 15,
              fontWeight: 500, cursor: assigning ? 'not-allowed' : 'pointer'
            }}
          >
            {assigning ? 'Assigning…' : `Assign to ${selectedClient?.client?.full_name || 'Client'}`}
          </button>
        )}
      </div>
    </div>
  );
}
