// netlify/functions/send-email-attach.ts
import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export const handler: Handler = async (event) => {
  try {
    const { to, key, filename = 'inspection.pdf' } =
      event.body ? JSON.parse(event.body) : {};

    if (!to || !key) {
      return { statusCode: 400, body: 'Missing "to" or "key"' };
    }
    if (!process.env.RESEND_FROM_EMAIL) {
      return { statusCode: 500, body: 'RESEND_FROM_EMAIL not set' };
    }

    // Lee el binario directamente del store "reports"
    const store = getStore('reports');
    const arrayBuffer = await store.get(key, { type: 'arrayBuffer' });
    if (!arrayBuffer) {
      return { statusCode: 404, body: `Blob not found for key: \${key}` };
    }

    const buffer = Buffer.from(arrayBuffer);

    const res = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
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
      console.error('Resend error:', (res as any).error);
      return {
        statusCode: 502,
        body: `Email send failed: \${(res as any).error.message || 'unknown error'}`,
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('send-email-attach error:', e);
    return { statusCode: 500, body: e?.message || 'internal error' };
  }
};

// Fallback CommonJS
;(module as any).exports = { handler };
