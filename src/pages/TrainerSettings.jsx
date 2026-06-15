import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabase';

const API = import.meta.env.VITE_API_URL || '';

const SPECIALIZATIONS = [
  'Fat loss', 'Muscle gain', 'Strength',
  'Powerlifting', 'Rehabilitation',
  'Sports performance', 'Flexibility',
  'Senior fitness', 'Pre/postnatal'
];

// ── Sub-components ──────────────────────────────────────────

const Toggle = ({ value, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: 44, height: 26, borderRadius: 13,
      background: value ? '#111' : '#D0D0D0',
      position: 'relative', cursor: 'pointer',
      transition: 'background 0.2s', flexShrink: 0
    }}
  >
    <div style={{
      position: 'absolute',
      top: 3,
      left: value ? 21 : 3,
      width: 20, height: 20, borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s'
    }} />
  </div>
);

const SectionHeader = ({ title }) => (
  <div style={{
    padding: '16px 20px 6px',
    fontSize: 11, fontWeight: 500,
    color: '#999', textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: '#F7F7F5'
  }}>{title}</div>
);

const SettingsRow = ({ icon, label, value, onPress, toggle, toggleValue, onToggle, danger }) => (
  <div
    onClick={onPress}
    style={{
      display: 'flex', alignItems: 'center',
      padding: '0 20px', height: 52,
      background: 'white', cursor: onPress ? 'pointer' : 'default',
      borderBottom: '0.5px solid rgba(0,0,0,0.06)'
    }}
  >
    <i
      className={`ti ti-${icon}`}
      style={{ fontSize: 18, color: danger ? '#A32D2D' : '#888', marginRight: 14, width: 20, textAlign: 'center' }}
    />
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: 14, color: danger ? '#A32D2D' : '#111' }}>{label}</span>
      {value && (
        <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>{value}</span>
      )}
    </div>
    {toggle
      ? <Toggle value={toggleValue} onChange={onToggle} />
      : onPress
        ? <i className="ti ti-chevron-right" style={{ fontSize: 16, color: '#C0C0C0' }} />
        : null
    }
  </div>
);

// ── Main component ──────────────────────────────────────────

export default function TrainerSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const photoInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([
        apiFetch(`/api/trainer/profile/${userId}`),
        apiFetch(`/api/trainer/clients/${userId}`)
      ]);
      setProfile(p);
      setClients(c || []);
    } catch (err) {
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('userId', userId);
    try {
      const res = await fetch(`${API}/api/trainer/profile/${userId}/photo`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setProfile(p => ({ ...p, profile_photo_url: data.photo_url }));
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  const toggleAccepting = async () => {
    const newVal = !profile.is_accepting_clients;
    setProfile(p => ({ ...p, is_accepting_clients: newVal }));
    await fetch(`${API}/api/trainer/profile/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_accepting_clients: newVal })
    });
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(profile?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = () => {
    setEditForm({
      bio: profile?.bio || '',
      specializations: profile?.specializations || [],
      experience_years: profile?.experience_years || '',
      hourly_rate: profile?.hourly_rate || '',
      city: profile?.city || '',
      phone: profile?.phone || '',
    });
    setEditOpen(true);
  };

  const toggleSpec = (spec) => {
    const current = editForm.specializations || [];
    setEditForm(f => ({
      ...f,
      specializations: current.includes(spec)
        ? current.filter(s => s !== spec)
        : [...current, spec]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/trainer/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      setProfile(p => ({ ...p, ...editForm }));
      setEditOpen(false);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (relationshipId, name) => {
    if (!confirm(`Remove ${name} as a client?`)) return;
    try {
      await apiFetch(`/api/trainer/client/${relationshipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'removed' })
      });
      loadData();
    } catch (err) {
      alert('Failed to remove client');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      await apiFetch(`/api/trainer/profile/${userId}`, { method: 'DELETE' });
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TR';

  const activeClients = (clients || []).filter(c => c.status === 'active');

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', paddingBottom: 100 }}>

      {/* Profile card */}
      <div style={{ background: '#F7F7F5', paddingTop: 52 }}>
        <div style={{
          background: 'white', borderRadius: 12,
          margin: '0 20px 4px', padding: 16,
          border: '0.5px solid rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar with camera overlay */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={photoInputRef}
                onChange={handlePhotoUpload}
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 64, height: 64, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {profile?.profile_photo_url
                  ? <img src={profile.profile_photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 20, fontWeight: 600, color: '#185FA5' }}>{initials}</span>
                }
              </div>
              {/* Camera overlay badge */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: '50%',
                background: '#111', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoUploading
                  ? <span style={{ fontSize: 8, color: 'white' }}>…</span>
                  : <i className="ti ti-camera" style={{ fontSize: 11, color: 'white' }} />
                }
              </div>
            </div>

            {/* Name + bio */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                {profile?.full_name || 'Trainer'}
              </div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {profile?.bio || 'No bio yet'}
              </div>
            </div>

            {/* Edit chevron */}
            <button
              onClick={openEdit}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0C0C0', padding: 4 }}
            >
              <i className="ti ti-pencil" style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', justifyContent: 'space-around',
            paddingTop: 14, marginTop: 14,
            borderTop: '0.5px solid rgba(0,0,0,0.08)'
          }}>
            {[
              { label: 'Clients', value: activeClients.length },
              { label: 'Exp. (yrs)', value: profile?.experience_years || '—' },
              { label: 'Rate', value: profile?.hourly_rate ? `₹${profile.hourly_rate}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section: Trainer ── */}
      <SectionHeader title="Trainer" />
      <div style={{ background: 'white', borderRadius: 0, overflow: 'hidden' }}>
        <SettingsRow
          icon="users"
          label="Accepting clients"
          toggle
          toggleValue={profile?.is_accepting_clients !== false}
          onToggle={toggleAccepting}
        />
        <SettingsRow
          icon="template"
          label="Templates"
          value={`${(clients || []).length > 0 ? '' : ''}`}
          onPress={() => navigate('/trainer/templates')}
        />
        <SettingsRow
          icon="message-circle"
          label="Chat"
          onPress={() => navigate('/trainer/chat')}
        />
      </div>

      {/* ── Section: Invite ── */}
      <SectionHeader title="Invite code" />
      <div style={{ background: 'white', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '0.5px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your code</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, fontFamily: 'monospace' }}>
              {profile?.invite_code || '—'}
            </div>
          </div>
          <button
            onClick={copyInviteCode}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: copied ? '#EAF3DE' : '#111',
              color: copied ? '#3B6D11' : 'white',
              border: 'none', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div style={{ padding: '10px 20px', fontSize: 12, color: '#999' }}>
          Share with clients so they can connect with you in the app
        </div>
      </div>

      {/* ── Section: Account ── */}
      <SectionHeader title="Account" />
      <div style={{ background: 'white', overflow: 'hidden' }}>
        <SettingsRow
          icon="home"
          label="Switch to Member Mode"
          onPress={() => navigate('/home')}
        />
        <SettingsRow
          icon="bell"
          label="Notifications"
          onPress={() => {}}
        />
        <SettingsRow
          icon="lock"
          label="Privacy"
          onPress={() => {}}
        />
      </div>

      {/* Delete account */}
      <div style={{ textAlign: 'center', padding: '4px 20px 16px' }}>
        {deleteConfirm ? (
          <div style={{ background: '#FFF0F0', border: '0.5px solid #A32D2D', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: '#A32D2D', marginBottom: 10 }}>Are you sure? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{ flex: 1, height: 36, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.15)', background: 'white', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', background: '#A32D2D', color: 'white', fontSize: 13, cursor: 'pointer' }}
              >
                Delete account
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleDeleteAccount}
            style={{ fontSize: 12, color: '#C0C0C0', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            onMouseOver={e => e.currentTarget.style.color = '#A32D2D'}
            onMouseOut={e => e.currentTarget.style.color = '#C0C0C0'}
          >
            Delete account
          </button>
        )}
      </div>

      {/* ── Log Out ── */}
      <div style={{ padding: '8px 20px 40px' }}>
        <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0 20px' }} />
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: '#FEF2F2', color: '#EF4444', fontWeight: 600,
            fontSize: 15, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Log Out
        </button>
      </div>

      {/* ── Edit Profile Sheet (normal flow, not fixed) ── */}
      {editOpen && (
        <div style={{
          marginTop: 20, background: 'white',
          border: '0.5px solid rgba(0,0,0,0.1)',
          borderRadius: '16px 16px 0 0', padding: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Edit profile</span>
            <button
              onClick={() => setEditOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bio</div>
            <textarea
              rows={3}
              value={editForm.bio || ''}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell clients about yourself…"
              style={{
                width: '100%', background: '#F7F7F5', border: 'none',
                borderRadius: 8, padding: 12, fontSize: 13, color: '#333',
                resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Experience + Rate */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Experience (yrs)</div>
              <input
                type="number"
                value={editForm.experience_years || ''}
                onChange={e => setEditForm(f => ({ ...f, experience_years: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rate (₹/hr)</div>
              <input
                type="number"
                value={editForm.hourly_rate || ''}
                onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* City + Phone */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>City</div>
              <input
                type="text"
                value={editForm.city || ''}
                onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</div>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Specializations */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specializations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SPECIALIZATIONS.map(spec => {
                const active = (editForm.specializations || []).includes(spec);
                return (
                  <button
                    key={spec}
                    onClick={() => toggleSpec(spec)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12,
                      border: active ? 'none' : '0.5px solid rgba(0,0,0,0.15)',
                      background: active ? '#111' : 'transparent',
                      color: active ? 'white' : '#555',
                      cursor: 'pointer'
                    }}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', height: 48, borderRadius: 10,
              background: saving ? '#ccc' : '#111',
              color: 'white', border: 'none', fontSize: 14,
              fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.08)',
        display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px'
      }}>
        {[
          { label: 'Clients', icon: '👥', path: '/trainer/dashboard' },
          { label: 'Templates', icon: '📋', path: '/trainer/templates' },
          { label: 'Chat', icon: '💬', path: '/trainer/chat' },
          { label: 'Profile', icon: '👤', path: '/trainer/settings', active: true }
        ].map(tab => (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              color: tab.active ? '#111' : '#999', padding: '0 12px'
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
