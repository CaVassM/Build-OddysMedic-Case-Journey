// Historial de decisiones del alumno y métricas calculadas a partir de él. No contiene cifras fijas de la interfaz.
import { probability, seedCompetencies, sigma, type CompetencyId } from "./engine";

export type Decision = {
  caseName: string;
  /** Parada del caso, desde 1. */
  stop: number;
  /** Momento en que se respondió, en ms. */
  at: number;
  competencyId: CompetencyId;
  correct: boolean;
  answer: string;
  confidence: string;
  seconds: number;
  thetaAfter: number;
  errorTitle?: string;
};

const noIdea = "No sé";
const dayMs = 24 * 60 * 60 * 1000;

// Las fechas del historial de ejemplo se cuentan hacia atrás desde hoy, para que "hace 2 días" lo siga siendo.
function exampleTime(daysBack: number, step: number) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.getTime() - daysBack * dayMs + step * 150_000;
}

// Historial de ejemplo de Bruno. Cada competencia termina en el θ y el n de `seedCompetencies`.
export const seededDecisions: Decision[] = [
  {
    caseName: "Lucía",
    stop: 1,
    at: exampleTime(5, 1),
    competencyId: "formulacion",
    correct: true,
    answer: "",
    confidence: "Algo",
    seconds: 48,
    thetaAfter: 0.55,
  },
  {
    caseName: "Lucía",
    stop: 2,
    at: exampleTime(5, 2),
    competencyId: "interpretacion",
    correct: true,
    answer: "",
    confidence: "Mucho",
    seconds: 64,
    thetaAfter: 0.55,
  },
  {
    caseName: "Lucía",
    stop: 3,
    at: exampleTime(5, 3),
    competencyId: "priorizacion",
    correct: false,
    answer: "",
    confidence: "Mucho",
    seconds: 37,
    thetaAfter: -0.4,
    errorTitle: "Confunde el orden de prioridades",
  },
  {
    caseName: "Lucía",
    stop: 4,
    at: exampleTime(5, 4),
    competencyId: "priorizacion",
    correct: false,
    answer: noIdea,
    confidence: noIdea,
    seconds: 22,
    thetaAfter: -0.7,
  },
  {
    caseName: "Lucía",
    stop: 5,
    at: exampleTime(5, 5),
    competencyId: "formulacion",
    correct: false,
    answer: "",
    confidence: "Poco",
    seconds: 71,
    thetaAfter: 0.17,
    errorTitle: "Confunde causa y desencadenante",
  },
  {
    caseName: "Marta",
    stop: 1,
    at: exampleTime(2, 1),
    competencyId: "interpretacion",
    correct: false,
    answer: "",
    confidence: "Algo",
    seconds: 55,
    thetaAfter: 0.1,
    errorTitle: "Confunde estado subclínico y manifiesto",
  },
  {
    caseName: "Marta",
    stop: 2,
    at: exampleTime(2, 2),
    competencyId: "manejo",
    correct: true,
    answer: "",
    confidence: "Mucho",
    seconds: 43,
    thetaAfter: 0.61,
  },
  {
    caseName: "Marta",
    stop: 3,
    at: exampleTime(2, 3),
    competencyId: "manejo",
    correct: true,
    answer: "",
    confidence: "Algo",
    seconds: 58,
    thetaAfter: 1.2,
  },
  {
    caseName: "Marta",
    stop: 4,
    at: exampleTime(2, 4),
    competencyId: "formulacion",
    correct: true,
    answer: "",
    confidence: "Poco",
    seconds: 66,
    thetaAfter: 0.6,
  },
];

/** Lo que el sistema eligió por el alumno, dicho en lenguaje llano. */
export type SystemDecision = {
  kind: "Variante" | "Siguiente caso";
  choice: string;
  reason: string;
  /** Probabilidad de acierto estimada, en %. */
  chance?: number;
};

export const seededSystemDecisions: SystemDecision[] = [
  {
    kind: "Siguiente caso",
    choice: "Elena",
    reason: "aún no tenemos evidencia de cómo interpretas pruebas tiroideas",
    chance: Math.round(
      probability(seedCompetencies.find(({ id }) => id === "interpretacion")!.theta, 0) * 100,
    ),
  },
];

export const confidenceLevels = ["Poco", "Algo", "Mucho"];

export function summarizeDecisions(decisions: Decision[]) {
  const total = decisions.length;
  const correct = decisions.filter((decision) => decision.correct).length;
  const seconds = decisions.reduce((sum, decision) => sum + decision.seconds, 0);

  const confidence = confidenceLevels.map((level) => {
    const chosen = decisions.filter((decision) => decision.confidence === level);
    const right = chosen.filter((decision) => decision.correct).length;
    return {
      level,
      count: chosen.length,
      right,
      rate: chosen.length ? Math.round((right / chosen.length) * 100) : null,
    };
  });

  const errorCounts = new Map<string, { count: number; cases: string[] }>();
  for (const { errorTitle, caseName } of decisions) {
    if (!errorTitle) continue;
    const entry = errorCounts.get(errorTitle) ?? { count: 0, cases: [] };
    entry.count += 1;
    if (!entry.cases.includes(caseName)) entry.cases.push(caseName);
    errorCounts.set(errorTitle, entry);
  }
  const noIdeaCount = decisions.filter((decision) => decision.answer === noIdea).length;

  return {
    total,
    correctRate: total ? Math.round((correct / total) * 100) : 0,
    averageSeconds: total ? Math.round(seconds / total) : 0,
    correctCount: correct,
    noIdeaCount,
    wrongCount: total - correct - noIdeaCount,
    seconds,
    confidence,
    overconfidentCount: decisions.filter(
      (decision) => decision.confidence === "Mucho" && !decision.correct,
    ).length,
    // A igual número de veces se mantiene el orden en que aparecieron.
    errors: [...errorCounts]
      .map(([title, { count, cases }]) => ({ title, count, cases }))
      .sort((a, b) => b.count - a.count),
  };
}

export type TrailPoint = {
  /** Número de respuesta dentro de la competencia, desde 1. */
  n: number;
  /** σ(θ) tras responder, en %. */
  level: number;
  correct: boolean;
  noIdea: boolean;
  caseName: string;
  stop: number;
  at: number;
};

/** Un punto por intento: nivel tras responder y con qué resultado. */
export function competencyPoints(decisions: Decision[], competencyId: CompetencyId): TrailPoint[] {
  return decisions
    .filter((decision) => decision.competencyId === competencyId)
    .map((decision, index) => ({
      n: index + 1,
      level: Math.round(sigma(decision.thetaAfter) * 100),
      correct: decision.correct,
      noIdea: decision.answer === noIdea,
      caseName: decision.caseName,
      stop: decision.stop,
      at: decision.at,
    }));
}

/** Resumen de un caso ya jugado: aciertos, tiempo y competencias trabajadas. */
export function summarizeCase(decisions: Decision[], caseName: string) {
  const own = decisions.filter((decision) => decision.caseName === caseName);
  return {
    decisions: own,
    correct: own.filter((decision) => decision.correct).length,
    seconds: own.reduce((sum, decision) => sum + decision.seconds, 0),
    competencies: [...new Set(own.map((decision) => decision.competencyId))],
    at: own.reduce((latest, decision) => Math.max(latest, decision.at), 0),
  };
}

const shortDate = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

/** "5 nov" */
export function formatShortDate(at: number) {
  return shortDate.format(at).replace(".", "");
}

/** "hoy", "ayer", "hace 2 días"; pasadas cuatro semanas, la fecha. */
export function formatRelativeDay(at: number, now = Date.now()) {
  const startOf = (time: number) => new Date(time).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(now) - startOf(at)) / dayMs);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 28) return `hace ${days} días`;
  return formatShortDate(at);
}
