import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

declare const Buffer: any; // For Node.js Buffer type

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface UploadRequest {
  filename?: string;
  data?: string;
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: '',
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parse request body
    let request: UploadRequest;
    try {
      request = JSON.parse(event.body || '{}') as UploadRequest;
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { filename = `report-${Date.now()}.pdf`, data } = request;

    // Validate required fields
    if (!data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: data (base64 encoded PDF)' })
      };
    }

    // Clean and validate base64 data
    try {
      // Remove the data URL prefix if present
      const cleanData = data.replace(/^data:.*;base64,/, '');
      
      // Convert base64 to Uint8Array
      const fileData = base64ToUint8Array(cleanData);
      
      // Validate file size
      if (fileData.length > MAX_FILE_SIZE) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({ 
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            maxSize: MAX_FILE_SIZE,
            actualSize: fileData.length
          })
        };
      }

      // Configure blob store
      const store = getStore({
        name: 'reports',
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_API_TOKEN,
      });

      // Generate a safe filename and key
      const safeFilename = filename.replace(/[^\w.\-]+/g, '_');
      const key = `reports/${Date.now()}-${safeFilename}`;

      console.log(`Uploading file ${safeFilename} (${fileData.length} bytes) to ${key}`);

      // Convert Uint8Array to base64 string for storage
      const base64Data = Buffer.from(fileData).toString('base64');
      
      // Save the file to blob storage as a string
      await store.set(key, base64Data, {
        metadata: {
          originalName: filename,
          uploadedAt: new Date().toISOString(),
          size: fileData.length,
          isBase64: 'true',
          contentType: 'application/pdf',
        }
      });

      console.log(`Successfully uploaded ${key}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          key,
          filename: safeFilename,
          size: fileData.length
        })
      };

    } catch (error) {
      console.error('Error processing file:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'upload_failed',
          message: error instanceof Error ? error.message : 'Failed to process file',
        })
      };
    }
  } catch (error) {
    console.error('Unexpected error in upload-report:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'internal_server_error',
        message: 'An unexpected error occurred while processing your request',
        requestId: event.headers?.['x-nf-request-id'] || 'unknown'
      })
    };
  }
};

// Fallback CommonJS for runtime compatibility
if (typeof module !== 'undefined') {
  module.exports = { handler };
}
