// Motor adaptativo (Elo): estima el nivel θ del alumno en cada competencia.

export type CompetencyId =
  | "interpretacion"
  | "manejo"
  | "seleccion"
  | "formulacion"
  | "priorizacion"
  | "diferencial";

export type CompetencyState = {
  id: CompetencyId;
  name: string;
  theta: number;
  n: number;
};

/** Historial inicial de Bruno. */
export const seedCompetencies: CompetencyState[] = [
  { id: "interpretacion", name: "Interpretación de resultados", theta: 0.1, n: 2 },
  { id: "manejo", name: "Manejo terapéutico", theta: 1.2, n: 2 },
  { id: "seleccion", name: "Selección de pruebas", theta: 0, n: 0 },
  { id: "formulacion", name: "Formulación diagnóstica", theta: 0.6, n: 3 },
  { id: "priorizacion", name: "Priorización", theta: -0.7, n: 2 },
  { id: "diferencial", name: "Diagnóstico diferencial", theta: 0, n: 0 },
];

/** σ(x) = 1 / (1 + e^-x) */
export function sigma(x: number) {
  return 1 / (1 + Math.exp(-x));
}

/** P(acierto) = 0.25 + 0.75 · σ(θ − d) */
export function probability(theta: number, difficulty: number) {
  return 0.25 + 0.75 * sigma(theta - difficulty);
}

/** r = 1 si acierta, 0 si falla o responde «No sé». */
export function applyAnswer(
  competency: CompetencyState,
  correct: boolean,
  difficulty: number,
): CompetencyState {
  const r = correct ? 1 : 0;
  const k = 1 / (1 + 0.05 * competency.n);
  return {
    ...competency,
    theta: competency.theta + k * (r - probability(competency.theta, difficulty)),
    n: competency.n + 1,
  };
}

export function describeCompetency({ theta, n }: CompetencyState) {
  const progress = sigma(theta);
  if (n < 2) {
    return { label: "Sin evidencia suficiente", hasEvidence: false, reinforce: false, progress };
  }
  if (progress >= 0.75) {
    return { label: "Adecuado", hasEvidence: true, reinforce: false, progress };
  }
  if (progress < 0.5) {
    return { label: "Refuerzo sugerido", hasEvidence: true, reinforce: true, progress };
  }
  return { label: "En progreso", hasEvidence: true, reinforce: false, progress };
}

/** Elige la opción cuya P queda más cerca del objetivo; en un empate gana la primera. */
export function closestToTarget<T extends { difficulty: number }>(
  theta: number,
  options: T[],
  target = 0.75,
) {
  const distance = (option: T) => Math.abs(probability(theta, option.difficulty) - target);
  return options.reduce((best, option) => (distance(option) < distance(best) ? option : best));
}

const statusPriority = ["Refuerzo sugerido", "Sin evidencia suficiente", "En progreso", "Adecuado"];

/** Ordena por prioridad de estado y, a igual estado, por menor σ(θ). */
export function rankCompetencies(competencies: CompetencyState[]) {
  const priority = (competency: CompetencyState) =>
    statusPriority.indexOf(describeCompetency(competency).label);
  return [...competencies].sort(
    (a, b) => priority(a) - priority(b) || sigma(a.theta) - sigma(b.theta),
  );
}

/** Toma la competencia más prioritaria que tenga candidatos y, entre ellos, el más cercano al 75 %. */
export function recommendCase<T extends { competencyId: CompetencyId; difficulty: number }>(
  competencies: CompetencyState[],
  candidates: T[],
) {
  for (const competency of rankCompetencies(competencies)) {
    const options = candidates.filter(({ competencyId }) => competencyId === competency.id);
    if (options.length > 0) {
      const candidate = closestToTarget(competency.theta, options);
      return {
        candidate,
        competency,
        chance: probability(competency.theta, candidate.difficulty),
      };
    }
  }
  return null;
}
