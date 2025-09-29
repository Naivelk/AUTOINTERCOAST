// services/imageCompression.ts

/** Comprime un File a JPEG con redimensionado. Devuelve DataURL. */
export async function compressImageFile(
    file: File,
    maxSide = 1600,
    quality = 0.72
  ): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('No se pudo leer la imagen'));
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });
    return compressDataUrl(dataUrl, maxSide, quality);
  }
  
  /** Comprime un DataURL a JPEG con redimensionado. Devuelve DataURL. */
  export async function compressDataUrl(
    dataUrl: string,
    maxSide = 1600,
    quality = 0.72
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }
  
  // Export default opcional (compatibilidad)
  export default compressImageFile;
  