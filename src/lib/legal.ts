/**
 * Consentimiento informado y aviso de privacidad.
 * LEGAL_VERSION debe coincidir con VERSION_TEXTOS_LEGALES del backend
 * (src/users/legal.constants.ts). Súbela en ambos lados cuando cambie un texto.
 *
 * IMPORTANTE: son textos base redactados a partir de lo que hace la plataforma.
 * Deben ser revisados y aprobados por la institución antes del uso con población real.
 */
export const LEGAL_VERSION = "1.0";

/** Datos de la institución. Ajústalos cuando las instancias correspondientes los confirmen. */
export const RESPONSABLE = "Instituto Tecnológico de Culiacán";
export const CONTACTO_PRIVACIDAD =
  "el servicio de psicología de la institución o el equipo de NeuroFocus";

export type LegalSection = { titulo: string; parrafos: string[] };
export type LegalDoc = { titulo: string; secciones: LegalSection[] };

export const CONSENTIMIENTO: LegalDoc = {
  titulo: "Consentimiento informado",
  secciones: [
    {
      titulo: "¿Qué es NeuroFocus?",
      parrafos: [
        "NeuroFocus es una plataforma de detección preventiva del estrés, la ansiedad y los síntomas depresivos en la comunidad universitaria. Te permite responder tres cuestionarios breves (PSS-14, GAD-7 y PHQ-9), conocer tus resultados, solicitar una cita con el servicio de psicología y comunicarte con tu psicólogo.",
      ],
    },
    {
      titulo: "Tu participación es voluntaria",
      parrafos: [
        "Usar la plataforma es voluntario. Puedes no responder un cuestionario, cancelarlo o dejar de usar la plataforma cuando quieras, sin consecuencias académicas ni laborales.",
      ],
    },
    {
      titulo: "Alcances y límites",
      parrafos: [
        "Los resultados son orientativos y preventivos: no constituyen un diagnóstico ni sustituyen la valoración de una persona profesional de la psicología.",
        "La plataforma no es un servicio de emergencia. Si sientes que estás en riesgo o necesitas ayuda de inmediato, busca apoyo con una persona de confianza o acude al servicio de psicología de tu institución.",
      ],
    },
    {
      titulo: "Quién puede ver tu información",
      parrafos: [
        "Tus respuestas y resultados pueden ser consultados por el psicólogo que tengas asignado. Si alguna respuesta indica que podrías necesitar atención prioritaria, un profesional revisará tu evaluación conforme al protocolo institucional.",
        "Los reportes generales se elaboran con datos agregados y anonimizados, y solo con autorización de la institución.",
      ],
    },
    {
      titulo: "Aceptación",
      parrafos: [
        "Al marcar la casilla confirmas que leíste este documento, que entiendes sus alcances y límites, y que aceptas participar de manera libre e informada.",
      ],
    },
  ],
};

export const AVISO_PRIVACIDAD: LegalDoc = {
  titulo: "Aviso de privacidad",
  secciones: [
    {
      titulo: "Responsable",
      parrafos: [
        `El responsable del tratamiento de tus datos personales es: ${RESPONSABLE}.`,
      ],
    },
    {
      titulo: "Datos que se recaban",
      parrafos: [
        "Datos de cuenta: nombre, correo institucional, número de control o de empleado y tipo de persona (alumno, docente o personal administrativo).",
        "Datos sensibles de salud: respuestas y puntajes de los cuestionarios, citas, notas del expediente psicológico y mensajes del chat.",
      ],
    },
    {
      titulo: "Para qué se usan",
      parrafos: [
        "Para crear tu cuenta, aplicar los cuestionarios, mostrarte tus resultados, agendar y dar seguimiento a tus citas, brindarte atención psicológica y comunicarte avisos de la plataforma. De forma agregada y anonimizada, para elaborar reportes autorizados por la institución.",
      ],
    },
    {
      titulo: "Cómo se protegen",
      parrafos: [
        "Tu contraseña se guarda únicamente como un resumen criptográfico. Las notas del expediente se almacenan cifradas. Los mensajes del chat se cifran en tu dispositivo y en el del psicólogo (cifrado de extremo a extremo): el servidor no puede leerlos. El acceso a cada dato depende del rol y está limitado a las personas autorizadas.",
        "Los registros clínicos y los mensajes no se eliminan físicamente; se anulan, ocultan o cierran para conservar el historial.",
      ],
    },
    {
      titulo: "Tus derechos",
      parrafos: [
        `Puedes solicitar el acceso, la rectificación, la cancelación de tus datos o la oposición a su tratamiento acudiendo a ${CONTACTO_PRIVACIDAD}.`,
      ],
    },
    {
      titulo: "Cambios",
      parrafos: [
        `Si este aviso cambia, se publicará una nueva versión. Versión vigente: ${LEGAL_VERSION}.`,
      ],
    },
  ],
};
