import { useCallback, useRef, useState } from 'react';

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.85;

async function resizeImageClient(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', JPEG_QUALITY);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function useFoodPhotoPicker() {
  const [photos, setPhotos] = useState([]); // array of { file: File, blob: Blob, preview: string }
  const inputRef = useRef(null);

  const addPhoto = useCallback(() => {
    if (!inputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';
      input.onchange = handleFiles;
      document.body.appendChild(input);
      inputRef.current = input;
    }
    inputRef.current.value = '';
    inputRef.current.click();
  }, []);

  async function handleFiles(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotos(prev => {
      if (prev.length >= 3) return prev;
      return prev; // will update after resize
    });
    try {
      const blob = await resizeImageClient(file);
      const preview = URL.createObjectURL(blob);
      setPhotos(prev => {
        if (prev.length >= 3) return prev;
        return [...prev, { file, blob, preview }];
      });
    } catch {
      // ignore resize failures — skip this photo
    }
  }

  const removePhoto = useCallback((index) => {
    setPhotos(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]?.preview);
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setPhotos(prev => { prev.forEach(p => URL.revokeObjectURL(p.preview)); return []; });
  }, []);

  return { photos, addPhoto, removePhoto, clear };
}
