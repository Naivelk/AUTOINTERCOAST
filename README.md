
# AutoInspect - Inspección Vehicular PWA

AutoInspect es una aplicación web progresiva (PWA) para inspección de vehículos, lista para usarse en cualquier dispositivo y funcionar completamente offline. Permite capturar datos, fotos, generar PDFs y gestionar inspecciones de manera segura y privada, aprovechando IndexedDB para almacenamiento eficiente.

---

## 🚗 Características principales

- **PWA:** Instalación en móvil o PC, funciona offline.
- **Flujo guiado:** Inspección paso a paso: datos, vehículos, fotos, resumen.
- **Soporte multi-vehículo:** Cada inspección puede tener varios autos y fotos por categoría.
- **Generación de PDF profesional:** Incluye fotos y todos los datos.
- **Almacenamiento seguro:** Toda la información se guarda en IndexedDB (no localStorage), soportando archivos grandes sin errores de cuota.
- **Gestión completa:** Ver, editar, eliminar inspecciones y re-generar PDFs.
- **UI moderna:** Hecha con React, Tailwind CSS y Lucide Icons.
- **Privacidad:** Nada sale de tu dispositivo.

---

## 🛠️ Tecnologías usadas

- **React + Vite** (SPA ultra rápida)
- **TypeScript**
- **Tailwind CSS**
- **React Router DOM**
- **IndexedDB** (vía [idb](https://github.com/jakearchibald/idb))
- **jsPDF** y **jspdf-autotable** (PDF)
- **Lucide Icons**
- **Netlify** (despliegue recomendado)

---

## 🚀 Instalación y ejecución local

1. **Clona el repo:**
   ```sh
   git clone https://github.com/Naivelk/-autoinspectapp.git
   cd -autoinspectapp
   ```
2. **Instala dependencias:**
   ```sh
   npm install
   ```
3. **Modo desarrollo:**
   ```sh
   npm run dev
   ```
4. **Build de producción:**
   ```sh
   npm run build
   ```
5. **Prueba el build localmente:**
   ```sh
   npx serve -s dist -l 5175
   ```
   Luego abre [http://localhost:5175](http://localhost:5175)

---

## 🌐 Despliegue en Netlify (SPA)

1. Haz build (`npm run build`).
2. Sube la carpeta `dist/` a Netlify (drag & drop o conecta GitHub).
3. Asegúrate de tener un archivo `_redirects` con:
   ```
   /*    /index.html   200
   ```
   Así las rutas funcionan como SPA.

---

## 📦 Migración automática de datos

- Si tienes inspecciones guardadas en `localStorage` de versiones anteriores, la app las migrará automáticamente a IndexedDB la primera vez que la abras tras actualizar.
- Esto elimina errores de "Local Storage Full" y permite guardar muchas más fotos y PDFs.

---

## 📚 Estructura del proyecto

```
/
├── public/                # Archivos estáticos (favicon, manifest, _redirects)
├── src/
│   ├── components/        # Componentes reutilizables (UI)
│   ├── screens/           # Pantallas principales (vistas)
│   ├── services/          # Lógica de negocio (IndexedDB, PDF, etc)
│   ├── App.tsx            # Contexto y rutas
│   ├── constants.ts       # Constantes globales
│   ├── index.tsx          # Entry point
│   ├── types.ts           # Tipos TypeScript
│   └── ...
├── index.html             # HTML principal
├── README.md              # Esta documentación
└── ...
```

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, lee las [pautas de contribución](CONTRIBUTING.md) antes de enviar un pull request.

---

## 📄 Documentación adicional

### Estructura de la base de datos

La aplicación utiliza IndexedDB con el siguiente esquema principal:

- **inspecciones**: Almacena todas las inspecciones realizadas
  - id: Identificador único
  - fecha: Fecha de creación
  - datosGenerales: Información del asegurado, agente, etc.
  - vehiculos: Array de vehículos inspeccionados
  - fotos: Objeto con las fotos organizadas por categoría
  - pdfGenerado: Indica si ya se generó el PDF

### Manejo de errores

- La aplicación incluye manejo de errores para:
  - Carga de imágenes
  - Generación de PDF
  - Operaciones de base de datos
  - Validación de formularios

### Rendimiento

- Se implementaron las siguientes optimizaciones:
  - Carga perezosa de componentes
  - Memoización de componentes costosos
  - Optimización de imágenes antes de guardar
  - Uso de virtualización para listas largas

---

## 📱 Compatibilidad

- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Dispositivos móviles (iOS/Android)
- Modo offline completo

## 📞 Soporte

Para reportar problemas o solicitar características, por favor abre un [issue](https://github.com/Naivelk/-autoinspectapp/issues) en el repositorio.

---

## 🎯 Próximas características

- [ ] Sincronización con la nube
- [ ] Plantillas personalizables de informes
- [ ] Firma digital en los informes
- [ ] Exportación a Excel/CSV
- [ ] Autenticación de usuarios

---

## 🙏 Agradecimientos

- A la comunidad de código abierto por las increíbles herramientas utilizadas
- A los contribuyentes que ayudan a mejorar este proyecto
- A los usuarios por sus valiosos comentarios y sugerencias

---

## 📄 Licencia

MIT. Desarrollado por Kevin Santiago Quimbaya Andrade.

---

## 📬 Contacto y soporte

¿Dudas o sugerencias? Abre un issue o escribe a [support@autoinspect.app](mailto:support@autoinspect.app)

---

> **Tip:** Puedes agregar capturas de pantalla o GIFs en esta sección para mostrar la app en acción.
    ```
2.  **Servir los Archivos:**
    Puedes usar cualquier servidor HTTP simple para servir los archivos estáticos (`index.html`, `src/index.tsx`, etc.) desde la raíz del proyecto. Algunas opciones:
    *   **Live Server (Extensión de VS Code):** Si usas VS Code, la extensión "Live Server" es una forma muy sencilla de lanzar la aplicación. Haz clic derecho en `index.html` y selecciona "Open with Live Server".
    *   **Python HTTP Server:**
        ```bash
        python -m http.server 8000
        ```
        Luego abre `http://localhost:8000` en tu navegador.
    *   **Node.js `http-server`:**
        ```bash
        npx http-server -p 8000
        ```
        Luego abre `http://localhost:8000` en tu navegador.

3.  **API Key (Si se usaran servicios externos que la requieran):**
    Actualmente, la aplicación no utiliza APIs externas que requieran una API key directamente visible o configurable por el usuario en el frontend. *Si se integrara una API como Gemini, esta esperaría que `process.env.API_KEY` estuviera configurada en el entorno de ejecución.* Para esta aplicación PWA basada en cliente, este tipo de clave debería manejarse a través de un backend o un servicio proxy para mantenerla segura.

## Consideraciones y Posibles Mejoras Futuras

*   **Build para Producción:** Para un despliegue en producción, se recomienda:
    *   Minificar el código JavaScript/CSS.
    *   Procesar Tailwind CSS con su CLI o como plugin de PostCSS para purgar clases no usadas y optimizar el CSS.
    *   Considerar un empaquetador como Vite o Webpack si la complejidad de la aplicación crece significativamente.
*   **Gestión de Estado Avanzada:** Para aplicaciones más grandes, se podría considerar una librería de gestión de estado más robusta (Zustand, Redux Toolkit).
*   **Backend y Sincronización en la Nube:** Para persistencia de datos más allá del `localStorage` y funcionalidades multi-dispositivo, se necesitaría un backend.
*   **Pruebas (Testing):** Implementar pruebas unitarias y de integración.
*   **Optimización de Imágenes:** Antes de guardar en Base64, se podrían aplicar compresiones o redimensionamientos para optimizar el uso de `localStorage`.
*   **Alternativas a `localStorage`:** Para datos más grandes o más estructurados, `IndexedDB` podría ser una mejor opción.

## Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue las guías estándar de contribución (fork, branch, pull request).

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LicenseScreen.tsx` o la sección correspondiente en la documentación de la app para más detalles.
*(Podrías crear un archivo LICENSE en la raíz con el texto de la licencia que tienes en `LicenseScreen.tsx`).*
