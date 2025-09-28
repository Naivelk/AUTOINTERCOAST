// netlify/functions/send-email-attach.ts
import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getStore } from '@netlify/blobs';

// Timeout for Blobs API call (5 seconds)
const BLOBS_TIMEOUT = 5000;

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

    const { to, key, filename, data } = body;
    console.log('Request received:', { 
      to: to ? '***' : 'missing', 
      filename: filename || 'missing',
      hasKey: !!key,
      hasData: !!data
    });

    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.error('RESEND_FROM_EMAIL not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
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
        const got = await withTimeout(blobReadPromise, BLOBS_TIMEOUT, 'Blobs read operation timed out');
        
        if (got && got.length) {
          console.log('Successfully read', got.length, 'bytes from Blobs');
          bytes = got;
        } else {
          console.warn('Blobs returned empty or invalid data');
        }
      } catch (e: any) {
        console.warn('Failed to read from Blobs, falling back to base64 data:', e.message);
        // Continue to fallback
      }
    }

    // 2) Fallback: Use base64 data from client if available
    if ((!bytes || bytes.length === 0) && data) {
      try {
        console.log('Using base64 data from client');
        const clean = data.replace(/^data:.*;base64,/, '');
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

    // 3) Send email with Resend
    console.log('Preparing to send email to:', to);
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    try {
      const { error } = await withTimeout(
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to,
          subject: 'AutoInspect – Reporte de inspección',
          html: `
            <p>Adjuntamos el reporte de inspección.</p>
            <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          `,
          attachments: [{
            filename,
            content: Buffer.from(bytes),
          }],
        }),
        15000 // 15 second timeout for email sending
      );

      if (error) {
        console.error('Resend API error:', error);
        throw new Error('Failed to send email');
      }

      console.log('Email sent successfully to:', to);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Email sent successfully' 
        })
      };
    } catch (e: any) {
      console.error('Error sending email:', e);
      throw new Error(`Failed to send email: ${e.message}`);
    }
  } catch (e: any) {
    console.error('Error in send-email-attach:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: e.message 
      })
    };
  }
};

// Fallback CommonJS for runtime compatibility
(module as any).exports = { handler };
