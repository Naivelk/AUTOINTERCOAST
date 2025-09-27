
import { SavedInspection, PhotoCategoryKey, PhotoCategoryConfig, AllPhotoCategoryKeys, Vehicle, Photo } from '../types.ts';
import { initialVehicleState } from '../constants.ts';
import * as inspectionDb from './inspectionDb';

// Clave para almacenar el nombre del agente por defecto
const DEFAULT_AGENT_NAME_KEY = 'autoinspect_default_agent_name';

// Obtener el nombre del agente por defecto desde el almacenamiento local
export const getDefaultAgentName = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DEFAULT_AGENT_NAME_KEY) || '';
};

// Guardar el nombre del agente por defecto en el almacenamiento local
export const saveDefaultAgentName = (name: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEFAULT_AGENT_NAME_KEY, name);
};

const ensureCompleteVehiclePhotos = (vehicleData: any): Vehicle => {
  const completePhotos: Record<PhotoCategoryKey, Photo> = {} as Record<PhotoCategoryKey, Photo>;
  AllPhotoCategoryKeys.forEach(key => {
    const config = PhotoCategoryConfig[key];
    completePhotos[key] = {
      id: key,
      name: config.name,
      base64: null,
      file: null,
    };
  });

  if (vehicleData.photos) {
    for (const key in vehicleData.photos) {
      if (AllPhotoCategoryKeys.includes(key as PhotoCategoryKey) && vehicleData.photos[key]) {
        const photoKey = key as PhotoCategoryKey;
        completePhotos[photoKey] = {
          id: vehicleData.photos[key].id || key,
          name: vehicleData.photos[key].name || PhotoCategoryConfig[photoKey]?.name || key,
          base64: vehicleData.photos[key].base64 || null,
          file: null, // file is transient
        };
      }
    }
  }
  return {
    clientId: vehicleData.clientId || `vehicle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    make: vehicleData.make || '',
    model: vehicleData.model || '',
    year: vehicleData.year || '',
    photos: completePhotos,
  };
};

export const getInspections = async (): Promise<SavedInspection[]> => {
  const inspections = await inspectionDb.getAllInspections();
  return inspections.map(inspData => {
    let vehiclesArray: Vehicle[];
    if (Array.isArray(inspData.vehicles)) {
      vehiclesArray = inspData.vehicles.map(vehicleItem => ensureCompleteVehiclePhotos(vehicleItem));
    } else if ((inspData as any).vehicle) { // Legacy support
      vehiclesArray = [ensureCompleteVehiclePhotos((inspData as any).vehicle)];
    } else {
      vehiclesArray = [initialVehicleState()];
    }
    return {
      ...inspData,
      vehicles: vehiclesArray,
    };
  });
};

const cleanInspectionForStorage = (inspection: SavedInspection): SavedInspection => {
  return {
    ...inspection,
    vehicles: inspection.vehicles.map(v => {
      const vehiclePhotosToStore = { ...v.photos };
      AllPhotoCategoryKeys.forEach(key => {
        if (vehiclePhotosToStore[key]) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { file, ...photoToStore } = vehiclePhotosToStore[key]!;
          vehiclePhotosToStore[key] = photoToStore as Photo; 
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientId: vehicleClientId, ...vehicleDetailsToStore } = v; // Remove clientId before storage
      return { ...vehicleDetailsToStore, photos: vehiclePhotosToStore };
    })
  };
};

export const saveInspection = async (inspection: SavedInspection): Promise<void> => {
  const inspectionToSave = cleanInspectionForStorage(inspection);
  try {
    await inspectionDb.saveInspection(inspectionToSave);
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError') {
      throw new Error('QuotaExceededError: IndexedDB quota exceeded when trying to save inspection.');
    }
    console.error("Error saving inspection to IndexedDB:", error);
    throw error;
  }
};

export const overwriteAllInspections = async (inspectionsToSave: SavedInspection[]): Promise<void> => {
  const cleanedInspections = inspectionsToSave.map(insp => cleanInspectionForStorage(insp));
  try {
    await inspectionDb.overwriteAllInspections(cleanedInspections);
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError') {
      throw new Error('QuotaExceededError: IndexedDB quota exceeded when trying to overwrite all inspections.');
    }
    console.error("Error overwriting inspections in IndexedDB:", error);
    throw error;
  }
};


export const getInspectionById = async (id: string): Promise<SavedInspection | undefined> => {
  return await inspectionDb.getInspectionById(id);
};
