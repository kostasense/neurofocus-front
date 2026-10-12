export type Role = 1 | 2 | 3;
export type ApiError = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
export type AuthUser = { userId: number; correo: string; rol: Role };
export type AuthTokens = { accessToken: string; refreshToken: string };
export type LoginResult = {
  success: boolean;
  statusCode: number;
  data: AuthTokens & { user?: AuthUser };
  message?: string;
};
export type Paginated<T> = {
  data: T[];
  meta?: { total?: number; page?: number; limit?: number };
};
export type BigId = string; // columnas BIGINT: tedious las entrega como string

export type Appointment = {
  id_cita: BigId;
  id_paciente: number;
  id_psicologo: number;
  paciente?: string;
  psicologo?: string;
  num_control_o_num_empleado?: string;
  tipo_persona?: string;
  id_evaluacion?: BigId | null;
  inicio: string;
  fin: string;
  modalidad: 1 | 2; // 1 Presencial, 2 Virtual
  estado: 1 | 2 | 3 | 4 | 5 | 6; // Solicitada, Confirmada, Realizada, Cancelada, No asistió, Reprogramada
  fecha_creacion?: string;
  motivo_cancelacion?: string | null;
  notas_agenda?: string | null;
};

export type Evaluation = {
  id_evaluacion: BigId;
  id_paciente: number;
  paciente?: string;
  num_control_o_num_empleado?: string;
  tipo_persona?: string;
  fecha_inicio: string;
  fecha_cierre: string | null;
  estado: 1 | 2 | 3 | 4; // Abierta, Completa, Cerrada incompleta, Anulada
  pss14_puntaje: number | null;
  pss14_nivel: number | null;
  gad7_puntaje: number | null;
  gad7_nivel: number | null;
  phq9_puntaje: number | null;
  phq9_nivel: number | null;
  alerta_prioritaria: number | null; // 0/1; null si no hay aplicaciones
  requiere_revision: boolean;
  revisada_por: number | null;
  fecha_revision: string | null;
};

export type Notification = {
  id_notificacion: BigId;
  id_usuario: number;
  tipo: 1 | 2 | 3 | 4; // Cita, Chat, Pánico, Sistema
  titulo: string;
  cuerpo: string;
  referencia_id: BigId | null;
  fecha_creacion: string;
  fecha_leida: string | null;
  prioridad: 1 | 2 | 3; // Normal, Alta, Crítica
};

export type ClinicalRecord = {
  id_expediente: BigId;
  id_paciente: number;
  paciente: string;
  id_psicologo_responsable: number | null;
  psicologo_responsable: string | null;
  estado: 1 | 2 | 3; // Activo, Cerrado, Archivado
  fecha_apertura: string;
  fecha_cierre: string | null;
  motivo_consulta: string | null;
};

export type RecordSummary = {
  id_expediente: BigId;
  id_paciente: number;
  paciente: string;
  num_control_o_num_empleado: string;
  tipo_persona: string;
  estado: 1 | 2 | 3;
  fecha_apertura: string;
  fecha_cierre: string | null;
  motivo_consulta: string | null;
};

// Entradas y adjuntos vienen en camelCase (los mapea el servicio)
export type RecordEntry = {
  idEntrada: BigId;
  idExpediente: BigId;
  idPsicologo: number;
  psicologo: string | null;
  idCita: BigId | null;
  idEvaluacion: BigId | null;
  tipo: 1 | 2 | 3 | 4 | 5 | 6; // Nota sesión, Valoración, Plan, Seguimiento, Referencia, Cierre
  fechaRegistro: string;
  anulada: boolean;
  motivoAnulacion: string | null;
  contenido: string | null; // null si está anulada
};

export type RecordAttachment = {
  idAdjunto: BigId;
  idEntrada: BigId;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: BigId; // BIGINT
  ubicacionObjeto: string;
  hashSha256: string;
  fechaCarga: string;
  cargadoPor: number;
};

export type Psychologist = {
  id_psicologo: number;
  nombre: string;
  correo: string;
  activo: boolean;
  cedula_profesional: string;
  especialidad: string | null;
  duracion_cita_minutos: number;
  chat_disponible: boolean;
  activo_para_citas: boolean;
};

export type DashboardPatient = {
  id_psicologo: number;
  id_paciente: number;
  paciente: string;
  tipo_persona: string;
  fecha_inicio: string;
  id_expediente: BigId | null;
  estado_expediente: 1 | 2 | 3 | null;
  fecha_ultima_evaluacion: string | null;
  proxima_cita: string | null;
};

export type User = {
  id_usuario: number;
  correo: string;
  nombre: string;
  id_rol: Role;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
};

export type Suggestion = {
  id_sugerencia: BigId;
  id_autor?: number | null; // null = anónima
  autor?: string | null;
  id_psicologo_referido: number | null;
  psicologo_referido: string | null;
  id_cita: BigId | null;
  categoria: 1 | 2 | 3 | 4 | 5; // Sistema, Atención psicológica, Citas, Privacidad, Otro
  calificacion: number | null; // 1-5
  comentario: string;
  estado: 1 | 2 | 3 | 4; // Nueva, En revisión, Atendida, Cerrada
  fecha_creacion: string;
  atendida_por?: number | null;
  administrador?: string | null;
  fecha_atencion: string | null;
  respuesta_interna?: string | null;
};

export type PanicAlert = {
  id_alerta: BigId;
  id_canal: BigId;
  id_paciente: number;
  id_psicologo: number;
  paciente: string;
  fecha_alerta: string;
  estado: 1 | 2 | 3 | 4 | 5; // Emitida, Notificada, Vista, Atendida, Cerrada
  fecha_vista: string | null;
  fecha_atencion: string | null;
};

export type ChatChannel = {
  id_canal: BigId;
  id_paciente: number;
  id_psicologo: number;
  paciente?: string;
  psicologo?: string;
  habilitado_por_psicologo: boolean;
  abierto: boolean;
  chat_disponible?: boolean;
  fecha_creacion: string;
  fecha_cierre: string | null;
  ultima_actividad: string | null;
};

export type ChatMessage = {
  idMensaje: BigId;
  idCanal: BigId;
  idEmisor: number;
  fechaEnvio: string;
  mensajeCifrado: string; // base64
  nonce: string; // base64
  etiquetaAutenticacion: string; // base64
  versionClave: number;
  tipoMensaje: 1 | 2 | 3; // Texto, Sistema, Pánico
  entregado: string | null;
  leido: string | null;
};

export type Instrument = {
  id_instrumento: number;
  codigo: string;
  nombre: string;
  numero_reactivos: number;
  puntaje_min: number;
  puntaje_max: number;
  version: number;
  activo: boolean;
};
