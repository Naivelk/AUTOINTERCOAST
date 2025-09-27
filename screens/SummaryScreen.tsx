import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { InspectionContext } from '../App';
import { generatePdfBlobUrl } from '../services/pdfGenerator';
import { saveInspection } from '../services/inspectionService';

// Define the Photo interface
interface Photo {
  id: string;
  base64?: string;
}

// Define the Vehicle interface
interface Vehicle {
  clientId?: string;
  make?: string;
  model?: string;
  year?: string;
  plateNumber?: string;
  chassisNumber?: string;
  photos: {
    [key: string]: Photo | undefined;
    front?: Photo;
    back?: Photo;
    left?: Photo;
    right?: Photo;
    vin?: Photo;
    registration?: Photo;
    ownerId?: Photo;
    location?: Photo;
  };
}

// Inspection type is used in the context
// @ts-ignore - This type is used in the context
interface Inspection {
  id?: string;
  agentName: string;
  insuredName: string;
  policyNumber: string;
  inspectionDate: string | Date;
  vehicles: Vehicle[];
  emailSent?: boolean;
  emailAddress?: string;
  sentAt?: string;
  pdfGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // For any additional properties
}

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

const SummaryScreen: React.FC = () => {
  const context = useContext(InspectionContext);
  const navigate = useNavigate();
  // State for the component
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState('Operation Successful');
  const [modalMessage, setModalMessage] = useState('Your inspection has been saved successfully.');
  
  const addDebugLog = (message: string) => {
    console.log(`[DEBUG] ${message}`);
    setDebugLogs(prev => [...prev, message].slice(-5)); // Mantener solo los últimos 5 logs
  };

  if (!context) return <div>Cargando...</div>;
  
  const { currentInspection } = context;

  useEffect(() => {
    setIsGeneratingPdf(false);
  }, [currentInspection?.id]);
  
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
          
          {/* Mostrar logs de depuración */}
          {debugLogs.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
              <p className="font-semibold mb-2">Detalles:</p>
              {debugLogs.map((log, index) => (
                <div key={index} className="py-1 border-b border-gray-200 last:border-0">
                  {log}
                </div>
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
  
  const handleGeneratePdf = async () => {
    if (!currentInspection) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Generate PDF blob URL - using type assertion to match expected type
      const pdfUrl = await generatePdfBlobUrl(currentInspection as any);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `inspection-${currentInspection.id || new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message with option to email
      setModalTitle('PDF Generated');
      setModalMessage('The PDF has been generated and downloaded successfully. Would you like to email it?');
      setShowEmailModal(true);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setModalTitle('Error');
      setModalMessage('There was an error generating the PDF. Please try again.');
      setShowSuccessModal(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el PDF'));
      reader.onload = () => {
        const result = reader.result as string;
        // result es "data:application/pdf;base64,XXXX"
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  
  const handleSendEmail = async () => {
    if (!email || !currentInspection) {
      console.error('Email o inspección no definidos');
      return;
    }
  
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalTitle('Error');
      setModalMessage('El formato del correo electrónico no es válido');
      setShowSuccessModal(true);
      setIsSendingEmail(false);
      return;
    }
  
    setIsSendingEmail(true);
    setModalTitle('Enviando correo...');
    setModalMessage('Estamos preparando el informe. Por favor, espera...');
    setShowSuccessModal(true);
  
    const handleError = (error: unknown) => {
      console.error('Error:', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
  
      let msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('Failed to fetch')) {
        msg = 'No se pudo conectar con el servidor. Verifica tu conexión a Internet.';
      } else if (msg.includes('timeout')) {
        msg = 'La operación tardó demasiado tiempo. Intenta de nuevo.';
      }
      setModalTitle('Error');
      setModalMessage(msg);
      setShowSuccessModal(true);
      setIsSendingEmail(false);
    };
  
    try {
      console.log('Iniciando proceso de envío de correo...');
      addDebugLog('Generando PDF...');
      setModalMessage('Generando el informe PDF...');
  
      // 1) Generar el PDF como Blob URL
      const pdfUrl = await generatePdfBlobUrl(currentInspection as any);
  
      // 2) Obtener el Blob real y pasarlo a base64 (porque upload-report espera base64)
      setModalMessage('Procesando el archivo PDF...');
      console.log('Obteniendo PDF desde:', pdfUrl);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) throw new Error('No se pudo obtener el PDF generado');
      const pdfBlob = await pdfResponse.blob();
      const base64 = await blobToBase64(pdfBlob);
      console.log('PDF obtenido, tamaño:', (pdfBlob.size / (1024 * 1024)).toFixed(2), 'MB');
  
      // 3) Subir el archivo al blob store mediante la función upload-report
      const filename = `inspeccion_${currentInspection.policyNumber || 'sin_poliza'}_${Date.now()}.pdf`;
      setModalMessage('Subiendo el informe de forma segura...');
      const upRes = await fetch('/.netlify/functions/upload-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filename, data: base64 }),
        credentials: 'same-origin',
      });
      if (!upRes.ok) {
        const text = await upRes.text().catch(() => '');
        throw new Error(`Error subiendo el PDF (${upRes.status}) ${text}`);
      }
      const { key } = await upRes.json();
      if (!key) throw new Error('Respuesta inválida del servidor (falta key)');
  
      // 4) Pedir a la function que LEA del blob store y envíe adjunto con Resend
      setModalMessage('Enviando el correo con adjunto...');
      const sendRes = await fetch('/.netlify/functions/send-email-attach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: email, key, filename }),
        credentials: 'same-origin',
      });
      if (!sendRes.ok) {
        const text = await sendRes.text();
        throw new Error(text || 'Error al enviar el correo');
      }
  
      // 5) Guardar/actualizar inspección
      const updatedInspection = {
        ...currentInspection,
        id: currentInspection.id || `inspection_${Date.now()}`,
        emailSent: true,
        emailAddress: email,
        sentAt: new Date().toISOString(),
        pdfGenerated: true,
        updatedAt: new Date().toISOString(),
      };
      await saveInspection(updatedInspection);
  
      // 6) Éxito
      addDebugLog('¡Correo enviado con éxito!');
      setModalTitle('¡Éxito!');
      setModalMessage('El correo se ha enviado correctamente con el PDF adjunto.');
      setShowSuccessModal(true);
      setShowEmailModal(false);
    } catch (err) {
      handleError(err);
    } finally {
      setIsSendingEmail(false);
    }
  };  

  // Check for missing photos in vehicles
  useEffect(() => {
    try {
      if (!currentInspection?.vehicles) return;
      
      currentInspection.vehicles.forEach((vehicle, index) => {
        if (!vehicle.photos || Object.keys(vehicle.photos).length === 0) {
          console.warn(`Falta al menos una foto en el vehículo ${index + 1}`);
        }
      });
    } catch (err) {
      console.error('Error verificando fotos:', err);
    }
  }, [currentInspection]);

  const resetInspection = () => {
    // Reset inspection logic here if needed
  };
  
  const handleViewInspections = () => {
    navigate('/inspections');
  };

  // Button component for consistent styling
  const Button: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    isLoading?: boolean;
  }> = ({ 
    onClick, 
    children, 
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false
  }) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
    };

    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          const vehicleSectionTitleBase = `Vehicle ${index + 1}`;
          const makeModelDisplay = [vehicle.make, vehicle.model].filter(Boolean).join(' ').trim();
          const vehicleSectionTitle = makeModelDisplay ? `${vehicleSectionTitleBase}: ${makeModelDisplay}` : `${vehicleSectionTitleBase} Details`;

          return (
            <section key={vehicle.clientId || index} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold app-text-secondary mb-3">
                {vehicleSectionTitle}
              </h2>
              <SummaryItem 
                label="Vehicle Make" 
                value={vehicle.make || 'Not specified'} 
                isMissing={!vehicle.make} 
              />
              <SummaryItem 
                label="Vehicle Model" 
                value={vehicle.model || 'Not specified'} 
                isMissing={!vehicle.model} 
              />
              <h3 className="text-md font-semibold app-text-secondary mt-4 mb-2">Photos for Vehicle {index + 1}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(vehicle.photos).map(([categoryKey, photo]) => {
                  if (!photo) return null;
                  const displayName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);

                  return (
                    <div key={photo.id} className="text-center">
                      <span className={`text-xs block mb-1 text-gray-600`}>
                        {displayName}
                      </span>
                      {photo.base64 ? (
                        <img src={photo.base64} alt={displayName} className="w-full h-24 object-cover rounded border" />
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

        <div className="mt-8 flex flex-col space-y-3 sm:flex-row sm:justify-between items-center">
          <Button 
            onClick={() => navigate('/photos')} 
            variant="outline" 
            className="w-full sm:w-auto"
          >
            Back to Photos
          </Button>
          <Button 
            onClick={handleGeneratePdf} 
            size="lg" 
            isLoading={isGeneratingPdf}
            className="w-full sm:w-auto"
          >
            {isGeneratingPdf ? 'Processing...' : 'Generate & Save PDF'}
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
            <div className="text-green-500 mx-auto mb-4 text-5xl">✓</div>
            <h3 className="text-xl font-semibold mb-2">{modalTitle}</h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <div className="space-y-3">
              <Button 
                onClick={() => { 
                  setShowSuccessModal(false); 
                  setIsGeneratingPdf(false); 
                  resetInspection(); 
                  navigate('/new-inspection'); 
                }}
                className="w-full"
              >
                Start New Inspection
              </Button>
              <Button 
                onClick={handleViewInspections}
                variant="outline"
                className="w-full"
              >
                View All Inspections
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Modal */}
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
