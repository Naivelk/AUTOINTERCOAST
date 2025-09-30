export interface Photo {
  id: string; // e.g., 'front', 'vin'
  name: string; // e.g., 'Front View', 'VIN Number'
  base64: string | null;
  file?: File | null; // Temporary storage for file object before converting to base64
  note?: string; // Optional note for the photo
  preview?: string | null; // URL for preview purposes (data URL or blob URL)
}

export interface Vehicle {
  // Internal client-side ID for managing list of vehicles before saving
  // This is not part of the saved inspection ID structure.
  clientId?: string; 
  make: string;
  model: string;
  year: string;
  licensePlate?: string;
  photos: {
    front: Photo;
    back: Photo;
    left: Photo;
    right: Photo;
    vin?: Photo;
    registration?: Photo;
    ownerId?: Photo;
    location?: Photo;
  };
}

export interface Inspection {
  id: string; // Unique ID: InsuredName_VehicleModelVehicleYear_Timestamp (Primary vehicle used for ID)
  agentName: string;
  insuredName: string;
  policyNumber?: string;
  inspectionDate: string; // ISO string
  vehicles: Vehicle[]; // Changed from single vehicle to array
}

export enum InspectionStep {
  VEHICLE_DETAILS = 1,
  PHOTO_CAPTURE = 2,
  SUMMARY = 3,
}

export interface SavedInspection extends Inspection {
  pdfGenerated: boolean; 
}

export type PhotoCategoryKey = 'front' | 'back' | 'left' | 'right' | 'vin' | 'registration' | 'ownerId' | 'location';

export interface PhotoCategoryDetail {
  id: PhotoCategoryKey;
  name: string;
  isOptional: boolean;
}

export const PhotoCategoryConfig: Record<PhotoCategoryKey, PhotoCategoryDetail> = {
  front: { id: 'front', name: 'Front View', isOptional: true }, // Changed to true
  back: { id: 'back', name: 'Rear View', isOptional: true },    // Changed to true
  left: { id: 'left', name: 'Left Side', isOptional: true },   // Changed to true
  right: { id: 'right', name: 'Right Side', isOptional: true },  // Changed to true
  vin: { id: 'vin', name: 'VIN Number', isOptional: true },
  registration: { id: 'registration', name: 'Vehicle Registration', isOptional: true },
  ownerId: { id: 'ownerId', name: 'Owner ID', isOptional: true },
  location: { id: 'location', name: 'Location Screenshot', isOptional: true },
};


export const RequiredPhotoCategoryKeys: PhotoCategoryKey[] = Object.values(PhotoCategoryConfig)
  .filter(pc => !pc.isOptional)
  .map(pc => pc.id);

export const OptionalPhotoCategoryKeys: PhotoCategoryKey[] = Object.values(PhotoCategoryConfig)
  .filter(pc => pc.isOptional)
  .map(pc => pc.id);

export const AllPhotoCategoryKeys: PhotoCategoryKey[] = Object.values(PhotoCategoryConfig).map(pc => pc.id);


export interface SettingsItemType {
  id: string;
  label: string;
  icon: React.ElementType;
  action?: () => void;
  path?: string;
}