/**
 * Utilidades para la detección de dispositivos
 */

/**
 * Detecta si el dispositivo es iOS (iPhone, iPad, iPod) o Mac con pantalla táctil
 */
export const isIOS = (): boolean => {
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent || '' : '';
  return /iPad|iPhone|iPod/.test(ua) || (/\bMacintosh\b/.test(ua) && 'ontouchend' in document);
};

/**
 * Detecta si el dispositivo es móvil
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Detecta si el navegador es Safari
 */
export const isSafari = (): boolean => {
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent || '' : '';
  return /^((?!chrome|android).)*safari/i.test(ua);
};
