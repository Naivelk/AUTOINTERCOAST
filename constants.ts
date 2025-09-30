
import { Inspection, Photo, Vehicle, PhotoCategoryKey, PhotoCategoryConfig, AllPhotoCategoryKeys } from './types.ts';
import { getDefaultAgentName } from './services/inspectionService.ts'; // Importar función

// Keys for storage
const STORAGE_PREFIX = 'autoinspect_';
export const STORAGE_KEYS = {
  inspection: `${STORAGE_PREFIX}current_inspection`,
  step: `${STORAGE_PREFIX}current_step`,
  vehicleIndex: `${STORAGE_PREFIX}current_vehicle_index`,
} as const;

export const APP_NAME = "AutoInspect";
export const LOCAL_STORAGE_KEY = "autoinspect_inspections";

const createPhotoObject = (categoryKey: PhotoCategoryKey): Photo => {
  const config = PhotoCategoryConfig[categoryKey];
  return {
    id: config.id,
    name: config.name,
    base64: null,
    file: null,
  };
};

export const initialVehicleState = (): Vehicle => ({
  clientId: `vehicle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // For UI keying
  make: '',
  model: '',
  year: '',
  photos: AllPhotoCategoryKeys.reduce((acc, key) => {
    acc[key] = createPhotoObject(key);
    return acc;
  }, {} as Record<PhotoCategoryKey, Photo>),
});

export const initialInspectionState = (): Inspection => ({
  id: '',
  agentName: getDefaultAgentName(), // Usar nombre de agente predeterminado
  insuredName: '',
  policyNumber: '',
  inspectionDate: new Date().toISOString(),
  vehicles: [initialVehicleState()], // Initialize with one vehicle
});

export const PDF_OPTIONS = {
  BRAND_COLOR: '#2563EB', 
  TEXT_COLOR: '#1F2937', // Tailwind gray-800 for primary text (darker)
  TEXT_COLOR_MUTED: '#6B7280', // Tailwind gray-500 for labels, placeholders
  LINE_COLOR: '#D1D5DB', // Tailwind gray-300 for subtle lines
  
  CARD_BACKGROUND_COLOR: '#F9FAFB', // Tailwind gray-50 for section title bars
  CARD_BORDER_COLOR: '#E5E7EB', // Tailwind gray-200 for card/photo borders
  
  PAGE_MARGIN: 36, // Increased page margin for a more spacious feel
  CONTENT_START_Y: 0, // Will be set after header
  
  FONT_SIZE_MAIN_TITLE: 22, // For "AutoInspect - Vehicle Inspection Report"
  FONT_SIZE_INSPECTION_ID: 9,   // Smaller font for Inspection ID in header
  FONT_SIZE_LOGO_TEXT: 12,      // For "AutoInspect" text as logo
  FONT_SIZE_SECTION_HEADER: 14, // For titles in card headers (e.g., "Inspector Details")
  FONT_SIZE_KEY_VALUE_KEY: 9,   // For keys in key-value pairs (e.g., "Agent's Name:")
  FONT_SIZE_KEY_VALUE_VALUE: 10, // For values in key-value pairs
  FONT_SIZE_PHOTO_CAPTION: 8,   // For text below photos (e.g., "Front View")
  FONT_SIZE_FOOTER: 8,          // For footer text

  PHOTO_GRID_COLUMNS: 2,
  PHOTO_SLOT_GAP: 10, // Gap between photo slots in the grid
  PHOTO_CELL_PADDING: 3, // Padding inside the photo cell border before image
  PHOTO_CAPTION_OFFSET_Y: 4, // Space between photo and its caption

  // Spacing helpers
  SECTION_TITLE_BAR_HEIGHT_FACTOR: 1.4, // Multiplier for font size to get bar height
  SECTION_TITLE_BAR_PADDING_Y: 8, // Vertical padding inside title bar
  SECTION_SPACING_AFTER_TITLE_BAR: 15,
  KEY_VALUE_SPACING_Y: 7, // Vertical space after each key-value pair
  BLOCK_SPACING_Y: 20, // Space between major content blocks/cards

  // Deprecated/Replaced, kept for reference during transition if any old logic relies on them
  // PAGE_CONTENT_WIDTH_OFFSET: 56, (replaced by calculations using PAGE_MARGIN)
  // FONT_SIZE_XXL_TITLE: 20, (replaced)
  // FONT_SIZE_XL_HEADER: 16, (replaced)
  // FONT_SIZE_L_SUBHEADER: 12,(replaced)
  // FONT_SIZE_M_NORMAL: 10, (replaced by KEY_VALUE_VALUE)
  // FONT_SIZE_S_SMALL: 8, (replaced by specific uses like PHOTO_CAPTION, FOOTER)
  // PHOTO_THUMBNAIL_WIDTH: 80,
  // PHOTO_THUMBNAIL_HEIGHT: 60,
  // PHOTO_GAP: 12, (replaced by PHOTO_SLOT_GAP)
  // CARD_SECTION_HEADER_BG: '#F9FAFB', (renamed to CARD_BACKGROUND_COLOR)
};

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;