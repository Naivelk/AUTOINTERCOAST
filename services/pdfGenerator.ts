import { jsPDF } from 'jspdf';
import { Vehicle, SavedInspection } from '../types';

/**
 * Determines the image format from a data URL
 * @param dataUrl The data URL of the image
 * @returns 'PNG' or 'JPEG' based on the data URL
 */
function getImageFormatFromDataUrl(dataUrl: string): 'JPEG' | 'PNG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG'; // default to JPEG
}

/**
 * Loads an image from a URL and returns it as a data URL
 * @param url The URL of the image to load
 * @returns A promise that resolves to the data URL of the image
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

// Interfaces for PDF generation
interface PageSize {
  width: number;
  height: number;
}

interface PdfPhoto {
  id: string;
  name: string;
  base64: string; // Changed from string | null to string since we're ensuring it's not null before use
  note?: string;
  category?: string;
  url?: string;
  width?: number;
  height?: number;
}

// Types for PDF generation
interface PdfState {
  currentY: number;
  pageNumber: number;
  maxPageHeight: number;
  contentX: number;
  contentWidth: number;
  footerHeight: number;
  pageSize: PageSize;
}

// Extend the Photo interface to include the required properties

interface PdfOptions {
  // Colors
  COLOR_PRIMARY: string;
  COLOR_PRIMARY_LIGHT: string;
  COLOR_SECONDARY: string;
  COLOR_WHITE: string;
  COLOR_BORDER: string;
  COLOR_TEXT: string;
  COLOR_TEXT_SECONDARY: string;
  COLOR_BACKGROUND: string;
  COLOR_DANGER: string;
  COLOR_SUCCESS: string;
  
  // Layout
  PAGE_MARGIN: number;
  CARD_PADDING: number;
  CARD_MARGIN: number;
  CARD_BORDER_RADIUS: number;
  CARD_SHADOW: string;
  CONTENT_WIDTH: number;
  CARD_WIDTH: number;
  
  // Typography
  FONT_FAMILY: string;
  FONT_FAMILY_BOLD: string;
  FONT_FAMILY_ITALIC: string;
  FONT_SIZE_SMALL: number;
  FONT_SIZE_NORMAL: number;
  FONT_SIZE_MEDIUM: number;
  FONT_SIZE_LARGE: number;
  FONT_SIZE_XLARGE: number;
  FONT_SIZE_XXLARGE: number;
  FONT_SIZE_TITLE: number;
  FONT_SIZE_HEADER: number;
  FONT_SIZE_SUBHEADER: number;
  
  // Spacing
  LINE_HEIGHT: number;
  ELEMENT_MARGIN: number;
  
  // Images - High resolution settings
  IMAGE_QUALITY: number;            // Maximum quality (0.0 - 1.0)
  IMAGE_MAX_WIDTH: number;          // Maximum width for images
  IMAGE_MAX_HEIGHT: number;         // Maximum height for images
  IMAGE_PADDING: number;            // Padding around images
  IMAGE_CARD_PADDING: number;       // Padding inside card
  IMAGE_BORDER_RADIUS: number;      // Border radius for image cards
  CAPTION_HEIGHT: number;           // Height for caption
  CAPTION_MARGIN_TOP: number;       // Space between image and caption
  CAPTION_FONT_SIZE: number;        // Font size for captions
  CAPTION_PADDING: number;          // Padding around caption text
  CARD_SHADOW_OPACITY: number;      // Shadow opacity for cards
  
  // Header & Footer
  HEADER_HEIGHT: number;
  FOOTER_HEIGHT: number;
}

const PDF_OPTIONS: PdfOptions = {
  // Colors - Improved contrast for better readability
  COLOR_PRIMARY: '#1D4ED8',     // Slightly darker blue for better contrast
  COLOR_PRIMARY_LIGHT: '#EFF6FF', // Light blue background
  COLOR_SECONDARY: '#374151',   // Darker gray for better readability
  COLOR_TEXT: '#111827',        // Almost black for main text
  COLOR_TEXT_SECONDARY: '#6B7280', // Secondary text color
  COLOR_BACKGROUND: '#FFFFFF',   // Pure white background
  COLOR_WHITE: '#FFFFFF',
  COLOR_BORDER: '#E5E7EB',
  COLOR_DANGER: '#B91C1C',      // Darker red for better contrast
  COLOR_SUCCESS: '#166534',     // Darker green for success messages
  
  // Layout - Adjusted for better spacing
  PAGE_MARGIN: 30,              // Increased from 25
  CARD_PADDING: 20,             // Increased from 15
  CARD_MARGIN: 15,              // Increased from 10
  CARD_BORDER_RADIUS: 8,        // Slightly more rounded corners
  CARD_SHADOW: '1px 1px 5px rgba(0,0,0,0.1)',
  CONTENT_WIDTH: 0,             // Will be calculated based on page width
  CARD_WIDTH: 0,                // Will be calculated based on content width
  
  // Typography - Improved for better readability
  // Using standard fonts that are available by default in jsPDF
  FONT_FAMILY: 'helvetica',
  FONT_FAMILY_BOLD: 'helvetica',
  FONT_FAMILY_ITALIC: 'helvetica',
  FONT_SIZE_SMALL: 10,
  FONT_SIZE_NORMAL: 12,
  FONT_SIZE_MEDIUM: 14,
  FONT_SIZE_LARGE: 16,
  FONT_SIZE_XLARGE: 18,
  FONT_SIZE_XXLARGE: 24,
  FONT_SIZE_TITLE: 16,
  FONT_SIZE_HEADER: 18,
  FONT_SIZE_SUBHEADER: 14,
  
  // Spacing - Improved vertical rhythm
  LINE_HEIGHT: 1.5,             // Increased from 1.4
  ELEMENT_MARGIN: 12,           // Increased from 10
  
  // Images - High resolution settings
  IMAGE_QUALITY: 1.0,            // Maximum quality (0.0 - 1.0)
  IMAGE_MAX_WIDTH: 500,          // Maximum width for images
  IMAGE_MAX_HEIGHT: 600,         // Maximum height for images
  IMAGE_PADDING: 15,             // Padding around images
  IMAGE_CARD_PADDING: 10,        // Padding inside card
  IMAGE_BORDER_RADIUS: 4,        // Border radius for image cards
  CAPTION_HEIGHT: 22,            // Height for caption
  CAPTION_MARGIN_TOP: 10,        // Space between image and caption
  CAPTION_FONT_SIZE: 10,         // Font size for captions
  CAPTION_PADDING: 8,            // Padding around caption text
  CARD_SHADOW_OPACITY: 0.1,      // Shadow opacity for cards
  
  // Header & Footer
  HEADER_HEIGHT: 80,            // Height of the header in pixels
  FOOTER_HEIGHT: 30             // Height of the footer in pixels
};

/**
 * Adds an image with a card background to the PDF
 * @param doc The jsPDF document instance
 * @param photo The photo to add, must have base64 data
 * @param x The x position to place the image
 * @param y The y position to place the image
 * @param width The available width for the image
 * @param maxHeight The maximum height for the image
 * @param showCaption Whether to show a caption
 * @param _state Optional PDF state
 * @returns The height of the added image and whether a new page was added
 */
/** Re-encodea la imagen al tamaño real que se dibujará en el PDF (y la pasa a JPEG) */
async function reencodeForPdf(
  dataUrl: string,
  targetW: number,
  targetH: number,
  quality = 0.56 // 0.55–0.62 suele equilibrar bien
): Promise<string> {
  // Asegura JPEG (si viene PNG suele pesar más)
  const ensureJpeg = (src: string) =>
    src.startsWith('data:image/jpeg')
      ? src
      : src.replace(/^data:image\/png/, 'data:image/jpeg');

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img load'));
    i.src = ensureJpeg(dataUrl);
  });

  // Escala para que quepa en el rectángulo (manteniendo aspecto)
  const ratio = img.naturalWidth / img.naturalHeight;
  let w = targetW;
  let h = Math.round(targetW / ratio);
  if (h > targetH) {
    h = targetH;
    w = Math.round(targetH * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', quality);
}

const addImageWithCard = async (
  doc: jsPDF,
  photo: PdfPhoto & { base64: string },
  x: number,
  y: number,
  width: number,
  maxHeight: number,
  showCaption = true,
  _state?: PdfState
): Promise<{ height: number; newPage: boolean }> => {
  if (!photo.base64) {
    console.warn('No image data available for photo:', photo.id);
    return { height: 0, newPage: false };
  }

  // Ensure dataURL format
  let imageData = photo.base64.startsWith('data:')
    ? photo.base64
    : `data:image/jpeg;base64,${photo.base64}`;

  // Load image for dimensions
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  } catch (error) {
    console.error('Error loading image for dimensions:', error);
    return { height: 100, newPage: false };
  }

  // Special categories
  const isSpecialImage =
    photo.category &&
    ['VIN Number', 'Vehicle Registration', 'Owner ID'].includes(photo.category);

  const minImageWidth = isSpecialImage ? 300 : 250;
  const minImageHeight = isSpecialImage ? 250 : 200;
  const availableImageWidth = Math.max(width - PDF_OPTIONS.IMAGE_PADDING * 2, minImageWidth);

  // Original dimensions
  let imageWidth = photo.width ?? img.width ?? minImageWidth;
  let imageHeight = photo.height ?? img.height ?? minImageHeight;
  const ratio = imageWidth / imageHeight;

  // Initial scaling based on available width
  let finalRenderWidth = availableImageWidth;
  let finalRenderHeight = finalRenderWidth / ratio;

  // Respect minimum dimensions
  if (finalRenderWidth < minImageWidth) {
    finalRenderWidth = minImageWidth;
    finalRenderHeight = finalRenderWidth / ratio;
  }
  if (finalRenderHeight < minImageHeight) {
    finalRenderHeight = minImageHeight;
    finalRenderWidth = finalRenderHeight * ratio;
  }

  // Limit by max height
  if (finalRenderHeight > maxHeight) {
    finalRenderHeight = Math.max(minImageHeight, maxHeight);
    finalRenderWidth = finalRenderHeight * ratio;

    if (finalRenderWidth < minImageWidth) {
      finalRenderWidth = minImageWidth;
      finalRenderHeight = finalRenderWidth / ratio;
    }
  }

  // Caption height calculation
  let captionHeightPx = 0;
  if (showCaption) {
    const text = (photo.note?.trim() || photo.name?.trim() || 'SIN NOTA').trim().toUpperCase();
    doc.setFontSize(PDF_OPTIONS.CAPTION_FONT_SIZE);
    doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');

    const maxTextWidth = finalRenderWidth - PDF_OPTIONS.CAPTION_PADDING * 2;
    const lines = doc.splitTextToSize(text, maxTextWidth);
    captionHeightPx =
      lines.length * (PDF_OPTIONS.CAPTION_FONT_SIZE + 2) + 
      PDF_OPTIONS.CAPTION_PADDING * 2 + 
      PDF_OPTIONS.CAPTION_MARGIN_TOP;
  }

  // Total card height (calculate once)
  const totalCardHeight =
    finalRenderHeight + 
    PDF_OPTIONS.IMAGE_PADDING * 2 + 
    (showCaption ? captionHeightPx : 0);

  // Shadow effect (using light gray)
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(
    x + 2,
    y + 2,
    width,
    totalCardHeight,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    'F'
  );

  // White card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(
    x,
    y,
    width,
    totalCardHeight,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    'FD'
  );

  // Center image in card
  const imageX = x + (width - finalRenderWidth) / 2;
  const imageY = y + PDF_OPTIONS.IMAGE_PADDING;

  // Determine image format

// Re-encodeamos al tamaño REAL que se va a dibujar (reduce muchísimo el peso)
const embedDataUrl = await reencodeForPdf(
  imageData,
  Math.round(finalRenderWidth),
  Math.round(finalRenderHeight),
  0.58 // ajusta 0.55–0.62 si quieres más/menos peso
);

try {
  // Ya es JPEG y del tamaño exacto; podemos fijar formato a 'JPEG'
  doc.addImage(
    embedDataUrl,
    'JPEG',
    imageX,
    imageY,
    finalRenderWidth,
    finalRenderHeight,
    undefined,
    'FAST' // ✅
  );

} catch (error) {
  // ... deja tu bloque catch como lo tienes (placeholder)
}


  // Add caption
  if (showCaption) {
    const captionText = (photo.note?.trim() || photo.name?.trim() || 'SIN NOTA').trim().toUpperCase();
    const captionY = imageY + finalRenderHeight + PDF_OPTIONS.CAPTION_MARGIN_TOP;

    const lines = doc.splitTextToSize(
      captionText,
      finalRenderWidth - PDF_OPTIONS.CAPTION_PADDING * 2
    );

    doc.setFillColor(255, 255, 255);
    doc.rect(imageX, captionY, finalRenderWidth, captionHeightPx, 'F');

    doc.setFontSize(PDF_OPTIONS.CAPTION_FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    doc.text(
      lines, 
      imageX + finalRenderWidth / 2, 
      captionY + PDF_OPTIONS.CAPTION_PADDING, 
      { align: 'center', baseline: 'top' }
    );
  }

  return { 
    height: totalCardHeight, 
    newPage: false 
  };
};

// Add footer to the PDF
// Dibuja el pie SOLO en la página actual
const addFooter = (
  doc: jsPDF,
  inspection: SavedInspection,
  page: number,
  total: number
): void => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Fondo del footer
  doc.setFillColor(PDF_OPTIONS.COLOR_BACKGROUND);
  doc.rect(
    0,
    pageHeight - PDF_OPTIONS.FOOTER_HEIGHT,
    pageWidth,
    PDF_OPTIONS.FOOTER_HEIGHT,
    'F'
  );

  // Texto
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
  doc.setTextColor(PDF_OPTIONS.COLOR_TEXT_SECONDARY);

  // Número de página
  doc.text(
    `Página ${page} de ${total}`,
    pageWidth - PDF_OPTIONS.PAGE_MARGIN,
    pageHeight - PDF_OPTIONS.PAGE_MARGIN,
    { align: 'right' }
  );

  // ID de inspección
  doc.text(
    `ID: ${inspection.id || 'N/A'}`,
    PDF_OPTIONS.PAGE_MARGIN,
    pageHeight - PDF_OPTIONS.PAGE_MARGIN
  );
};


// Format date to localized string
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Adds a vehicle information card to the PDF
 * @param doc The jsPDF document instance
 * @param inspection The inspection data
 * @param vehicle The vehicle data
 * @param startY The Y position to start drawing
 * @param state The PDF generation state
 * @returns The Y position after the vehicle card
 */
const addVehicleInfoCard = (
  doc: jsPDF,
  inspection: SavedInspection,
  vehicle: Vehicle,
  startY: number,
  state: PdfState
): number => {
  const { contentX, contentWidth } = state;
  const cardPadding = PDF_OPTIONS.CARD_PADDING / 2;
  const cardWidth = contentWidth;
  
  // Add the card background with shadow
  doc.setFillColor(PDF_OPTIONS.COLOR_WHITE);
  doc.setDrawColor(PDF_OPTIONS.COLOR_BORDER);
  
  // Draw card background with subtle shadow
  doc.roundedRect(
    contentX - cardPadding,
    startY - cardPadding,
    cardWidth,
    70, // Height matches original design
    PDF_OPTIONS.CARD_BORDER_RADIUS,
    PDF_OPTIONS.CARD_BORDER_RADIUS,
    'FD'
  );
  
  // Calculate column positions with better spacing
  const col1 = contentX + 10; // Add small left padding
  const col2 = contentX + (cardWidth * 0.45); // Slightly wider first column
  
  // Client Information Section
  let infoY = startY + 10; // Start position for content
  
  // Section title
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_MEDIUM);
  doc.text('Client Information', col1, infoY);
  
  // Add a subtle separator line
  infoY += 5;
  doc.setDrawColor(PDF_OPTIONS.COLOR_BORDER);
  doc.line(col1, infoY, col1 + (cardWidth * 0.8), infoY);
  infoY += 12; // More space after section title
  
  // Field styling
  const fieldLabelWidth = 40; // Fixed width for labels
  const fieldValueX = col1 + fieldLabelWidth; // Align all values at the same X position
  const fieldHeight = 8; // Height of each field
  const fieldSpacing = 14; // Space between fields
  
  // Agent Field
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
  doc.text('Agent:', col1, infoY);
  
  const agentName = (inspection.agentName?.trim() || 'Not specified').toUpperCase();
  const agentNameWidth = Math.min(doc.getTextWidth(agentName) + 10, 150);
  
  doc.setFillColor('#F3F4F6');
  doc.roundedRect(
    fieldValueX - 3,
    infoY - 4,
    agentNameWidth,
    fieldHeight,
    2,
    2,
    'F'
  );
  
  doc.setFont(PDF_OPTIONS.FONT_FAMILY);
  doc.setTextColor(PDF_OPTIONS.COLOR_TEXT);
  doc.text(agentName, fieldValueX, infoY, {
    maxWidth: cardWidth - fieldLabelWidth - 20,
    lineHeightFactor: 1.2
  });
  
  // Insured Field
  infoY += fieldSpacing;
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.text('Insured:', col1, infoY);
  
  const insuredName = (inspection.insuredName?.trim() || 'Not specified').toUpperCase();
  const insuredNameWidth = Math.min(doc.getTextWidth(insuredName) + 10, 150);
  
  doc.setFillColor('#F3F4F6');
  doc.roundedRect(
    fieldValueX - 3,
    infoY - 4,
    insuredNameWidth,
    fieldHeight,
    2,
    2,
    'F'
  );
  
  doc.setFont(PDF_OPTIONS.FONT_FAMILY);
  doc.text(insuredName, fieldValueX, infoY, {
    maxWidth: cardWidth - fieldLabelWidth - 20,
    lineHeightFactor: 1.2
  });
  
  // Policy Number Field
  infoY += fieldSpacing;
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.text('Policy #:', col1, infoY);
  
  const policyNumber = (inspection.policyNumber?.trim() || 'Not specified').toUpperCase();
  const policyNumberWidth = Math.min(doc.getTextWidth(policyNumber) + 10, 150);
  
  doc.setFillColor('#E0F2FE'); // Light blue background
  doc.roundedRect(
    fieldValueX - 3,
    infoY - 4,
    policyNumberWidth,
    fieldHeight,
    2,
    2,
    'F'
  );
  
  doc.setFont(PDF_OPTIONS.FONT_FAMILY_BOLD);
  doc.setTextColor(PDF_OPTIONS.COLOR_PRIMARY);
  doc.text(policyNumber, fieldValueX, infoY, {
    maxWidth: cardWidth - fieldLabelWidth - 20,
    lineHeightFactor: 1.2
  });
  doc.setTextColor(PDF_OPTIONS.COLOR_TEXT);
  
  // Vehicle Information Section (right column)
  let vehicleY = startY + 10; // Align with client info section
  
  // Vehicle Information Section Title
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_MEDIUM);
  doc.text('Vehicle Information', col2, vehicleY);
  
  // Add a subtle separator line
  vehicleY += 5;
  doc.setDrawColor(PDF_OPTIONS.COLOR_BORDER);
  doc.line(col2, vehicleY, col2 + (cardWidth * 0.8), vehicleY);
  vehicleY += 12; // More space after section title
  
  // Vehicle Info with better spacing and alignment
  const vehicleLabelWidth = 50; // Slightly wider for 'License Plate'
  const vehicleValueX = col2 + vehicleLabelWidth;
  
  // Vehicle Make/Model/Year
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
  doc.text('Vehicle:', col2, vehicleY);
  
  const vehicleInfo = [
    vehicle.year,
    vehicle.make,
    vehicle.model
  ].filter(Boolean).join(' ').trim() || 'Not specified';
  
  const vehicleInfoWidth = Math.min(doc.getTextWidth(vehicleInfo) + 10, 150);
  
  doc.setFillColor('#F3F4F6');
  doc.roundedRect(
    vehicleValueX - 3,
    vehicleY - 4,
    vehicleInfoWidth,
    fieldHeight,
    2,
    2,
    'F'
  );
  
  doc.setFont(PDF_OPTIONS.FONT_FAMILY);
  doc.text(vehicleInfo, vehicleValueX, vehicleY, {
    maxWidth: cardWidth - vehicleLabelWidth - 20,
    lineHeightFactor: 1.2
  });
  
  // License Plate
  vehicleY += fieldSpacing;
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.text('Plate:', col2, vehicleY);
  
  const plateText = vehicle.licensePlate?.trim().toUpperCase() || 'Not specified';
  const plateWidth = Math.min(doc.getTextWidth(plateText) + 10, 120);
  
  doc.setFillColor('#E0F2FE');
  doc.roundedRect(
    vehicleValueX - 3,
    vehicleY - 4,
    plateWidth,
    fieldHeight,
    2,
    2,
    'F'
  );
  
  doc.setFont(PDF_OPTIONS.FONT_FAMILY_BOLD);
  doc.setTextColor(PDF_OPTIONS.COLOR_PRIMARY);
  doc.text(plateText, vehicleValueX, vehicleY, {
    maxWidth: cardWidth - vehicleLabelWidth - 20,
    lineHeightFactor: 1.2
  });
  doc.setTextColor(PDF_OPTIONS.COLOR_TEXT);
  
  // Return the Y position after the card with some space
  return startY + 90; // Matches original card height + margin
};

// Add the header with inspection details
const addHeader = (doc: jsPDF, inspection: SavedInspection, state: PdfState, logoDataUrl?: string): number => {
  const { currentY, contentX } = state;
  const headerHeight = PDF_OPTIONS.HEADER_HEIGHT;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightAlign = pageWidth - PDF_OPTIONS.PAGE_MARGIN;
  
  // Set document properties for better quality
  doc.setProperties({
    title: `Inspection Report - ${inspection.id || 'New'}`,
    subject: 'Vehicle Inspection Report',
    author: 'AutoInspect App',
    keywords: 'inspection, vehicle, report',
    creator: 'AutoInspect App'
  });
  
  // Set compression for better performance
  doc.setFont(PDF_OPTIONS.FONT_FAMILY);
  
  try {
    // Add header background with a subtle shadow
    doc.setFillColor(PDF_OPTIONS.COLOR_PRIMARY);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Add logo (left side) or fallback to text
    if (logoDataUrl) {
      // Add logo with optimized dimensions
      const logoHeight = 26;  // Reduced from 32
      const logoWidth = 80;   // Reduced from 100
      
      try {
        doc.addImage(
          logoDataUrl,
          'JPEG',  // Now using JPEG for better compression
          contentX,
          14, // Y position
          logoWidth,
          logoHeight,
          undefined,
          'FAST'
        );
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        // Fallback to text if logo fails to load
        doc.setFontSize(PDF_OPTIONS.FONT_SIZE_HEADER);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PDF_OPTIONS.COLOR_WHITE);
        doc.text('AutoInspect', contentX, 20);
      }
    } else {
      // Fallback to text if no logo provided
      doc.setFontSize(PDF_OPTIONS.FONT_SIZE_HEADER);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(PDF_OPTIONS.COLOR_WHITE);
      doc.text('AutoInspect', contentX, 20);
    }
    
    // Add document title (centered, adjusted for logo)
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_TITLE);
    doc.setFont('helvetica', 'bold');
    doc.text(
      'Inspection Report',
      pageWidth / 2,
      logoDataUrl ? 40 : 30, // Adjust Y position based on logo presence
      { align: 'center' }
    );
    
    // Add inspection ID and date (right aligned, on separate lines)
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
    // ID on first line
    doc.text(
      `ID: ${inspection.id?.substring(0, 8) || 'N/A'}`,
      rightAlign,
      18,  // Fixed Y position for ID
      { align: 'right' }
    );
    
    // Date on second line with more spacing
    doc.text(
      formatDate(inspection.inspectionDate || new Date().toISOString()),
      rightAlign,
      32,  // Fixed Y position for date (18 + 14px spacing)
      { align: 'right' }
    );
    
    // Add a simple header with just the title and inspection info
    const infoStartY = headerHeight + PDF_OPTIONS.ELEMENT_MARGIN * 1.5;
    
    // Add document title
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_HEADER);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe de Inspección', contentX, infoStartY);
    
    // Add inspection ID and date on the right
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
    doc.setFont('helvetica');
    
    // ID on first line
    doc.text(
      `ID: ${inspection.id?.substring(0, 8) || 'N/A'}`,
      rightAlign,
      infoStartY,
      { align: 'right' }
    );
    
    // Date on second line
    doc.text(
      formatDate(inspection.inspectionDate || new Date().toISOString()),
      rightAlign,
      infoStartY + 14,
      { align: 'right' }
    );
    
    // Add a subtle separator line
    doc.setDrawColor(PDF_OPTIONS.COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.line(contentX, infoStartY + 30, contentX + PDF_OPTIONS.CONTENT_WIDTH, infoStartY + 30);
    
    // Return the Y position after the header
    return infoStartY + 50; // Fixed height for the simplified header
  } catch (error) {
    console.error('Error adding header:', error);
    return currentY + PDF_OPTIONS.HEADER_HEIGHT;
  }
}

/**
 * Processes and adds vehicle photos to the PDF in a grid layout
 * @param doc The jsPDF document instance
 * @param vehicle The vehicle containing the photos
 * @param startY The Y position to start drawing
 * @param state The PDF generation state
 * @returns The Y position after processing all photos
 */
const processVehiclePhotos = async (
  doc: jsPDF,
  vehicle: Vehicle,
  startY: number,
  state: PdfState
): Promise<number> => {
  // Convert photos object to array and filter out undefined/null values
  const photosArray = vehicle.photos ? Object.values(vehicle.photos).filter(Boolean) : [];
  
  if (photosArray.length === 0) {
    return startY;
  }

  // Add section header
  doc.setFontSize(PDF_OPTIONS.FONT_SIZE_MEDIUM);
  doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
  doc.setTextColor(PDF_OPTIONS.COLOR_TEXT);
  const sectionTitle = 'FOTOS DEL VEHÍCULO';
  const sectionTitleWidth = doc.getTextWidth(sectionTitle);
  doc.text(sectionTitle, state.contentX + (state.contentWidth - sectionTitleWidth) / 2, startY);
  
  let currentY = startY + 20; // Space after section header
  
  // Process each photo one by one (one photo per row)
  for (const photo of photosArray) {
    // Skip photos without base64 data
    if (!photo.base64 || !photo.base64.startsWith('data:image')) {
      console.warn('Skipping photo - invalid or missing base64 data');
      continue;
    }
    
    try {
      // Calculate available width (full content width)
      const availableWidth = state.contentWidth;
      
      // Calculate estimated height for space checking
      const estimatedImageHeight = 300; // Default height in pixels
      const captionHeight = PDF_OPTIONS.CAPTION_MARGIN_TOP + (PDF_OPTIONS.LINE_HEIGHT * 2);
      const padding = PDF_OPTIONS.IMAGE_PADDING * 2;
      const elementMargin = PDF_OPTIONS.ELEMENT_MARGIN;
      
      // Calculate total required height for this card
      const requiredHeight = estimatedImageHeight + padding + captionHeight + elementMargin;
      
      // Calculate available space on current page
      const availableSpace = state.maxPageHeight - currentY - PDF_OPTIONS.FOOTER_HEIGHT - PDF_OPTIONS.PAGE_MARGIN;
      
      console.log(`[PDF] Space check - Available: ${Math.ceil(availableSpace)}px, Required: ${Math.ceil(requiredHeight)}px`);
      
      // Add new page if not enough space for the image with caption and margins
      if (availableSpace < requiredHeight) {
        console.log(`[PDF] Not enough space, adding new page`);
        doc.addPage();
        state.pageNumber++;
        currentY = PDF_OPTIONS.PAGE_MARGIN * 2;
        console.log(`[PDF] New page added, currentY reset to: ${currentY}px`);
      }
      
      // Calculate maximum possible image height for current page
      // Leave some space at the bottom for footer and margin
      const maxImageHeight = state.maxPageHeight - currentY - PDF_OPTIONS.FOOTER_HEIGHT - padding - captionHeight - elementMargin - 20;
      
      // Add the image with card - one photo per row
      const result = await addImageWithCard(
        doc,
        photo as PdfPhoto & { base64: string },
        state.contentX,
        currentY,
        availableWidth,
        maxImageHeight,
        true, // Show caption
        state
      );
      
      // Update current Y position
      if (result.newPage) {
        // If addImageWithCard added a new page, we're already at the top of a new page
        currentY = PDF_OPTIONS.PAGE_MARGIN * 2 + result.height;
      } else {
        // Continue on current page
        currentY += result.height;
      }
      
      // Add margin after each photo
      currentY += elementMargin;
      
      console.log(`[PDF] Photo processed, new Y: ${currentY}px`);
    } catch (error) {
      console.error('Error processing photo:', error);
      // Continue with next photo if one fails
      continue;
    }
  }
  
  // Return final Y position with extra margin
  return currentY + PDF_OPTIONS.ELEMENT_MARGIN;
}

/**
 * Genera un blob URL del PDF para previsualizar en un iframe/embed.
 */
// Generate the main PDF content
const generatePdfContent = async (doc: jsPDF, inspection: SavedInspection): Promise<void> => {
  try {
    // Initialize PDF state
    const state: PdfState = {
      currentY: PDF_OPTIONS.PAGE_MARGIN * 2,
      pageNumber: 1,
      maxPageHeight: doc.internal.pageSize.getHeight() - PDF_OPTIONS.FOOTER_HEIGHT,
      contentX: PDF_OPTIONS.PAGE_MARGIN,
      contentWidth: doc.internal.pageSize.getWidth() - PDF_OPTIONS.PAGE_MARGIN * 2,
      footerHeight: PDF_OPTIONS.FOOTER_HEIGHT,
      pageSize: {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight()
      }
    };
    
    // Update content width in options
    PDF_OPTIONS.CONTENT_WIDTH = state.contentWidth;
    
    // Load logo if available (re-encoded and optimized)
    let logoDataUrl: string | null = null;
    try {
      const rawLogo = await loadImageAsDataUrl('/assets/logogrande.png');
      if (rawLogo) {
        const LOGO_W = 80;  // width in PDF points (smaller for better performance)
        const LOGO_H = 26;  // height in PDF points
        logoDataUrl = await reencodeForPdf(rawLogo, LOGO_W, LOGO_H, 0.70);
      }
    } catch (error) {
      console.warn('Could not load logo, falling back to text header');
    }
    
    // Add header with (possibly) compressed logo
    state.currentY = addHeader(doc, inspection, state, logoDataUrl || undefined);
    
    // Process each vehicle
    if (inspection.vehicles && inspection.vehicles.length > 0) {
      for (const [index, vehicle] of inspection.vehicles.entries()) {
        // Start each vehicle (except the first) on a new page
        if (index > 0) {
          doc.addPage();
          state.pageNumber++;
          state.currentY = PDF_OPTIONS.PAGE_MARGIN * 2;
        }
        
        // Add vehicle info card
        state.currentY = addVehicleInfoCard(
          doc,
          inspection,
          vehicle,
          state.currentY,
          state
        );
        
        // Add space before photos
        state.currentY += PDF_OPTIONS.ELEMENT_MARGIN;
        
        // Process photos for this vehicle
        state.currentY = await processVehiclePhotos(doc, vehicle, state.currentY, state);
      }
    }
    
  } catch (error) {
    console.error('Error generating PDF content:', error);
    // Add error message to PDF
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_NORMAL);
    doc.setTextColor(PDF_OPTIONS.COLOR_DANGER);
    doc.text(
      'Error al generar el PDF. Por favor, intente nuevamente.',
      PDF_OPTIONS.PAGE_MARGIN,
      PDF_OPTIONS.PAGE_MARGIN * 2
    );
  }
};

/**
 * Generates a PDF and returns it as a Blob
 * @param inspection The inspection data
 * @returns A promise that resolves to a Blob containing the PDF
 */

export const generatePdfBlob = async (inspection: SavedInspection): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
    compress: true, // ayuda a bajar el peso final 
  });

  try {
    await generatePdfContent(doc, inspection);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(doc, inspection, i, pageCount);
    }
    
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Create a minimal error PDF
    const errorDoc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    errorDoc.text('Error generating PDF. Please try again.', 40, 40);
    return errorDoc.output('blob');
  }
};

// ✅ CIERRA AQUÍ la función generatePdf
export const generatePdf = async (inspection: SavedInspection): Promise<void> => {
  try {
    const blob = await generatePdfBlob(inspection);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `inspeccion-${inspection.id || new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}; // ⬅️ ESTE `};` FALTABA

// (Opcional) helper si algún día necesitas convertir un dataURL a Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] || 'application/pdf';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ✅ NUEVA export que pide InspectionsListScreen.tsx
export const generatePdfBlobUrl = async (inspection: SavedInspection): Promise<string> => {
  const blob = await generatePdfBlob(inspection);
  return URL.createObjectURL(blob);
};
