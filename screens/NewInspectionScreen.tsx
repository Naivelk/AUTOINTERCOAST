
import React, { useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { InspectionContext } from '../App.tsx';
import PageContainer from '../components/PageContainer.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';
import WizardSteps from '../components/WizardSteps.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx'; // Import the new modal
import { Inspection, InspectionStep, Vehicle } from '../types.ts';
import { PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { initialVehicleState } from '../constants.ts';

const NewInspectionScreen: React.FC = () => {
  const context = useContext(InspectionContext);
  const navigate = useNavigate();

  if (!context) return <div className="p-4">Loading context...</div>;

  const {
    currentInspection, setCurrentInspection,
    currentStep: wizardCurrentStep, setCurrentStep,
    currentVehicleIndex, setCurrentVehicleIndex,
    addVehicle, removeVehicle,
  } = context;

  const [generalData, setGeneralData] = useState({
    agentName: '',
    insuredName: '',
    policyNumber: '',
  });

  const [activeVehicleData, setActiveVehicleData] = useState<Vehicle>(
    initialVehicleState() 
  );
  
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [vehicleToRemoveIndex, setVehicleToRemoveIndex] = useState<number | null>(null);

  useEffect(() => {
    setGeneralData({
      agentName: currentInspection.agentName,
      insuredName: currentInspection.insuredName,
      policyNumber: currentInspection.policyNumber || '',
    });

    if (currentInspection.vehicles && currentInspection.vehicles[currentVehicleIndex]) {
      setActiveVehicleData(currentInspection.vehicles[currentVehicleIndex]);
    } else if (currentInspection.vehicles && currentInspection.vehicles.length > 0) {
      const safeIndex = Math.min(currentVehicleIndex, currentInspection.vehicles.length - 1);
       if(currentVehicleIndex >= currentInspection.vehicles.length && currentInspection.vehicles.length > 0) {
          console.warn(`NewInspectionScreen: currentVehicleIndex (${currentVehicleIndex}) was out of bounds. Corrected to ${safeIndex}.`);
      }
      setActiveVehicleData(currentInspection.vehicles[safeIndex] || initialVehicleState());
    } else {
      setActiveVehicleData(initialVehicleState());
    }
  }, [currentInspection.agentName, currentInspection.insuredName, currentInspection.vehicles, currentVehicleIndex]);


  useEffect(() => {
    setCurrentStep(InspectionStep.VEHICLE_DETAILS);
  }, [setCurrentStep]);


  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGeneralData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setActiveVehicleData(prev => ({ ...prev, [name]: value }));
    const errorKey = `vehicle_${currentVehicleIndex}_${name}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const deepClone = <T,>(obj: T): T => {
  // Usar solo JSON.parse(JSON.stringify(obj)) para máxima compatibilidad (incluyendo iOS/Safari)
  return JSON.parse(JSON.stringify(obj));
};

const persistLocalFormToContext = () => {
  setCurrentInspection(prevInsp => {
    const updatedVehicles = prevInsp.vehicles.map((v, i) =>
      i === currentVehicleIndex
        ? { ...deepClone(activeVehicleData), clientId: v.clientId || activeVehicleData.clientId }
        : deepClone(v)
    );
    return {
      ...prevInsp,
      agentName: generalData.agentName,
      insuredName: generalData.insuredName,
      policyNumber: generalData.policyNumber,
      vehicles: updatedVehicles,
    };
  });
};

  const getLatestInspectionDataFromForm = (): Inspection => {
  const vehiclesFromContext = currentInspection.vehicles.map((v) => deepClone(v));
  if (vehiclesFromContext[currentVehicleIndex]) {
    vehiclesFromContext[currentVehicleIndex] = {
      ...deepClone(activeVehicleData),
      clientId: vehiclesFromContext[currentVehicleIndex].clientId || activeVehicleData.clientId,
    };
  } else {
    vehiclesFromContext.push(deepClone(activeVehicleData));
  }

  return {
    ...currentInspection,
    agentName: generalData.agentName,
    insuredName: generalData.insuredName,
    policyNumber: generalData.policyNumber,
    vehicles: vehiclesFromContext,
  };
};


  const handleAddVehicle = () => {
  if (!validateVehicle(currentVehicleIndex, activeVehicleData, false)) return;
  // Save current vehicle with deep clone
  setCurrentInspection(prevInsp => {
    const updatedVehicles = prevInsp.vehicles.map((v, i) =>
      i === currentVehicleIndex
        ? { ...deepClone(activeVehicleData), clientId: v.clientId || activeVehicleData.clientId }
        : deepClone(v)
    );
    return {
      ...prevInsp,
      agentName: generalData.agentName,
      insuredName: generalData.insuredName,
      policyNumber: generalData.policyNumber,
      vehicles: updatedVehicles,
    };
  });
  setTimeout(() => {
    addVehicle(); // This will append a new blank vehicle and update the index
  }, 0);
};

  const triggerRemoveVehicle = (indexToRemove: number) => {
    if (currentInspection.vehicles.length <= 1) {
      alert("At least one vehicle is required.");
      return;
    }
    setVehicleToRemoveIndex(indexToRemove);
    setShowRemoveConfirmModal(true);
  };

  const confirmRemoveVehicle = () => {
    if (vehicleToRemoveIndex !== null) {
      const latestData = getLatestInspectionDataFromForm();
      removeVehicle(vehicleToRemoveIndex, latestData);
    }
    setVehicleToRemoveIndex(null);
    setShowRemoveConfirmModal(false);
  };
  
  const cancelRemoveVehicle = () => {
    setVehicleToRemoveIndex(null);
    setShowRemoveConfirmModal(false);
  };
  
  const handleSelectVehicle = (indexToSelect: number) => {
    if (indexToSelect === currentVehicleIndex) return;
    if (!validateVehicle(currentVehicleIndex, activeVehicleData, false)) return; 
    persistLocalFormToContext(); 
    setCurrentVehicleIndex(indexToSelect);
  };

  const validateVehicle = (index: number, vehicle: Vehicle, updateErrorsState: boolean = true): boolean => {
    const vErrors: Record<string, string> = {};
    const yearErrorKey = `vehicle_${index}_year`;

    if (vehicle.year.trim() && (!/^\d{4}$/.test(vehicle.year) || parseInt(vehicle.year, 10) < 1900 || parseInt(vehicle.year, 10) > new Date().getFullYear() + 1)) {
      vErrors[yearErrorKey] = "Invalid year.";
    }

    if (updateErrorsState) {
        setErrors(prev => {
            const nextErrors = {...prev};
            delete nextErrors[`vehicle_${index}_make`];
            delete nextErrors[`vehicle_${index}_model`];
            if (!vErrors[yearErrorKey]) delete nextErrors[yearErrorKey];
            return {...nextErrors, ...vErrors};
        });
    }
    return Object.keys(vErrors).length === 0;
  };


  const validateForm = (): boolean => {
    let newErrors: Record<string, any> = {};
    if (!generalData.agentName.trim()) newErrors.agentName = "Agent name is required.";

    const inspectionStateForValidation = currentInspection;

    inspectionStateForValidation.vehicles.forEach((vehicle, index) => {
      const vErrorsForThisVehicle: Record<string, string> = {};
      const yearErrorKey = `vehicle_${index}_year`;

      if (vehicle.year.trim() && (!/^\d{4}$/.test(vehicle.year) || 
          parseInt(vehicle.year, 10) < 1900 || 
          parseInt(vehicle.year, 10) > new Date().getFullYear() + 1)) {
        vErrorsForThisVehicle[yearErrorKey] = `Vehicle ${index+1}: Invalid year.`;
      }
      
      if(Object.keys(vErrorsForThisVehicle).length > 0) {
        newErrors = {...newErrors, ...vErrorsForThisVehicle};
      } else {
        delete newErrors[yearErrorKey];
        delete newErrors[`vehicle_${index}_make`];
        delete newErrors[`vehicle_${index}_model`];
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    persistLocalFormToContext();
    setTimeout(() => {
      if (!validateForm()) {
        toast.error("Please correct the errors before proceeding.");
        return;
      }
      setCurrentInspection(prev => ({
        ...prev,
        inspectionDate: new Date().toISOString(),
      }));
      setCurrentStep(InspectionStep.PHOTO_CAPTURE);
      setCurrentVehicleIndex(0);
      navigate('/photos');
    }, 0);
  };

  return (
    <PageContainer title="New Vehicle Inspection" className="px-2 sm:px-4">
      <WizardSteps currentStep={wizardCurrentStep} />
      <div className="space-y-8 pb-8">
        
        <section className="p-5 bg-[var(--app-color-card-background)] rounded-2xl shadow-card-soft">
          <h2 className="text-lg font-semibold mb-4" style={{color: 'var(--app-color-secondary-text)'}}>Inspector & Insured Details</h2>
          <Input label="Agent's Name" name="agentName" value={generalData.agentName} onChange={handleGeneralChange} error={errors.agentName} placeholder="Enter agent's name" />
          <Input label="Insured's Name (Optional)" name="insuredName" value={generalData.insuredName} onChange={handleGeneralChange} error={errors.insuredName} placeholder="Enter insured's name" />
          <Input label="Policy Number (Optional)" name="policyNumber" value={generalData.policyNumber} onChange={handleGeneralChange} error={errors.policyNumber} placeholder="Enter policy number" />
        </section>

        <section className="space-y-5">
          <h2 className="text-lg font-semibold px-1" style={{color: 'var(--app-color-secondary-text)'}}>Vehicle Details</h2>
          {currentInspection.vehicles.map((vehicle, index) => {
            const isCurrentActive = index === currentVehicleIndex;
            const displayData = isCurrentActive ? activeVehicleData : vehicle;
            
            let vehicleTitle = `Vehicle ${index + 1}`;
            if (isCurrentActive) vehicleTitle += " (Editing)";
            const makeModelDisplay = [displayData.make, displayData.model].filter(Boolean).join(' ');
            
            if (makeModelDisplay) {
              vehicleTitle += `: ${makeModelDisplay}`;
            }


            return (
              <div 
                key={vehicle.clientId || `vehicle-${index}`} 
                className={`p-5 bg-[var(--app-color-card-background)] rounded-2xl shadow-card-soft border-2 transition-all duration-200
                  ${isCurrentActive ? 'border-[var(--app-color-primary)] shadow-lg' : 'border-transparent'}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-md font-semibold ${isCurrentActive ? 'app-text-primary' : 'text-gray-700'}`}>
                    {vehicleTitle}
                  </h3>
                  <div className="flex space-x-2">
                    {!isCurrentActive && (
                      <Button variant="outline" size="sm" onClick={() => handleSelectVehicle(index)} className="py-1 px-2.5">
                        <Edit3 size={14} className="mr-1" /> Edit
                      </Button>
                    )}
                    {currentInspection.vehicles.length > 1 && (
                      <Button variant="danger" size="sm" onClick={() => triggerRemoveVehicle(index)} className="py-1 px-2.5">
                        <Trash2 size={14} className="mr-1"/> Remove
                      </Button>
                    )}
                  </div>
                </div>
                {isCurrentActive && (
                  <div className="space-y-3 mt-2">
                    <Input label="Vehicle Make (Optional)" name="make" value={activeVehicleData.make} onChange={handleVehicleChange} error={errors[`vehicle_${index}_make`]} placeholder="e.g., Toyota" />
                    <Input label="Vehicle Model (Optional)" name="model" value={activeVehicleData.model} onChange={handleVehicleChange} error={errors[`vehicle_${index}_model`]} placeholder="e.g., Corolla" />
                    <Input label="Vehicle Year (Optional)" name="year" type="number" value={activeVehicleData.year} onChange={handleVehicleChange} error={errors[`vehicle_${index}_year`]} placeholder="e.g., 2020" inputMode="numeric" pattern="[0-9]*" />
                  </div>
                )}
              </div>
            );
          })}
        
          <Button variant="secondary" onClick={handleAddVehicle} className="w-full sm:w-auto mt-3">
            <PlusCircle size={20} className="mr-2" /> Add Another Vehicle
          </Button>
        </section>
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} size="lg">
            Next: Add Photos
          </Button>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={showRemoveConfirmModal}
        onClose={cancelRemoveVehicle}
        onConfirm={confirmRemoveVehicle}
        title="Confirm Vehicle Removal"
        message={`Are you sure you want to remove Vehicle ${vehicleToRemoveIndex !== null ? vehicleToRemoveIndex + 1 : ''}? This action cannot be undone.`}
        confirmText="Remove"
        confirmVariant="danger"
      />
    </PageContainer>
  );
};

export default NewInspectionScreen;
