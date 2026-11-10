# Backend (andamiaje v0.1)

Estructura preparada para futuras integraciones corporativas. **La extensión v1.0 no depende de él ni le envía datos.**

Arranque local: `CYBERADMIN_API_TOKEN=<token de 24+ caracteres> node backend/server.mjs` (escucha solo en 127.0.0.1).

Pendiente para producción (no implementado): TLS delante (reverse proxy), SSO/OIDC en lugar de token estático, base de datos, RBAC,
conexión con SIEM/EDR/ticketing, proxy de reputación (para no exponer claves API en clientes), expansión segura de redirecciones y
conectores de acciones de contención (firewall/EDR/IdP) con doble aprobación.
