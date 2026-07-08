import { useCallback, useEffect, useRef, useState } from 'react';

const SILENCE_THRESHOLD = 0.02;   // raised from 0.01 — ambient noise won't count as speech
const SILENCE_DURATION_MS = 2000;
const MAX_DURATION_MS = 30000;

function getSupportedMimeType() {
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'error'
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  const [blob, setBlob] = useState(null); // set when recording finishes (manual or auto)

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const mimeTypeRef = useRef('');

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    mr.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    setStatus('recording');
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setError('Microphone permission denied.');
      setStatus('error');
      return;
    }
    streamRef.current = stream;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = null;
    let hasSpeech = false; // silence timer only activates after first speech detected

    function tick() {
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setAudioLevel(Math.min(rms * 4, 1));

      const now = Date.now();
      if (rms >= SILENCE_THRESHOLD) {
        hasSpeech = true;
        silenceStart = null;
      } else if (hasSpeech) {
        // Only count silence AFTER speech has been detected at least once
        if (!silenceStart) silenceStart = now;
        else if (now - silenceStart >= SILENCE_DURATION_MS) {
          stop();
          return;
        }
      }
      // If hasSpeech is false (still waiting for first word), just keep ticking — never auto-stop

      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);

    const maxTimer = setTimeout(() => stop(), MAX_DURATION_MS);

    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      clearTimeout(maxTimer);
      cleanup();
      setStatus('processing');
      const b = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
      setBlob(b);
    };

    mr.start(100);
  }, [stop, cleanup]);

  return { status, start, stop, audioLevel, error, blob };
}
