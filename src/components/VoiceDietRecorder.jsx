import { useEffect, useState } from 'react';
import { Mic, X } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { supabase } from '../utils/supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function postAudioToAPI(blob) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const form = new FormData();
  form.append('audio', blob, 'recording.' + (blob.type.includes('mp4') ? 'm4a' : 'webm'));

  const res = await fetch(`${BASE_URL}/api/ai/voice/diet`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, code: data.error });
  return data;
}

// Waveform bars animation
function Waveform({ audioLevel, active }) {
  const bars = 20;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = Math.sin((Date.now() / 200) + i * 0.6) * 0.5 + 0.5;
        const h = active ? Math.max(4, audioLevel * 36 * phase + 4) : 4;
        return (
          <div key={i} style={{
            width: 3,
            height: h,
            borderRadius: 2,
            backgroundColor: 'var(--text-primary)',
            transition: 'height 0.08s ease',
          }} />
        );
      })}
    </div>
  );
}

export default function VoiceDietRecorder({ onParsed, onClose }) {
  const { start, stop, audioLevel, error: recError, blob } = useVoiceRecorder();
  const [uiStatus, setUiStatus] = useState('idle'); // 'idle' | 'recording' | 'uploading' | 'error'
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  // Animate waveform
  useEffect(() => {
    if (uiStatus !== 'recording') return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [uiStatus]);

  async function handleMicPress() {
    if (uiStatus === 'idle') {
      setMessage('');
      setUiStatus('recording');
      await start();
    } else if (uiStatus === 'recording') {
      stop(); // triggers onstop → blob state → useEffect below
    }
  }

  // Upload whenever blob arrives (manual stop OR auto-stop via silence/timer)
  useEffect(() => {
    if (blob && uiStatus === 'recording') {
      setUiStatus('uploading');
      uploadBlob(blob);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  async function uploadBlob(blob) {
    setUiStatus('uploading');
    try {
      const result = await postAudioToAPI(blob);
      onParsed(result);
      onClose();
    } catch (err) {
      if (err.status === 429) {
        setMessage('Daily AI limit reached. Try again tomorrow.');
      } else if (err.code === 'EMPTY_TRANSCRIPT') {
        setMessage("Didn't catch that. Try again?");
        setUiStatus('idle');
        return;
      } else {
        setMessage('Something went wrong. Please try again.');
      }
      setUiStatus('error');
    }
  }

  const isRecording = uiStatus === 'recording';
  const isUploading = uiStatus === 'uploading';
  const isError = uiStatus === 'error';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px calc(48px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        animation: 'slideUpSheet 0.25s ease',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--border)' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
          <X size={20} />
        </button>

        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>AI Voice Diet Log</div>

        {/* Waveform */}
        {isRecording && <Waveform audioLevel={audioLevel} active key={tick} />}

        {/* Mic button */}
        <button
          onClick={handleMicPress}
          disabled={isUploading}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            backgroundColor: isRecording ? 'var(--error)' : 'var(--text-primary)',
            color: 'var(--bg-card)',
            border: 'none', cursor: isUploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording ? '0 0 0 12px rgba(239,68,68,0.15)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Mic size={32} />
        </button>

        {/* Status text */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', minHeight: 20 }}>
          {isUploading && 'Analysing your meal...'}
          {isRecording && 'Listening… auto-stops after silence'}
          {uiStatus === 'idle' && !message && 'Tap mic and describe what you ate'}
        </div>

        {/* Error / retry message */}
        {message && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: isError && uiStatus === 'error' && message.includes('limit') ? 'var(--error)' : 'var(--text-secondary)', marginBottom: 8 }}>
              {message}
            </div>
            {message.includes("Didn't catch") && (
              <button onClick={() => { setMessage(''); setUiStatus('idle'); }}
                style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Try again
              </button>
            )}
          </div>
        )}

        {recError && (
          <div style={{ fontSize: 12, color: 'var(--error)', textAlign: 'center' }}>{recError}</div>
        )}
      </div>

      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  );
}
