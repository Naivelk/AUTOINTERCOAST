// netlify/functions/upload-report.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const filename: string = body?.filename || `report-${Date.now()}.pdf`;
    let data: string = body?.data;

    if (!data) {
      return { statusCode: 400, body: 'Missing "data" (base64 of PDF)' };
    }

    // permite data URL o base64 puro
    data = data.replace(/^data:.*;base64,/, '');
    const bytes = Buffer.from(data, 'base64');

    // --- Credenciales necesarias para usar la API de Netlify Blobs ---
    const siteID =
      process.env.SITE_ID || process.env.NETLIFY_SITE_ID; // SITE_ID la inyecta Netlify (reservada)
    const token = process.env.NETLIFY_API_TOKEN;

    if (!siteID || !token) {
      return {
        statusCode: 500,
        body: 'SITE_ID/NETLIFY_SITE_ID y NETLIFY_API_TOKEN deben estar definidos',
      };
    }

    const store = 'reports';
    const key = `${store}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}-${filename}`;

    // Subir el binario vía API REST de Netlify
    const apiUrl = `https://api.netlify.com/api/v1/sites/${siteID}/blobs/${store}/${encodeURIComponent(
      key.replace(`${store}/`, '') // la ruta después del nombre del store
    )}`;

    const put = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/octet-stream',
      },
      body: bytes,
    });

    if (!put.ok) {
      const errText = await put.text().catch(() => '');
      return {
        statusCode: 502,
        body: `Blob upload failed: ${put.status} ${errText}`,
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, key }),
    };
  } catch (e: any) {
    console.error('upload-report error:', e);
    return { statusCode: 500, body: e?.message || 'internal error' };
  }
};

// Fallback CommonJS
;(module as any).exports = { handler };
