
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileDown, Trash2, FileText, Edit3, Mail } from 'lucide-react'; 
import PageContainer from '../components/PageContainer.tsx';
import Button from '../components/Button.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import { SavedInspection, InspectionStep } from '../types.ts'; 
import { getInspections, overwriteAllInspections, getInspectionById, saveInspection } from '../services/inspectionService';
import { generatePdf, generatePdfBlobUrl, generatePdfBlob } from '../services/pdfGenerator.ts';
import { InspectionContext } from '../App.tsx'; 

const InspectionCard: React.FC<{ 
  inspection: SavedInspection; 
  onDelete: (id: string) => void; 
  onDownloadPdf: (inspection: SavedInspection) => Promise<void>; 
  onEdit: (id: string) => void;
  onEmailPdf: (inspection: SavedInspection) => Promise<void>;
}> = ({ inspection, onDelete, onDownloadPdf, onEdit, onEmailPdf }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownloadPdf(inspection);
    } catch (error) {
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const primaryVehicle = inspection.vehicles && inspection.vehicles.length > 0 
    ? inspection.vehicles[0] 
    : { make: '', model: '', year: ''};
  
  let mainDesc = [primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(' ').trim();
  if (!mainDesc) {
    mainDesc = "Vehicle Details";
  }

  const vehicleSummaryText = inspection.vehicles && inspection.vehicles.length > 1 
    ? `${mainDesc} & ${inspection.vehicles.length - 1} more`
    : mainDesc;
  
  const yearDisplay = primaryVehicle.year ? `(${primaryVehicle.year})` : '';

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-md font-semibold app-text-primary">{vehicleSummaryText} {yearDisplay}</h3>
          <h2 className="text-xl font-bold mb-4">Saved Inspections</h2>
          <p className="text-xs text-gray-500">Insured: {inspection.insuredName || "(Not provided)"}</p>
          <p className="text-xs text-gray-500">Date: {new Date(inspection.inspectionDate).toLocaleDateString()}</p>
          <p className={`text-xs ${inspection.pdfGenerated ? 'text-green-600' : 'text-yellow-600'}`}>
            PDF: {inspection.pdfGenerated ? 'Generated' : 'Not Generated / Error'}
          </p>
        </div>
        <div className="flex flex-col space-y-2 items-end">
           <Button onClick={handleDownload} variant="outline" size="sm" isLoading={isDownloading} className="app-text-primary app-border-primary w-full justify-start">
            <FileDown size={16} className="mr-1" /> {isDownloading ? 'Processing...' : (inspection.pdfGenerated ? 'Re-Download' : 'Generate PDF')}
          </Button>
          <Button 
            onClick={() => onEmailPdf(inspection)} 
            variant="outline" 
            size="sm" 
            className="w-full justify-start app-text-primary app-border-primary"
          >
            <Mail size={16} className="mr-1" /> Email PDF
          </Button>
          <Button onClick={() => onEdit(inspection.id)} variant="outline" size="sm" className="w-full justify-start">
            <Edit3 size={16} className="mr-1" /> Edit
          </Button>
          <Button onClick={() => onDelete(inspection.id)} variant="danger" size="sm" className="w-full justify-start">
            <Trash2 size={16} className="mr-1" /> Delete
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2 break-all">ID: {inspection.id}</p>
    </div>
  );
};

const InspectionsListScreen: React.FC = () => {
  const [inspections, setInspections] = useState<SavedInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [inspectionToDeleteId, setInspectionToDeleteId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [currentInspectionForEmail, setCurrentInspectionForEmail] = useState<SavedInspection | null>(null);
  const navigate = useNavigate();
  const context = useContext(InspectionContext);

  if (!context) {
    console.error("InspectionContext not found in InspectionsListScreen");
    return <div className="p-4">Error: Application context is not available.</div>;
  }

  const { setCurrentInspection, setCurrentStep, setCurrentVehicleIndex } = context;

  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedInspections = await getInspections();
      setInspections(savedInspections.sort((a,b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()));
    } catch (e) {
      console.error("Failed to load inspections:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const triggerDeleteInspection = (id: string) => {
    setInspectionToDeleteId(id);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteInspection = async () => {
    if (inspectionToDeleteId) {
      const updatedInspections = inspections.filter(insp => insp.id !== inspectionToDeleteId);
      setInspections(updatedInspections); 
      await overwriteAllInspections(updatedInspections); 
    }
    setInspectionToDeleteId(null);
    setShowDeleteConfirmModal(false);
  };
  
  const cancelDeleteInspection = () => {
    setInspectionToDeleteId(null);
    setShowDeleteConfirmModal(false);
  };

  const handleDownloadPdf = async (inspection: SavedInspection) => {
    await generatePdf(inspection); 
    const currentInspections = await getInspections(); 
    const updatedInspectionFromFile = currentInspections.find(i => i.id === inspection.id);
    if (updatedInspectionFromFile) {
        setInspections(prev => prev.map(i => i.id === inspection.id ? updatedInspectionFromFile : i)
                                   .sort((a,b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()));
    } else { 
        fetchInspections();
    }
  };

  const handleEditInspection = async (id: string) => {
    console.log("Editing inspection with ID:", id);
    const inspectionToEdit = await getInspectionById(id); // Using the new service function
    if (inspectionToEdit) {
      setCurrentInspection(inspectionToEdit);
      setCurrentVehicleIndex(0); // Start editing with the first vehicle
      setCurrentStep(InspectionStep.VEHICLE_DETAILS); // Set the wizard to the first step
      navigate('/new-inspection');
    } else {
      toast.error("Error: Could not find the inspection to edit.");
      console.error("Inspection with ID not found for editing:", id);
    }
  };

  const handleEmailPdf = async (inspection: SavedInspection) => {
    setCurrentInspectionForEmail(inspection);
    // Use type assertion to access emailAddress if it exists
    const email = (inspection as any).emailAddress || '';
    setCurrentEmail(email);
    setEmailError(null);
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!currentInspectionForEmail || !currentEmail) return;

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      setEmailError('Por favor ingresa un correo electrónico válido');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      throw new Error('La operación tardó demasiado tiempo. Intenta de nuevo.');
    }, 30000);

    setIsSendingEmail(true);
    setEmailError(null);

    const fail = (msg: string, err?: unknown) => {
      console.error('Email error:', err);
      clearTimeout(timeoutId);
      setEmailError(msg);
      toast.error(msg);
      setIsSendingEmail(false);
    };

    try {
      // 1) Generar el PDF
      const blob = await generatePdfBlob(currentInspectionForEmail);
      
      // 2) Convertir a base64
      const base64 = await blobToBase64(blob);
      const filename = `inspeccion_${currentInspectionForEmail.policyNumber || 'sin_poliza'}_${Date.now()}.pdf`;

      // 3) Subir a Netlify Blobs (opcional)
      let key: string | null = null;
      try {
        const upRes = await fetch('/.netlify/functions/upload-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: filename.replace(/[^\w.\-]+/g, '_'),
            data: base64 
          }),
          signal: controller.signal
        });
        
        if (upRes.ok) {
          const result = await upRes.json();
          key = result.key || result.blobId || null;
        } else {
          const errorText = await upRes.text();
          console.warn('Error subiendo a Blobs, usando fallback a base64:', errorText);
        }
      } catch (e) {
        console.warn('Error en subida a Blobs, usando fallback a base64:', e);
      }

      // 4) Enviar correo
      const mailPayload = {
        to: currentEmail,
        filename: filename.replace(/[^\w.\-]+/g, '_'),
        data: base64,
        ...(key ? { key } : {}), // Solo incluir key si existe
        subject: `Informe de Inspección - ${new Date().toLocaleDateString()}`,
        html: `
          <h1>Inspección de Vehículo</h1>
          <p>Hola,</p>
          <p>Adjunto encontrarás el informe de inspección para ${currentInspectionForEmail.insuredName || 'tu vehículo'}.</p>
          <p><strong>Detalles:</strong></p>
          <ul>
            <li>Agente: ${currentInspectionForEmail.agentName || 'No especificado'}</li>
            <li>Fecha: ${new Date().toLocaleDateString()}</li>
            <li>N° de Póliza: ${currentInspectionForEmail.policyNumber || 'N/A'}</li>
          </ul>
          <p>Gracias por usar AutoInspect.</p>
        `
      };

      const mailRes = await fetch('/.netlify/functions/send-email-attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailPayload),
        signal: controller.signal
      });

      if (!mailRes.ok) {
        const error = await mailRes.json().catch(() => ({}));
        throw new Error((error as any).message || 'Error al enviar el correo');
      }

      // 5) Actualizar la inspección
      const updatedInspection = {
        ...currentInspectionForEmail,
        emailSent: true,
        emailAddress: currentEmail,
        sentAt: new Date().toISOString(),
        pdfGenerated: true,
        updatedAt: new Date().toISOString()
      };

      await saveInspection(updatedInspection);
      
      // 6) Actualizar el estado local
      setInspections(prev => 
        prev.map(insp => 
          insp.id === updatedInspection.id ? updatedInspection : insp
        )
      );

      // 7) Mostrar mensaje de éxito
      toast.success('¡Correo enviado exitosamente!');
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


  // Helper function to convert Blob to base64
  const blobToBase64 = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (!base64data) {
          reject(new Error('Error al convertir el archivo a base64'));
          return;
        }
        resolve(base64data);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(blob);
    });
  };

  const inspectionBeingDeleted = inspections.find(insp => insp.id === inspectionToDeleteId);
  const vehicleInfoForModal = inspectionBeingDeleted?.vehicles?.[0]?.make && inspectionBeingDeleted?.vehicles?.[0]?.model
    ? `${inspectionBeingDeleted.vehicles[0].make} ${inspectionBeingDeleted.vehicles[0].model}`
    : `this inspection`;

  return (
    <PageContainer title="Saved Inspections">
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <p>Loading inspections...</p>
        </div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-10">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Inspections Found</h3>
          <p className="text-gray-500 mb-6">Start by creating a new vehicle inspection.</p>
          <Button onClick={() => navigate('/new-inspection')} size="lg">
            <PlusCircle size={20} className="mr-2" />
            Create New Inspection
          </Button>
        </div>
      ) : (
        <div className="p-1">
          {inspections.map((inspection) => (
            <InspectionCard 
              key={inspection.id} 
              inspection={inspection} 
              onDelete={triggerDeleteInspection} 
              onDownloadPdf={handleDownloadPdf}
              onEdit={handleEditInspection}
              onEmailPdf={handleEmailPdf}
            />
          ))}
           <div className="mt-8 flex justify-center">
            <Button onClick={() => navigate('/new-inspection')} size="lg" variant="primary">
              <PlusCircle size={20} className="mr-2" />
              Create Another Inspection
            </Button>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={cancelDeleteInspection}
        onConfirm={confirmDeleteInspection}
        title="Confirmar eliminación"
        message={`¿Estás seguro de que deseas eliminar ${vehicleInfoForModal}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        confirmVariant="danger"
      />
      
      {/* Email Modal */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${showEmailModal ? 'block' : 'hidden'}`}>
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Enviar PDF por correo</h3>
            <button 
              onClick={() => setShowEmailModal(false)}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSendingEmail}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese el correo electrónico"
                required
                disabled={isSendingEmail}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                disabled={isSendingEmail}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSendingEmail || !currentEmail}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isSendingEmail ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Enviar correo
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
};

export default InspectionsListScreen;
