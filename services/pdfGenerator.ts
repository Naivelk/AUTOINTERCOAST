import { jsPDF } from 'jspdf';
import { Vehicle, SavedInspection } from '../types';

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

// Add an image with a card background
const addImageWithCard = async (
  doc: jsPDF,
  photo: PdfPhoto & { base64: string },
  x: number,
  y: number,
  width: number,
  maxHeight: number,
  showCaption = true,
  _state?: PdfState // Optional and marked as unused
): Promise<{ height: number; newPage: boolean }> => {
  // Use PDF_OPTIONS for all dimensions and styling
  if (!photo.base64) {
    console.warn('No image data provided');
    return { height: 0, newPage: false };
  }
  
  // Calculate minimum dimensions based on image category
  const isSpecialImage = photo.category && [
    'VIN Number',
    'Vehicle Registration',
    'Owner ID'
  ].includes(photo.category);
  
  const minImageWidth = isSpecialImage ? 300 : 250;
  const minImageHeight = isSpecialImage ? 250 : 200;
  
  // Calculate available space for the image (accounting for padding and caption)
  const availableImageWidth = Math.max(width - (PDF_OPTIONS.IMAGE_PADDING * 2), minImageWidth);
  
  // Load image to get its dimensions
  const loadImageDims = async (base64: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = base64;
    });
  };

  // Get image dimensions
  let imageWidth = photo.width ?? 0;
  let imageHeight = photo.height ?? 0;
  
  if (imageWidth <= 0 || imageHeight <= 0) {
    try {
      const dimensions = await loadImageDims(photo.base64);
      imageWidth = dimensions.width || minImageWidth;
      imageHeight = dimensions.height || minImageHeight;
    } catch (error) {
      console.error('Error loading image dimensions:', error);
      imageWidth = minImageWidth;
      imageHeight = minImageHeight;
    }
  }
  
  // Calculate aspect ratio
  const imgAspectRatio = imageWidth / imageHeight;
  
  // Calculate initial dimensions based on available width
  let finalRenderWidth = availableImageWidth;
  let finalRenderHeight = availableImageWidth / imgAspectRatio;
  
  // Ensure minimum width is respected
  if (finalRenderWidth < minImageWidth) {
    finalRenderWidth = minImageWidth;
    finalRenderHeight = finalRenderWidth / imgAspectRatio;
  }
  
  // Ensure minimum height is respected
  if (finalRenderHeight < minImageHeight) {
    finalRenderHeight = minImageHeight;
    finalRenderWidth = finalRenderHeight * imgAspectRatio;
  }
  
  // If image is too tall, scale down to fit height
  if (finalRenderHeight > maxHeight) {
    finalRenderHeight = maxHeight;
    finalRenderWidth = finalRenderHeight * imgAspectRatio;
    
    // If width went below minimum, adjust both dimensions
    if (finalRenderWidth < minImageWidth) {
      finalRenderWidth = minImageWidth;
      finalRenderHeight = finalRenderWidth / imgAspectRatio;
    }
  }
  
  // Calculate caption height if showing caption
  let captionHeightPx = 0;
  const captionLineHeight = 7; // For multi-line captions
  
  if (showCaption) {
    // Calculate how many lines the caption will take
    const maxLineWidth = finalRenderWidth - (PDF_OPTIONS.IMAGE_PADDING * 2);
    const captionWords = (photo.note?.trim() || photo.name?.trim() || 'SIN NOTA').trim().split(' ');
    let currentLine = '';
    let lineCount = 1;
    
    // Simple text wrapping algorithm
    doc.setFontSize(PDF_OPTIONS.CAPTION_FONT_SIZE);
    doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold'); // 'bold' style works with standard fonts
    
    for (const word of captionWords) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth <= maxLineWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lineCount++;
        currentLine = word;
      }
    }
    
    // Add the last line if not empty
    if (currentLine) lineCount++;
    
    // Calculate total caption height with margins
    captionHeightPx = (lineCount * captionLineHeight) + (PDF_OPTIONS.CAPTION_MARGIN_TOP * 2);
  }
  
  // Calculate total card height (image + padding + caption)
  const totalCardHeight = finalRenderHeight + (PDF_OPTIONS.IMAGE_PADDING * 2) + captionHeightPx;
  
  // Draw card background with shadow
  doc.setDrawColor(0, 0, 0, PDF_OPTIONS.CARD_SHADOW_OPACITY * 255);
  doc.setFillColor(0, 0, 0, PDF_OPTIONS.CARD_SHADOW_OPACITY * 255);
  doc.roundedRect(
    x + 2,
    y + 2,
    width,
    totalCardHeight,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    'F'
  );
  
  // Draw card background
  doc.setDrawColor(255, 255, 255);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(
    x,
    y,
    width,
    totalCardHeight,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    PDF_OPTIONS.IMAGE_BORDER_RADIUS,
    'FD'
  );
  
  // Calculate image position (centered in card)
  const imagePosX = x + (width - finalRenderWidth) / 2;
  const imagePosY = y + PDF_OPTIONS.IMAGE_PADDING;
  
  // Add the image with error handling
  try {
    doc.addImage(
      photo.base64,
      'JPEG',
      imagePosX,
      imagePosY,
      finalRenderWidth,
      finalRenderHeight,
      undefined,
      'FAST'
    );
  } catch (error) {
    console.error('Error adding image to PDF:', error);
    // Draw a placeholder if image fails to load
    doc.setFillColor(255, 255, 255);
    doc.rect(
      x + (width - finalRenderWidth) / 2,
      imagePosY,
      finalRenderWidth,
      finalRenderHeight,
      'F'
    );
    
    // Draw caption background
    doc.setFillColor(255, 255, 255);
    doc.rect(
      x + (width - finalRenderWidth) / 2,
      imagePosY + finalRenderHeight + PDF_OPTIONS.CAPTION_MARGIN_TOP,
      finalRenderWidth,
      captionHeightPx,
      'F'
    );
    
    // Draw caption text
    const lines = doc.splitTextToSize(
      (photo.note?.trim() || photo.name?.trim() || 'SIN NOTA').trim().toUpperCase(),
      finalRenderWidth - PDF_OPTIONS.CAPTION_PADDING * 2
    );
    doc.text(
      lines,
      x + width / 2,
      imagePosY + finalRenderHeight + PDF_OPTIONS.CAPTION_MARGIN_TOP + PDF_OPTIONS.CAPTION_PADDING + (lines.length * PDF_OPTIONS.LINE_HEIGHT) / 2,
      { align: 'center', baseline: 'middle' }
    );
  }
  
    // Add caption if enabled
  if (showCaption) {
    const captionText = (photo.note || photo.name || 'SIN NOTA').trim();
    const captionY = imagePosY + finalRenderHeight + PDF_OPTIONS.CAPTION_MARGIN_TOP;
    const captionLineHeight = PDF_OPTIONS.LINE_HEIGHT * 1.2; // Slightly more spacing for captions
    
    doc.setFontSize(PDF_OPTIONS.CAPTION_FONT_SIZE);
    doc.setFont(PDF_OPTIONS.FONT_FAMILY, 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Split text into lines and draw each line
    const words = captionText.split(' ');
    let currentLine = '';
    let currentY = captionY;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth <= finalRenderWidth - (PDF_OPTIONS.IMAGE_PADDING * 2)) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          doc.text(
            currentLine.toUpperCase(),
            x + width / 2,
            currentY,
            { align: 'center' }
          );
          currentY += captionLineHeight;
        }
        currentLine = word;
      }
    }
    
    // Draw the last line if not empty
    if (currentLine) {
      doc.text(
        currentLine.toUpperCase(),
        x + width / 2,
        currentY,
        { align: 'center' }
      );
    }
  }
  
  // Calculate total height used by this card
  const totalHeight = totalCardHeight + PDF_OPTIONS.ELEMENT_MARGIN;
  
  // Return the height used and whether a new page was added
  return {
    height: totalHeight,
    newPage: false // Page breaks are now handled by the caller
  };
}

// Add footer to the PDF
const addFooter = (doc: jsPDF, inspection: SavedInspection): void => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer background
    doc.setFillColor(PDF_OPTIONS.COLOR_BACKGROUND);
    doc.rect(
      0,
      doc.internal.pageSize.getHeight() - PDF_OPTIONS.FOOTER_HEIGHT,
      doc.internal.pageSize.getWidth(),
      PDF_OPTIONS.FOOTER_HEIGHT,
      'F'
    );
    
    // Page number
    doc.setFontSize(PDF_OPTIONS.FONT_SIZE_SMALL);
    doc.setTextColor(PDF_OPTIONS.COLOR_TEXT_SECONDARY);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - PDF_OPTIONS.PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - PDF_OPTIONS.PAGE_MARGIN,
      { align: 'right' }
    );
    
    // Inspection ID
    doc.text(
      `ID: ${inspection.id || 'N/A'}`,
      PDF_OPTIONS.PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - PDF_OPTIONS.PAGE_MARGIN
    );
  }
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
  doc.setLanguage('en-US');
  doc.setFont(PDF_OPTIONS.FONT_FAMILY);
  
  try {
    // Add header background with a subtle shadow
    doc.setFillColor(PDF_OPTIONS.COLOR_PRIMARY);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Add logo (left side) or fallback to text
    if (logoDataUrl) {
      // Add logo with fixed dimensions (height: 32px, width will be proportional)
      const logoHeight = 32;
      const logoWidth = 100; // Adjust width proportionally based on your logo's aspect ratio
      
      try {
        doc.addImage(
          logoDataUrl,
          'PNG',
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
    
    // Load logo if available
    let logoDataUrl = null;
    try {
      logoDataUrl = await loadImageAsDataUrl('/assets/logogrande.png');
    } catch (error) {
      console.warn('Could not load logo, falling back to text header');
    }
    
    // Add header with logo
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
    format: 'a4' 
  });
  
  try {
    await generatePdfContent(doc, inspection);
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(doc, inspection);
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

// Función de compatibilidad para el código existente
export const generatePdf = async (inspection: SavedInspection): Promise<void> => {
  try {
    // Generate PDF and get blob
    const blob = await generatePdfBlob(inspection);
    const url = URL.createObjectURL(blob);
    
    // Create and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `inspeccion-${inspection.id || new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // No need to clean up URL here as it's only created in the try block
    throw error;
  }
};
