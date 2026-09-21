/** Formato de fechas y números en español. */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTO = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "martes · 19 de septiembre" */
export function fechaLarga(date: Date = new Date()): string {
  return `${DIAS[date.getDay()]} · ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

/** "19 may 2027" */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

/** Saludo según la hora: "Buenas noches" / "Buenos días" / "Buenas tardes" */
export function saludo(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Número con separador de miles estilo es-CL: 3.000.000 */
export function numero(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(n);
}

/** Valor monetario: $3.000.000 CLP */
export function dinero(n: number, unit = "CLP"): string {
  return `$${numero(n)} ${unit}`;
}

/** Porcentaje: 81% */
export function porcentaje(n: number): string {
  return `${Math.round(n)}%`;
}

/** Horas: "34h" */
export function horas(n: number): string {
  return `${numero(n)}h`;
}
