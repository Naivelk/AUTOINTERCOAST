import type { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

export const handler: Handler = async (event) => {
  try {
    const { filename = 'report.pdf', data } = event.body ? JSON.parse(event.body) : {};

    if (!data) {
      return { statusCode: 400, body: 'Missing file data' };
    }

    const store = getStore('reports');
    const key = `reports/${randomUUID()}-${filename}`;

    // Subir el archivo directamente desde la función
    // @ts-ignore - Los tipos del paquete son incorrectos, store.set acepta Buffer.
    await store.set(key, Buffer.from(data, 'base64'), {
      metadata: { filename },
    });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    };
  } catch (e: any) {
    console.error('upload-report error:', e);
    return { statusCode: 500, body: e?.message || 'Internal server error' };
  }
};
