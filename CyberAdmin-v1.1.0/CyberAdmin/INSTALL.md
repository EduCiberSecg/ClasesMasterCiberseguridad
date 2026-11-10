# Instalación

## Requisitos
Chrome o Edge **110+** en Windows 10/11, macOS o Linux. Node.js 18+ solo si quieres ejecutar tests/validación (opcional).

## Windows (automático)
1. Descomprime `CyberAdmin-v1.0.0.zip` (si usas el ZIP) en una carpeta **permanente** (p. ej. `C:\Tools\CyberAdmin`).
2. Doble clic en `install.bat` (o `powershell -ExecutionPolicy Bypass -File install.ps1`).
   Comprueba archivos, valida el manifest, ejecuta tests si hay Node y abre la página de extensiones.
3. Sigue la guía de tu navegador.

> Chrome/Edge no permiten instalar extensiones sin firmar de forma silenciosa; la carga descomprimida es el método previsto para esta versión.

## Guía para Google Chrome
1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. **Cargar descomprimida** → selecciona la carpeta que contiene `manifest.json`.
4. Fija el icono con el puzzle 🧩 → pin. Clic en el icono: panel rápido → «Abrir centro de control completo».

## Guía para Microsoft Edge
1. Abre `edge://extensions`.
2. Activa **Modo de desarrollador** (panel izquierdo).
3. **Cargar extensión desempaquetada** → selecciona la carpeta con `manifest.json`.
4. Fija el icono desde el menú de extensiones.

## macOS / Linux
`npm run all` (validación + tests + ZIP) y carga la carpeta como arriba.

## Configuración de integraciones (opcional)
*Configuración* → pega tu API key de **Google Safe Browsing** y/o **VirusTotal**. Solo se usan si marcas «Consultar servicios externos» en un análisis y aceptas el diálogo de consentimiento (el navegador pedirá permiso de acceso al servicio la primera vez). Variables de entorno de referencia para backend/scripts: `config/config.example.env`.

## Asistente IA con Ollama (opcional)
1. Instala [Ollama](https://ollama.com) y descarga un modelo: `ollama pull llama3.2`.
2. Ollama rechaza (HTTP 403) las peticiones de extensiones salvo que lo permitas. Arráncalo con la variable de entorno `OLLAMA_ORIGINS=chrome-extension://*`:
   - Windows (PowerShell): `setx OLLAMA_ORIGINS "chrome-extension://*"` y reinicia Ollama.
   - macOS: `launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"` y reinicia Ollama.
   - Linux (systemd): `systemctl edit ollama` → `Environment="OLLAMA_ORIGINS=chrome-extension://*"` → `systemctl restart ollama`.
3. En la extensión: *Asistente IA* → «Reconectar» (concede el permiso a localhost) → elige modelo y pregunta. La URL se cambia en *Configuración*.
Los datos no salen de tu equipo y el contenido de las consultas no se guarda.

## Verificación manual (2 minutos)
1. Icono → el panel muestra KPIs y riesgo. Escribe `http://paypa1.com.login.xyz/verify` → «Analizar» → riesgo alto/crítico.
2. Dashboard → Configuración → *Cargar datos de demostración* → el dashboard muestra gráficos.
3. Incidentes → abre uno → añade evidencia, acción y comentario → cierra → exporta PDF.
4. Protocolos → Ransomware → marca pasos → la barra de progreso avanza y persiste al recargar.
5. Alertas → marca como revisada → desaparece de Pendientes y aparece en Historial.
6. Auditoría → ves todas las acciones; exporta CSV.
7. Clic derecho sobre un enlace de cualquier web → «Analizar enlace con CyberAdmin».

## Actualizar / desinstalar
Sustituye la carpeta y pulsa **Recargar** en la página de extensiones. Eliminar la extensión borra sus datos locales; exporta antes los informes.

## Problemas frecuentes
- *«No se pudo cargar el manifest»*: seleccionaste la carpeta equivocada; debe contener `manifest.json` directamente.
- *Service worker inactivo*: normal en MV3; se reactiva al usarlo.
- *Notificaciones no aparecen*: revisa los permisos de notificaciones del sistema para el navegador.
