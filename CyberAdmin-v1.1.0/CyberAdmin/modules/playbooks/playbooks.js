// Protocolos de respuesta a incidentes (alineados con las fases de NIST SP 800-61: detección, contención, erradicación, recuperación, lecciones).
export const SECTIONS = [
  ['what', 'Qué ha ocurrido'], ['identify', 'Cómo identificarlo'], ['first', 'Primeras acciones'], ['contain', 'Contención'], ['investigate', 'Investigación'],
  ['recover', 'Recuperación'], ['communicate', 'Comunicación'], ['document', 'Documentación'], ['dont', 'Qué NO hacer'], ['escalate', 'Criterios de escalado']
];
const EVIDENCE_RULE = 'Preserva evidencias ANTES de modificar nada: captura logs, hashes (SHA-256) y registra cadena de custodia (quién, cuándo, dónde).';
const COMMON_DOC = [
  'Registrar cronología (UTC) de detección, acciones y decisiones en el incidente',
  'Guardar evidencias con hash SHA-256 y cadena de custodia',
  'Anotar sistemas, cuentas y datos afectados',
  'Redactar lecciones aprendidas y acciones de mejora tras el cierre'
];
const COMMON_DONT = [
  'No apagar ni reinstalar equipos sin antes decidir qué evidencias volátiles hay que conservar',
  'No borrar logs, correos ni ficheros sospechosos: aíslalos y conserva copia',
  'No acusar ni confrontar a personas antes de tener evidencias verificadas',
  'No ejecutar acciones destructivas o de bloqueo sin autorización explícita del responsable'
];
const mk = (id, title, icon, severity, p) => ({
  id, title, icon, severity, ...p,
  document: [...(p.document || []), ...COMMON_DOC], dont: [...p.dont, ...COMMON_DONT],
  investigate: [...p.investigate, EVIDENCE_RULE]
});

export const PLAYBOOKS = [
  mk('phishing', 'Phishing', 'mail', 'high', {
    what: 'Un usuario recibe (o interactúa con) un mensaje fraudulento que suplanta a una entidad para robar credenciales, dinero o instalar malware.',
    identify: ['Remitente o dominio que no coincide con la entidad real', 'Enlaces cuyo destino difiere del texto mostrado', 'Urgencia, amenazas o adjuntos inesperados', 'Informes de usuarios o picos de intentos de login desde ubicaciones inusuales'],
    first: ['Pedir al usuario que NO interactúe más y que reenvíe el mensaje como adjunto (.eml)', 'Confirmar si hizo clic, introdujo credenciales o abrió adjuntos', 'Analizar la URL en el módulo Analizador de phishing'],
    contain: ['Si hubo credenciales: forzar cambio de contraseña y revocar sesiones/tokens (acción autorizada)', 'Solicitar el bloqueo del dominio/URL en proxy, DNS y pasarela de correo', 'Retirar el mensaje de los buzones afectados mediante la herramienta de correo corporativa'],
    investigate: ['Revisar cabeceras (SPF, DKIM, DMARC, Received)', 'Buscar otros destinatarios del mismo mensaje', 'Revisar inicios de sesión sospechosos y reglas de reenvío creadas en el buzón'],
    recover: ['Reactivar cuentas tras restablecer MFA y credenciales', 'Eliminar reglas de buzón maliciosas', 'Escanear equipos si se abrió un adjunto'],
    communicate: ['Avisar a usuarios con la información práctica (no reenviar el phishing original)', 'Informar al responsable de seguridad y, si hay datos personales, al DPO'],
    dont: ['No abrir el enlace/adjunto desde un equipo corporativo normal', 'No reenviar el correo sospechoso por correo normal a más gente'],
    escalate: ['Credenciales de administrador o cuentas privilegiadas afectadas', 'Se instaló malware o hay actividad posterior en la cuenta', 'Campaña dirigida a directivos (whaling) o más de 10 víctimas']
  }),
  mk('ransomware', 'Ransomware', 'lock', 'critical', {
    what: 'Malware que cifra ficheros y/o exfiltra datos y exige un rescate. Es una emergencia de continuidad de negocio.',
    identify: ['Ficheros con extensiones nuevas o inaccesibles', 'Nota de rescate en pantalla o en carpetas', 'Picos de CPU/disco y borrado de copias de sombra', 'Alertas de EDR/antivirus por cifrado masivo'],
    first: ['Activar el plan de crisis y avisar al responsable de seguridad inmediatamente', 'Desconectar de la red (cable/Wi-Fi) los equipos afectados SIN apagarlos', 'Identificar el paciente cero y el alcance (equipos, comparticiones, servidores)'],
    contain: ['Aislar segmentos de red/VLAN afectados mediante la plataforma de red (con autorización)', 'Deshabilitar cuentas comprometidas y credenciales de servicio implicadas', 'Proteger y desconectar copias de seguridad offline/inmutables antes de que sean alcanzadas'],
    investigate: ['Identificar variante y vector inicial (RDP, phishing, VPN, vulnerabilidad)', 'Determinar si hubo exfiltración (doble extorsión)', 'Obtener muestra de la nota de rescate y de un fichero cifrado para análisis'],
    recover: ['Reconstruir desde imágenes limpias, no «limpiar» el sistema comprometido', 'Restaurar desde copias verificadas y libres de malware', 'Rotar TODAS las credenciales y reforzar MFA antes de reconectar', 'Monitorizar intensivamente tras la reconexión'],
    communicate: ['Dirección y gabinete legal desde el primer momento', 'Notificación a autoridades (CERT/INCIBE-CERT, Policía/Guardia Civil) y a la AEPD en 72 h si hay datos personales', 'Comunicación a clientes/proveedores según contrato'],
    dont: ['No pagar el rescate ni negociar sin decisión de dirección y asesoría legal/policial', 'No reiniciar los equipos cifrados (se pierde memoria volátil)', 'No restaurar sobre sistemas aún comprometidos'],
    escalate: ['SIEMPRE: escalar a dirección y equipo de crisis', 'Afecta a servidores críticos, ERP o datos personales', 'Indicios de exfiltración de datos']
  }),
  mk('malware', 'Malware', 'bug', 'high', {
    what: 'Software malicioso (troyano, infostealer, backdoor, miner…) detectado en uno o varios equipos.',
    identify: ['Alertas de antivirus/EDR', 'Procesos o servicios desconocidos, persistencia en inicio/tareas programadas', 'Conexiones salientes a destinos inusuales', 'Rendimiento degradado o cambios de configuración'],
    first: ['Aislar el equipo de la red manteniéndolo encendido', 'Capturar procesos, conexiones y memoria si se dispone de herramientas forenses', 'Identificar el vector (descarga, USB, correo, vulnerabilidad)'],
    contain: ['Aislar mediante EDR o desconexión de red', 'Bloquear IOCs (hashes, dominios, IPs) en las herramientas de seguridad con autorización', 'Deshabilitar cuentas usadas en el equipo si hay sospecha de robo de credenciales'],
    investigate: ['Analizar la muestra en sandbox (nunca en producción)', 'Buscar los mismos IOCs en el resto de la flota', 'Determinar si hubo movimiento lateral o exfiltración'],
    recover: ['Reinstalar el equipo desde imagen limpia', 'Cambiar credenciales usadas en el equipo', 'Aplicar parches y corregir el vector de entrada'],
    communicate: ['Informar al usuario y a su responsable', 'Compartir IOCs con el equipo de seguridad y, si procede, con el CERT'],
    dont: ['No usar el equipo infectado para iniciar sesión con cuentas privilegiadas', 'No subir muestras con datos sensibles a servicios públicos de análisis'],
    escalate: ['Malware con capacidad de movimiento lateral o ransomware', 'Se ha detectado en servidores o equipos de administradores', 'Varios equipos con los mismos IOCs']
  }),
  mk('credenciales', 'Robo de credenciales', 'key', 'high', {
    what: 'Credenciales de usuarios o servicios han sido capturadas (phishing, infostealer, filtración, reutilización).',
    identify: ['Credenciales corporativas en filtraciones o foros', 'Inicios de sesión desde países/ASN inusuales o imposibles (viaje imposible)', 'Fatiga MFA (múltiples notificaciones)', 'Alertas del proveedor de identidad'],
    first: ['Identificar las cuentas afectadas y su nivel de privilegio', 'Forzar cambio de contraseña y revocar sesiones/tokens/API keys (autorizado)', 'Revisar MFA registrado: eliminar métodos desconocidos'],
    contain: ['Bloquear temporalmente las cuentas comprometidas', 'Restringir acceso desde IPs atacantes en el IdP/firewall', 'Rotar secretos de cuentas de servicio relacionados'],
    investigate: ['Revisar logs de autenticación y acciones realizadas con la cuenta', 'Buscar reutilización de credenciales en otros sistemas', 'Determinar cómo se obtuvieron (phishing, malware, filtración)'],
    recover: ['Restablecer credenciales con MFA resistente a phishing', 'Revertir cambios no autorizados hechos con la cuenta', 'Monitorizar la cuenta 30 días'],
    communicate: ['Informar al titular de la cuenta con instrucciones claras', 'Notificar a responsables de los sistemas accesibles con esa cuenta'],
    dont: ['No enviar nuevas contraseñas por correo o chat', 'No restaurar el acceso antes de eliminar sesiones y métodos MFA desconocidos'],
    escalate: ['Cuenta de administrador, de servicio o con acceso a datos sensibles', 'Evidencia de uso malicioso de la cuenta', 'Lista masiva de credenciales corporativas']
  }),
  mk('fuga-datos', 'Fuga de información', 'database', 'critical', {
    what: 'Datos confidenciales o personales han sido expuestos, enviados o extraídos a terceros sin autorización.',
    identify: ['Envíos masivos o inusuales a destinos externos/nube personal', 'Bases de datos o buckets públicos', 'Datos corporativos publicados o ofrecidos a la venta', 'Alertas DLP'],
    first: ['Determinar qué datos, cuántos registros y qué categorías (personales, financieros, secretos)', 'Detener la exposición (cerrar el acceso público, revocar enlaces)', 'Reunir al equipo legal/DPO desde el inicio'],
    contain: ['Revocar claves, tokens y accesos implicados', 'Bloquear canales de exfiltración identificados (con autorización)', 'Solicitar retirada del contenido publicado a las plataformas'],
    investigate: ['Reconstruir qué se accedió y cuándo con logs de acceso', 'Distinguir error humano, insider o ataque externo', 'Evaluar el riesgo para los afectados'],
    recover: ['Corregir la causa (permisos, configuración, proceso)', 'Reforzar controles DLP y mínimos privilegios', 'Verificar que los datos ya no están accesibles'],
    communicate: ['Notificar a la AEPD en un máximo de 72 h si hay riesgo para los derechos de las personas (RGPD art. 33)', 'Comunicar a los afectados si el riesgo es alto (art. 34)', 'Informar a clientes/contratos con cláusulas de notificación'],
    dont: ['No minimizar ni retrasar la notificación legal por «esperar a tener todos los datos»', 'No contactar con el presunto atacante sin asesoría legal'],
    escalate: ['SIEMPRE si hay datos personales: DPO y asesoría legal', 'Datos de categorías especiales o menores', 'Exposición pública o venta de datos']
  }),
  mk('acceso-no-autorizado', 'Acceso no autorizado', 'shield-off', 'high', {
    what: 'Una persona o sistema accede a recursos para los que no tiene permiso (externo, insider o cuenta legítima mal usada).',
    identify: ['Accesos fuera de horario o a recursos no habituales', 'Nuevas cuentas, cambios de privilegios o reglas de firewall', 'Alertas de SIEM/EDR por escalada de privilegios', 'Uso de herramientas administrativas inesperadas'],
    first: ['Identificar el sistema, la cuenta y el origen del acceso', 'Preservar logs y sesiones activas', 'Decidir si se observa (monitorización) o se contiene de inmediato según riesgo'],
    contain: ['Deshabilitar cuenta/sesión y bloquear origen (con autorización)', 'Aislar el sistema accedido si hay riesgo de propagación', 'Revocar claves SSH/API y tokens'],
    investigate: ['Reconstruir línea temporal de acciones del actor', 'Buscar persistencia (cuentas, tareas, claves, webshells)', 'Identificar datos accedidos o modificados'],
    recover: ['Eliminar persistencia y restaurar configuración legítima', 'Parchear la vulnerabilidad o corregir el permiso', 'Rotar credenciales de todo el alcance'],
    communicate: ['Informar al propietario del sistema y a seguridad', 'RRHH/legal si se trata de un insider'],
    dont: ['No confrontar al sospechoso antes de asegurar evidencias y consultar a RRHH/legal', 'No «limpiar» el sistema antes de copiar logs'],
    escalate: ['Acceso a sistemas críticos o a datos personales', 'Privilegios de administrador de dominio/root', 'Posible insider']
  }),
  mk('fuerza-bruta', 'Ataques de fuerza bruta', 'repeat', 'medium', {
    what: 'Intentos masivos de adivinar credenciales (fuerza bruta, password spraying, credential stuffing) contra servicios expuestos.',
    identify: ['Muchos fallos de autenticación desde una o varias IP', 'Un mismo password probado contra muchas cuentas (spraying)', 'Bloqueos de cuentas masivos', 'Picos de tráfico en RDP/SSH/VPN/OWA/login web'],
    first: ['Determinar el servicio atacado y si hubo algún acceso exitoso tras los fallos', 'Revisar logins exitosos desde las IP atacantes', 'Activar o reforzar bloqueo por intentos y rate limiting'],
    contain: ['Bloquear IPs/rangos atacantes en el firewall/WAF (con autorización)', 'Exigir MFA en el servicio', 'Retirar exposición directa (RDP/SSH) detrás de VPN o bastión'],
    investigate: ['Identificar si alguna cuenta fue comprometida', 'Correlacionar con listas de credenciales filtradas', 'Medir volumen, duración y origen'],
    recover: ['Restablecer credenciales de cuentas con acceso exitoso', 'Mantener las reglas de protección activas', 'Ajustar política de contraseñas'],
    communicate: ['Informar al propietario del servicio', 'Avisar a usuarios cuyas cuentas fueron objetivo'],
    dont: ['No desactivar el bloqueo de cuentas para «evitar molestias»', 'No bloquear rangos enormes sin valorar el impacto a usuarios legítimos'],
    escalate: ['Algún login exitoso desde la IP atacante', 'Cuentas privilegiadas objetivo', 'Ataque sostenido que afecta a la disponibilidad']
  }),
  mk('cuenta-comprometida', 'Compromiso de cuentas', 'user-x', 'high', {
    what: 'Un atacante controla una cuenta legítima (correo, SaaS, directorio) y puede actuar en nombre del usuario.',
    identify: ['Correos enviados que el usuario no escribió', 'Reglas de reenvío/ocultación en el buzón', 'Cambios de MFA, recuperación o contraseña no solicitados', 'Alertas de actividad anómala del proveedor'],
    first: ['Deshabilitar o bloquear la cuenta y cerrar todas las sesiones', 'Restablecer contraseña desde un canal seguro y revisar MFA', 'Documentar la actividad reciente de la cuenta antes de limpiarla'],
    contain: ['Revocar tokens OAuth y aplicaciones autorizadas sospechosas', 'Eliminar reglas de reenvío y delegaciones', 'Avisar al equipo para que desconfíe de mensajes recientes de la cuenta'],
    investigate: ['Revisar logs de acceso, IPs y user agents', 'Evaluar el correo/datos accedidos o exfiltrados', 'Buscar fraude (cambios de IBAN, solicitudes de pago)'],
    recover: ['Reactivar con MFA fuerte', 'Restaurar configuración legítima', 'Monitorizar 30 días'],
    communicate: ['Contactar a destinatarios que recibieron mensajes del atacante', 'Informar a finanzas si hubo intento de fraude (BEC)'],
    dont: ['No reutilizar la contraseña antigua o parecida', 'No eliminar los correos enviados por el atacante antes de preservar evidencias'],
    escalate: ['Cuenta de directivo o financiera (BEC)', 'Acceso a datos personales o confidenciales', 'Cuenta con privilegios administrativos']
  }),
  mk('vulnerabilidad', 'Vulnerabilidades críticas', 'alert-triangle', 'high', {
    what: 'Se publica o descubre una vulnerabilidad crítica (CVSS alto / explotada activamente) que afecta a activos de la organización.',
    identify: ['Aviso de CISA KEV, INCIBE-CERT, fabricante o escáner de vulnerabilidades', 'Explotación activa conocida (exploit público)', 'Activos expuestos a Internet afectados', 'Indicadores de explotación en logs'],
    first: ['Inventariar qué activos y versiones están afectados', 'Priorizar los expuestos a Internet y los críticos', 'Comprobar si ya hay indicios de explotación'],
    contain: ['Aplicar mitigaciones temporales del fabricante (regla WAF, deshabilitar función)', 'Restringir el acceso al servicio vulnerable', 'Activar monitorización específica de la vulnerabilidad'],
    investigate: ['Buscar IOCs de explotación (webshells, procesos, conexiones)', 'Revisar logs desde la fecha de publicación (e incluso antes si era 0-day)'],
    recover: ['Aplicar el parche en ventana urgente, con plan de reversión', 'Verificar con un nuevo escaneo', 'Si hubo explotación, tratarlo como acceso no autorizado y reconstruir'],
    communicate: ['Informar a propietarios de sistemas y dirección con plazos', 'Registrar excepciones aprobadas'],
    dont: ['No parchear en producción sin copia/plan de reversión', 'No retrasar la mitigación esperando a la ventana mensual si hay explotación activa'],
    escalate: ['Explotación activa confirmada', 'Activos críticos sin parche ni mitigación disponible', 'Evidencia de compromiso']
  }),
  mk('ddos', 'Ataques DDoS', 'activity', 'high', {
    what: 'Tráfico malicioso masivo satura red, aplicaciones o recursos y degrada o interrumpe el servicio.',
    identify: ['Latencia o caídas repentinas del servicio', 'Picos de tráfico/peticiones desde muchas IPs', 'Saturación de ancho de banda, conexiones o CPU', 'Alertas del ISP/CDN'],
    first: ['Confirmar que es un ataque y no un pico legítimo o fallo interno', 'Contactar con el ISP/proveedor anti-DDoS/CDN', 'Medir tipo: volumétrico, de protocolo o capa 7'],
    contain: ['Activar mitigación (scrubbing, rate limiting, WAF, geobloqueo selectivo) con autorización', 'Aumentar capacidad si es posible', 'Mostrar página de mantenimiento si procede'],
    investigate: ['Capturar muestras de tráfico y logs', 'Comprobar si el DDoS es cortina de humo de otro ataque', 'Valorar si hay extorsión'],
    recover: ['Retirar mitigaciones temporales gradualmente', 'Revisar arquitectura (CDN, autoescalado)', 'Actualizar el plan anti-DDoS'],
    communicate: ['Estado a clientes y soporte', 'Denuncia a autoridades si hay extorsión'],
    dont: ['No pagar la extorsión', 'No bloquear país entero sin valorar su impacto en clientes legítimos'],
    escalate: ['Servicio crítico caído más de 30 minutos', 'Demanda de rescate', 'Actividad intrusiva simultánea']
  }),
  mk('exposicion-servidores', 'Exposición de servidores', 'server', 'high', {
    what: 'Servicios, paneles, bases de datos o buckets son accesibles desde Internet sin la protección adecuada.',
    identify: ['Hallazgos de Shodan/Censys/escáneres externos', 'Puertos administrativos abiertos (RDP, SSH, DB, paneles)', 'Servicios con credenciales por defecto o sin autenticación', 'Avisos de investigadores o de terceros'],
    first: ['Confirmar la exposición desde una red externa', 'Identificar propietario, función y datos del servidor', 'Revisar logs para detectar accesos externos previos'],
    contain: ['Restringir el acceso (firewall, VPN, lista de IPs) con autorización', 'Cambiar credenciales por defecto y rotar secretos', 'Retirar la exposición pública de buckets/dumps'],
    investigate: ['Determinar desde cuándo y qué se pudo acceder', 'Buscar indicios de acceso o modificación por terceros'],
    recover: ['Aplicar hardening y parches', 'Añadir el activo al inventario y monitorización', 'Integrar el chequeo de exposición en el proceso de despliegue'],
    communicate: ['Informar al propietario del servicio y a seguridad', 'Notificar a DPO si había datos personales accesibles'],
    dont: ['No apagar el servidor sin coordinar con el propietario (impacto y evidencias)', 'No ignorar el riesgo por «no estar enlazado en ningún sitio»'],
    escalate: ['Datos personales o críticos accesibles', 'Evidencia de accesos de terceros', 'Servicio crítico de producción']
  }),
  mk('perdida-dispositivo', 'Pérdida de dispositivos', 'smartphone', 'medium', {
    what: 'Portátil, móvil, USB u otro dispositivo con datos o acceso corporativo se pierde o es robado.',
    identify: ['Aviso del usuario de pérdida o robo', 'Dispositivo sin reportar en inventario/MDM', 'Intentos de acceso desde el dispositivo tras la pérdida'],
    first: ['Registrar cuándo, dónde y circunstancias; denunciar el robo si procede', 'Comprobar si el dispositivo tenía cifrado de disco y bloqueo con PIN', 'Identificar datos y accesos almacenados (sesiones, VPN, MFA)'],
    contain: ['Revocar sesiones, certificados, tokens y credenciales del dispositivo', 'Ordenar bloqueo/borrado remoto vía MDM (acción autorizada)', 'Deshabilitar su acceso a VPN y apps corporativas'],
    investigate: ['Revisar accesos posteriores a la pérdida', 'Evaluar si había datos personales o secretos sin cifrar'],
    recover: ['Entregar dispositivo de sustitución con credenciales nuevas', 'Actualizar inventario', 'Recordar políticas de cifrado y reporte inmediato'],
    communicate: ['Informar a seguridad y al responsable del usuario', 'DPO si había datos personales sin cifrar (posible brecha)'],
    dont: ['No esperar «a ver si aparece» para revocar accesos', 'No borrar remotamente antes de valorar si hace falta preservar evidencias (p. ej. robo con denuncia)'],
    escalate: ['Dispositivo sin cifrar con datos sensibles', 'Dispositivo de directivo/administrador', 'Accesos sospechosos tras la pérdida']
  })
];
export const getPlaybook = (id) => PLAYBOOKS.find((p) => p.id === id);
export const CHECKLIST_SECTIONS = ['first', 'contain', 'investigate', 'recover', 'communicate', 'document'];
export function checklistItems(p) {
  return CHECKLIST_SECTIONS.flatMap((s) => (p[s] || []).map((text, i) => ({ key: `${s}.${i}`, section: s, text })));
}
