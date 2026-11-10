# Changelog

## 1.1.0
- Nuevo **Asistente IA** (vista «Asistente IA»): consultas de seguridad a un modelo local mediante Ollama, con streaming, selección de modelo, botón «Detener» y contexto opcional (resumen de incidentes abiertos y alertas pendientes).
- Ajustes: URL y modelo de Ollama, con «Probar conexión». Solo `localhost`/`127.0.0.1`.
- Permisos de host opcionales `http://localhost/*` y `http://127.0.0.1/*`; `connect-src` ampliado a localhost.
- Auditoría registra que se hizo una consulta (modelo, longitud), nunca su contenido. Historial del chat solo en memoria.
- Tests de `services/ollama.js` y del asistente.

## 1.0.0
- Primera versión funcional: dashboard, analizador de phishing (local + reputación opt‑in), incidentes, 12 protocolos con checklist, alertas, auditoría e informes PDF/JSON/CSV.
- Permisos mínimos, CSP estricta, DOM sin innerHTML, claves API aisladas.
- Instaladores `install.ps1`/`install.bat`, validación estática, 29 tests, andamiaje de backend.
