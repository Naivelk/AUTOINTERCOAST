import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { InspectionContext } from '../App';
import { generatePdfBlob } from '../services/pdfGenerator';
import { saveInspection } from '../services/inspectionService';

// ───────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────
import { isIOS } from '../utils/device';

// ───────────────────────────────────────────────────────────
// Tipos
interface SummaryItemProps {
  label: string;
  value: string | React.ReactNode;
  isMissing?: boolean;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, isMissing = false }) => (
  <div className="py-2 border-b border-gray-200 flex justify-between items-center">
    <span className="text-sm font-medium text-gray-600">{label}:</span>
    {isMissing ? (
      <span className="text-sm text-gray-400 italic">(Opcional - No proporcionado)</span>
    ) : (
      <span className="text-sm text-gray-800 text-right break-all">{value}</span>
    )}
  </div>
);

// Blob -> base64 (solo la parte base64)
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el PDF'));
    reader.onload = () => {
      const result = reader.result as string; // "data:application/pdf;base64,XXXX"
      resolve(result.split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
  });

const SummaryScreen: React.FC = () => {
  const context = useContext(InspectionContext);
  const navigate = useNavigate();

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState('Operation Successful');
  const [modalMessage, setModalMessage] = useState('Your inspection has been saved successfully.');

  const addDebugLog = (m: string) => {
    console.log('[DEBUG]', m);
    setDebugLogs(prev => [...prev, m].slice(-6));
  };

  if (!context) return <div>Cargando...</div>;

  const { currentInspection, setCurrentInspection } = context;

  // Rehidrata si iOS remontó el componente y el contexto viene vacío
  useEffect(() => {
    if (!currentInspection) {
      try {
        const cached = sessionStorage.getItem('currentInspection');
        if (cached) setCurrentInspection(JSON.parse(cached));
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setIsGeneratingPdf(false); }, [currentInspection?.id]);

  if (!currentInspection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Modal
          isOpen={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
          contentLabel="Resultado de la operación"
          className="modal"
          overlayClassName="modal-overlay"
        >
          <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
          <p className="mb-4">{modalMessage}</p>

          {debugLogs.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
              <p className="font-semibold mb-2">Detalles:</p>
              {debugLogs.map((log, i) => (
                <div key={i} className="py-1 border-b border-gray-200 last:border-0">{log}</div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowSuccessModal(false)}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </Modal>
      </div>
    );
  }

  
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/\bMacintosh\b/.test(navigator.userAgent) && 'ontouchend' in document);
  const openingRef = React.useRef(false); // evita doble click o dobles invocaciones

  const handleGeneratePdf = async () => {
    if (openingRef.current || !currentInspection) return;
    openingRef.current = true;
    setIsGeneratingPdf(true);

    try {
      const blob = await generatePdfBlob(currentInspection as any);
      const url = URL.createObjectURL(blob);
      const filename = `inspection_${currentInspection.policyNumber || 'report'}_${Date.now()}.pdf`.replace(/[^\w.-]/g,'_');

      if (isiOS) {
        // iOS: no intenta descargar; solo abre el visor en una pestaña
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        // Desktop: descarga directa
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      }

      // No abrimos el modal aquí. Se abrirá con el botón "Send Email"
    } catch (e) {
      console.error('Error generating PDF:', e);
      setModalTitle('Error');
      setModalMessage('There was an error generating the PDF. Please try again.');
      setShowSuccessModal(true);
    } finally {
      setIsGeneratingPdf(false);
      openingRef.current = false;
    }
  };

  // ───────────────────────────────────────────────────────────
  // fetch con retry (sin keepalive)
  // ───────────────────────────────────────────────────────────
  const fetchWithRetry = async (
    url: string,
    options: RequestInit = {},
    retries = 2,
    backoff = 600
  ): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const merged: RequestInit = {
      ...options,
      headers,
      credentials: options.credentials ?? 'same-origin',
      signal: controller.signal,
    };

    try {
      const res = await fetch(url, merged);
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (retries <= 0) throw err;
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Enviar por email
  // ───────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!email || !currentInspection) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalTitle('Error');
      setModalMessage('El formato del correo electrónico no es válido');
      setShowSuccessModal(true);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      throw new Error('La operación tardó demasiado tiempo. Intenta de nuevo.');
    }, 30000);

    setIsSendingEmail(true);
    setModalTitle('Enviando correo...');
    setModalMessage('Estamos preparando el informe. Por favor, espera...');
    setShowSuccessModal(true);

    const fail = (msg: string, err?: unknown) => {
      console.error('Email error:', err);
      clearTimeout(timeoutId);
      setModalTitle('Error');
      setModalMessage(msg);
      setShowSuccessModal(true);
      setIsSendingEmail(false);
    };

    try {
      addDebugLog('Generando PDF...');
      const blob = await generatePdfBlob(currentInspection as any);
      addDebugLog(`PDF generado (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`);

      addDebugLog('Convirtiendo a base64...');
      const base64 = await blobToBase64(blob);
      const filename = `inspeccion_${currentInspection.policyNumber || 'sin_poliza'}_${Date.now()}.pdf`;

      // Subir a Blobs (opcional)
      let key: string | null = null;
      try {
        addDebugLog('Subiendo a Netlify Blobs...');
        
        const upRes = await fetchWithRetry('/.netlify/functions/upload-report', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ filename, data: base64 }),
          credentials: 'same-origin',
        });
        if (upRes.ok) {
          const result = await upRes.json();
          key = result.key;
          addDebugLog(`Archivo subido con clave: ${key}`);
        } else {
          const errorText = await upRes.text();
          console.warn('Error subiendo a Blobs, usando fallback a base64:', errorText);
        }
      } catch (e) {
        console.warn('Error en subida a Blobs, usando fallback a base64:', e);
      }

      // true cuando haces build/deploy en Netlify; false cuando corres `vite`/`netlify dev`
      const USE_BLOBS = import.meta.env.PROD;

      // En producción subimos a Blobs (más eficiente y barato)
      if (USE_BLOBS) {
        try {
          const upRes = await fetchWithRetry('/.netlify/functions/upload-report', {
            method: 'POST',
            body: JSON.stringify({ filename, data: base64 }),
            credentials: 'same-origin',
          });
          if (upRes.ok) {
            const json = await upRes.json();
            key = json.key;
            addDebugLog(`Archivo subido con clave: ${key}`);
          } else {
            const errorText = await upRes.text();
            console.warn('Error subiendo a Blobs, usando fallback a base64:', errorText);
          }
        } catch (e) {
          console.warn('Error en subida a Blobs, usando fallback a base64:', e);
        }
      }

      // Envío de correo
      addDebugLog('Enviando email...');
      const mailPayload = {
        to: email,
        filename: filename.replace(/[^\w.\-]+/g, '_'),
        data: base64,
        ...(key ? { key } : {}), // Solo incluir key si existe
      };

      const mailRes = await fetchWithRetry('/.netlify/functions/send-email-attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailPayload),
        credentials: 'same-origin',
      });

      if (!mailRes.ok) {
        const error = await mailRes.json().catch(() => ({}));
        throw new Error((error as any).message || 'Error al enviar el correo');
      }

      const updated = {
        ...currentInspection,
        id: currentInspection.id || `inspection_${Date.now()}`,
        emailSent: true,
        emailAddress: email,
        sentAt: new Date().toISOString(),
        pdfGenerated: true,
        updatedAt: new Date().toISOString(),
      };

      await saveInspection(updated);

      clearTimeout(timeoutId);
      addDebugLog('¡Correo enviado con éxito!');
      setModalTitle('¡Éxito!');
      setModalMessage('El correo se ha enviado correctamente con el PDF adjunto.');
      setShowSuccessModal(true);
      setShowEmailModal(false);
    } catch (e: any) {
      console.error('Error en el proceso de envío:', e);
      let msg = e?.message || 'Ocurrió un error enviando el correo';
      if (e.name === 'AbortError' || /timeout/i.test(msg)) {
        msg = 'La operación tardó demasiado tiempo. Por favor, inténtalo de nuevo.';
      } else if (/Failed to fetch/i.test(msg)) {
        msg = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      }
      fail(msg, e);
    } finally {
      clearTimeout(timeoutId);
      setIsSendingEmail(false);
    }
  };

  // Advertencias de fotos (no bloquea)
  useEffect(() => {
    try {
      if (!currentInspection?.vehicles) return;
      currentInspection.vehicles.forEach((v, i) => {
        if (!v.photos || Object.keys(v.photos).length === 0) {
          console.warn(`Falta al menos una foto en el vehículo ${i + 1}`);
        }
      });
    } catch (e) {
      console.error('Error verificando fotos:', e);
    }
  }, [currentInspection]);

  const resetInspection = () => {};
  const handleViewInspections = () => navigate('/inspections');

  const Button: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    isLoading?: boolean;
  }> = ({ onClick, children, variant = 'primary', size = 'md', className = '', isLoading = false }) => {
    const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' };
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="space-y-6">
          <section className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold app-text-secondary mb-3">Inspector & Insured Details</h2>
            <SummaryItem label="Agent's Name" value={currentInspection.agentName} />
            <SummaryItem label="Insured's Name" value={currentInspection.insuredName} isMissing={!currentInspection.insuredName} />
            <SummaryItem label="Policy Number" value={currentInspection.policyNumber || ''} isMissing={!currentInspection.policyNumber} />
            <SummaryItem label="Inspection Date" value={new Date(currentInspection.inspectionDate).toLocaleDateString()} />
          </section>

          {currentInspection.vehicles.map((vehicle, index) => {
            const base = `Vehicle ${index + 1}`;
            const mm = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
            const title = mm ? `${base}: ${mm}` : `${base} Details`;
            return (
              <section key={vehicle.clientId || index} className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold app-text-secondary mb-3">{title}</h2>
                <SummaryItem label="Vehicle Make" value={vehicle.make || 'Not specified'} isMissing={!vehicle.make} />
                <SummaryItem label="Vehicle Model" value={vehicle.model || 'Not specified'} isMissing={!vehicle.model} />
                <h3 className="text-md font-semibold app-text-secondary mt-4 mb-2">Photos for Vehicle {index + 1}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(vehicle.photos).map(([k, photo]) => {
                    if (!photo) return null;
                    const display = k.charAt(0).toUpperCase() + k.slice(1);
                    return (
                      <div key={photo.id} className="text-center">
                        <span className="text-xs block mb-1 text-gray-600">{display}</span>
                        {photo.base64 ? (
                          <img src={photo.base64} alt={display} className="w-full h-24 object-cover rounded border" />
                        ) : (
                          <div className="w-full h-24 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-xs text-gray-400 italic">(Not provided)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Action Bar */}
          <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t p-4 mt-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" className="w-full" onClick={() => navigate('/photos')}>
                Back to Photos
              </Button>
              <Button className="w-full" size="lg" onClick={handleGeneratePdf} isLoading={isGeneratingPdf}>
                {isGeneratingPdf ? 'Processing...' : 'Generate & Save PDF'}
              </Button>
              <Button variant="primary" className="w-full" size="lg" onClick={() => setShowEmailModal(true)}>
                Send Email
              </Button>
            </div>
          </div>
        </div>

        {/* Modal simple de resultado */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
              <div
                className={`mx-auto mb-4 text-5xl ${
                  /error/i.test(modalTitle) ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {/error/i.test(modalTitle) ? '✕' : '✓'}
              </div>

              <h3 className="text-xl font-semibold mb-2">{modalTitle}</h3>
              <p className="text-gray-600 mb-6">{modalMessage}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => { setShowSuccessModal(false); setIsGeneratingPdf(false); resetInspection(); navigate('/new-inspection'); }}
                  className="w-full"
                >
                  Start New Inspection
                </Button>
                <Button onClick={handleViewInspections} variant="outline" className="w-full">
                  View All Inspections
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para email */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
              <h3 className="text-xl font-semibold mb-4">Send Report by Email</h3>
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter recipient's email"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 font-semibold rounded-lg px-5 py-2.5 text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className={`flex-1 font-semibold rounded-lg px-5 py-2.5 text-sm text-white shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                    !email || isSendingEmail ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{ backgroundColor: 'var(--app-color-primary)' }}
                  disabled={!email || isSendingEmail}
                >
                  {isSendingEmail ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryScreen;
