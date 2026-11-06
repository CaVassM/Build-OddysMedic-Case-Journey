// Historial de decisiones del alumno y métricas calculadas a partir de él. No contiene cifras fijas de la interfaz.
import { sigma, type CompetencyId } from "./engine";

export type Decision = {
  caseName: string;
  competencyId: CompetencyId;
  correct: boolean;
  answer: string;
  confidence: string;
  seconds: number;
  thetaAfter: number;
  errorTitle?: string;
};

const noIdea = "No sé";

// Historial de ejemplo de Bruno. Cada competencia termina en el θ y el n de `seedCompetencies`.
export const seededDecisions: Decision[] = [
  {
    caseName: "Lucía",
    competencyId: "formulacion",
    correct: true,
    answer: "",
    confidence: "Algo",
    seconds: 48,
    thetaAfter: 0.55,
  },
  {
    caseName: "Lucía",
    competencyId: "interpretacion",
    correct: true,
    answer: "",
    confidence: "Mucho",
    seconds: 64,
    thetaAfter: 0.55,
  },
  {
    caseName: "Lucía",
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
    competencyId: "priorizacion",
    correct: false,
    answer: noIdea,
    confidence: noIdea,
    seconds: 22,
    thetaAfter: -0.7,
  },
  {
    caseName: "Lucía",
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
    competencyId: "manejo",
    correct: true,
    answer: "",
    confidence: "Mucho",
    seconds: 43,
    thetaAfter: 0.61,
  },
  {
    caseName: "Marta",
    competencyId: "manejo",
    correct: true,
    answer: "",
    confidence: "Algo",
    seconds: 58,
    thetaAfter: 1.2,
  },
  {
    caseName: "Marta",
    competencyId: "formulacion",
    correct: true,
    answer: "",
    confidence: "Poco",
    seconds: 66,
    thetaAfter: 0.6,
  },
];

export const seededSystemDecisions = [
  "Siguiente caso: Elena, porque aún no tenemos evidencia de cómo interpretas pruebas tiroideas.",
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
      rate: chosen.length ? Math.round((right / chosen.length) * 100) : null,
    };
  });

  const errorCounts = new Map<string, number>();
  for (const { errorTitle } of decisions) {
    if (errorTitle) errorCounts.set(errorTitle, (errorCounts.get(errorTitle) ?? 0) + 1);
  }

  return {
    total,
    correctRate: total ? Math.round((correct / total) * 100) : 0,
    averageSeconds: total ? Math.round(seconds / total) : 0,
    noIdeaCount: decisions.filter((decision) => decision.answer === noIdea).length,
    confidence,
    overconfidentCount: decisions.filter(
      (decision) => decision.confidence === "Mucho" && !decision.correct,
    ).length,
    // A igual número de veces se mantiene el orden en que aparecieron.
    errors: [...errorCounts]
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** σ(θ) después de cada respuesta de una competencia. */
export function competencyTrail(decisions: Decision[], competencyId: CompetencyId) {
  return decisions
    .filter((decision) => decision.competencyId === competencyId)
    .map((decision) => sigma(decision.thetaAfter));
}
