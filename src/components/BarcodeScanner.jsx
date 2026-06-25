import { useEffect, useRef, useState } from 'react';

/**
 * BarcodeScanner
 * Uses QuaggaJS (loaded from CDN) to scan barcodes via device camera.
 *
 * Props:
 *   onDetected(barcode: string) — called when barcode is scanned
 *   onClose() — close the scanner
 */
export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [lastCode, setLastCode] = useState('');
  const detectedRef = useRef(false);

  useEffect(() => {
    loadQuagga();
    return () => stopScanner();
  }, []);

  const loadQuagga = () => {
    if (window.Quagga) {
      initScanner();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
    script.onload = initScanner;
    script.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to load barcode scanner. Check your connection.');
    };
    document.head.appendChild(script);
  };

  const initScanner = () => {
    if (!scannerRef.current) return;

    window.Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: {
          facingMode: 'environment', // rear camera
          width: { min: 640 },
          height: { min: 480 },
        },
      },
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
      numOfWorkers: 2,
      frequency: 10,
      decoder: {
        readers: [
          'ean_reader',          // EAN-13 (most common)
          'ean_8_reader',        // EAN-8
          'upc_reader',          // UPC-A
          'upc_e_reader',        // UPC-E
          'code_128_reader',     // Code 128
          'code_39_reader',      // Code 39
          'i2of5_reader',        // Interleaved 2of5
        ],
      },
    }, (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        setStatus('error');
        setErrorMsg(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access.'
            : 'Could not start camera. Try refreshing.'
        );
        return;
      }
      window.Quagga.start();
      setStatus('ready');

      window.Quagga.onDetected((result) => {
        const code = result.codeResult?.code;
        if (!code || detectedRef.current) return;

        // Confidence check — require 2 consecutive same reads
        if (code === lastCode) {
          detectedRef.current = true;
          window.Quagga.stop();
          onDetected(code);
        }
        setLastCode(code);
      });

      // Draw scan line overlay
      window.Quagga.onProcessed((result) => {
        const canvas = window.Quagga.canvas?.dom?.overlay;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result?.boxes) {
          result.boxes
            .filter(box => box !== result.box)
            .forEach(box => {
              window.Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
                color: 'rgba(16, 185, 129, 0.3)',
                lineWidth: 1,
              });
            });
        }

        if (result?.box) {
          window.Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
            color: 'rgba(16, 185, 129, 0.9)',
            lineWidth: 2,
          });
        }

        if (result?.codeResult?.code) {
          window.Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, ctx, {
            color: 'rgba(239, 68, 68, 0.8)',
            lineWidth: 3,
          });
        }
      });
    });
  };

  const stopScanner = () => {
    if (window.Quagga) {
      try { window.Quagga.stop(); } catch (e) {}
      window.Quagga.offDetected();
      window.Quagga.offProcessed();
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-camera)] z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 z-10">
        <button
          onClick={() => { stopScanner(); onClose(); }}
          className="flex items-center gap-2 text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cancel
        </button>
        <p className="text-white font-semibold">Scan Barcode</p>
        <div className="w-16" />
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 px-8">
            <div className="text-center">
              <p className="text-4xl mb-4">📷</p>
              <p className="text-white font-semibold mb-2">Camera Error</p>
              <p className="text-zinc-400 text-sm mb-6">{errorMsg}</p>
              <button
                onClick={() => { setStatus('loading'); setErrorMsg(''); initScanner(); }}
                className="px-6 py-3 bg-emerald-500 rounded-xl font-semibold text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Quagga renders video here */}
        <div
          ref={scannerRef}
          className="w-full h-full"
          style={{ display: status === 'ready' ? 'block' : 'none' }}
        />

        {/* Scan frame overlay */}
        {status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Dark corners */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Scan window */}
            <div className="relative w-72 h-44 z-10">
              {/* Clear center */}
              <div className="absolute inset-0 bg-transparent" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />

              {/* Corner borders */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute w-8 h-8 ${pos}`}>
                  <div className={`absolute bg-emerald-400 ${
                    i === 0 ? 'top-0 left-0 w-full h-0.5' : ''
                  }${i === 0 ? ' after:content-[""] after:absolute after:left-0 after:top-0 after:w-0.5 after:h-full after:bg-emerald-400' : ''}`} />
                </div>
              ))}

              {/* Corners using borders */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br" />

              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-emerald-400/80 animate-scan" />
            </div>

            {/* Instruction */}
            <p className="absolute bottom-24 text-white text-sm text-center px-8">
              Point camera at barcode on packaging
            </p>
          </div>
        )}
      </div>

      {/* Manual entry fallback */}
      <div className="px-5 pb-8 pt-4 bg-zinc-950">
        <ManualBarcodeEntry onSubmit={(code) => { stopScanner(); onDetected(code); }} />
      </div>
    </div>
  );
}

function ManualBarcodeEntry({ onSubmit }) {
  const [code, setCode] = useState('');
  return (
    <div>
      <p className="text-zinc-500 text-xs text-center mb-3">Or enter barcode manually</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. 8901491102063"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 14))}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none font-mono"
          inputMode="numeric"
        />
        <button
          onClick={() => code.length >= 6 && onSubmit(code)}
          disabled={code.length < 6}
          className="px-4 py-3 bg-emerald-500 rounded-xl font-semibold text-sm disabled:opacity-40"
        >
          Look up
        </button>
      </div>
    </div>
  );
}
