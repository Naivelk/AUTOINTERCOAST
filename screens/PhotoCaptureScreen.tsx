
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InspectionContext } from '../App.tsx';
import PageContainer from '../components/PageContainer.tsx';
import Button from '../components/Button.tsx';
import WizardSteps from '../components/WizardSteps.tsx';
import PhotoUploadCard from '../components/PhotoUploadCard.tsx';
import { InspectionStep, PhotoCategoryKey, AllPhotoCategoryKeys, Photo } from '../types.ts';
import { MAX_FILE_SIZE_BYTES } from '../constants.ts';
import { compressImageFile } from '../services/imageCompression';


const PhotoCaptureScreen: React.FC = () => {
  const context = useContext(InspectionContext);
  const navigate = useNavigate();

  if (!context) return <div>Loading...</div>;

  const { 
    currentInspection, setCurrentInspection, 
    currentStep: wizardCurrentStep, setCurrentStep,
    currentVehicleIndex, setCurrentVehicleIndex
  } = context;

  const activeVehicle = currentInspection.vehicles[currentVehicleIndex];

  const [photoErrors, setPhotoErrors] = useState<Record<string, string | null>>({}); // Keyed by vehicleIndex_photoSlotId


  useEffect(() => {
    // Basic check to ensure user came from new-inspection screen with minimal data
    if (!currentInspection.agentName || currentInspection.vehicles.length === 0) {
      navigate('/new-inspection');
      return;
    }
    setCurrentStep(InspectionStep.PHOTO_CAPTURE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInspection.agentName, currentInspection.vehicles, navigate, setCurrentStep]);

  const handlePhotoChange = async (vehicleIndex: number, photoSlotId: string, file: File | null) => {
    const errorKey = `${vehicleIndex}_${photoSlotId}`;
    
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setPhotoErrors(prev => ({ ...prev, [errorKey]: `File exceeds max size.` }));
        setCurrentInspection(prevInsp => {
          const updatedVehicles = [...prevInsp.vehicles];
          const targetVehicle = updatedVehicles[vehicleIndex];
          if (targetVehicle && targetVehicle.photos[photoSlotId as PhotoCategoryKey]) {
            targetVehicle.photos[photoSlotId as PhotoCategoryKey] = {
              ...targetVehicle.photos[photoSlotId as PhotoCategoryKey]!,
              base64: null,
              file: null,
            };
          }
          return { ...prevInsp, vehicles: updatedVehicles };
        });
        return;
      }

      try {
        // Compress and standardize to JPEG
        const compressedDataUrl = await compressImageFile(file, 1600, 0.72);

        setCurrentInspection(prevInsp => {
          const updatedVehicles = [...prevInsp.vehicles];
          const targetVehicle = updatedVehicles[vehicleIndex];
          if (targetVehicle && targetVehicle.photos[photoSlotId as PhotoCategoryKey]) {
            targetVehicle.photos[photoSlotId as PhotoCategoryKey] = {
              ...targetVehicle.photos[photoSlotId as PhotoCategoryKey]!,
              base64: compressedDataUrl,
              file: null, // We don't need to store the original File object
            };
          }
          return { ...prevInsp, vehicles: updatedVehicles };
        });
        setPhotoErrors(prev => ({ ...prev, [errorKey]: null }));
      } catch (e) {
        console.error('Error compressing image:', e);
        setPhotoErrors(prev => ({ ...prev, [errorKey]: "Error processing image." }));
      }
    } else { // File is null (removed)
      setCurrentInspection(prevInsp => {
        const updatedVehicles = [...prevInsp.vehicles];
        const targetVehicle = updatedVehicles[vehicleIndex];
        if (targetVehicle && targetVehicle.photos[photoSlotId as PhotoCategoryKey]) {
          targetVehicle.photos[photoSlotId as PhotoCategoryKey] = {
            ...targetVehicle.photos[photoSlotId as PhotoCategoryKey]!,
            base64: null,
            file: null,
          };
        }
        return { ...prevInsp, vehicles: updatedVehicles };
      });
      setPhotoErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };
  
  const validateAllPhotos = (): boolean => {
    for (let i = 0; i < currentInspection.vehicles.length; i++) {
      const vehicle = currentInspection.vehicles[i];
      const hasAtLeastOnePhoto = Object.values(vehicle.photos).some(photo => photo?.base64);
      if (!hasAtLeastOnePhoto) {
        alert(`At least one photo is required for Vehicle ${i + 1} to proceed.`);
        setCurrentVehicleIndex(i); // Focus on the vehicle with missing photo
        return false;
      }
    }
    return true;
  };

  const handleNextVehicle = () => {
    if (currentVehicleIndex < currentInspection.vehicles.length - 1) {
      setCurrentVehicleIndex(currentVehicleIndex + 1);
    } else {
      // This is the last vehicle, so "Next Vehicle" acts like "Submit to Summary"
      if (!validateAllPhotos()) {
        // Alert is handled by validateAllPhotos
        return;
      }
      setCurrentStep(InspectionStep.SUMMARY);
      navigate('/summary');
    }
  };
  
  const handlePreviousVehicle = () => {
    if (currentVehicleIndex > 0) {
      setCurrentVehicleIndex(currentVehicleIndex - 1);
    } else {
      navigate('/new-inspection'); // Back to vehicle details from first vehicle's photos
    }
  };

  const handleSubmitToSummary = () => {
    if (!validateAllPhotos()) {
      // Alert is handled by validateAllPhotos
      return;
    }
    setCurrentStep(InspectionStep.SUMMARY);
    navigate('/summary');
  };

  if (!activeVehicle) {
    navigate('/new-inspection');
    return <div>Redirecting...</div>;
  }

  const currentVehiclePhotoSlots: Photo[] = AllPhotoCategoryKeys.map(
    catKey => activeVehicle.photos[catKey]
  ).filter(Boolean) as Photo[];

  const vehicleInfoDisplayArray = [activeVehicle.make, activeVehicle.model, activeVehicle.year ? `(${activeVehicle.year})` : ''];
  const vehicleInfoDisplay = vehicleInfoDisplayArray.filter(Boolean).join(' ').trim();


  return (
    <PageContainer 
      title={`Photos for Vehicle ${currentVehicleIndex + 1}`}
      showBackButton 
      onBack={handlePreviousVehicle}
    >
      <WizardSteps currentStep={wizardCurrentStep} />
      <p className="text-md font-semibold app-text-secondary mb-1 px-1">
         {vehicleInfoDisplay || "(Vehicle details not specified)"}
      </p>
      <p className="text-sm text-gray-600 mb-4 px-1">
        Take at least one photo of this vehicle. Additional photos are optional.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
        {currentVehiclePhotoSlots.map((photoSlot) => (
          photoSlot && (
            <PhotoUploadCard
              key={`${currentVehicleIndex}_${photoSlot.id}`}
              photoSlot={photoSlot}
              onPhotoChange={(slotId, file) => handlePhotoChange(currentVehicleIndex, slotId, file)}
              errorMessage={photoErrors[`${currentVehicleIndex}_${photoSlot.id}`]}
            />
          )
        ))}
      </div>
      <div className="mt-8 flex justify-between items-center p-1">
        <Button onClick={handlePreviousVehicle} variant="outline">
          {currentVehicleIndex === 0 ? 'Back to Details' : 'Previous Vehicle'}
        </Button>
        {currentVehicleIndex < currentInspection.vehicles.length - 1 ? (
          <Button onClick={handleNextVehicle} size="lg">
            Next Vehicle's Photos
          </Button>
        ) : (
          <Button onClick={handleSubmitToSummary} size="lg">
            Next: Review Summary
          </Button>
        )}
      </div>
    </PageContainer>
  );
};

export default PhotoCaptureScreen;
