// netlify/functions/upload-report.ts
import type { Handler } from '@netlify/functions';

// Timeout for API calls (10 seconds)
const API_TIMEOUT = 10000;

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Helper function to create a timeout promise
const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMsg = 'Request timed out'): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(timeoutMsg)), ms)
  );
  return Promise.race([promise, timeout]);
};


export const handler: Handler = async (event) => {
  // Set CORS headers with proper type
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
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

    // Parse and validate request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const filename: string = body?.filename || `report-${Date.now()}.pdf`;
    let data: string | undefined = body?.data;

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
      data = data.replace(/^data:.*;base64,/, '');
      const bytes = Buffer.from(data, 'base64');
      
      // Validate file size
      if (bytes.length > MAX_FILE_SIZE) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({ 
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
          })
        };
      }

      // Get credentials
      const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
      const token = process.env.NETLIFY_API_TOKEN;

      if (!siteID || !token) {
        console.warn('Netlify Blobs not configured - missing SITE_ID or NETLIFY_API_TOKEN');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Server configuration error',
            message: 'Blob storage is not configured'
          })
        };
      }

      // Generate a unique key for the blob
      const store = 'reports';
      const key = `${store}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}-${filename.replace(/[^\w.-]/g, '_')}`;

      console.log(`Uploading file ${filename} (${bytes.length} bytes) to ${key}`);

      // Upload to Netlify Blobs via REST API
      const apiUrl = `https://api.netlify.com/api/v1/sites/${siteID}/blobs/${store}/${encodeURIComponent(
        key.replace(`${store}/`, '')
      )}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        const response = await withTimeout(fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: bytes,
          signal: controller.signal
        }), API_TIMEOUT, 'Upload timed out');

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          console.error(`Blob upload failed (${response.status}):`, errText);
          
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to upload file',
              message: `Blob storage error: ${response.status} ${response.statusText}`
            })
          };
        }

        console.log(`Successfully uploaded ${key}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            key,
            filename,
            size: bytes.length
          })
        };
      } catch (e: any) {
        clearTimeout(timeoutId);
        
        if (e.name === 'AbortError') {
          console.error('Upload timed out');
          return {
            statusCode: 504,
            headers,
            body: JSON.stringify({ error: 'Upload timed out' })
          };
        }
        
        throw e; // Re-throw for outer catch
      }
    } catch (e: any) {
      console.error('Error processing file:', e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid file data',
          message: 'The provided data is not a valid base64-encoded file'
        })
      };
    }
  } catch (e: any) {
    console.error('Error in upload-report:', e);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: e.message 
      })
    };
  }
};

// Fallback CommonJS for runtime compatibility
;(module as any).exports = { handler };
