// netlify/functions/send-email-attach.ts
import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getStore } from '@netlify/blobs';

// Timeout for Blobs API call (5 seconds)
const BLOBS_TIMEOUT = 5000;

// Timeout for email sending (15 seconds)
const EMAIL_TIMEOUT = 15000;

// Helper function to create a timeout promise
const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMsg = 'Request timed out'): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(timeoutMsg)), ms)
  );
  return Promise.race([promise, timeout]);
};

export const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
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

    const { to, key, filename, data: base64Data } = body;
    console.log('Request received:', { 
      to: to ? '***' : 'missing', 
      filename: filename || 'missing',
      hasKey: !!key,
      hasData: !!base64Data
    });

    // Check for required environment variables
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL;
    const missing = [];
    
    if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (!fromEmail) missing.push('RESEND_FROM_EMAIL or FROM_EMAIL');
    
    if (missing.length > 0) {
      console.error(`Missing required environment variables: ${missing.join(', ')}`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'server_configuration_error',
          message: `Missing required configuration: ${missing.join(', ')}`,
          missing: missing
        })
      };
    }

    // Validate required fields
    if (!to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: to' })
      };
    }

    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: filename' })
      };
    }

    let bytes: Uint8Array | null = null;

    // 1) Try to read from Netlify Blobs if key is provided
    if (key) {
      try {
        console.log('Attempting to read from Blobs with key:', key);
        const store = getStore('reports');
        
        // Add timeout to Blobs API call
        const blobReadPromise = store.get(key) as unknown as Promise<Uint8Array | null>;
        const got = await withTimeout(
          blobReadPromise, 
          BLOBS_TIMEOUT, 
          `Blobs read operation timed out after ${BLOBS_TIMEOUT}ms`
        );
        
        if (got && got.length) {
          console.log('Successfully read', got.length, 'bytes from Blobs');
          bytes = got;
        } else {
          console.warn('Blobs returned empty or invalid data');
        }
      } catch (e: any) {
        console.warn('Failed to read from Blobs, falling back to base64 data:', e.message);
        // Continue to fallback to base64 data
      }
    }

    // 2) Fallback: Use base64 data from client if available
    if ((!bytes || bytes.length === 0) && base64Data) {
      try {
        console.log('Using base64 data from client');
        const clean = base64Data.replace(/^data:.*;base64,/, '');
        bytes = Buffer.from(clean, 'base64');
        console.log('Decoded', bytes?.length || 0, 'bytes from base64');
      } catch (e: any) {
        console.error('Failed to decode base64 data:', e.message);
        // Continue to error handling
      }
    }

    // If we still don't have bytes, return an error
    if (!bytes || bytes.length === 0) {
      console.error('No PDF data available from any source');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No PDF data available. Please provide either a valid key or base64 data.' 
        })
      };
    }

    // 3) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'invalid_email',
          message: 'Invalid email address format'
        })
      };
    }

    // 4) Send email with Resend
    console.log('Preparing to send email to:', to);
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // 5) Send email with attachment
    // We've already validated that fromEmail is defined, so we can safely use non-null assertion
    const emailData = {
      from: fromEmail!,
      to,
      subject: 'AutoInspect – Reporte de inspección',
      text: 'Adjuntamos el reporte de inspección.\n\nEste es un correo automático, por favor no responda a este mensaje.',
      html: `
        <p>Adjuntamos el reporte de inspección.</p>
        <p>Este es un correo automático, por favor no responda a este mensaje.</p>
      `,
      attachments: [{
        filename: filename.replace(/[^\w.\-]+/g, '_'),
        content: Buffer.from(bytes),
      }],
    };

    const { data: emailResponse, error } = await withTimeout(
      resend.emails.send(emailData),
      EMAIL_TIMEOUT,
      `Email sending timed out after ${EMAIL_TIMEOUT}ms`
    );

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Email sent successfully to:', to);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Email sent successfully',
        emailId: emailResponse?.id,
        usedFallback: !key || !bytes
      })
    };
  } catch (e: any) {
    console.error('Error in send-email-attach:', e);
    
    // Determine status code based on error type
    let statusCode = 500;
    let errorCode = 'internal_server_error';
    
    if (e.message.includes('timed out')) {
      statusCode = 504;
      errorCode = 'request_timeout';
    } else if (e.message.toLowerCase().includes('invalid email')) {
      statusCode = 400;
      errorCode = 'invalid_email';
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorCode,
        message: e.message,
        requestId: event.headers['x-nf-request-id'] || 'unknown'
      })
    };
  }
};

// Fallback CommonJS for runtime compatibility
(module as any).exports = { handler };
