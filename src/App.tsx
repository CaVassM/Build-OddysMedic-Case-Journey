import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  applyAnswer,
  closestToTarget,
  describeCompetency,
  probability,
  recommendCase,
  seedCompetencies,
  type CompetencyId,
  type CompetencyState,
} from "./engine";
import { portraitSrc, portraitTone, type PortraitName } from "./portraits";
import { worstCaseLongName, worstCasePatient, worstCaseStop } from "./worstCase";

// Solo en desarrollo y solo si la URL lo pide: una demo normal no ve ni el selector ni estos datos.
const devDataParam = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("data")
  : null;
const useWorstCase = devDataParam === "worst";

function DevDataToggle() {
  if (!devDataParam) return null;
  return (
    <div className="dev-data-toggle">
      <a className={useWorstCase ? "" : "active"} href="?data=demo">
        Demo data
      </a>
      <a className={useWorstCase ? "active" : ""} href="?data=worst">
        Worst case
      </a>
    </div>
  );
}

type StopState = "done" | "current" | "pending";

function CompassLogo() {
  return (
    <div className="brand-lockup">
      <svg className="brand-mark" viewBox="0 0 38 38" aria-hidden="true">
        <circle cx="19" cy="19" r="16.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M19 7.5 24 21l-5 9.5L14 21l5-13.5Z" fill="currentColor" />
        <path d="m19 7.5 5 13.5-5-2.9V7.5Z" fill="#43D6BE" />
        <path d="M16.2 16.2h5.6v5.6h-5.6z" fill="#43D6BE" />
        <path d="M19 14.5v9M14.5 19h9" stroke="#1A1840" strokeWidth="1.4" />
      </svg>
      <span>OddysMedic</span>
    </div>
  );
}

function Portrait({ patient, className = "" }: { patient: PortraitName; className?: string }) {
  return (
    <span className={`portrait ${portraitTone(patient)} ${className}`}>
      <img alt="" src={portraitSrc(patient)} />
    </span>
  );
}

// Una sola onda de ECG: línea base, P, QRS, T y vuelta a la base. Se dibuja una vez al montarse.
const heartbeatPath = "M0 16H20q4 -6 8 0H34l3 4 5 -20 5 24 4 -8H60q5 -8 10 0H80";

function Heartbeat() {
  return (
    <svg className="heartbeat" viewBox="0 0 80 28" fill="none" aria-hidden="true">
      <path className="heartbeat-path" d={heartbeatPath} pathLength="1" />
    </svg>
  );
}

const heroDonePath = "M74 380C150 380 130 250 250 250";

// La ruta es punteada: una máscara con el mismo trazo la revela. Luego late antes de la parada actual.
function HeroRoute() {
  return (
    <svg className="route" viewBox="0 0 640 480" fill="none" aria-hidden="true">
      <mask id="hero-route-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="480">
        <path
          className="hero-route-draw"
          d={heroDonePath}
          pathLength="1"
          stroke="white"
          strokeWidth="10"
        />
      </mask>
      <path
        className="hero-route-dashes"
        d={heroDonePath}
        mask="url(#hero-route-reveal)"
        stroke="#43D6BE"
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
      />
      <path
        className="heartbeat-path"
        d={heartbeatPath}
        pathLength="1"
        transform="translate(250 234)"
      />
      <path
        d="M424 250C500 250 480 130 548 130"
        stroke="#8F8BC4"
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
      />
      <circle cx="60" cy="380" r="15" fill="#43D6BE" />
      <path
        d="m53 380 5 5 10-11"
        stroke="#1A1840"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="560" cy="130" r="10" fill="white" stroke="#C9C6E3" strokeWidth="3" />
      <text x="60" y="420" textAnchor="middle">
        Diagnóstico
      </text>
      <text x="376" y="188" textAnchor="middle">
        Tratamiento
      </text>
      <text x="560" y="166" textAnchor="middle">
        Seguimiento
      </text>
    </svg>
  );
}

function CompassRose() {
  return (
    <svg className="compass-rose" viewBox="0 0 104 104" aria-hidden="true">
      <circle cx="52" cy="52" r="35" fill="none" stroke="rgba(255,255,255,.3)" />
      <circle cx="52" cy="52" r="25" fill="none" stroke="rgba(255,255,255,.18)" />
      <path d="m52 13 7 32-7 7-7-7 7-32ZM52 91l-7-32 7-7 7 7-7 32Z" fill="rgba(255,255,255,.78)" />
      <path d="m13 52 32-7 7 7-7 7-32-7ZM91 52l-32 7-7-7 7-7 32 7Z" fill="rgba(255,255,255,.45)" />
      <circle cx="52" cy="52" r="3.5" fill="#43D6BE" />
      <text x="52" y="10" fill="rgba(255,255,255,.8)" fontSize="9" textAnchor="middle">
        N
      </text>
    </svg>
  );
}

function SpecialtyCard({
  title,
  description,
  patient,
  active = false,
}: {
  title: string;
  description: string;
  patient: PortraitName;
  active?: boolean;
}) {
  const content = (
    <>
      <Portrait patient={patient} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </>
  );
  // Solo la especialidad disponible lleva a algún sitio; las demás dicen «Muy pronto».
  return active ? (
    <a className="specialty-card active" href="/inicio">
      {content}
    </a>
  ) : (
    <article className="specialty-card">{content}</article>
  );
}

function ButtonLink({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) {
  return (
    <a className={`button-link ${secondary ? "secondary" : ""}`} href="/inicio">
      {children}
    </a>
  );
}

function LoggedTopbar({ current = "inicio" }: { current?: "inicio" | "progreso" }) {
  return (
    <header className="topbar logged-topbar">
      <div className="nav-content">
        <a href="/inicio" aria-label="Ir al inicio">
          <CompassLogo />
        </a>
        <nav aria-label="Navegación principal" className="logged-nav">
          <a
            className={current === "inicio" ? "active" : ""}
            aria-current={current === "inicio" ? "page" : undefined}
            href="/inicio"
          >
            Inicio
          </a>
          <a
            className={current === "progreso" ? "active" : ""}
            aria-current={current === "progreso" ? "page" : undefined}
            href="/progreso"
          >
            Mi progreso
          </a>
        </nav>
        <a className="student-profile" href="/inicio" aria-label="Perfil de Bruno">
          <span className="avatar">B</span>
          <span>Bruno</span>
        </a>
      </div>
    </header>
  );
}

function MiniRoute() {
  return (
    <svg className="mini-route" viewBox="0 0 270 42" fill="none" aria-hidden="true">
      <path
        d="M17 25c35-20 52 7 89-4 31-9 36-29 69-17 28 10 38 23 78 5"
        stroke="#43D6BE"
        strokeWidth="2.5"
        strokeDasharray="5 6"
        strokeLinecap="round"
      />
      <circle cx="17" cy="25" r="7" fill="white" stroke="#C9C6E3" strokeWidth="2.5" />
      <circle cx="129" cy="15" r="7" fill="white" stroke="#C9C6E3" strokeWidth="2.5" />
      <circle cx="253" cy="9" r="7" fill="white" stroke="#C9C6E3" strokeWidth="2.5" />
    </svg>
  );
}

function CompetencyTrack({ competency }: { competency: CompetencyState }) {
  const { hasEvidence, progress } = describeCompetency(competency);
  return (
    <div className={`progress-track ${hasEvidence ? "" : "dashed"}`}>
      {hasEvidence && <span style={{ width: `${progress * 100}%` }} />}
    </div>
  );
}

function CompetencyStatus({ competency }: { competency: CompetencyState }) {
  const { label, reinforce, hasEvidence } = describeCompetency(competency);
  const tone = !hasEvidence
    ? "no-evidence"
    : reinforce
      ? "reinforce"
      : label === "Adecuado"
        ? "good"
        : "progressing";
  return <small className={`status-chip ${tone}`}>{label}</small>;
}

function Competency({ competency }: { competency: CompetencyState }) {
  return (
    <div className="competency-row">
      <p>{competency.name}</p>
      <CompetencyTrack competency={competency} />
      <CompetencyStatus competency={competency} />
    </div>
  );
}

// Historial ilustrativo: el resultado de cada parada coincide con el total de aciertos del caso.
const recentCases: Array<{
  title: string;
  patient: string;
  portrait: PortraitName;
  marks: StopAnswer[];
}> = [
  {
    title: "Cetoacidosis tras gastroenteritis",
    patient: useWorstCase ? `${worstCaseLongName}, 24 años` : "Lucía, 24 años",
    portrait: "Lucía",
    marks: [
      { correct: true, answer: "" },
      { correct: false, answer: "" },
      { correct: true, answer: "" },
    ],
  },
  {
    title: "Palpitaciones y pérdida de peso",
    patient: "Marta, 35 años",
    portrait: "Marta",
    marks: [
      { correct: true, answer: "" },
      { correct: true, answer: "" },
      { correct: true, answer: "" },
    ],
  },
];

function RecentCase({
  title,
  patient,
  portrait,
  marks,
}: {
  title: string;
  patient: string;
  portrait: PortraitName;
  marks: StopAnswer[];
}) {
  return (
    <article className="recent-case">
      <div className="recent-who">
        <Portrait patient={portrait} />
        <div>
          <h3>{title}</h3>
          <p>{patient}</p>
        </div>
      </div>
      <div className="recent-result">
        <div className="recent-route">
          {marks.map((mark, index) => (
            <span className={`recent-mark ${stopMarkState(mark)}`} key={index}>
              <StopMark answer={mark} />
            </span>
          ))}
        </div>
        <span>{marks.filter((mark) => mark.correct).length} de 3 aciertos</span>
      </div>
    </article>
  );
}

function StudentHome() {
  const answers = readElenaAnswers();
  const competencies = competenciesAfterElena(answers, readCasePlan());
  const homeCompetencies = competencies.filter(({ id }) =>
    elenaStops.some((stop) => stop.competencyId === id),
  );
  const finished = isCaseFinished(answers);
  const recommended = finished ? recommendNextCase(competencies).candidate : null;

  return (
    <div className="student-page">
      <LoggedTopbar />
      <main className="student-main">
        <section className="student-left">
          <h1>Hola, Bruno</h1>
          <article className="next-case-card">
            <div className="next-case-orbit orbit-one" />
            <div className="next-case-orbit orbit-two" />
            <Portrait patient={recommended ? recommended.patient : "Elena"} />
            <div className="next-case-main">
              <span className="next-case-label">Tu siguiente caso</span>
              <h2>{recommended ? recommended.title : "Consulta por cansancio"}</h2>
              <p>
                {recommended
                  ? recommended.line
                  : "Elena, 68 años. Endocrinología. Tres paradas, unos 6 minutos."}
              </p>
              <MiniRoute />
              {recommended ? (
                <span className="next-case-soon">Disponible muy pronto</span>
              ) : (
                <a className="button-link next-case-button" href="/caso/elena">
                  Empezar caso
                </a>
              )}
            </div>
            <div className="case-rationale">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path d="m16 6 3.7 10-3.7 7-3.7-7L16 6Z" fill="currentColor" />
                <path d="m16 6 3.7 10-3.7-2.1V6Z" fill="#43D6BE" />
              </svg>
              <p>
                {recommended
                  ? recommended.reason
                  : "Lo elegimos porque aún no tenemos evidencia de cómo interpretas pruebas tiroideas."}
              </p>
            </div>
          </article>
          <section className="recent-cases">
            <h2>Casos recientes</h2>
            <div className="recent-case-list">
              {finished && (
                <RecentCase
                  title="Consulta por cansancio"
                  patient="Elena, 68 años"
                  portrait="Elena"
                  marks={answers}
                />
              )}
              {recentCases.map((recentCase) => (
                <RecentCase key={recentCase.title} {...recentCase} />
              ))}
            </div>
          </section>
        </section>
        <aside className="competencies-card">
          <h2>Tus competencias</h2>
          {homeCompetencies.map((competency) => (
            <Competency competency={competency} key={competency.id} />
          ))}
          <a className="progress-link" href="/progreso">
            Ver todo mi progreso
          </a>
        </aside>
        <DevDataToggle />
      </main>
    </div>
  );
}

function CaseRoute() {
  const stops = [
    ["Diagnóstico", "Interpretar TSH y T4 libre"],
    ["Tratamiento", "Elegir el tratamiento de primera línea"],
    ["Seguimiento", "Elegir la prueba de control"],
  ];

  return (
    <div className="case-route" aria-label="Ruta del caso">
      <div className="case-route-line" />
      {stops.map(([title, description]) => (
        <div className="case-route-stop" key={title}>
          <span className="case-route-dot" />
          <strong>{title}</strong>
          <small>{description}</small>
        </div>
      ))}
    </div>
  );
}

const elenaPatient = useWorstCase
  ? worstCasePatient
  : {
      name: "Elena",
      caseTitle: "Consulta por cansancio",
      complaint: "Cansancio persistente",
      chips: ["68 años", "Mujer", "Consulta ambulatoria"],
    };

function ElenaCaseIntro() {
  const [learnerId, setLearnerId] = useState<LearnerId>(() => readCasePlan()?.learnerId ?? "bruno");

  // Empezar fija el plan y descarta el intento anterior.
  function startCase() {
    sessionStorage.setItem("elena-plan", JSON.stringify(buildCasePlan(learnerId)));
    sessionStorage.removeItem("elena-answers");
    sessionStorage.removeItem("elena-closed");
  }

  return (
    <div className="case-intro-page">
      <LoggedTopbar />
      <main className="case-intro">
        <p className="breadcrumb">Endocrinología / {elenaPatient.caseTitle}</p>
        <header className="patient-card">
          <Portrait patient="Elena" />
          <div className="patient-card-body">
            <h1>{elenaPatient.caseTitle}</h1>
            <p className="patient-name">{elenaPatient.name}</p>
            <div className="patient-story">
              <span>Motivo de consulta</span>
              <p>{elenaPatient.complaint}</p>
            </div>
            <ul className="patient-chips">
              {elenaPatient.chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
            <div className="patient-tags">
              <span className="patient-tag">Paciente ficticia</span>
              <span className="patient-tag">Contenido sin validación médica</span>
            </div>
          </div>
          <div className="case-start">
            <a
              className="button-link case-start-button"
              href="/caso/elena/jugar"
              onClick={startCase}
            >
              Empezar caso
            </a>
            <span>Unos 6 minutos.</span>
            <a className="case-start-back" href="/inicio">
              Volver al inicio
            </a>
          </div>
        </header>
        <div className="case-details">
          <section className="case-intro-section route-section">
            <h2>Tu ruta</h2>
            <CaseRoute />
          </section>
          <section className="case-intro-section practice-section">
            <h2>Qué vas a practicar</h2>
            <p>Interpretación de resultados, manejo terapéutico y selección de pruebas.</p>
          </section>
          <div className="case-info-strip">
            <p>Puedes responder «No sé»: también nos ayuda a elegir tu siguiente caso.</p>
          </div>
        </div>
        <div className="demo-learner">
          <span className="demo-learner-tag">Demo</span>
          <span id="demo-learner-label">Probar como:</span>
          <div
            aria-labelledby="demo-learner-label"
            className="demo-learner-options"
            role="radiogroup"
          >
            {demoLearners.map((learner) => (
              <label className={learnerId === learner.id ? "active" : ""} key={learner.id}>
                <input
                  checked={learnerId === learner.id}
                  className="sr-only"
                  name="demo-learner"
                  onChange={() => setLearnerId(learner.id)}
                  type="radio"
                />
                {learner.label}
              </label>
            ))}
          </div>
        </div>
        <DevDataToggle />
      </main>
    </div>
  );
}

type CaseOption = { text: string; explanation: string; correct?: boolean };

const baseElenaStops: Array<{
  title: string;
  competency: string;
  competencyId: CompetencyId;
  difficulty: number;
  question: string;
  options: CaseOption[];
  reminder: string;
}> = [
  {
    title: "Diagnóstico",
    competency: "interpretación de resultados",
    competencyId: "interpretacion",
    difficulty: 0,
    question: "¿Qué diagnóstico explica mejor el perfil tiroideo presentado?",
    options: [
      {
        text: "Hipotiroidismo primario manifiesto",
        explanation: "Integra TSH alta y T4 libre baja.",
        correct: true,
      },
      { text: "Hipotiroidismo subclínico", explanation: "No concuerda con T4 libre baja." },
      {
        text: "Hipotiroidismo central",
        explanation: "TSH marcadamente alta favorece falla primaria.",
      },
      { text: "Hipertiroidismo primario", explanation: "El patrón hormonal es opuesto." },
    ] satisfies CaseOption[],
    reminder: "Relaciona ambas pruebas: no interpretes solo la TSH.",
  },
  {
    title: "Tratamiento",
    competency: "manejo terapéutico",
    competencyId: "manejo",
    difficulty: -1,
    question: "Confirmado el diagnóstico, ¿qué fármaco es el tratamiento de primera línea?",
    options: [
      { text: "Levotiroxina", explanation: "Sustituye la hormona tiroidea.", correct: true },
      {
        text: "Metimazol",
        explanation: "Inhibe la producción hormonal; no corresponde a este déficit.",
      },
      {
        text: "Propranolol como único tratamiento",
        explanation: "No repone la hormona que falta.",
      },
      {
        text: "Liotironina de rutina como primera elección",
        explanation: "No es la opción rutinaria de primera línea.",
      },
    ] satisfies CaseOption[],
    reminder: "Distingue sustituir la hormona de bloquear su síntesis.",
  },
  {
    title: "Seguimiento",
    competency: "selección de pruebas",
    competencyId: "seleccion",
    difficulty: 0,
    question: "¿Qué prueba debe guiar el seguimiento rutinario de este hipotiroidismo tratado?",
    options: [
      { text: "TSH sérica", explanation: "Es la prueba principal de seguimiento.", correct: true },
      { text: "Anticuerpos antiperoxidasa seriados", explanation: "No ajustan el reemplazo." },
      { text: "Ecografía tiroidea seriada", explanation: "No mide la respuesta bioquímica." },
      { text: "T3 total como única prueba", explanation: "No es la prueba principal de control." },
    ] satisfies CaseOption[],
    reminder: "No confundas la prueba de seguimiento con el estudio de la causa.",
  },
];

const elenaStops = useWorstCase
  ? [{ ...baseElenaStops[0], ...worstCaseStop }, baseElenaStops[1], baseElenaStops[2]]
  : baseElenaStops;

type VariantId = "estandar" | "guiada";
type LearnerId = "bruno" | "menos-experiencia";
type CasePlan = { learnerId: LearnerId; variantId: VariantId };

// Variantes autorizadas de la parada 1: misma pregunta, distinta información en el panel.
const elenaVariants: Array<{
  id: VariantId;
  name: string;
  difficulty: number;
  note: string;
}> = [
  {
    id: "estandar",
    name: "Estándar",
    difficulty: 0,
    note: "la versión estándar de esta parada",
  },
  {
    id: "guiada",
    name: "Guiada",
    difficulty: -1.5,
    note: "la versión guiada, con más datos del caso",
  },
];

const demoLearners: Array<{ id: LearnerId; label: string; interpretacionTheta?: number }> = [
  { id: "bruno", label: "Bruno (nivel actual)" },
  { id: "menos-experiencia", label: "Alumno con menos experiencia", interpretacionTheta: -0.6 },
];

function startingCompetencies(learnerId: LearnerId) {
  const theta = demoLearners.find(({ id }) => id === learnerId)?.interpretacionTheta;
  return seedCompetencies.map((competency) =>
    competency.id === "interpretacion" && theta !== undefined
      ? { ...competency, theta }
      : competency,
  );
}

function startingTheta(learnerId: LearnerId) {
  return startingCompetencies(learnerId).find(({ id }) => id === "interpretacion")!.theta;
}

function buildCasePlan(learnerId: LearnerId): CasePlan {
  return {
    learnerId,
    variantId: closestToTarget(startingTheta(learnerId), elenaVariants).id,
  };
}

function readCasePlan(): CasePlan | null {
  try {
    const plan = JSON.parse(sessionStorage.getItem("elena-plan") ?? "null");
    const known =
      demoLearners.some(({ id }) => id === plan?.learnerId) &&
      elenaVariants.some(({ id }) => id === plan?.variantId);
    return known ? plan : null;
  } catch {
    return null;
  }
}

function planVariant(plan: CasePlan) {
  return elenaVariants.find(({ id }) => id === plan.variantId)!;
}

function chanceOf(theta: number, difficulty: number) {
  return Math.round(probability(theta, difficulty) * 100);
}

// Cada caso candidato practica una sola competencia.
const nextCaseCandidates: Array<{
  mapName: string;
  patient: PortraitName;
  title: string;
  line: string;
  reason: string;
  competencyId: CompetencyId;
  difficulty: number;
}> = [
  {
    mapName: "Rafael",
    patient: "Rafael",
    title: "Una consulta preventiva y su seguimiento",
    line: useWorstCase
      ? `${worstCaseLongName}, 52 años. Confirmar diabetes con pruebas.`
      : "Rafael, 52 años. Confirmar diabetes con pruebas.",
    reason:
      "Te lo sugerimos porque interpretación de resultados es donde más te conviene practicar, y este caso vuelve a pedirte interpretar pruebas.",
    competencyId: "interpretacion",
    difficulty: -1,
  },
  {
    mapName: "Elena II",
    patient: "Elena",
    title: "Continuidad del cuidado",
    line: "Elena, meses después. Ajustar el tratamiento y elegir el control.",
    reason:
      "Aún no tenemos suficiente evidencia de cómo eliges pruebas de control, y este caso te lo pide.",
    competencyId: "seleccion",
    difficulty: -0.5,
  },
];

function recommendNextCase(competencies: CompetencyState[]) {
  const caseCompetencies = competencies.filter(({ id }) =>
    elenaStops.some((stop) => stop.competencyId === id),
  );
  return recommendCase(caseCompetencies, nextCaseCandidates)!;
}

function ResultIcon({ correct }: { correct: boolean }) {
  return (
    <svg className="result-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".15" />
      {correct ? (
        <path
          d="m5.8 10.2 2.6 2.6 5.8-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m7 7 6 6m0-6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

type StopAnswer = { correct: boolean; answer: string };

// «No sé» cuenta como r = 0 en el motor, pero en pantalla no se muestra como error.
function stopMarkState({ correct, answer }: StopAnswer) {
  if (correct) return "done";
  return answer === "No sé" ? "neutral" : "error";
}

function StopMark({ answer }: { answer: StopAnswer }) {
  const state = stopMarkState(answer);
  if (state === "neutral") {
    return (
      <>
        <span aria-hidden="true">?</span>
        <span className="sr-only">No sé</span>
      </>
    );
  }
  return (
    <svg
      aria-label={state === "done" ? "Correcta" : "Incorrecta"}
      className="stop-mark"
      fill="none"
      role="img"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 20 20"
    >
      <path d={state === "done" ? "m5.5 10.3 3 3 6-6.6" : "m6.5 6.5 7 7m0-7-7 7"} />
    </svg>
  );
}

function FocusTopbar() {
  return (
    <header className="focus-topbar">
      <div className="focus-nav">
        <a href="/inicio" aria-label="Ir al inicio">
          <CompassLogo />
        </a>
        <span title={elenaPatient.caseTitle}>{elenaPatient.caseTitle}</span>
        <a href="/inicio">Salir</a>
      </div>
    </header>
  );
}

function PlayRoute({ stop, answers }: { stop: number; answers: Array<StopAnswer | undefined> }) {
  return (
    <div className="play-route">
      <div className="play-track">
        <div className="play-lead">
          {stop === 0 ? <Heartbeat key={stop} /> : <span className="play-lead-line" />}
        </div>
        {elenaStops.map((item, index) => {
          const answer = answers[index];
          const complete = index <= stop && answer;
          return (
            <Fragment key={item.title}>
              <div className={`play-stop ${index === stop ? "is-current" : ""}`}>
                <span
                  className={`play-dot ${index === stop && !complete ? "current" : ""} ${complete ? stopMarkState(answer) : ""}`}
                >
                  {complete && <StopMark answer={answer} />}
                </span>
                <span className="play-stop-label">{item.title}</span>
              </div>
              {index < elenaStops.length - 1 && (
                <div className={`play-segment ${answer ? "drawn" : ""}`}>
                  <span />
                </div>
              )}
              {index + 1 === stop && <Heartbeat key={stop} />}
            </Fragment>
          );
        })}
      </div>
      <strong className="stop-count">Parada {stop + 1} de 3</strong>
    </div>
  );
}

type LabRange = { low: number; high: number; position: number; out?: "high" | "low" };

// El intervalo de referencia ocupa este tramo de la barra; lo que queda fuera se dibuja al borde.
const rangeStart = 28;
const rangeEnd = 72;

function rangeFromValues(value: number, low: number, high: number): LabRange {
  const position = rangeStart + ((value - low) / (high - low)) * (rangeEnd - rangeStart);
  return {
    low,
    high,
    position: Math.round(Math.min(96, Math.max(4, position)) * 10) / 10,
    out: value > high ? "high" : value < low ? "low" : undefined,
  };
}

// Rangos de referencia del banco de casos (EVENTOS_CLINICOS).
const labRanges: Record<string, LabRange> = {
  TSH: rangeFromValues(24, 0.4, 4),
  "T4 libre": rangeFromValues(0.5, 0.8, 1.8),
  Hemoglobina: rangeFromValues(13, 12, 16),
};

function RangeBar({ low, high, position, out }: LabRange) {
  const connector =
    out === "high"
      ? { left: `${rangeEnd}%`, width: `${position - rangeEnd}%` }
      : out === "low"
        ? { left: `${position}%`, width: `${rangeStart - position}%` }
        : null;
  return (
    <div aria-hidden="true" className="range-bar">
      <span
        className="range-band"
        style={{ left: `${rangeStart}%`, width: `${rangeEnd - rangeStart}%` }}
      />
      {connector && <span className="range-connector" style={connector} />}
      <span className={`range-dot ${out ? "out" : ""}`} style={{ left: `${position}%` }} />
      <span className="range-limit" style={{ left: `${rangeStart}%` }}>
        {low}
      </span>
      <span className="range-limit" style={{ left: `${rangeEnd}%` }}>
        {high}
      </span>
    </div>
  );
}

function KnowledgeRow({
  label,
  value,
  learned = false,
  range,
}: {
  label: string;
  value: string;
  learned?: boolean;
  range?: LabRange;
}) {
  return (
    <div
      className={`knowledge-row ${learned ? "learned-row" : ""} ${value.length > 30 ? "stacked" : ""} ${range?.out ? "out-of-range" : ""}`}
    >
      <span>{label}</span>
      <strong>
        {value}
        {range && (
          <span className="sr-only">
            . Referencia: {range.low} a {range.high}
          </span>
        )}
      </strong>
      {range && <RangeBar {...range} />}
    </div>
  );
}

function ElenaKnowledge({ stop, variantId }: { stop: number; variantId: VariantId }) {
  const [tab, setTab] = useState("Laboratorio");
  const guided = variantId === "guiada";
  const details: Record<string, string[][]> = {
    Historia: [
      ["Edad", "68 años"],
      ["Sexo", "Mujer"],
      ["Motivo de consulta", "Cansancio persistente"],
      ...(guided
        ? [
            [
              "Historia actual",
              "Tres meses de cansancio progresivo, intolerancia al frío y estreñimiento. Sin alteración de conciencia ni deterioro agudo.",
            ],
          ]
        : []),
      [
        "Antecedentes",
        "Sin enfermedad tiroidea conocida, cardiopatía, cirugía tiroidea ni uso de amiodarona o litio. No toma biotina.",
      ],
      ["Alergias", "Niega alergias medicamentosas conocidas."],
      ["Contexto", "Consulta ambulatoria"],
    ],
    ...(guided
      ? {
          Exploración: [
            ["Signos vitales", "FC 58 lat/min, PA 124/76 mmHg, T 36.2 °C."],
            ["Exploración", "Piel seca, orientada, sin edema."],
          ],
        }
      : {}),
    Laboratorio: [
      ["TSH", "24 mUI/L, alta"],
      ["T4 libre", "0.5 ng/dL, baja"],
      ...(guided ? [["Hemoglobina", "13 g/dL"]] : []),
    ],
  };
  const tabNames = Object.keys(details);
  const activeIndex = tabNames.indexOf(tab);

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % tabNames.length,
      ArrowLeft: (index - 1 + tabNames.length) % tabNames.length,
      Home: 0,
      End: tabNames.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setTab(tabNames[target]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [target].focus();
  }

  const growingDetails = [
    ...(stop > 0 ? [["Diagnóstico", "hipotiroidismo primario manifiesto"]] : []),
    ...(stop > 1
      ? [
          ["Tratamiento", "levotiroxina 25 µg"],
          ["Plan", "TSH en 3 meses"],
        ]
      : []),
  ];

  return (
    <aside className="knowledge-panel">
      <h2>Lo que sabes de Elena</h2>
      <div aria-label="Información del caso" className="knowledge-tabs" role="tablist">
        {tabNames.map((name, index) => (
          <button
            aria-controls={tab === name ? "knowledge-tabpanel" : undefined}
            aria-selected={tab === name}
            className={tab === name ? "active" : ""}
            id={`knowledge-tab-${index}`}
            key={name}
            onClick={() => setTab(name)}
            onKeyDown={(event) => moveWithKeyboard(event, index)}
            role="tab"
            tabIndex={tab === name ? 0 : -1}
            type="button"
          >
            {name}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`knowledge-tab-${activeIndex}`}
        className="knowledge-rows"
        id="knowledge-tabpanel"
        role="tabpanel"
        tabIndex={0}
      >
        {details[tab].map(([label, value]) => (
          <KnowledgeRow
            key={label}
            label={label}
            range={tab === "Laboratorio" ? labRanges[label] : undefined}
            value={value}
          />
        ))}
        {growingDetails.map(([label, value]) => (
          <KnowledgeRow key={label} label={label} learned value={value} />
        ))}
      </div>
      <p className="lab-note">Valores de un laboratorio ficticio.</p>
    </aside>
  );
}

const confidenceLevels = ["Poco", "Algo", "Mucho"];

// Retraso de cada opción en la cascada: los pasos se acortan (50, 40, 30 ms) para que se lea como una ola.
const cascadeDelays = [0, 50, 90, 120];

// En un grupo de radios, las flechas mueven el foco y la selección a la vez.
function moveWithinRadioGroup(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  values: string[],
  select: (value: string) => void,
) {
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
  const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
  if (!forward && !backward) return;
  event.preventDefault();
  const target = (index + (forward ? 1 : -1) + values.length) % values.length;
  select(values[target]);
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    [target].focus();
}

function ElenaCasePlay({ plan }: { plan: CasePlan }) {
  const variant = planVariant(plan);
  const variantChance = chanceOf(startingTheta(plan.learnerId), variant.difficulty);
  const [stop, setStop] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState("Algo");
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{ correct: boolean; answer: string; confidence: string; time: number } | undefined>
  >([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const data = elenaStops[stop];
  const noIdea = selected === "No sé";
  const correctOption = data.options.find((option) => option.correct)!;
  const isCorrect = selected === correctOption.text;
  const choices = [...data.options.map((option) => option.text), "No sé"];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextActionRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  // El control que tenía el foco desaparece al avanzar: lo llevamos al siguiente paso lógico.
  useEffect(() => {
    if (answered) nextActionRef.current?.focus();
  }, [answered]);

  // También al entrar: los atajos 1–4 solo actúan con el foco dentro de la pregunta (WCAG 2.1.4).
  useEffect(() => {
    headingRef.current?.focus();
  }, [stop]);

  function handleShortcuts(event: KeyboardEvent<HTMLElement>) {
    if (answered || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const target = event.target as HTMLElement;
    const optionIndex = Number(event.key) - 1;
    const option = data.options[optionIndex];
    if (option) {
      event.preventDefault();
      setSelected(option.text);
      event.currentTarget
        .querySelectorAll<HTMLButtonElement>('[aria-labelledby="question-title"] [role="radio"]')
        [optionIndex]?.focus();
      return;
    }
    if (event.key === "Enter" && selected && !target.closest(".respond-button")) {
      event.preventDefault();
      respond();
    }
  }

  // Tras responder, las opciones dejan de ser un control y quedan como resultado.
  function choiceProps(value: string) {
    if (answered) return {};
    const index = choices.indexOf(value);
    return {
      "aria-checked": selected === value,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        moveWithinRadioGroup(event, index, choices, setSelected),
      role: "radio",
      tabIndex: selected === value || (!selected && index === 0) ? 0 : -1,
    };
  }

  function respond() {
    if (!selected) return;
    setAnswers((current) => {
      const next = [...current];
      next[stop] = {
        correct: isCorrect,
        answer: selected,
        confidence: noIdea ? "No sé" : confidence,
        time: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      };
      sessionStorage.setItem("elena-answers", JSON.stringify(next));
      return next;
    });
    setAnswered(true);
  }

  function nextStop() {
    if (stop === 2) return;
    setStop((current) => current + 1);
    setSelected(null);
    setConfidence("Algo");
    setAnswered(false);
    setExpanded([]);
    setStartedAt(Date.now());
  }

  return (
    <div className="play-page">
      <FocusTopbar />
      <main className="play-main">
        <PlayRoute stop={stop} answers={answers} />
        <div className="play-grid">
          <section className="question-area" onKeyDown={handleShortcuts}>
            <h1 id="question-title" ref={headingRef} tabIndex={-1}>
              {data.question}
            </h1>
            <div className="stop-lead">
              <div aria-atomic="true" aria-live="polite" className="result-live">
                {answered && (
                  <p
                    className={`result-line ${noIdea ? "neutral" : isCorrect ? "right" : "incorrect"}`}
                  >
                    {!noIdea && <ResultIcon correct={isCorrect} />}
                    {noIdea
                      ? "Esta es la respuesta, con su porqué."
                      : isCorrect
                        ? "Correcto."
                        : "No es la correcta. Revisa por qué."}
                  </p>
                )}
              </div>
              {stop === 0 && !answered && (
                <div className="level-adjustment variant-note">
                  <CompassLogo />
                  <span>
                    Para ti elegimos {variant.note}: {variantChance} % de acierto estimado.
                  </span>
                </div>
              )}
            </div>
            <div
              aria-labelledby={answered ? undefined : "question-title"}
              role={answered ? undefined : "radiogroup"}
            >
              <div className={`answer-options ${answered ? "answered" : ""}`}>
                {data.options.map((option, optionIndex) => {
                  const selectedWrong = answered && selected === option.text && !option.correct;
                  const showExpanded = expanded.includes(option.text);
                  return (
                    <div
                      className={`answer-wrap ${answered && option.correct ? "correct" : ""} ${selectedWrong ? "wrong" : ""}`}
                      key={option.text}
                      style={{ "--cascade": `${cascadeDelays[optionIndex]}ms` } as CSSProperties}
                    >
                      <button
                        {...choiceProps(option.text)}
                        aria-keyshortcuts={answered ? undefined : String(optionIndex + 1)}
                        className={`answer-option ${selected === option.text ? "selected" : ""}`}
                        disabled={answered}
                        onClick={() => setSelected(option.text)}
                        type="button"
                      >
                        {option.text}
                      </button>
                      {answered && option.correct && (
                        <div className="answer-feedback correct-feedback reveal">
                          <span>Correcta</span>
                          <p>{option.explanation}</p>
                        </div>
                      )}
                      {selectedWrong && (
                        <div className="answer-feedback wrong-feedback reveal">
                          <span>Tu respuesta</span>
                          <p>{option.explanation}</p>
                        </div>
                      )}
                      {answered && !option.correct && !selectedWrong && (
                        <div className="why-not">
                          <button
                            aria-expanded={showExpanded}
                            aria-label={`Por qué no: ${option.text}`}
                            className="reveal"
                            onClick={() =>
                              setExpanded((current) =>
                                current.includes(option.text)
                                  ? current.filter((item) => item !== option.text)
                                  : [...current, option.text],
                              )
                            }
                            type="button"
                          >
                            Por qué no
                          </button>
                          {showExpanded && <p>{option.explanation}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!answered && (
                <button
                  {...choiceProps("No sé")}
                  className={`no-idea ${noIdea ? "selected" : ""}`}
                  onClick={() => setSelected("No sé")}
                  type="button"
                >
                  No sé
                </button>
              )}
            </div>
            {!answered && (
              <div className="response-bar">
                {!noIdea && (
                  <div className="confidence-control">
                    <span id="confidence-label">¿Qué tan seguro estás?</span>
                    <div aria-labelledby="confidence-label" role="radiogroup">
                      {confidenceLevels.map((level, index) => (
                        <button
                          aria-checked={confidence === level}
                          className={confidence === level ? "active" : ""}
                          key={level}
                          onClick={() => setConfidence(level)}
                          onKeyDown={(event) =>
                            moveWithinRadioGroup(event, index, confidenceLevels, setConfidence)
                          }
                          role="radio"
                          tabIndex={confidence === level ? 0 : -1}
                          type="button"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="respond-button"
                  disabled={!selected}
                  onClick={respond}
                  type="button"
                >
                  Responder
                </button>
              </div>
            )}
            {answered && (
              <>
                <div className="remember-block reveal">
                  <strong>Para recordar</strong>
                  <p>{data.reminder}</p>
                  <span>Fuente: NICE NG145. Contenido sin validación médica.</span>
                </div>
                <div className="answer-next">
                  <div className="level-adjustment reveal">
                    <CompassLogo />
                    <span>Con esto ajustamos tu nivel en {data.competency}.</span>
                  </div>
                  {stop === 2 ? (
                    <a
                      className="button-link next-stop-button"
                      href="/caso/elena/resultado"
                      ref={nextActionRef}
                    >
                      Ver resultado
                    </a>
                  ) : (
                    <button
                      className="next-stop-button"
                      onClick={nextStop}
                      ref={nextActionRef}
                      type="button"
                    >
                      Ir a la parada {stop + 2}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
          <ElenaKnowledge stop={stop} variantId={plan.variantId} />
        </div>
        <DevDataToggle />
      </main>
    </div>
  );
}

type SavedAnswer = { correct: boolean; answer: string; confidence: string; time: number };

function readElenaAnswers(): SavedAnswer[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem("elena-answers") ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function isCaseFinished(answers: SavedAnswer[]) {
  return answers.filter(Boolean).length === elenaStops.length;
}

// El estado se recalcula desde las respuestas guardadas: así volver a abrir una pantalla no las cuenta dos veces.
function competenciesAfterElena(answers: SavedAnswer[], plan: CasePlan | null) {
  return answers.reduce(
    (competencies, answer, index) => {
      const stop = elenaStops[index];
      if (!answer || !stop) return competencies;
      const difficulty = index === 0 && plan ? planVariant(plan).difficulty : stop.difficulty;
      return competencies.map((competency) =>
        competency.id === stop.competencyId
          ? applyAnswer(competency, answer.correct, difficulty)
          : competency,
      );
    },
    startingCompetencies(plan?.learnerId ?? "bruno"),
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const rest = String(seconds % 60).padStart(2, "0");
  return `${Math.floor(seconds / 60)} min ${rest} s`;
}

function CaseClosedStamp() {
  return (
    <div aria-label="Caso cerrado" className="case-stamp" role="img">
      <svg aria-hidden="true" viewBox="0 0 200 200">
        <defs>
          <path d="M19 100a81 81 0 1 1 162 0a81 81 0 1 1 -162 0" id="case-stamp-circle" />
        </defs>
        <circle cx="100" cy="100" r="98" />
        <circle cx="100" cy="100" r="66" />
        <text textLength="505">
          <textPath href="#case-stamp-circle">CASO CERRADO · CASO CERRADO ·</textPath>
        </text>
      </svg>
      <Portrait patient="Elena" />
    </div>
  );
}

function CompletedRoute({ answers }: { answers: SavedAnswer[] }) {
  return (
    <div className="completed-route">
      <div className="completed-route-line" />
      {elenaStops.map((item, index) => {
        const answer = answers[index];
        return (
          <div className="completed-stop" key={item.title}>
            <span className={`completed-dot ${stopMarkState(answer)}`}>
              <StopMark answer={answer} />
            </span>
            <span>{item.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function ElenaCaseResult() {
  const [answers] = useState<SavedAnswer[]>(readElenaAnswers);
  const [showReason, setShowReason] = useState(false);
  // El cierre se celebra una sola vez por intento; al volver a esta pantalla ya está sellado.
  const [closing] = useState(() => !sessionStorage.getItem("elena-closed"));
  useEffect(() => {
    sessionStorage.setItem("elena-closed", "1");
  }, []);
  const competencies = competenciesAfterElena(answers, readCasePlan());
  const correctCount = answers.filter((answer) => answer?.correct).length;
  const noIdeaCount = answers.filter((answer) => answer?.answer === "No sé").length;
  const {
    candidate: nextCase,
    competency: nextCaseCompetency,
    chance,
  } = recommendNextCase(competencies);
  const competencyName =
    nextCaseCompetency.name.charAt(0).toLowerCase() + nextCaseCompetency.name.slice(1);

  return (
    <div className="result-page">
      <LoggedTopbar />
      <main className="result-main">
        <header className={`result-head ${closing ? "is-closing" : ""}`}>
          <div className="result-head-copy">
            <div className="result-route">
              <CompletedRoute answers={answers} />
              <span className="route-tail" />
            </div>
            <h1>Terminaste el caso de Elena</h1>
            <p className="result-summary">Acertaste {correctCount} de 3 decisiones.</p>
            {noIdeaCount > 0 && (
              <p className="result-no-idea">
                Respondiste «No sé» {noIdeaCount} {noIdeaCount === 1 ? "vez" : "veces"}
              </p>
            )}
          </div>
          <CaseClosedStamp />
        </header>
        <div className="result-grid">
          <div>
            <section className="stops-summary-card">
              <h2>Qué pasó en cada parada</h2>
              {elenaStops.map((item, index) => {
                const answer = answers[index];
                const noIdea = answer?.answer === "No sé";
                return (
                  <div className="stop-summary-row" key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{answer?.answer ?? ""}</span>
                    </div>
                    <span
                      className={`summary-result ${answer?.correct ? "correct" : noIdea ? "neutral" : "wrong"}`}
                    >
                      {noIdea ? (
                        <StopMark answer={answer} />
                      ) : (
                        <ResultIcon correct={Boolean(answer?.correct)} />
                      )}
                    </span>
                    <time dateTime={answer ? `PT${answer.time}S` : undefined}>
                      {answer ? formatDuration(answer.time) : ""}
                    </time>
                  </div>
                );
              })}
            </section>
            <section className="result-competencies">
              <h2>Tus competencias</h2>
              {elenaStops.map((stop) => (
                <Competency
                  competency={competencies.find(({ id }) => id === stop.competencyId)!}
                  key={stop.competencyId}
                />
              ))}
            </section>
          </div>
          <aside className="next-case-result">
            <div className="result-orbit result-orbit-one" />
            <div className="result-orbit result-orbit-two" />
            <Portrait patient={nextCase.patient} />
            <span>Tu siguiente caso</span>
            <h2>{nextCase.title}</h2>
            <p className="next-case-line">{nextCase.line}</p>
            <p className="next-case-reason">{nextCase.reason}</p>
            <button
              aria-expanded={showReason}
              className="decision-explainer"
              onClick={() => setShowReason((current) => !current)}
              type="button"
            >
              <CompassLogo />
              Cómo lo decidimos
            </button>
            {showReason && (
              <p className="decision-copy">
                Elegimos {competencyName} porque está en «
                {describeCompetency(nextCaseCompetency).label}». Entre los casos disponibles para
                ella, este es el más cercano al 75 % de acierto estimado: {Math.round(chance * 100)}{" "}
                %.
              </p>
            )}
            <a className="result-next-button" href="/inicio">
              Empezar siguiente caso
            </a>
            <a className="result-home-link" href="/inicio">
              Volver al inicio
            </a>
          </aside>
        </div>
      </main>
    </div>
  );
}

// Coordenadas en % del bloque: la ruta y las paradas se estiran con él, sin deformar los puntos ni el texto.
const territorySlots = [
  { x: 8, y: 60 },
  { x: 25, y: 40 },
  { x: 42, y: 60 },
  { x: 59, y: 40 },
  { x: 76, y: 60 },
  { x: 92, y: 42 },
];

// Completados del historial, luego el caso recomendado y al final los pendientes.
function buildTerritoryStops(completed: string[], current: string) {
  const pending = ["Rafael", "Elena II", "Sofía"].filter((name) => name !== current);
  const stops: Array<{ name: string; state: StopState }> = [
    ...completed.map((name) => ({ name, state: "done" as const })),
    { name: current, state: "current" as const },
    ...pending.map((name) => ({ name, state: "pending" as const })),
  ];
  return stops.map((stop, index) => ({ ...stop, ...territorySlots[index] }));
}

const stopStateLabels: Record<StopState, string> = {
  done: "completado",
  current: "caso actual",
  pending: "pendiente",
};

// endInset deja libre el último tramo, en % del ancho, para que la línea llegue plana al latido.
function wavePath(stops: Array<{ x: number; y: number }>, endInset = 0) {
  return stops
    .map((stop, index) => {
      if (index === 0) return `M${stop.x} ${stop.y}`;
      const previous = stops[index - 1];
      const x = index === stops.length - 1 ? stop.x - endInset : stop.x;
      const middle = (previous.x + x) / 2;
      return `C${middle} ${previous.y} ${middle} ${stop.y} ${x} ${stop.y}`;
    })
    .join(" ");
}

function TerritoryMap({
  territoryStops,
}: {
  territoryStops: ReturnType<typeof buildTerritoryStops>;
}) {
  const currentIndex = territoryStops.findIndex((stop) => stop.state === "current");

  return (
    <section className="territory" aria-label="Ruta de casos de Endocrinología">
      <div className="map-grid" />
      <CompassRose />
      <svg
        className="territory-route"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path d={wavePath(territoryStops.slice(currentIndex))} className="route-pending" />
        <path
          d={wavePath(territoryStops.slice(0, currentIndex + 1), 8.5)}
          className="route-travelled"
        />
      </svg>
      <ol className="territory-stops">
        {territoryStops.map((stop) => (
          <li
            className={`territory-stop ${stop.state}`}
            aria-current={stop.state === "current" ? "step" : undefined}
            key={stop.name}
            style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
          >
            {stop.state === "current" && <Heartbeat />}
            <span className="territory-dot">
              <Portrait patient={stop.name === "Elena II" ? "Elena" : stop.name} />
              {stop.state === "done" && (
                <svg className="territory-check" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="m6 10.2 2.7 2.7L14 7.4"
                    fill="none"
                    stroke="#1A1840"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="territory-label">
              {useWorstCase && stop.name === "Lucía" ? worstCaseLongName : stop.name}
              <span className="sr-only"> ({stopStateLabels[stop.state]})</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatTheta(theta: number) {
  return theta.toFixed(2).replace("-", "−");
}

function ProgressRow({
  competency,
  showCalculation,
}: {
  competency: CompetencyState;
  showCalculation: boolean;
}) {
  return (
    <li className="progress-row">
      <p className="progress-row-name">{competency.name}</p>
      <CompetencyTrack competency={competency} />
      <CompetencyStatus competency={competency} />
      <span className="progress-row-count">
        {competency.n} {competency.n === 1 ? "respuesta" : "respuestas"}
      </span>
      {showCalculation && (
        <dl className="calculation-row">
          <div>
            <dt>θ</dt>
            <dd>{formatTheta(competency.theta)}</dd>
          </div>
          <div>
            <dt>n</dt>
            <dd>{competency.n}</dd>
          </div>
          <div>
            <dt>P</dt>
            <dd>{Math.round(probability(competency.theta, 0) * 100)} %</dd>
          </div>
        </dl>
      )}
    </li>
  );
}

function formatDifficulty(difficulty: number) {
  return String(difficulty).replace("-", "−");
}

function VariantExplanation({ plan }: { plan: CasePlan | null }) {
  if (!plan) {
    return (
      <section className="variant-explanation">
        <h3>Variante del último caso</h3>
        <p>
          Todavía no has empezado un caso con variantes. Al empezar el de Elena verás aquí cuál
          elegimos y por qué.
        </p>
      </section>
    );
  }

  const theta = startingTheta(plan.learnerId);
  const learner = demoLearners.find(({ id }) => id === plan.learnerId)!;
  const options = elenaVariants.map((variant) => {
    const chance = chanceOf(theta, variant.difficulty);
    return { ...variant, chance, distance: Math.abs(chance - 75) };
  });
  const [standard, guided] = options;

  return (
    <section className="variant-explanation">
      <h3>Variante del último caso</h3>
      <p>
        Consulta por cansancio, parada 1. Probado como {learner.label}. Al empezar, θ era{" "}
        {formatTheta(theta)} en interpretación de resultados.
      </p>
      <ul className="variant-options">
        {options.map((option) => (
          <li className={option.id === plan.variantId ? "chosen" : ""} key={option.id}>
            <span>{option.name}</span>
            <span>d = {formatDifficulty(option.difficulty)}</span>
            <span>P = {option.chance} %</span>
            {option.id === plan.variantId && <span>Elegida</span>}
          </li>
        ))}
      </ul>
      <p>
        Por qué: buscamos P cerca del 75 %. La estándar queda a {standard.distance} puntos y la
        guiada, a {guided.distance}; por eso elegimos la {planVariant(plan).name.toLowerCase()}.
      </p>
    </section>
  );
}

function ProgressPage() {
  const [showCalculation, setShowCalculation] = useState(false);
  const answers = readElenaAnswers();
  const plan = readCasePlan();
  const competencies = competenciesAfterElena(answers, plan);
  const finished = isCaseFinished(answers);
  const completed = ["Lucía", "Marta", ...(finished ? ["Elena"] : [])];
  const current = finished ? recommendNextCase(competencies).candidate.mapName : "Elena";

  function resetDemo() {
    sessionStorage.clear();
    window.location.reload();
  }

  return (
    <div className="student-page">
      <LoggedTopbar current="progreso" />
      <main className="progress-main">
        <h1>Tu progreso</h1>
        <p className="progress-summary">
          Endocrinología: {completed.length} casos completados de 26.
        </p>
        <TerritoryMap territoryStops={buildTerritoryStops(completed, current)} />
        <section className="progress-card" id="competency-details">
          <h2>Competencias</h2>
          {showCalculation && (
            <p className="calculation-note">
              P es la probabilidad de acertar una pregunta de dificultad media (d = 0).{" "}
              <span>
                P = 0.25 + 0.75 · 1/(1 + e<sup>−(θ−d)</sup>)
              </span>
            </p>
          )}
          <ul className="progress-rows">
            {competencies.map((competency) => (
              <ProgressRow
                competency={competency}
                key={competency.id}
                showCalculation={showCalculation}
              />
            ))}
          </ul>
          {showCalculation && <VariantExplanation plan={plan} />}
        </section>
        <div className="progress-foot">
          <p>
            Mostramos un estado solo cuando hay al menos 2 respuestas. Así evitamos conclusiones con
            poca evidencia.
          </p>
          <div className="progress-foot-actions">
            <button
              aria-controls="competency-details"
              aria-expanded={showCalculation}
              className="calculation-toggle"
              onClick={() => setShowCalculation((shown) => !shown)}
              type="button"
            >
              {showCalculation ? "Ocultar el cálculo" : "Ver cómo calcula el sistema"}
            </button>
            <button className="demo-reset" onClick={resetDemo} type="button">
              Reiniciar demo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

const routeTitles: Record<string, string> = {
  "/inicio": "Inicio · OddysMedic",
  "/progreso": "Tu progreso · OddysMedic",
  "/caso/elena": "Consulta por cansancio · OddysMedic",
  "/caso/elena/jugar": "Caso en curso: Consulta por cansancio · OddysMedic",
  "/caso/elena/resultado": "Resultado: Consulta por cansancio · OddysMedic",
};

export default function App() {
  useEffect(() => {
    document.title = routeTitles[window.location.pathname] ?? "OddysMedic";
  }, []);

  if (window.location.pathname === "/inicio") {
    return <StudentHome />;
  }

  if (window.location.pathname === "/progreso") {
    return <ProgressPage />;
  }

  if (window.location.pathname === "/caso/elena") {
    return <ElenaCaseIntro />;
  }

  if (window.location.pathname === "/caso/elena/jugar") {
    const plan = readCasePlan();
    return plan ? <ElenaCasePlay plan={plan} /> : <Redirect to="/caso/elena" />;
  }

  if (window.location.pathname === "/caso/elena/resultado") {
    return isCaseFinished(readElenaAnswers()) ? <ElenaCaseResult /> : <Redirect to="/caso/elena" />;
  }

  return (
    <main>
      <header className="topbar">
        <div className="nav-content">
          <a href="/" aria-label="Ir al inicio">
            <CompassLogo />
          </a>
          <nav aria-label="Navegación principal">
            <a href="#casos">Casos</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <div className="nav-actions">
            <ButtonLink secondary>Ingresar</ButtonLink>
            <ButtonLink>Crear cuenta</ButtonLink>
          </div>
        </div>
      </header>

      <section className="hero" id="como-funciona">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1>Decide como en la consulta, caso a caso</h1>
            <p>
              Cada caso avanza por paradas: diagnóstico, tratamiento y seguimiento. El sistema
              aprende de tus respuestas y elige tu siguiente caso.
            </p>
            <ButtonLink>Empezar mi primer caso</ButtonLink>
          </div>

          <div className="case-map" aria-label="Vista previa de un caso clínico" role="group">
            <div className="map-grid" />
            <CompassRose />
            <HeroRoute />
            <Portrait patient="Elena" className="hero-portrait" />
            <div className="case-card treatment-card">
              <span className="small-label">Ahora: tratamiento</span>
              <strong>Elena, 68 años, con cansancio persistente</strong>
              <span className="card-meta">Parada 2 de 3</span>
            </div>
          </div>
        </div>
      </section>

      <section className="specialties" id="casos">
        <div className="section-inner">
          <h2>Elige por dónde empezar</h2>
          <div className="specialty-grid">
            <SpecialtyCard title="Endocrinología" description="26 casos" patient="Elena" active />
            <SpecialtyCard title="Cardiología" description="Muy pronto" patient="Cardiología" />
            <SpecialtyCard title="Neurología" description="Muy pronto" patient="Neurología" />
            <SpecialtyCard title="Emergencias" description="Muy pronto" patient="Emergencias" />
          </div>
        </div>
      </section>
    </main>
  );
}
