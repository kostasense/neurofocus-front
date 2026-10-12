# NeuroFocus Expo Starter

Arquitectura universal para Android, iOS y web con Expo Router.

## Módulos API

`src/api`: database, crypto, auth, users, patients, psychologists, assignments, evaluations, appointments, records, suggestions, notifications y chat.

## Seguridad

- Access/refresh tokens en SecureStore (native) y localStorage (web).
- Interceptor Axios agrega Bearer, renueva una vez ante 401 y repite la solicitud.
- Si refresh falla, limpia sesión y navega al login.
- El chat E2EE requiere un servicio criptográfico separado en frontend; este starter no simula claves.

## Vistas

- Auth: login y registro.
- Paciente: dashboard, evaluaciones, citas, perfil, chat, notificaciones, sugerencias.
- Psicólogo: dashboard, pacientes, agenda, evaluaciones, expedientes, chat y alertas.
- Administrador: dashboard, usuarios, psicólogos, asignaciones, sugerencias, métricas y notificaciones.

## Responsividad

`Screen` limita contenido a 1100 px en web y usa padding adaptable. Los dashboards usan `flexWrap`, por lo que pasan de una columna en móvil a varias columnas en web.
