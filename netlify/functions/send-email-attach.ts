import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getStore } from '@netlify/blobs';

// Timeout for Blobs API call (10 seconds)
const BLOBS_TIMEOUT = 10000;

// Timeout for email sending (30 seconds)
const EMAIL_TIMEOUT = 30000;

// Helper function to create a timeout promise
const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMsg = 'Request timed out'): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(timeoutMsg)), ms)
  );
  return Promise.race([promise, timeout]);
};

interface EmailRequest {
  to: string;
  filename: string;
  key?: string;
  data?: string;
}

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
    let request: EmailRequest;
    try {
      request = JSON.parse(event.body || '{}') as EmailRequest;
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { to, key, filename, data: base64Data } = request;
    console.log('Email request received:', { 
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

    let pdfBuffer: Buffer | null = null;

    // 1) Try to read from Netlify Blobs if key is provided
    if (key) {
      try {
        console.log('Attempting to read from Blobs with key:', key);
        const store = getStore({
          name: 'reports',
          siteID: process.env.NETLIFY_SITE_ID,
          token: process.env.NETLIFY_API_TOKEN,
        });
        
        // Get the blob metadata first to check if it's base64 encoded
        const metadata = await withTimeout(
          store.getWithMetadata(key, { type: 'json' }),
          BLOBS_TIMEOUT,
          `Blobs metadata read timed out after ${BLOBS_TIMEOUT}ms`
        ) as { data: string | null, metadata: any };
        
        if (metadata && metadata.data) {
          // If the data is stored as base64 string
          if (metadata.metadata?.isBase64 === 'true') {
            const base64Data = metadata.data as string;
            pdfBuffer = Buffer.from(base64Data, 'base64');
            console.log(`Successfully read ${pdfBuffer.length} bytes (base64) from Blobs`);
          } else {
            // Handle as regular string data if needed
            pdfBuffer = Buffer.from(metadata.data as string);
            console.log(`Successfully read ${pdfBuffer.length} bytes (string) from Blobs`);
          }
        } else {
          console.warn('Blobs returned empty or invalid data');
        }
      } catch (e: any) {
        console.warn('Failed to read from Blobs, falling back to base64 data:', e.message);
        // Continue to fallback to base64 data
      }
    }

    // 2) Fallback: Use base64 data from client if available
    if ((!pdfBuffer || pdfBuffer.length === 0) && base64Data) {
      try {
        console.log('Using base64 data from client');
        const clean = base64Data.replace(/^data:.*;base64,/, '');
        pdfBuffer = Buffer.from(clean, 'base64');
        console.log(`Decoded ${pdfBuffer.length} bytes from base64`);
      } catch (e: any) {
        console.error('Failed to decode base64 data:', e.message);
        // Continue to error handling
      }
    }

    // If we still don't have the PDF, return an error
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('No PDF data available from any source');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'no_pdf_data',
          message: 'No PDF data available. Please provide either a valid key or base64 data.' 
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
    
    // Create a safe filename
    const safeFilename = filename.replace(/[^\w.\-]+/g, '_');
    
    // 5) Send email with attachment
    const emailData = {
      from: fromEmail!,
      to,
      subject: 'AutoInspect – Reporte de inspección',
      text: `Estimado/a,

Se ha generado el informe de inspección solicitado. Por favor encuentre adjunto el documento en formato PDF con todos los detalles.

Detalles de la inspección:
- Fecha: ${new Date().toLocaleDateString('es-ES')}
- Hora: ${new Date().toLocaleTimeString('es-ES')}

Este es un mensaje automático generado por el sistema de gestión de inspecciones de INTERCOAST.

--
INTERCOAST
Sistema de Gestión de Inspecciones`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Estimado/a,</p>
          
          <p>Se ha generado el informe de inspección solicitado. Por favor encuentre adjunto el documento en formato PDF con todos los detalles.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1D4ED8; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Detalles de la inspección:</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>Fecha: ${new Date().toLocaleDateString('es-ES')}</li>
              <li>Hora: ${new Date().toLocaleTimeString('es-ES')}</li>
            </ul>
          </div>
          
          <p>Este es un mensaje automático generado por el sistema de gestión de inspecciones de <strong>INTERCOAST</strong>.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            INTERCOAST<br>
            Sistema de Gestión de Inspecciones
          </p>
        </div>
      `,
      attachments: [{
        filename: safeFilename,
        content: pdfBuffer,
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
        usedFallback: !key || !base64Data
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
