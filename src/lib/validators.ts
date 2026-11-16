/**
 * Correo institucional de pacientes: L**17****@culiacan.tecnm.mx
 * (L mayúscula o minúscula, 8 dígitos y "17" en los dígitos 3 y 4).
 * Debe coincidir con la validación del backend (RegisterDto).
 */
export const CORREO_INSTITUCIONAL = /^[lL]\d{2}17\d{4}@culiacan\.tecnm\.mx$/i;

export const isInstitutionalEmail = (v: string) =>
  CORREO_INSTITUCIONAL.test(v.trim());

/** Los 8 dígitos del correo institucional (coinciden con el número de control). */
export const digitsOfInstitutionalEmail = (v: string) =>
  isInstitutionalEmail(v) ? v.trim().slice(1, 9) : null;
