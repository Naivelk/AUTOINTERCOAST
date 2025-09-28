// netlify/functions/send-email-attach.ts
import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getStore } from '@netlify/blobs';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { to, key, filename, data } = JSON.parse(event.body || '{}') as {
      to?: string;
      key?: string;       // clave del blob (opcional si mandas data)
      filename?: string;
      data?: string;      // base64 opcional (fallback si no hay Blobs)
    };

    // Validaciones de entorno
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL not set');

    // Validaciones de payload
    if (!to) throw new Error('Missing "to"');
    if (!filename) throw new Error('Missing "filename"');

    let bytes: Uint8Array | null = null;

    // 1) Intentar leer el PDF desde Netlify Blobs si se envió "key"
    if (key) {
      try {
        const store = getStore('reports'); // mismo nombre que usa upload-report
        const got = (await store.get(key)) as unknown as Uint8Array | null;
        if (got && got.length) bytes = got;
      } catch (e: any) {
        // Si el runtime no tiene Blobs configurado, seguimos con el fallback
        console.warn('Blobs no disponible en runtime, usaré data base64 si viene:', e?.message);
      }
    }

    // 2) Fallback: si no pudimos leer del store, usar base64 del cliente
    if (!bytes && data) {
      const clean = data.replace(/^data:.*;base64,/, '');
      bytes = Buffer.from(clean, 'base64');
    }

    // Si aún no tenemos bytes, devolvemos error claro
    if (!bytes) {
      return {
        statusCode: 400,
        body: 'No PDF bytes available (ni key válida ni data base64)',
      };
    }

    // 3) Enviar email con Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: 'AutoInspect – Reporte de inspección',
      html: `<p>Adjuntamos el reporte de inspección.</p>`,
      attachments: [
        {
          filename,
          content: Buffer.from(bytes), // Resend acepta Buffer
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { statusCode: 500, body: 'Resend failed' };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('send-email-attach error:', e);
    return { statusCode: 500, body: e?.message || 'internal error' };
  }
};

// Fallback CommonJS por si el runtime lo requiere
;(module as any).exports = { handler };
