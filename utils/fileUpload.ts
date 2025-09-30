// utils/fileUpload.ts

export type CompressOpts = {
    maxSide?: number;        // lado mayor máximo (px)
    quality?: number;        // 0..1 para JPEG/WebP
    mimeType?: string;       // 'image/jpeg' recomendado
  };
  
  /** ---- Helpers de formato ---- */
  
  // Lee un File como dataURL (base64 con prefijo data:image/...)
  export function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
      fr.onload = () => resolve(fr.result as string);
      fr.readAsDataURL(file);
    });
  }
  
  // Devuelve solo la parte base64 (sin el prefijo data:image/...)
  export function dataURLToBase64(d: string) {
    return d.split(',')[1] ?? '';
  }
  
  // Si llega un base64 “pelado”, lo vuelve dataURL con el mime dado
  export function ensureDataUrl(s?: string, mime: string = 'image/jpeg') {
    if (!s) return '';
    if (s.startsWith('data:image')) return s;
    return `data:${mime};base64,${s}`;
  }
  
  /** ---- Carga de imagen ---- */
  
  function fileToImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
      img.src = url;
    });
  }
  
  function dataURLToImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = dataUrl;
    });
  }
  
  /** ---- Núcleo de compresión + reescalado ---- */
  
  function drawScaled(img: HTMLImageElement, maxSide: number) {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
  
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
  
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }
  
  /**
   * Comprime un dataURL a JPEG/WebP reescalando el lado mayor
   */
  export async function compressDataURL(
    dataUrl: string,
    { maxSide = 1280, quality = 0.72, mimeType = 'image/jpeg' }: CompressOpts = {}
  ): Promise<string> {
    const img = await dataURLToImage(dataUrl);
    const canvas = drawScaled(img, maxSide);
    return canvas.toDataURL(mimeType, quality);
  }
  
  /**
   * Lee un File y devuelve **dataURL comprimido** (más eficiente que FileReader->dataURL->comprimir)
   */
  export async function fileToCompressedDataURL(
    file: File,
    { maxSide = 1280, quality = 0.72, mimeType = 'image/jpeg' }: CompressOpts = {}
  ): Promise<string> {
    try {
      const img = await fileToImage(file);
      const canvas = drawScaled(img, maxSide);
      return canvas.toDataURL(mimeType, quality);
    } catch {
      // Fallback: si algo falla, usa el camino vía dataURL
      const original = await fileToDataURL(file);
      try {
        return await compressDataURL(original, { maxSide, quality, mimeType });
      } catch {
        return original;
      }
    }
  }
  