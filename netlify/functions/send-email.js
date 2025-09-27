const { Resend } = require('resend');

console.log('Iniciando función send-email');

// Mostrar las variables de entorno disponibles (sin valores sensibles)
console.log('Verificando configuración de entorno en send-email:', {
  RESEND_API_KEY: process.env.RESEND_API_KEY ? '***' : 'No definida',
  FROM_EMAIL: process.env.FROM_EMAIL ? '***' : 'No definida',
  NODE_ENV: process.env.NODE_ENV || 'development',
  status: process.env.RESEND_API_KEY && process.env.FROM_EMAIL ? 'Configuración válida' : 'Faltan variables de entorno'
});

// Verificar las variables de entorno
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

if (!RESEND_API_KEY || !FROM_EMAIL) {
  console.error('ERROR: Faltan variables de entorno requeridas');
  throw new Error('Configuración incompleta');
}

if (!RESEND_API_KEY) {
  console.error('ERROR: RESEND_API_KEY no está definida');
}

// Inicializar el cliente de Resend
const resend = new Resend(RESEND_API_KEY);

// Configuración de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const handler = async function(event, context) {
  // Configurar ID de solicitud único para rastreo
  const requestId = context.awsRequestId || `req_${Date.now()}`;
  
  // Función de log mejorada
  const log = (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      requestId,
      level: 'INFO',
      message,
      ...data
    };
    console.log(JSON.stringify(logEntry));
  };
  
  const logError = (message, error = {}) => {
    const timestamp = new Date().toISOString();
    const errorEntry = {
      timestamp,
      requestId,
      level: 'ERROR',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...error
      }
    };
    console.error(JSON.stringify(errorEntry));
  };
  
  log('=== INICIO DE SOLICITUD ===', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    bodyPreview: event.body ? event.body.substring(0, 500) : 'Vacío',
    rawBodySize: event.body ? event.body.length : 0
  });
  
  // Manejar solicitud OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    log('Manejando solicitud OPTIONS (preflight)');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Verificar que sea una solicitud POST
  if (event.httpMethod !== 'POST') {
    const error = new Error('Método no permitido');
    logError('Método HTTP no permitido', {
      method: event.httpMethod,
      allowedMethods: ['POST']
    });
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Método no permitido',
        requestId,
        allowedMethods: ['POST']
      })
    };
  }
  
  // Verificar si estamos en modo de desarrollo o producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  const ADMIN_EMAIL = 'alejandroquimbaya@quimservices.com'; // Correo del administrador
  
    // Validar que el body existe
    if (!event.body) {
      console.error('Error: No se recibió ningún dato');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'No se recibieron datos en la solicitud'
        })
      };
    }
    
    if (isDevelopment) {
      console.log('Modo desarrollo activado. Se enviará una copia al administrador.');
    }
    
    // Validar que tengamos una clave API
    console.log('Validando configuración de Resend...');
    if (!RESEND_API_KEY) {
      console.error('ERROR: No se encontró RESEND_API_KEY');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Error de configuración del servidor',
          details: 'Falta la clave de API de Resend'
        })
      };
    }
  
  let body;
  try {
    // Verificar que el cuerpo no esté vacío
    if (!event.body) {
      throw new Error('El cuerpo de la solicitud está vacío');
    }
    
    // Parsear el cuerpo de la solicitud
    body = JSON.parse(event.body);
    
    log('Cuerpo de la solicitud parseado correctamente', {
      to: body.to ? '***@' + body.to.split('@')[1] : 'No definido',
      subject: body.subject || 'No definido',
      hasHtml: !!body.html,
      attachmentsCount: body.attachments ? body.attachments.length : 0,
      attachmentsInfo: body.attachments 
        ? body.attachments.map(a => ({
            filename: a.filename,
            type: a.type,
            size: a.size || (a.content ? a.content.length : 0) + ' bytes'
          }))
        : []
    });
    
    // Validar que el cuerpo tenga el formato esperado
    if (!body.to || !body.subject || !body.html) {
      const errorMsg = 'Faltan campos requeridos en la solicitud';
      console.error(errorMsg, { 
        camposRecibidos: Object.keys(body),
        camposRequeridos: ['to', 'subject', 'html']
      });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: errorMsg,
          details: 'Se requieren los campos: to, subject, html'
        })
      };
    }

    // En modo desarrollo, enviar una copia al administrador
    if (isDevelopment && body.to) {
      console.log(`Modo desarrollo: Se enviará una copia a ${ADMIN_EMAIL}`);
      
      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.to)) {
        logError('Formato de correo electrónico inválido', { 
          email: body.to,
          regex: emailRegex.toString()
        });
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Formato de correo electrónico inválido',
            details: `El formato de ${body.to} no es válido`
          })
        };
      }
      
      // Guardar el destinatario original
      const originalTo = body.to;
      
      // Si el destinatario no es el administrador, agregar una nota
      if (originalTo !== ADMIN_EMAIL) {
        // Modificar el asunto para indicar que es una copia
        if (body.subject) {
          body.subject = `[COPIA] ${body.subject}`;
        }
        
        // Agregar una nota al HTML
        if (body.html) {
          body.html = body.html.replace('</body>', 
            `<div style='margin-top: 20px; padding: 10px; background: #e8f4fd; border-left: 4px solid #1d4ed8;'>
              <p><strong>Nota:</strong> Este es un correo de prueba. En producción, este correo sería enviado a: ${originalTo}</p>
            </div></body>`);
        }
      }
    }
      
  } catch (error) {
    logError('Error al parsear el cuerpo de la solicitud', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message,
        requestId,
        timestamp: new Date().toISOString()
      })
    };
  }
  
  try {
    const { to, subject, html, inspectionData } = body;
    
    // Validar campos requeridos
    if (!to) {
      logError('Falta el campo requerido: to', { body });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: 'Falta el campo requerido: to (destinatario)' 
        })
      };
    }

    if (!subject) {
      logError('Falta el campo requerido: subject', { body });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: 'Falta el campo requerido: subject (asunto)' 
        })
      };
    }

    if (!html) {
      logError('Falta el campo requerido: html', { body });
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: 'Falta el campo requerido: html (contenido del correo)' 
        })
      };
    }

    console.log('Validación de campos completada');

    // Validar que los adjuntos tengan el formato correcto
    const attachments = Array.isArray(body.attachments) 
      ? body.attachments.map(attach => ({
          filename: attach.filename || 'documento.pdf',
          content: attach.content,
          type: attach.type || 'application/pdf',
          disposition: 'attachment'
        }))
      : [];

    log('Preparando envío de correo', {
      to: '***@' + to.split('@')[1], // Ocultar parte del correo por privacidad
      subject: subject,
      hasHtml: !!html,
      attachmentsCount: body.attachments ? body.attachments.length : 0
    });
    console.log('Número de adjuntos:', attachments.length);
    
    // Verificar si hay archivos adjuntos
    if (body.attachments && body.attachments.length > 0) {
      log(`Procesando ${body.attachments.length} archivo(s) adjunto(s)`, {
        attachments: body.attachments.map(a => ({
          filename: a.filename,
          type: a.type,
          size: a.size || (a.content ? a.content.length : 0) + ' bytes'
        }))
      });
    }
    
    // Enviar correo usando Resend
    const emailData = {
      from: `AutoInspect <${FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      html: html,
      attachments: body.attachments || []
    };
    
    log('Enviando correo a través de Resend', {
      from: emailData.from,
      to: '***@' + emailData.to.split('@')[1],
      subject: emailData.subject,
      hasHtml: !!emailData.html,
      attachmentsCount: emailData.attachments.length
    });
    
    const { data, error } = await resend.emails.send(emailData);

    try {
      log('Correo enviado exitosamente', {
      messageId: data?.id,
      to: '***@' + to.split('@')[1],
      subject: subject,
      timestamp: new Date().toISOString()
    });
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Correo enviado correctamente',
          data: {
            id: data?.id,
            from: data?.from,
            to: data?.to,
            subject: data?.subject
          }
        })
      };
    } catch (sendError) {
      if (sendError) {
        logError('Error al enviar el correo a través de Resend', sendError);
      }
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Error al enviar el correo',
          message: sendError.message,
          ...(process.env.NODE_ENV === 'development' && {
            stack: sendError.stack,
            details: sendError
          })
        })
      };
    }
  } catch (error) {
    console.error('=== ERROR DETALLADO ===');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    console.error('Tipo de error:', error.name);
    console.error('=== FIN DE ERROR ===');
    
    // Determinar si es un error de validación o interno
    const isValidationError = error.name === 'ValidationError' || 
                            (error.message && (error.message.includes('validation') ||
                            error.message.includes('invalid')));
    
    // Mensaje de error amigable
    let errorMessage = 'Ocurrió un error al procesar tu solicitud.';
    if (isValidationError) {
      errorMessage = 'Datos de entrada inválidos. ' + (error.message || '');
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'La operación tardó demasiado tiempo. Por favor, inténtalo de nuevo.';
    }
    
    const errorResponse = {
      success: false, 
      error: isValidationError ? 'Error de validación' : 'Error interno del servidor',
      message: errorMessage
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.type = error.name;
    }
    
    return {
      statusCode: isValidationError ? 400 : 500,
      headers: corsHeaders,
      body: JSON.stringify(errorResponse)
    };
  }
};

// Exportar el manejador para ser utilizado por el servidor
module.exports = { handler };

