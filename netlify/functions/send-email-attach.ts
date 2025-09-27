// netlify/functions/send-email-attach.ts
import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
    if (!RESEND_API_KEY || !FROM_EMAIL) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: !FROM_EMAIL ? 'RESEND_FROM_EMAIL not set' : 'RESEND_API_KEY not set' }),
      };
    }

    const { to, key, filename = 'inspection.pdf', data } = event.body ? JSON.parse(event.body) : {};
    if (!to) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing "to"' }) };
    }

    // Preparar el buffer del PDF
    let buffer: Buffer | null = null;

    // 1) Intentar leer desde Netlify Blobs si viene "key"
    if (key) {
      try {
        const store = getStore('reports'); // en Netlify prod no requiere credenciales
        const arr = await store.get(key, { type: 'arrayBuffer' });
        if (arr) buffer = Buffer.from(arr);
      } catch (e: any) {
        // Si Blobs no está configurado todavía, caemos al fallback "data"
        console.warn('Blobs no disponible o sin credenciales, se usará fallback base64 si fue provisto:', e?.message);
      }
    }

    // 2) Fallback: si no logramos tener buffer y viene "data" base64, úsalo
    if (!buffer && data) {
      const base64 = String(data).replace(/^data:.*;base64,/, '');
      buffer = Buffer.from(base64, 'base64');
    }

    if (!buffer) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'No file provided. Expected "key" (Netlify Blobs) or "data" (base64)' }),
      };
    }

    const resend = new Resend(RESEND_API_KEY);
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reporte de inspección',
      html: '<p>Adjunto encontrarás tu PDF.</p>',
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if ((res as any)?.error) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: (res as any).error?.message || 'Resend error' }),
      };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('send-email-attach error:', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e?.message || 'internal error' }) };
  }
};

// Fallback CommonJS (por si el runtime lo requiere)
;(module as any).exports = { handler };
