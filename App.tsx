
import React, { useState, createContext, Dispatch, SetStateAction, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen.tsx';
import NewInspectionScreen from './screens/NewInspectionScreen.tsx';
import PhotoCaptureScreen from './screens/PhotoCaptureScreen.tsx';
import SummaryScreen from './screens/SummaryScreen.tsx';
import InspectionsListScreen from './screens/InspectionsListScreen.tsx';
import SettingsScreen from './screens/SettingsScreen.tsx';
import HelpScreen from './screens/HelpScreen.tsx';
import TermsScreen from './screens/TermsScreen.tsx';
import PrivacyScreen from './screens/PrivacyScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import ContactScreen from './screens/ContactScreen.tsx';
import LicenseScreen from './screens/LicenseScreen.tsx';
import BottomNav from './components/BottomNav.tsx';
import { Inspection, InspectionStep } from './types.ts';
import { initialInspectionState, initialVehicleState, STORAGE_KEYS } from './constants.ts';

// Contexto global para la inspección
interface InspectionContextType {
  currentInspection: Inspection;
  setCurrentInspection: Dispatch<SetStateAction<Inspection>>;
  currentStep: InspectionStep;
  setCurrentStep: Dispatch<SetStateAction<InspectionStep>>;
  currentVehicleIndex: number;
  setCurrentVehicleIndex: Dispatch<SetStateAction<number>>;
  addVehicle: () => void;
  removeVehicle: (index: number, latestInspectionData: Inspection) => void;
  resetInspection: () => void;
}

export const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

const App: React.FC = () => {
  // Manejo global de errores para nunca mostrar pantalla en blanco
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setGlobalError(event.message || 'Error desconocido');
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (globalError) {
    return (
      <div style={{ padding: 32, color: 'red', fontWeight: 'bold', textAlign: 'center', background: '#fff' }}>
        Error crítico: {globalError}
        <br />
        <span style={{ fontSize: 14, color: '#333', fontWeight: 'normal' }}>
          Por favor, toma un pantallazo de este mensaje y envíalo a soporte.
        </span>
      </div>
    );
  }

  // Storage helper
  const STORAGE = {
    get: (k: string) => {
      try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } 
      catch { return sessionStorage.getItem(k); }
    },
    set: (k: string, v: string) => {
      try { localStorage.setItem(k, v); } catch {}
      try { sessionStorage.setItem(k, v); } catch {}
    }
  };

  // Estado y lógica de contexto con persistencia
  const [currentInspection, setCurrentInspection] = useState<Inspection>(() => {
    try { 
      const saved = STORAGE.get(STORAGE_KEYS.inspection);
      return saved ? JSON.parse(saved) : initialInspectionState();
    } catch { 
      return initialInspectionState(); 
    }
  });

  const [currentStep, setCurrentStep] = useState<InspectionStep>(() => {
    try { 
      const saved = STORAGE.get(STORAGE_KEYS.step);
      return saved ? Number(saved) as InspectionStep : InspectionStep.VEHICLE_DETAILS;
    } catch { 
      return InspectionStep.VEHICLE_DETAILS; 
    }
  });

  const [currentVehicleIndex, setCurrentVehicleIndex] = useState<number>(() => {
    try { 
      const saved = STORAGE.get(STORAGE_KEYS.vehicleIndex);
      return saved ? Number(saved) : 0;
    } catch { 
      return 0; 
    }
  });

  const resetInspection = () => {
    setCurrentInspection(initialInspectionState());
    setCurrentStep(InspectionStep.VEHICLE_DETAILS);
    setCurrentVehicleIndex(0);
  };

  const addVehicle = () => {
    setCurrentInspection(prevInsp => {
      const newVehiclesArray = [...prevInsp.vehicles, initialVehicleState()];
      setCurrentVehicleIndex(newVehiclesArray.length - 1);
      return {
        ...prevInsp,
        vehicles: newVehiclesArray
      };
    });
  };

  const removeVehicle = (indexToRemove: number, latestInspectionData: Inspection) => {
    const originalActiveIndex = currentVehicleIndex; // Index active before this operation
    const updatedVehicles = latestInspectionData.vehicles.filter((_, index) => index !== indexToRemove);
    let finalVehiclesList = updatedVehicles;
    if (finalVehiclesList.length === 0) {
      finalVehiclesList = [initialVehicleState()];
    }
    let newCalculatedActiveIndex = originalActiveIndex;
    if (originalActiveIndex === indexToRemove) {
      newCalculatedActiveIndex = Math.max(0, indexToRemove - 1);
    } else if (originalActiveIndex > indexToRemove) {
      newCalculatedActiveIndex = originalActiveIndex - 1;
    }
    newCalculatedActiveIndex = Math.min(newCalculatedActiveIndex, finalVehiclesList.length - 1);
    setCurrentInspection({
      ...latestInspectionData, // Use the passed latest data as base
      vehicles: finalVehiclesList
    });
    setCurrentVehicleIndex(newCalculatedActiveIndex);
  };

  // Persistencia de estado
  useEffect(() => {
    try { 
      STORAGE.set(STORAGE_KEYS.inspection, JSON.stringify(currentInspection));
    } catch {}
  }, [currentInspection]);

  useEffect(() => {
    try { 
      STORAGE.set(STORAGE_KEYS.step, String(currentStep));
    } catch {}
  }, [currentStep]);

  useEffect(() => {
    try { 
      STORAGE.set(STORAGE_KEYS.vehicleIndex, String(currentVehicleIndex));
    } catch {}
  }, [currentVehicleIndex]);

  // Flush extra al ocultarse la página (iOS)
  useEffect(() => {
    const flush = () => {
      try {
        STORAGE.set(STORAGE_KEYS.inspection, JSON.stringify(currentInspection));
        STORAGE.set(STORAGE_KEYS.step, String(currentStep));
        STORAGE.set(STORAGE_KEYS.vehicleIndex, String(currentVehicleIndex));
      } catch {}
    };
    
    const onHidden = () => { 
      if (document.visibilityState === 'hidden') flush();
    };
    
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [currentInspection, currentStep, currentVehicleIndex]);

  // Mantener navegación SPA estable
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.hash;
      if (!path.startsWith('#/new') && !path.startsWith('#/photos') && !path.startsWith('#/summary')) {
        // Considera resetear aquí si lo necesitas
      }
    };
    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  return (
    <InspectionContext.Provider value={{
      currentInspection, setCurrentInspection,
      currentStep, setCurrentStep,
      currentVehicleIndex, setCurrentVehicleIndex,
      addVehicle, removeVehicle,
      resetInspection
    }}>
      <HashRouter>
        <div className="flex flex-col h-screen max-w-md mx-auto shadow-2xl app-bg-page" style={{ backgroundColor: 'var(--app-color-background)' }}>
          <div className="flex-grow overflow-y-auto pb-16">
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/new-inspection" element={<NewInspectionScreen />} />
              <Route path="/photos" element={<PhotoCaptureScreen />} />
              <Route path="/summary" element={<SummaryScreen />} />
              <Route path="/inspections" element={<InspectionsListScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/settings/profile" element={<ProfileScreen />} />
              <Route path="/settings/help" element={<HelpScreen />} />
              <Route path="/settings/terms" element={<TermsScreen />} />
              <Route path="/settings/privacy" element={<PrivacyScreen />} />
              <Route path="/settings/contact" element={<ContactScreen />} />
              <Route path="/settings/license" element={<LicenseScreen />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      </HashRouter>
    </InspectionContext.Provider>
  );
};

export default App;


