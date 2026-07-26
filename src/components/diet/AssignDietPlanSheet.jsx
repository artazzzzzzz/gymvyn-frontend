import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../utils/api';
import { supabase } from '../../utils/supabase';

const BASE = import.meta.env.VITE_API_URL || '';

async function dietFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
  return data;
}

const LEVEL_BADGE = {
  macros: { label: 'Macros',    bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  meals:  { label: 'Meal Plan', bg: '#FFF3E0',            color: '#BA7517' },
  full:   { label: 'Full Plan', bg: '#E8F5E9',            color: '#1D9E75' },
};

export default function AssignDietPlanSheet({ isOpen, onClose, template, onAssigned }) {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch(''); setSelectedClient(null); setNotes('');
      setError(''); setToast('');
      return;
    }
    if (user?.id) loadClients();
  }, [isOpen, user?.id]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/trainer/clients/${user.id}`);
      setClients((data || []).filter(r => r.status === 'active'));
    } catch (err) {
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(r => {
    const name = (r.client?.full_name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleAssign = async () => {
    if (!selectedClient || !template) return;
    setAssigning(true);
    setError('');
    try {
      await dietFetch('/api/diet-plans/assign', {
        method: 'POST',
        body: JSON.stringify({
          client_id: selectedClient.client_id,
          template_id: template.id,
          detail_level: template.detail_level,
          name: template.name,
          calories_target: template.calories_target,
          protein_g: template.protein_g,
          carbs_g: template.carbs_g,
          fat_g: template.fat_g,
          notes: notes.trim() || null,
        }),
      });
      const name = selectedClient.client?.full_name || 'Client';
      setToast(`${name}'s diet plan updated`);
      setTimeout(() => {
        setToast('');
        onAssigned?.();
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to assign plan');
    } finally {
      setAssigning(false);
    }
  };

  const badge = template ? (LEVEL_BADGE[template.detail_level] || LEVEL_BADGE.macros) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 290,
          background: 'rgba(0,0,0,0.55)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        paddingBottom: 40,
        boxShadow: '0 -2px 24px rgba(0,0,0,0.12)',
        transform: isOpen ? 'translateY(0)' : 'translateY(108%)',
        transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '4px 20px 12px' }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Assign Diet Plan</p>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
          {/* Template summary */}
          {template && (
            <div style={{
              background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{template.name}</span>
                {badge && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Cal', value: template.calories_target },
                  { label: 'P', value: template.protein_g ? `${template.protein_g}g` : null },
                  { label: 'C', value: template.carbs_g ? `${template.carbs_g}g` : null },
                  { label: 'F', value: template.fat_g ? `${template.fat_g}g` : null },
                ].map(({ label, value }) => value ? (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>{label}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* Assign to */}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 500 }}>Assign to</p>

          <input
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 14, color: 'var(--text-primary)', outline: 'none', marginBottom: 8,
            }}
          />

          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>Loading clients…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No clients found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, maxHeight: 180, overflowY: 'auto' }}>
              {filtered.map(r => {
                const isSelected = selectedClient?.client_id === r.client_id;
                return (
                  <button
                    key={r.client_id}
                    onClick={() => setSelectedClient(isSelected ? null : r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: isSelected ? '1.5px solid var(--border-strong)' : '0.5px solid var(--border)',
                      background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                    }}>
                      {(r.client?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {r.client?.full_name || 'Unknown'}
                    </span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Notes */}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', fontWeight: 500 }}>Notes (optional)</p>
          <textarea
            placeholder="Add notes for your client…"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
              borderRadius: 8, padding: '10px 12px',
              fontSize: 14, color: 'var(--text-primary)',
              outline: 'none', resize: 'none', marginBottom: 14, fontFamily: 'inherit',
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 10 }}>{error}</p>
          )}

          {toast && (
            <div style={{
              background: 'var(--success-bg)', borderRadius: 10, padding: '10px 14px',
              fontSize: 13, color: 'var(--success)', fontWeight: 500, marginBottom: 10, textAlign: 'center',
            }}>
              {toast}
            </div>
          )}

          <button
            onClick={handleAssign}
            disabled={!selectedClient || assigning}
            style={{
              width: '100%', padding: '14px',
              background: (!selectedClient || assigning) ? 'var(--bg-elevated)' : 'var(--text-primary)',
              color: (!selectedClient || assigning) ? 'var(--text-disabled)' : 'var(--bg-primary)',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600,
              cursor: (!selectedClient || assigning) ? 'not-allowed' : 'pointer',
            }}
          >
            {assigning ? 'Assigning…' : 'Assign Plan'}
          </button>
        </div>
      </div>
    </>
  );
}
