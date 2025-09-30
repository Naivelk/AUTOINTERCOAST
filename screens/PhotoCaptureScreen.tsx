import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InspectionContext } from '../App.tsx';
import PageContainer from '../components/PageContainer.tsx';
import Button from '../components/Button.tsx';
import WizardSteps from '../components/WizardSteps.tsx';
import PhotoUploadCard from '../components/PhotoUploadCard.tsx';
import {
  InspectionStep,
  PhotoCategoryKey,
  AllPhotoCategoryKeys,
  Photo,
  PhotoCategoryConfig,
} from '../types.ts';
import { fileToCompressedDataURL } from '../utils/fileUpload';

const PhotoCaptureScreen: React.FC = () => {
  const context = useContext(InspectionContext);
  const navigate = useNavigate();

  if (!context) return <div>Loading...</div>;

  const {
    currentInspection, setCurrentInspection,
    currentStep: wizardCurrentStep, setCurrentStep,
    currentVehicleIndex, setCurrentVehicleIndex,
  } = context;

  const activeVehicle = currentInspection.vehicles[currentVehicleIndex];

  // Keyed by `${vehicleIndex}_${photoSlotId}`
  const [photoErrors, setPhotoErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    // Basic guard: si no viene de new-inspection con datos mínimos
    if (!currentInspection.agentName || currentInspection.vehicles.length === 0) {
      navigate('/new-inspection');
      return;
    }
    setCurrentStep(InspectionStep.PHOTO_CAPTURE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentInspection.agentName, currentInspection.vehicles, navigate, setCurrentStep]);

  /**
   * Preset de compresión según el tipo/nombre del slot de foto.
   * Para VIN / matrícula / cédula (texto fino) damos más calidad/tamaño.
   */
  const getCompressionPreset = (slotId: PhotoCategoryKey) => {
    const name = (PhotoCategoryConfig[slotId]?.name || '').toLowerCase();
    const looksCritical =
      name.includes('vin') ||
      name.includes('matr') ||        // matrícula/placa
      name.includes('placa') ||
      name.includes('registration') ||
      name.includes('registro') ||
      name.includes('owner') ||
      name.includes('cédula') ||
      name.includes('cedula') ||
      name.includes('id');

    if (looksCritical) {
      return {
        maxSide: 900,
        quality: 0.66,
        minQuality: 0.45,
        targetKB: 150,
      };
    }

    return {
      maxSide: 1000,
      quality: 0.68,
      minQuality: 0.50,
      targetKB: 170,
    };
  };

  const handlePhotoChange = async (
    vehicleIndex: number,
    photoSlotId: PhotoCategoryKey,
    file: File | null
  ) => {
    const errorKey = `${vehicleIndex}_${photoSlotId}`;

    if (file) {
      try {
        // Compresión con preset dinámico por categoría
        const compressedDataUrl = await fileToCompressedDataURL(
          file,
          getCompressionPreset(photoSlotId)
        );

        setCurrentInspection(prevInsp => {
          const updatedVehicles = [...prevInsp.vehicles];
          const updatedPhotos = { ...updatedVehicles[vehicleIndex].photos };
          const photoName = PhotoCategoryConfig[photoSlotId]?.name || photoSlotId;

          updatedPhotos[photoSlotId] = {
            id: updatedPhotos[photoSlotId]?.id || crypto.randomUUID(),
            name: photoName,
            base64: compressedDataUrl,
            preview: compressedDataUrl,
            file: null, // guardamos comprimido, no el File
          };

          // limpiar error
          setPhotoErrors(prev => ({ ...prev, [errorKey]: null }));

          return {
            ...prevInsp,
            vehicles: updatedVehicles.map((v, i) =>
              i === vehicleIndex ? { ...v, photos: updatedPhotos } : v
            ),
          };
        });
      } catch (err) {
        console.error('Error processing photo:', err);
        setPhotoErrors(prev => ({ ...prev, [errorKey]: 'Error compressing image' }));
      }
    } else {
      // Quitar foto
      setCurrentInspection(prevInsp => {
        const updatedVehicles = [...prevInsp.vehicles];
        const updatedPhotos = { ...updatedVehicles[vehicleIndex].photos };
        const photoName = PhotoCategoryConfig[photoSlotId]?.name || photoSlotId;

        updatedPhotos[photoSlotId] = {
          id: updatedPhotos[photoSlotId]?.id || crypto.randomUUID(),
          name: photoName,
          base64: null,
          preview: null,
          file: null,
        };

        return {
          ...prevInsp,
          vehicles: updatedVehicles.map((v, i) =>
            i === vehicleIndex ? { ...v, photos: updatedPhotos } : v
          ),
        };
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
        setCurrentVehicleIndex(i);
        return false;
      }
    }
    return true;
  };

  const handleNextVehicle = () => {
    if (currentVehicleIndex < currentInspection.vehicles.length - 1) {
      setCurrentVehicleIndex(currentVehicleIndex + 1);
    } else {
      if (!validateAllPhotos()) return;
      setCurrentStep(InspectionStep.SUMMARY);
      navigate('/summary');
    }
  };

  const handlePreviousVehicle = () => {
    if (currentVehicleIndex > 0) {
      setCurrentVehicleIndex(currentVehicleIndex - 1);
    } else {
      navigate('/new-inspection');
    }
  };

  const handleSubmitToSummary = () => {
    if (!validateAllPhotos()) return;
    setCurrentStep(InspectionStep.SUMMARY);
    navigate('/summary');
  };

  if (!activeVehicle) {
    navigate('/new-inspection');
    return <div>Redirecting...</div>;
  }

  const currentVehiclePhotoSlots: Photo[] = AllPhotoCategoryKeys
    .map(catKey => activeVehicle.photos[catKey])
    .filter(Boolean) as Photo[];

  const vehicleInfoDisplayArray = [
    activeVehicle.make,
    activeVehicle.model,
    activeVehicle.year ? `(${activeVehicle.year})` : '',
  ];
  const vehicleInfoDisplay = vehicleInfoDisplayArray.filter(Boolean).join(' ').trim();

  return (
    <PageContainer
      title={`Photos for Vehicle ${currentVehicleIndex + 1}`}
      showBackButton
      onBack={handlePreviousVehicle}
    >
      <WizardSteps currentStep={wizardCurrentStep} />

      <p className="text-md font-semibold app-text-secondary mb-1 px-1">
        {vehicleInfoDisplay || '(Vehicle details not specified)'}
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
              onPhotoChange={(slotId, file) =>
                handlePhotoChange(currentVehicleIndex, slotId as PhotoCategoryKey, file)
              }
              errorMessage={photoErrors[`${currentVehicleIndex}_${photoSlot.id}`]}
            />
          )
        ))}
      </div>

      <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t p-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handlePreviousVehicle}
          >
            {currentVehicleIndex === 0 ? 'Back to Details' : 'Previous Vehicle'}
          </Button>
          {currentVehicleIndex < currentInspection.vehicles.length - 1 ? (
            <Button 
              variant="primary"
              className="w-full" 
              size="lg" 
              onClick={handleNextVehicle}
            >
              Next Vehicle's Photos
            </Button>
          ) : (
            <Button 
              variant="primary"
              className="w-full" 
              size="lg" 
              onClick={handleSubmitToSummary}
            >
              Next: Review Summary
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default PhotoCaptureScreen;
