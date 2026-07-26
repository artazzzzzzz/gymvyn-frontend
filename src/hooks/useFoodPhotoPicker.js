import { useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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

  const processFile = useCallback(async (file) => {
    if (!file) return;
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
  }, []);

  const addPhotoNative = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
      });
      const blob = await (await fetch(photo.webPath)).blob();
      const file = new File([blob], `photo.${photo.format || 'jpeg'}`, { type: blob.type || 'image/jpeg' });
      await processFile(file);
    } catch {
      // user cancelled the native camera, or it's unavailable — no-op,
      // matches the web input's cancel behavior (handleFiles never fires).
    }
  }, [processFile]);

  const handleFiles = useCallback((e) => {
    processFile(e.target.files?.[0]);
  }, [processFile]);

  const addPhoto = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      addPhotoNative();
      return;
    }

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
  }, [addPhotoNative, handleFiles]);

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
