import { useState, useEffect, useRef } from 'react';
import { SEVERITY } from '../utils/formFeedback';

/**
 * FormFeedbackOverlay
 * Renders on top of the camera/canvas in FormCoach.
 *
 * Props:
 *   activeFaults: array of fault rule objects currently active
 *   primaryFault: the highest priority fault (shown big)
 *   repCount: current rep count
 *   phase: 'up' | 'down' | 'rest'
 *   exerciseName: string
 *   voiceEnabled: bool
 *   onToggleVoice: fn
 */
export default function FormFeedbackOverlay({
  activeFaults = [],
  primaryFault = null,
  repCount = 0,
  phase = 'rest',
  exerciseName = '',
  voiceEnabled = true,
  onToggleVoice,
}) {
  const [recentMessages, setRecentMessages] = useState([]);
  const [flashGood, setFlashGood] = useState(false);
  const prevRepCount = useRef(repCount);
  const prevPrimaryFault = useRef(null);

  // Flash "Good rep!" when rep count increases with no faults
  useEffect(() => {
    if (repCount > prevRepCount.current) {
      prevRepCount.current = repCount;
      if (activeFaults.length === 0) {
        setFlashGood(true);
        setTimeout(() => setFlashGood(false), 1500);
      }
    }
  }, [repCount, activeFaults.length]);

  // Add new faults to message history
  useEffect(() => {
    if (primaryFault && primaryFault.id !== prevPrimaryFault.current?.id) {
      prevPrimaryFault.current = primaryFault;
      setRecentMessages(prev => {
        const updated = [
          { id: primaryFault.id, message: primaryFault.message, severity: primaryFault.severity, ts: Date.now() },
          ...prev.filter(m => m.id !== primaryFault.id)
        ].slice(0, 3); // keep last 3
        return updated;
      });
    }
    if (!primaryFault) {
      prevPrimaryFault.current = null;
    }
  }, [primaryFault]);

  // Auto-expire messages
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentMessages(prev => prev.filter(m => Date.now() - m.ts < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* Top bar — rep counter + phase + voice toggle */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 pointer-events-auto">
        {/* Rep counter */}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-white leading-none">{repCount}</p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Reps</p>
          </div>
          <div className={`w-px h-8 ${phase === 'up' ? 'bg-emerald-500' : phase === 'down' ? 'bg-amber-500' : 'bg-zinc-700'}`} />
          <div className="text-center">
            <p className={`text-xs font-semibold uppercase ${
              phase === 'up' ? 'text-emerald-400' :
              phase === 'down' ? 'text-amber-400' :
              'text-zinc-500'
            }`}>
              {phase === 'up' ? '▲ UP' : phase === 'down' ? '▼ DOWN' : '— HOLD'}
            </p>
          </div>
        </div>

        {/* Voice toggle */}
        <button
          onClick={onToggleVoice}
          className={`w-10 h-10 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all ${
            voiceEnabled
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-black/60 border-zinc-700 text-zinc-500'
          }`}
        >
          {voiceEnabled ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Primary fault alert — big centered banner */}
      {primaryFault && (
        <div className={`absolute left-4 right-4 top-20 animate-fade-in`}>
          <div className={`rounded-2xl px-5 py-4 border backdrop-blur-md ${
            primaryFault.severity === SEVERITY.ERROR
              ? 'bg-red-500/20 border-red-500/40'
              : 'bg-amber-500/20 border-amber-500/40'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                primaryFault.severity === SEVERITY.ERROR ? 'bg-red-500/30' : 'bg-amber-500/30'
              }`}>
                {primaryFault.severity === SEVERITY.ERROR ? (
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                  </svg>
                )}
              </div>
              <p className={`font-semibold text-sm ${
                primaryFault.severity === SEVERITY.ERROR ? 'text-red-300' : 'text-amber-300'
              }`}>
                {primaryFault.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Good rep flash */}
      {flashGood && (
        <div className="absolute left-4 right-4 top-20">
          <div className="bg-emerald-500/25 border border-emerald-500/50 rounded-2xl px-5 py-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                </svg>
              </div>
              <p className="text-emerald-300 font-semibold">Good rep!</p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary faults — small pills at bottom */}
      {activeFaults.length > 1 && (
        <div className="absolute bottom-24 left-4 right-4 flex flex-wrap gap-2 justify-center">
          {activeFaults
            .filter(f => f.id !== primaryFault?.id)
            .slice(0, 3)
            .map(fault => (
              <div
                key={fault.id}
                className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border ${
                  fault.severity === SEVERITY.ERROR
                    ? 'bg-red-500/15 border-red-500/30 text-red-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {fault.message}
              </div>
            ))}
        </div>
      )}

      {/* Form score bar — bottom left */}
      <div className="absolute bottom-8 left-4">
        <FormScoreBar activeFaultCount={activeFaults.length} />
      </div>

      {/* Exercise name — bottom center */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5">
          <p className="text-xs text-zinc-400 font-medium">{exerciseName}</p>
        </div>
      </div>
    </div>
  );
}

function FormScoreBar({ activeFaultCount }) {
  const score = Math.max(0, 100 - activeFaultCount * 25);
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const label = score >= 80 ? 'Great' : score >= 50 ? 'Fix form' : 'Stop!';

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[80px]">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Form</p>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${
          score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {label}
        </span>
      </div>
    </div>
  );
}
