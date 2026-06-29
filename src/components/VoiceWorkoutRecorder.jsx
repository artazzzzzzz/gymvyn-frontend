import { useEffect, useState } from 'react';
import { Mic, X, Check } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useWorkoutSessionContext } from '../contexts/WorkoutSessionContext';
import { supabase } from '../utils/supabase';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MUSCLE_OPTIONS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

async function postAudioToAPI(blob, muscleGroupHint) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const form = new FormData();
  form.append('audio', blob, 'recording.' + (blob.type.includes('mp4') ? 'm4a' : 'webm'));
  if (muscleGroupHint) form.append('muscleGroupHint', muscleGroupHint);

  const res = await fetch(`${BASE_URL}/api/ai/voice/workout`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, code: data.error });
  return data;
}

function Waveform({ audioLevel, active }) {
  const bars = 20;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = Math.sin((Date.now() / 200) + i * 0.6) * 0.5 + 0.5;
        const h = active ? Math.max(4, audioLevel * 36 * phase + 4) : 4;
        return (
          <div key={i} style={{
            width: 3, height: h, borderRadius: 2,
            backgroundColor: 'var(--text-primary)',
            transition: 'height 0.08s ease',
          }} />
        );
      })}
    </div>
  );
}

export default function VoiceWorkoutRecorder({ onClose, onManualSearch }) {
  const { start, stop, audioLevel, error: recError, blob } = useVoiceRecorder();
  const { addExercise, addSet, updateSet } = useWorkoutSessionContext();

  const [uiMode, setUiMode]     = useState('recording'); // 'recording' | 'matches'
  const [uiStatus, setUiStatus] = useState('idle');       // 'idle' | 'recording' | 'uploading' | 'error'
  const [muscleHint, setMuscleHint] = useState(null);
  const [message, setMessage]   = useState('');
  const [result, setResult]     = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [tick, setTick]         = useState(0);

  // Waveform animation ticker
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
      stop();
    }
  }

  // Upload when blob arrives (manual stop OR auto-stop from silence/timer)
  useEffect(() => {
    if (blob && uiStatus === 'recording') {
      setUiStatus('uploading');
      uploadBlob(blob);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  async function uploadBlob(b) {
    try {
      const data = await postAudioToAPI(b, muscleHint);
      setResult(data);
      setUiMode('matches');
    } catch (err) {
      if (err.status === 429) {
        setMessage('Daily AI limit reached. Try again tomorrow.');
        setUiStatus('error');
      } else if (err.code === 'EMPTY_TRANSCRIPT') {
        setMessage("Didn't catch that. Tap the mic to try again.");
        setUiStatus('idle');
      } else {
        setMessage('Something went wrong. Please try again.');
        setUiStatus('error');
      }
    }
  }

  function handleSelectCandidate(candidate) {
    const { exercise_id, exercise_name, muscle_group } = candidate;
    const sets = result?.matches?.sets || [];

    // Add exercise — useWorkoutSession initialises it with 1 empty set (setNumber 1)
    addExercise({ id: exercise_id, name: exercise_name, muscle_group });

    // Prefill sets using functional state updates (React 18 batches these safely)
    sets.forEach((set, i) => {
      const setNumber = i + 1;
      if (i > 0) addSet(exercise_id);
      if (set.weight_kg != null) updateSet(exercise_id, setNumber, 'weight', String(set.weight_kg));
      updateSet(exercise_id, setNumber, 'reps', String(set.reps || ''));
    });

    const n = sets.length;
    setSuccessMsg(`Added ${exercise_name} with ${n} set${n !== 1 ? 's' : ''}`);
    setTimeout(() => onClose(), 1400);
  }

  function handleManualSearch() {
    const spokenName = result?.matches?.spokenExerciseName || '';
    onManualSearch?.(spokenName);
    onClose();
  }

  const isRecording = uiStatus === 'recording';
  const isUploading = uiStatus === 'uploading';

  // ── Mode B: match selection ──────────────────────────────────────────────────
  if (uiMode === 'matches' && result) {
    const { transcript, matches } = result;
    const { spokenExerciseName, candidates, topMatchConfidence } = matches;

    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 48px',
          maxHeight: '82vh', overflowY: 'auto',
          animation: 'slideUpSheet 0.25s ease',
        }}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--border)', margin: '0 auto 20px' }} />

          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={20} />
          </button>

          {/* Transcript */}
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Heard: "{transcript}"
          </p>

          {/* Success message */}
          {successMsg && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--success-bg)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color="var(--success)" strokeWidth={3} />
              <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          {topMatchConfidence === 'none' ? (
            /* No candidates at all */
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Couldn't find "{spokenExerciseName}"
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                Try searching manually or say the exercise name more clearly.
              </p>
              <button
                onClick={handleManualSearch}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 12,
                  border: '1.5px dashed var(--border-strong)',
                  background: 'transparent', fontSize: 14, fontWeight: 500,
                  color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                Search manually for "{spokenExerciseName}"
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                Did you mean...?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {candidates.map((candidate, i) => {
                  const isTop = i === 0 && topMatchConfidence === 'high';
                  return (
                    <button
                      key={candidate.exercise_id}
                      onClick={() => handleSelectCandidate(candidate)}
                      style={{
                        width: '100%', padding: '12px 14px',
                        borderRadius: 12, cursor: 'pointer',
                        background: isTop ? 'var(--success-bg)' : 'var(--bg-pill)',
                        border: `1px solid ${isTop ? 'var(--success)' : 'var(--border)'}`,
                        textAlign: 'left',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          {isTop && <Check size={13} color="var(--success)" strokeWidth={3} style={{ flexShrink: 0 }} />}
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {candidate.exercise_name}
                          </span>
                        </div>
                        {candidate.muscle_group && (
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {candidate.muscle_group}
                          </span>
                        )}
                      </div>

                      {/* Similarity bar */}
                      <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--border)', flexShrink: 0 }}>
                        <div style={{
                          width: `${Math.round(candidate.similarity_score * 100)}%`,
                          height: '100%', borderRadius: 2,
                          background: isTop ? 'var(--success)' : 'var(--text-cta)',
                        }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleManualSearch}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 13, fontWeight: 500,
                  color: 'var(--text-tertiary)', cursor: 'pointer',
                }}
              >
                None of these — search manually
              </button>
            </>
          )}
        </div>
        <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      </>
    );
  }

  // ── Mode A: recording ────────────────────────────────────────────────────────
  return (
    <>
      <div onClick={!isRecording ? onClose : undefined} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        animation: 'slideUpSheet 0.25s ease',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--border)' }} />

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
          <X size={20} />
        </button>

        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>AI Voice Log</div>

        {/* Muscle group hint selector */}
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, textAlign: 'center' }}>
            Hitting which muscle? (optional)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {MUSCLE_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => setMuscleHint(prev => prev === m ? null : m)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${muscleHint === m ? 'var(--text-cta)' : 'var(--border)'}`,
                  background: muscleHint === m ? 'var(--accent-bg)' : 'var(--bg-pill)',
                  color: muscleHint === m ? 'var(--text-cta)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

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
          {isUploading && 'Finding your exercise…'}
          {isRecording && 'Listening… auto-stops after silence'}
          {uiStatus === 'idle' && !message && 'Tap mic and say the exercise + sets'}
        </div>

        {/* Error / retry message */}
        {message && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{message}</div>
            {uiStatus !== 'error' && (
              <button
                onClick={() => setMessage('')}
                style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
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
