// Datos extremos para comprobar las pantallas. Solo se usan en desarrollo con ?data=worst, empty, one o many.
import type { CompetencyId } from "./engine";
import type { Decision } from "./history";

const fixtureCompetencies: CompetencyId[] = [
  "interpretacion",
  "manejo",
  "seleccion",
  "formulacion",
  "priorizacion",
  "diferencial",
];
const fixtureErrors = [
  "Confunde estado subclínico y manifiesto",
  "Confunde origen primario y central",
  "Confunde sustitución y bloqueo hormonal",
  "Confunde etiología y seguimiento",
  "Confunde la gravedad de una descompensación aguda con la de un hallazgo crónico estable que no requiere intervención inmediata",
];

function manyDecisions() {
  const decisions: Decision[] = [];
  const theta = new Map<CompetencyId, number>();
  for (let index = 0; index < 72; index++) {
    const competencyId = fixtureCompetencies[index % fixtureCompetencies.length];
    const correct = index % 3 !== 0;
    const next = (theta.get(competencyId) ?? 0) + (correct ? 0.22 : -0.31);
    theta.set(competencyId, next);
    const isNoIdea = index % 11 === 0;
    decisions.push({
      caseName: index < 6 ? "Lucía" : index < 12 ? "Marta" : `Caso ${Math.floor(index / 3)}`,
      competencyId,
      correct: correct && !isNoIdea,
      answer: isNoIdea ? "No sé" : "",
      confidence: isNoIdea ? "No sé" : ["Poco", "Algo", "Mucho"][index % 3],
      seconds: 20 + ((index * 37) % 400),
      thetaAfter: next,
      errorTitle: correct || isNoIdea ? undefined : fixtureErrors[index % fixtureErrors.length],
    });
  }
  return decisions;
}

export function progressFixture(kind: string | null): Decision[] | null {
  if (kind === "empty") return [];
  if (kind === "many") return manyDecisions();
  if (kind === "one") {
    return [
      {
        caseName: "Lucía",
        competencyId: "interpretacion",
        correct: true,
        answer: "",
        confidence: "Algo",
        seconds: 40,
        thetaAfter: 0.38,
      },
    ];
  }
  return null;
}

export function manySystemDecisions() {
  return Array.from(
    { length: 24 },
    (_, index) =>
      `Siguiente caso: Caso ${index + 1}, porque selección de pruebas está en sin evidencia suficiente (${60 + index} %)`,
  );
}

export const worstCaseLongName = "María José de la Cruz y Fernández-Wiśniewska Oberhauser";

export const worstCasePatient = {
  name: worstCaseLongName,
  caseTitle: "Consulta por cansancio persistente con intolerancia al frío y estreñimiento",
  complaint:
    "Cansancio persistente de varios meses con intolerancia al frío y estreñimiento progresivo",
  chips: [
    "101 años",
    "Mujer",
    "Consulta ambulatoria de endocrinología y metabolismo del hospital regional",
  ],
};

export const worstCaseStop = {
  question:
    "Con TSH alta y T4 libre baja en una paciente sin tratamiento previo, sin amiodarona ni litio, ¿qué diagnóstico explica mejor el perfil tiroideo presentado en esta consulta?",
  options: [
    {
      text: "Hipotiroidismo primario manifiesto de probable etiología autoinmune por tiroiditis de Hashimoto, con repercusión clínica y bioquímica, sin criterios de coma mixedematoso ni insuficiencia suprarrenal asociada",
      explanation:
        "Integra TSH alta y T4 libre baja, y es coherente con una falla de la glándula tiroides sin datos de enfermedad hipofisaria, aunque conviene confirmar la causa con anticuerpos antiperoxidasa si cambia el manejo.",
      correct: true,
    },
    { text: "Ninguna", explanation: "No." },
    {
      text: "Hipotiroidismo-secundario-a-deficiencia-de-hormona-liberadora-de-tirotropina-hipotalámica-congénita",
      explanation:
        "TSH marcadamente alta favorece falla primaria y descarta un origen hipotalámico, que cursaría con TSH baja o inapropiadamente normal.",
    },
    {
      text: "Hipertiroidismo primario",
      explanation: "El patrón hormonal es opuesto.",
    },
  ],
};
