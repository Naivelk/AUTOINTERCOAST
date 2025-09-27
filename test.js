console.log('Prueba de Node.js funcionando correctamente');
console.log('Versión de Node.js:', process.version);

// Probar el módulo resend
try {
  const { Resend } = require('resend');
  console.log('Resend cargado correctamente');
} catch (error) {
  console.error('Error al cargar Resend:', error);
}
