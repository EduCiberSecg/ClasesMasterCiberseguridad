# CYBERADMIN · Security Operations Center (v1.0.0)

Extensión profesional para **Google Chrome y Microsoft Edge** (Manifest V3) que actúa como centro de control de ciberseguridad para administradores de sistemas, técnicos IT y responsables de seguridad.

Sin dependencias de terceros, sin build, sin código remoto. Todos los datos permanecen en el equipo del usuario.

## Funcionalidades implementadas (v1.0)

| Módulo | Estado | Detalle |
|---|---|---|
| **Dashboard** | ✅ | KPIs (total, críticos, pendientes, resueltos), nivel de riesgo, alertas recientes, donut por categoría, evolución 14 días, actividad |
| **Analizador de phishing** | ✅ local | 20+ heurísticas: Punycode/IDN, mezcla de alfabetos, IP (incl. ofuscada), subdominios, HTTP, `@`, marcas y typosquatting, TLD de riesgo, acortadores, redirección abierta, ejecutables… Resultado con nivel, indicadores, motivos, recomendaciones y fecha. «Bajo» **nunca** se presenta como «seguro» |
| Reputación externa | ✅ opt‑in | Google Safe Browsing y VirusTotal con clave propia, consentimiento explícito por análisis, URL sin parámetros por defecto, permiso de host opcional |
| **Incidentes** | ✅ | Alta, categorías, prioridades, responsable, estado, evidencias (con SHA‑256 local), acciones, comentarios, historial de cambios, cierre/reapertura, exportación PDF/JSON |
| **Protocolos** | ✅ | 12 protocolos × 10 secciones (qué ocurre, identificación, primeras acciones, contención, investigación, recuperación, comunicación, documentación, qué NO hacer, escalado) + checklist interactivo persistente (por incidente) y exportación PDF. Preservación de evidencias integrada |
| **Alertas** | ✅ | Críticas/pendientes/historial, gravedad, marcar revisada, notificaciones del navegador, badge del icono |
| **Auditoría** | ✅ | Toda acción queda registrada (claves API redactadas); filtros; exportación CSV/JSON |
| **Informes** | ✅ | PDF (generador propio), JSON y CSV (con protección contra inyección de fórmulas) |
| Popup | ✅ | Acceso rápido: KPIs, riesgo, análisis rápido de URL y accesos directos |
| Menú contextual | ✅ | «Analizar enlace con CyberAdmin» (análisis local) |

## Requieren backend o servicios externos (NO incluidos / solo andamiaje)

- Autenticación corporativa (SSO/OIDC) → la «identidad» actual es el nombre de operador local.
- Sincronización multi‑usuario de incidentes, RBAC, base de datos central (`backend/` contiene un esqueleto).
- Expansión/seguimiento seguro de redirecciones (requiere sandbox/backend; la extensión no visita URLs sospechosas).
- Ingesta automática de alertas desde SIEM/EDR/correo, y **acciones de bloqueo/aislamiento** (deben ejecutarse en tus herramientas administrativas con autorización; CyberAdmin nunca las ejecuta).
- Proxy de reputación para no distribuir claves API a los clientes.

## Instalación rápida

Ver [INSTALL.md](INSTALL.md). Resumen: `install.bat` (Windows) → `chrome://extensions` o `edge://extensions` → *Modo desarrollador* → *Cargar descomprimida* → carpeta del proyecto.

## Arquitectura

```
manifest.json            MV3, permisos mínimos, CSP estricta
background/              Service worker (badge, menú contextual, notificaciones)
popup.*                  Panel de acceso rápido
dashboard/               UI (app.js router · views/ · charts.js SVG propios · ui.js DOM seguro)
modules/phishing/        Motor de análisis (puro, sin red)
modules/incidents/       Gestión de incidentes + estadísticas + demo
modules/playbooks/       Protocolos y checklists
modules/alerts|audit/    Alertas y auditoría
modules/reports/         JSON, CSV, PDF
services/reputation.js   Integraciones externas (opt‑in)
services/ollama.js       Cliente de Ollama (IA local, solo localhost)
modules/assistant/       Prompt de sistema, contexto y consultas al asistente
storage/                 IndexedDB + chrome.storage.local (ajustes/claves)
utils/validate.js        Validación y saneamiento
backend/ config/ docs/   Andamiaje corporativo, configuración y documentación
tests/ scripts/          Tests (node:test) y validación/empaquetado
```

## Seguridad de la propia extensión

- **XSS/inyección HTML**: el DOM se construye solo con nodos y `textContent`; `innerHTML`, `eval`, `new Function`, `document.write` están prohibidos y el validador lo comprueba en cada ejecución.
- **CSP** `script-src 'self'`; sin scripts ni estilos en línea; sin recursos remotos; `connect-src` limitado a los dos servicios de reputación y a Ollama en localhost.
- **Mínimo privilegio**: `storage`, `alarms`, `notifications`, `contextMenus`. Sin `tabs`, `history`, `cookies`, `<all_urls>` ni content scripts. Hosts de reputación como permiso **opcional**, pedido en el momento del consentimiento.
- **Claves API**: solo en `chrome.storage.local`, enmascaradas en la UI, nunca en auditorías/informes/exportaciones. Nota: cualquier clave en un cliente puede ser extraída por quien controle el equipo → en entornos corporativos usa un proxy backend.
- **Sin telemetría** y sin envío de datos sin consentimiento. **Sin acciones destructivas automáticas**.

## Calidad

```
npm run validate   # manifest, rutas, imports, sintaxis, permisos, reglas de seguridad estáticas
npm test           # 29 tests (analizador, incidentes, auditoría, informes/PDF, protocolos, reputación con mock)
npm run zip        # dist/CyberAdmin-v1.0.0.zip
npm run all
```
Sin Node.js, `install.ps1` realiza la validación de archivos y manifest con PowerShell puro.

## Límites conocidos

- El análisis es heurístico: puede haber falsos positivos/negativos. Úsalo como apoyo, no como veredicto.
- Los datos viven en el perfil del navegador; desinstalar la extensión o borrar datos del navegador los elimina. Exporta informes periódicamente.
- Validado en Node 22 + pruebas de interfaz con jsdom; **no se ha podido probar en un navegador real en este entorno**: realiza la comprobación manual de `INSTALL.md` (sección «Verificación»).
