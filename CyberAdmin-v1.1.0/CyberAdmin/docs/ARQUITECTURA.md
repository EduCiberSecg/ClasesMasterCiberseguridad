# Arquitectura y decisiones

- **Sin framework ni build**: JavaScript ES modules nativos. Reduce superficie de ataque y permite cargar la carpeta directamente. React no mejora la mantenibilidad a este tamaño y exigiría un paso de compilación.
- **Capas**: UI (`dashboard/`, `popup.*`) → lógica de negocio (`modules/*`) → almacenamiento (`storage/`) e integraciones (`services/`). Los módulos no dependen de la UI; el motor de análisis y las estadísticas son funciones puras testeables en Node.
- **Almacenamiento**: IndexedDB (incidentes, alertas, auditoría, análisis, checklists) y `chrome.storage.local` (ajustes y claves). `db.js` tiene respaldo en memoria para tests.
- **Service worker**: sin estado; badge por alarma, menú contextual y notificaciones. Solo acepta mensajes de la propia extensión.
- **Modelo de amenazas resumido**: entradas hostiles (URLs, texto de incidentes) → saneadas y renderizadas con `textContent`; CSV con neutralización de fórmulas; exfiltración → ningún envío sin consentimiento, permisos de host opcionales; claves → almacenamiento aislado y redacción en auditoría.
- **Evolución**: sustituir `storage/` por un repositorio remoto (backend), añadir OIDC para identidad real, conectores de contención con doble aprobación.
