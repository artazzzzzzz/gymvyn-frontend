import { useState } from 'react';
import { Camera, X, Plus } from 'lucide-react';
import { useFoodPhotoPicker } from '../hooks/useFoodPhotoPicker';
import { supabase } from '../utils/supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function postPhotosToAPI(blobs) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const form = new FormData();
  blobs.forEach((blob, i) => {
    form.append('images', blob, `photo_${i}.jpg`);
  });

  const res = await fetch(`${BASE_URL}/api/ai/vision/food`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, code: data.error });
  return data;
}

export default function FoodPhotoCapture({ onParsed, onClose }) {
  const { photos, addPhoto, removePhoto, clear } = useFoodPhotoPicker();
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  async function handleAnalyze() {
    if (photos.length === 0) return;
    setStatus('uploading');
    setErrorMsg('');
    try {
      const result = await postPhotosToAPI(photos.map(p => p.blob));
      clear();
      onParsed(result);
      onClose();
    } catch (err) {
      if (err.status === 429) {
        setErrorMsg('Daily AI limit reached. Try again tomorrow.');
      } else if (err.status === 422) {
        setErrorMsg("Couldn't analyse. Try a clearer photo.");
        setStatus('idle');
        return;
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
      setStatus('error');
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 48px',
        display: 'flex', flexDirection: 'column', gap: 16,
        animation: 'slideUpSheet 0.25s ease',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--border)', alignSelf: 'center' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Snap your meal</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Add up to 3 photos. Multiple angles help.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {photos.map((photo, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={photo.preview} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>
                <X size={12} />
              </button>
            </div>
          ))}

          {photos.length < 3 && (
            <button onClick={addPhoto}
              style={{
                aspectRatio: '1', borderRadius: 12,
                border: '2px dashed var(--border)',
                backgroundColor: 'var(--bg-primary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, cursor: 'pointer', color: 'var(--text-tertiary)',
              }}>
              <Plus size={20} />
              <span style={{ fontSize: 11 }}>Add Photo</span>
            </button>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center' }}>{errorMsg}</div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={photos.length === 0 || status === 'uploading'}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
            backgroundColor: photos.length === 0 ? 'var(--bg-pill)' : 'var(--text-primary)',
            color: 'var(--bg-card)',
            fontSize: 15, fontWeight: 600,
            cursor: photos.length === 0 || status === 'uploading' ? 'default' : 'pointer',
            opacity: status === 'uploading' ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {status === 'uploading' ? (
            'Analysing…'
          ) : (
            <><Camera size={16} /> Analyze {photos.length > 0 ? `(${photos.length})` : ''}</>
          )}
        </button>
      </div>

      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  );
}
