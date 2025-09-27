const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env si existe
if (fs.existsSync('.env')) {
  dotenv.config();
}

// Verificar variables de entorno requeridas
const requiredEnvVars = ['RESEND_API_KEY', 'FROM_EMAIL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`ERROR: Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Importar dependencias después de verificar variables
const express = require('express');

// Mostrar variables de entorno cargadas (sin valores sensibles)
console.log('Variables de entorno configuradas correctamente:', {
  RESEND_API_KEY: '***',
  FROM_EMAIL: process.env.FROM_EMAIL,
  NODE_ENV: process.env.NODE_ENV || 'development'
});

// 4. Importar el manejador de correo después de cargar las variables
const { handler } = require('./netlify/functions/send-email');

const app = express();
const port = 3001;

// Aumentar el límite de tamaño de carga útil a 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuración mejorada de CORS
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar solicitudes de preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor de funciones en ejecución');
});

// Ruta para el envío de correos
app.post('/api/send-email', async (req, res) => {
  console.log('Solicitud de envío de correo recibida');
  
  try {
    // Verificar si hay datos adjuntos
    const attachmentCount = req.body.attachments ? req.body.attachments.length : 0;
    console.log(`Se recibieron ${attachmentCount} archivo(s) adjunto(s)`);
    
    // Validar el tamaño del cuerpo de la solicitud
    const requestSize = JSON.stringify(req.body).length / (1024 * 1024); // Tamaño en MB
    console.log(`Tamaño de la solicitud: ${requestSize.toFixed(2)} MB`);
    
    if (requestSize > 45) { // Dejamos un margen por debajo del límite de 50MB
      throw new Error('El tamaño de la solicitud excede el límite permitido');
    }
    
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify(req.body),
      headers: {
        'content-type': 'application/json'
      }
    });
    
    console.log('Resultado del envío:', {
      statusCode: result.statusCode,
      message: result.body ? JSON.parse(result.body).message : 'Sin cuerpo de respuesta'
    });
    
    // Enviar la respuesta al cliente
    res.status(result.statusCode).json(
      result.body ? JSON.parse(result.body) : { success: false, message: 'Respuesta vacía del servidor' }
    );
    
  } catch (error) {
    console.error('Error en la ruta de envío de correo:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar la solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor de funciones ejecutándose en http://localhost:${port}`);
  console.log('Configuración del entorno:', {
    RESEND_API_KEY: '***',
    FROM_EMAIL: process.env.FROM_EMAIL,
    NODE_ENV: process.env.NODE_ENV || 'development',
    status: 'Configuración válida'
  });
});
