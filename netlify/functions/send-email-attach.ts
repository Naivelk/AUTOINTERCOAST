import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!)

export const handler: Handler = async (event) => {
  try {
    const { to, key, filename = 'inspection.pdf' } =
      event.body ? JSON.parse(event.body) : {};

    if (!to || !key) {
      return { statusCode: 400, body: 'Missing "to" or "key"' };
    }

    const siteID = process.env.SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;
    const storeName = 'reports';

    if (!siteID || !token) {
      throw new Error('SITE_ID and NETLIFY_API_TOKEN must be set');
    }

    // Construir la URL del endpoint de la API de Netlify para obtener una URL de descarga firmada
    const apiUrl = `https://api.netlify.com/api/v1/sites/${siteID}/blobs/${storeName}/${key}?signed=true`;

    // Realizar la solicitud a la API para obtener la URL firmada
    const response = await fetch(apiUrl, {
      method: 'GET', // El método para obtener una URL de descarga es GET
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to get signed URL for download: ${response.status} ${errorBody}`);
    }

    const { url } = await response.json();

    // Descargamos el PDF dentro de la función (no desde el cliente)
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      throw new Error(`fetch blob failed: ${fileRes.status}`);
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resend admite adjuntos como Buffer
    await resend.emails.send({
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

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('send-email-attach error:', e);
    return { statusCode: 500, body: e?.message || 'internal error' };
  }
};
