import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabase';
import { TrainerCodeCard } from '../components/TrainerCodeCard';
import { TrainerJoinGymSheet } from '../components/TrainerJoinGymSheet';
import { CitySearchInput } from '../components/CitySearchInput';
import { useTheme } from '../contexts/ThemeContext';
import { usePhotoPicker } from '../hooks/usePhotoPicker';

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
      background: value ? "var(--text-primary)" : 'var(--border-strong)',
      position: 'relative', cursor: 'pointer',
      transition: 'background 0.2s', flexShrink: 0
    }}
  >
    <div style={{
      position: 'absolute',
      top: 3,
      left: value ? 21 : 3,
      width: 20, height: 20, borderRadius: '50%',
      background: 'var(--bg-card)',
      transition: 'left 0.2s'
    }} />
  </div>
);

const SectionHeader = ({ title }) => (
  <div style={{
    padding: '16px 20px 6px',
    fontSize: 11, fontWeight: 500,
    color: "var(--text-tertiary)", textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: 'var(--bg-primary)'
  }}>{title}</div>
);

const SettingsRow = ({ icon, label, value, onPress, toggle, toggleValue, onToggle, danger }) => (
  <div
    onClick={onPress}
    style={{
      display: 'flex', alignItems: 'center',
      padding: '0 20px', height: 52,
      background: 'var(--bg-card)', cursor: onPress ? 'pointer' : 'default',
      borderBottom: '0.5px solid var(--border)'
    }}
  >
    <i
      className={`ti ti-${icon}`}
      style={{ fontSize: 18, color: danger ? 'var(--error)' : "var(--text-tertiary)", marginRight: 14, width: 20, textAlign: 'center' }}
    />
    <div style={{ flex: 1 }}>
      <span style={{ fontSize: 14, color: danger ? 'var(--error)' : "var(--text-primary)" }}>{label}</span>
      {value && (
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginLeft: 8 }}>{value}</span>
      )}
    </div>
    {toggle
      ? <Toggle value={toggleValue} onChange={onToggle} />
      : onPress
        ? <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--text-disabled)' }} />
        : null
    }
  </div>
);

// ── Main component ──────────────────────────────────────────

export default function TrainerSettings() {
  const { user, enterMemberMode, memberDataComplete } = useAuth();
  const navigate = useNavigate();
  const { theme, setThemeMode } = useTheme();
  const { photo: photoPick, pickPhoto, clearPhoto } = usePhotoPicker();

  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [joinGymOpen, setJoinGymOpen] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [p, c] = await Promise.all([
        apiFetch(`/api/trainer/profile/${userId}`),
        apiFetch(`/api/trainer/clients/${userId}`)
      ]);
      setProfile(p);
      setClients(c || []);
    } catch (err) {
      // Do not leave `profile` null and let the "Gym: Not linked" row
      // render as if that were confirmed — surface a distinct error.
      console.error('Load settings error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // ─── Photo upload (triggered by hook when user picks a photo) ─────────────
  useEffect(() => {
    if (!photoPick) return;
    async function doUpload() {
      setPhotoUploading(true);
      setPhotoError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const formData = new FormData();
        formData.append('photo', photoPick.blob, 'avatar.jpg');
        const res = await fetch(`${API}/api/trainer/profile/${userId}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setProfile(p => ({ ...p, profile_photo_url: data.photo_url }));
      } catch {
        setPhotoError('Photo upload failed. Please try again.');
      } finally {
        setPhotoUploading(false);
        clearPhoto();
      }
    }
    doUpload();
  }, [photoPick]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAccepting = async () => {
    const newVal = !profile.is_accepting_clients;
    setProfile(p => ({ ...p, is_accepting_clients: newVal }));
    await apiFetch(`/api/trainer/profile/${userId}`, {
      method: 'PATCH',
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
      await apiFetch(`/api/trainer/profile/${userId}`, {
        method: 'PATCH',
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
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      // DELETE /api/trainer/profile/:userId doesn't exist on the backend —
      // reuse the same generic self-delete endpoint member Settings.jsx
      // uses. deleteUserCascade (shared by both) now also clears
      // trainer_profiles so this doesn't leave an orphaned row.
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--error)', marginBottom: 16, fontWeight: 500 }}>{fetchError}</p>
          <button onClick={loadData} style={{ height: 40, padding: '0 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Try again</button>
        </div>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>

      {/* Profile card */}
      <div style={{ background: 'var(--bg-primary)', paddingTop: 52 }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 12,
          margin: '0 20px 4px', padding: 16,
          border: '0.5px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar with camera overlay */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={pickPhoto}
                  style={{ width: 64, height: 64, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', background: 'var(--accent-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {profile?.profile_photo_url
                    ? <img src={profile.profile_photo_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-cta)' }}>{initials}</span>
                  }
                </div>
                {/* Camera overlay badge */}
                <div
                  onClick={pickPhoto}
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 22, height: 22, borderRadius: '50%',
                    background: "var(--text-primary)", display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {photoUploading
                    ? <span style={{ fontSize: 8, color: 'white' }}>…</span>
                    : <i className="ti ti-camera" style={{ fontSize: 11, color: 'white' }} />
                  }
                </div>
              </div>
              {photoError && (
                <div style={{ fontSize: 10, color: 'var(--error)', marginTop: 4, maxWidth: 64, textAlign: 'center', lineHeight: 1.3 }}>
                  Upload failed
                </div>
              )}
            </div>

            {/* Name + bio */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                {profile?.full_name || 'Trainer'}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {profile?.bio || 'No bio yet'}
              </div>
            </div>

            {/* Edit chevron */}
            <button
              onClick={openEdit}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 4 }}
            >
              <i className="ti ti-pencil" style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', justifyContent: 'space-around',
            paddingTop: 14, marginTop: 14,
            borderTop: '0.5px solid var(--border)'
          }}>
            {[
              { label: 'Clients', value: activeClients.length },
              { label: 'Exp. (yrs)', value: profile?.experience_years || '—' },
              { label: 'Rate', value: profile?.hourly_rate ? `₹${profile.hourly_rate}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section: Trainer ── */}
      <SectionHeader title="Trainer" />
      <div style={{ background: 'var(--bg-card)', borderRadius: 0, overflow: 'hidden' }}>
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
        <SettingsRow
          icon="building"
          label="Gym"
          value={
            fetchError
              ? "Couldn't load"
              : profile?.gym_id ? 'Linked' : (profile?.pending_gym_id ? 'Pending approval' : 'Not linked')
          }
          onPress={() => (fetchError ? loadData() : setJoinGymOpen(true))}
        />
      </div>

      {/* ── Section: Your Trainer Code ── */}
      <SectionHeader title="Your Trainer Code" />
      <div style={{ padding: '0 16px 4px' }}>
        <TrainerCodeCard />
      </div>

      {/* ── Section: Account ── */}
      <SectionHeader title="Account" />
      <div style={{ background: 'var(--bg-card)', overflow: 'hidden' }}>
        <SettingsRow
          icon="home"
          label="Switch to Member Mode"
          onPress={() => {
            enterMemberMode()
            if (!memberDataComplete) {
              navigate('/onboarding', { state: { returnTo: '/home', completionKey: 'member' } })
            } else {
              navigate('/home')
            }
          }}
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

      {/* ── Appearance ── */}
      <div style={{
        padding: '16px 20px 6px',
        fontSize: 11, fontWeight: 500,
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em',
        background: 'var(--bg)',
      }}>APPEARANCE</div>
      <div style={{ padding: '0 16px 4px' }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {[
            { id: 'light', label: 'Light', Icon: Sun },
            { id: 'dark', label: 'Dark', Icon: Moon },
            { id: 'system', label: 'System', Icon: Monitor, sub: 'Follows your device setting' },
          ].map((item, i) => (
            <div
              key={item.id}
              onClick={() => setThemeMode(item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', cursor: 'pointer', background: 'transparent',
                borderBottom: i < 2 ? '1px solid var(--divider)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <item.Icon size={18} color="var(--text-primary)" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>}
                </div>
              </div>
              {theme === item.id && <Check size={18} color="var(--accent)" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Log Out / Delete Account ── */}
      <div style={{ padding: '8px 20px 40px' }}>
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0 20px' }} />
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'var(--error-bg)', color: 'var(--error)', fontWeight: 600,
            fontSize: 15, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Log Out
        </button>
        <button
          onClick={() => { setDeleteConfirm(''); setDeleteError(''); setShowDeleteSheet(true) }}
          style={{
            width: '100%', padding: '14px', marginTop: 12,
            background: 'none', color: 'var(--error)', fontWeight: 500,
            fontSize: 14, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Delete Account
        </button>
      </div>

      {/* ── Delete Account Sheet ── */}
      {showDeleteSheet && (
        <>
          <div
            onClick={() => { setShowDeleteSheet(false); setDeleteConfirm('') }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            zIndex: 201, padding: '0 20px 32px',
          }}>
            <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '12px auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Delete Account?</div>

            <div style={{
              backgroundColor: 'var(--warning-bg)', borderLeft: '3px solid var(--warning)',
              borderRadius: '0 10px 10px 0', padding: 12, marginTop: 14,
            }}>
              <div style={{ fontSize: 13, color: 'var(--warning)' }}>
                ⚠ This will permanently delete your trainer account, profile, and client relationships. This cannot be undone.
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Type DELETE to confirm</div>
              <input
                type="text" placeholder="Type DELETE" value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                style={{
                  width: '100%', height: 52, border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: '0 16px', fontSize: 15,
                  boxSizing: 'border-box', outline: 'none', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {deleteError && (
              <div style={{ fontSize: 13, color: 'var(--error)', marginTop: 12 }}>{deleteError}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--error)', color: 'white',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 500,
                  cursor: 'pointer', opacity: (deleteConfirm !== 'DELETE' || deleting) ? 0.4 : 1,
                }}
              >{deleting ? 'Deleting...' : 'Delete Account'}</button>
              <button
                onClick={() => { setShowDeleteSheet(false); setDeleteConfirm('') }}
                style={{
                  width: '100%', height: 52, backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                  border: '0.5px solid var(--text-primary)', borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Profile Sheet ── */}
      {editOpen && (
        <>
          <div onClick={() => setEditOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 190 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 191,
            background: 'var(--bg-card)',
            borderRadius: '16px 16px 0 0', padding: 20,
            maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box'
          }}>
          <div style={{ width: 40, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Edit profile</span>
            <button
              onClick={() => setEditOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: "var(--text-tertiary)", lineHeight: 1 }}
            >×</button>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bio</div>
            <textarea
              rows={3}
              value={editForm.bio || ''}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell clients about yourself…"
              style={{
                width: '100%', background: 'var(--bg-primary)', border: 'none',
                borderRadius: 8, padding: 12, fontSize: 13, color: "var(--text-secondary)",
                resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Experience + Rate */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Experience (yrs)</div>
              <input
                type="number"
                value={editForm.experience_years || ''}
                onChange={e => setEditForm(f => ({ ...f, experience_years: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid var(--border)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rate (₹/hr)</div>
              <input
                type="number"
                value={editForm.hourly_rate || ''}
                onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid var(--border)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* City + Phone */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>City</div>
              <CitySearchInput
                variant="compact"
                placeholder="Search city…"
                value={editForm.city}
                onChange={v => setEditForm(f => ({ ...f, city: v }))}
                style={{
                  height: 40, borderRadius: 8, border: '0.5px solid var(--border)',
                  padding: '0 12px', fontSize: 13, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</div>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                style={{ width: '100%', height: 40, borderRadius: 8, border: '0.5px solid var(--border)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Specializations */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specializations</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SPECIALIZATIONS.map(spec => {
                const active = (editForm.specializations || []).includes(spec);
                return (
                  <button
                    key={spec}
                    onClick={() => toggleSpec(spec)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12,
                      border: active ? 'none' : '0.5px solid var(--border)',
                      background: active ? "var(--text-primary)" : 'transparent',
                      color: active ? 'var(--bg-primary)' : "var(--text-secondary)",
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
              background: saving ? 'var(--text-tertiary)' : "var(--text-primary)",
              color: 'white', border: 'none', fontSize: 14,
              fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          </div>
        </>
      )}

      <TrainerJoinGymSheet
        open={joinGymOpen}
        onClose={() => setJoinGymOpen(false)}
        onSuccess={loadData}
      />

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderTop: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-around', padding: '10px 0 24px'
      }}>
        {[
          { label: 'Clients',   path: '/trainer/dashboard',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { label: 'Templates', path: '/trainer/templates',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { label: 'Chat',      path: '/trainer/chat',        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
          { label: 'Profile',   path: '/trainer/settings', active: true, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(tab => (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              color: tab.active ? "var(--text-primary)" : "var(--text-tertiary)", padding: '0 12px'
            }}
          >
            <span>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
