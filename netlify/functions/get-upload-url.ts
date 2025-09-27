// netlify/functions/get-upload-url.ts
import type { Handler } from '@netlify/functions';
import * as Blobs from '@netlify/blobs';

// Algunas versiones exportan getSignedURL y otras getSignedUrl
const getSignedURL: (args: {
  method: 'PUT' | 'GET' | 'DELETE';
  key: string;
  expiresIn?: number;
}) => Promise<{ url: string }> =
  (Blobs as any).getSignedURL || (Blobs as any).getSignedUrl;

export const handler: Handler = async (event) => {
  try {
    const body = event?.body ? JSON.parse(event.body) : {};
    const filename: string = body?.filename || 'report.pdf';

    const key = `reports/\${Date.now()}-\${Math.random()
      .toString(16)
      .slice(2)}-\${filename}`;

    // Importante: NO pasar contentType para evitar preflight/CORS
    const { url } = await getSignedURL({
      method: 'PUT',
      key,
      expiresIn: 10 * 60, // 10 minutos
    });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, uploadUrl: url }),
    };
  } catch (e: any) {
    console.error('get-upload-url error:', e);
    return { statusCode: 500, body: e?.message || 'internal error' };
  }
};

// Fallback CommonJS para evitar "handler is undefined"
;(module as any).exports = { handler };
