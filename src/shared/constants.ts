/** Constantes compartidas entre cliente y servidor. */

export const APP_NAME = "LifeOS";
export const APP_TAGLINE = "Diseña tu futuro. Simula tus decisiones. Ejecuta tu vida.";

/** Límites de validación de la API. */
export const LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 2000,
  PROGRESS_MIN: 0,
  PROGRESS_MAX: 100,
  PERCENT_MIN: 0,
  PERCENT_MAX: 100,
} as const;

/** Rutas de navegación del cliente (multi-página). */
export const NAV_ITEMS = [
  { id: "overview", label: "Panel", icon: "◉", href: "/pages/dashboard.html" },
  { id: "objectives", label: "Objetivos", icon: "◇", href: "/pages/goals.html" },
  { id: "projects", label: "Proyectos", icon: "⬡", href: "/pages/projects.html" },
  { id: "timeline", label: "Cronología", icon: "◌", href: "/pages/timeline.html" },
  { id: "simulator", label: "Simulador", icon: "◈", href: "/pages/simulator.html" },
  { id: "insights", label: "Análisis", icon: "◎", href: "/pages/insights.html" },
  { id: "resources", label: "Recursos", icon: "▣", href: "/pages/resources.html" },
  { id: "settings", label: "Ajustes", icon: "⚙", href: "/pages/settings.html" },
] as const;
