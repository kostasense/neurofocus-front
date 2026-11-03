/**
 * Textos de los instrumentos (Anexos A, B y C de la investigación).
 * La base de datos solo guarda respuestas numéricas; los textos viven aquí.
 * El puntaje, el nivel y la alerta los calcula el backend (evaluations.service).
 */
export type Option = { valor: number; label: string };

export type Instrument = {
  id: 1 | 2 | 3; // id_instrumento en BD
  codigo: "PSS14" | "GAD7" | "PHQ9";
  corto: string;
  nombre: string;
  mide: string;
  periodo: string;
  instrucciones: string;
  opciones: Option[];
  preguntas: string[];
  puntajeMax: number;
  /** Etiquetas del nivel orientativo (índice = valor de `nivel`). PSS-14 no tiene niveles. */
  niveles: string[];
};

export const PSS14: Instrument = {
  id: 1,
  codigo: "PSS14",
  corto: "PSS-14",
  nombre: "Escala de Estrés Percibido (PSS-14)",
  mide: "Qué tan estresante has percibido tu vida.",
  periodo: "durante el último mes",
  instrucciones:
    "Las preguntas hacen referencia a tus sentimientos y pensamientos durante el último mes. En cada caso, selecciona la opción que mejor represente cómo te has sentido o qué has pensado ante cada situación.",
  opciones: [
    { valor: 0, label: "Nunca" },
    { valor: 1, label: "Casi nunca" },
    { valor: 2, label: "De vez en cuando" },
    { valor: 3, label: "A menudo" },
    { valor: 4, label: "Muy a menudo" },
  ],
  preguntas: [
    "En el último mes, ¿con qué frecuencia ha estado afectado/a por algo que ha ocurrido inesperadamente?",
    "En el último mes, ¿con qué frecuencia se ha sentido incapaz de controlar las cosas importantes en su vida?",
    "En el último mes, ¿con qué frecuencia se ha sentido nervioso/a o estresado/a?",
    "En el último mes, ¿con qué frecuencia ha manejado con éxito los pequeños problemas irritantes de la vida?",
    "En el último mes, ¿con qué frecuencia ha sentido que ha afrontado efectivamente los cambios importantes que han estado ocurriendo en su vida?",
    "En el último mes, ¿con qué frecuencia ha estado seguro/a sobre su capacidad para manejar sus problemas personales?",
    "En el último mes, ¿con qué frecuencia ha sentido que las cosas le van bien?",
    "En el último mes, ¿con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?",
    "En el último mes, ¿con qué frecuencia ha podido controlar las dificultades de su vida?",
    "En el último mes, ¿con qué frecuencia ha sentido que tenía todo bajo control?",
    "En el último mes, ¿con qué frecuencia ha estado enfadado/a porque las cosas que le han ocurrido estaban fuera de su control?",
    "En el último mes, ¿con qué frecuencia ha pensado sobre las cosas que le quedan por hacer?",
    "En el último mes, ¿con qué frecuencia ha podido controlar la forma de pasar el tiempo?",
    "En el último mes, ¿con qué frecuencia ha sentido que las dificultades se acumulan tanto que no puede superarlas?",
  ],
  puntajeMax: 56,
  niveles: [],
};

const FRECUENCIA_2_SEMANAS = (primera: string): Option[] => [
  { valor: 0, label: primera },
  { valor: 1, label: "Varios días" },
  { valor: 2, label: "Más de la mitad de los días" },
  { valor: 3, label: "Casi todos los días" },
];

export const GAD7: Instrument = {
  id: 2,
  codigo: "GAD7",
  corto: "GAD-7",
  nombre: "Escala de Ansiedad Generalizada (GAD-7)",
  mide: "Indicadores de ansiedad.",
  periodo: "durante las últimas dos semanas",
  instrucciones:
    "Durante las últimas dos semanas, ¿con qué frecuencia has sentido molestias debido a los siguientes problemas? Selecciona una sola respuesta por reactivo.",
  opciones: [
    { valor: 0, label: "Ninguna" },
    { valor: 1, label: "Por varios días" },
    { valor: 2, label: "Más de la mitad de los días" },
    { valor: 3, label: "Casi todos los días" },
  ],
  preguntas: [
    "Sentirse nervioso/a, ansioso/a o con los nervios de punta.",
    "No poder dejar o controlar la preocupación.",
    "Preocuparse demasiado por cosas diferentes.",
    "Tener problemas para relajarse.",
    "Estar tan inquieto/a que sea difícil permanecer sentado/a tranquilamente.",
    "Molestarse o irritarse fácilmente.",
    "Sentir miedo como si algo terrible pudiera ocurrir.",
  ],
  puntajeMax: 21,
  niveles: ["Mínimo", "Leve", "Moderado", "Severo"],
};

export const PHQ9: Instrument = {
  id: 3,
  codigo: "PHQ9",
  corto: "PHQ-9",
  nombre: "Cuestionario sobre la Salud del Paciente (PHQ-9)",
  mide: "Síntomas depresivos.",
  periodo: "durante las últimas dos semanas",
  instrucciones:
    "Durante las últimas dos semanas, ¿con qué frecuencia has sentido molestias debido a los siguientes problemas? Selecciona una sola respuesta por reactivo.",
  opciones: FRECUENCIA_2_SEMANAS("No, para nada"),
  preguntas: [
    "Poco interés o placer en hacer las cosas.",
    "Sentirse desanimado/a, deprimido/a o desesperanzado/a.",
    "Tener problemas para dormir o mantenerse dormido/a, o dormir demasiado.",
    "Sentirse cansado/a o tener poca energía.",
    "Tener poco apetito o comer en exceso.",
    "Sentirse mal acerca de sí mismo/a, sentir que es un/a fracasado/a o que se ha fallado a sí mismo/a o a su familia.",
    "Tener dificultad para concentrarse en actividades como leer o ver la televisión.",
    "Moverse o hablar tan despacio que otras personas puedan haberlo notado, o lo contrario: estar tan inquieto/a que se haya movido mucho más de lo habitual.",
    "Tener pensamientos de que sería mejor estar muerto/a o de que quisiera lastimarse de alguna forma.",
  ],
  puntajeMax: 27,
  niveles: ["Mínimo", "Leve", "Moderado", "Moderadamente severo", "Severo"],
};

/** Pregunta complementaria del PHQ-9 (dificultad funcional). */
export const PHQ9_DIFICULTAD = {
  pregunta:
    "Si marcó cualquier problema, ¿cuán difícil se le ha hecho realizar su trabajo, hacerse cargo de sus responsabilidades o llevarse bien con otras personas debido a estos problemas?",
  opciones: [
    { valor: 0, label: "No ha sido difícil" },
    { valor: 1, label: "Algo difícil" },
    { valor: 2, label: "Muy difícil" },
    { valor: 3, label: "Extremadamente difícil" },
  ] as Option[],
};

export const INSTRUMENTS: Instrument[] = [PSS14, GAD7, PHQ9];

/** Respuestas por instrumento: { id_instrumento: { numero_reactivo: valor } } */
export type Answers = Record<number, Record<number, number>>;

export const emptyAnswers = (): Answers => ({ 1: {}, 2: {}, 3: {} });

export const answeredCount = (ins: Instrument, a: Answers) =>
  Object.keys(a[ins.id] ?? {}).length;

export const isComplete = (ins: Instrument, a: Answers) =>
  answeredCount(ins, a) === ins.preguntas.length;

/**
 * Medios de atención prioritaria autorizados por la institución.
 * La investigación indica mostrar solo medios previamente autorizados:
 * agrégalos aquí cuando estén definidos (ejemplo: { nombre: "Servicio de psicología", detalle: "..." }).
 */
export const CONTACTOS_PRIORITARIOS: { nombre: string; detalle: string }[] = [];
