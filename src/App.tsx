import {
  Fragment,
  useEffect,
  useId,
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
import {
  caseSeconds,
  competencyPoints,
  formatDuration,
  formatRelativeDay,
  startingLevel,
  seededDecisions,
  seededSystemDecisions,
  summarizeCase,
  summarizeDecisions,
  type Decision,
  type SystemDecision,
} from "./history";
import { Isla, MapaMundos, MapaTerritorios } from "./MapaMundos";
import {
  MUNDO_ACTUAL,
  RUTA_ENDOCRINOLOGIA,
  RUTA_MEDICINA_INTERNA,
  RUTA_MUNDOS,
  TERRITORIO_ACTUAL,
} from "./data/mundos";
import { ConfidenceChart, LevelChart, OutcomeDonut, StatRing, TimeBars } from "./charts";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  ChevronIcon,
  ClockIcon,
  CompassIcon,
  CompassMark,
  CheckIcon,
  CompetencyIcon,
  EyeIcon,
  FlaskIcon,
  heartbeatPath,
  InfoIcon,
  RouteIcon,
  TrendIcon,
} from "./icons";
import { hasPortrait, portraitSrc, portraitTone, type PortraitName } from "./portraits";
import {
  manySystemDecisions,
  progressFixture,
  worstCaseLongName,
  worstCasePatient,
  worstCaseStop,
  worstCompetencyName,
} from "./worstCase";

// Solo en desarrollo y solo si la URL lo pide: una demo normal no ve ni el selector ni estos datos.
const devDataParam = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("data")
  : null;
const useWorstCase = devDataParam === "worst";
const devProgress = import.meta.env.DEV ? progressFixture(devDataParam) : null;
const baseDecisions = devProgress ?? seededDecisions;

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
      <a className={devDataParam === "empty" ? "active" : ""} href="?data=empty">
        0
      </a>
      <a className={devDataParam === "one" ? "active" : ""} href="?data=one">
        1
      </a>
      <a className={devDataParam === "many" ? "active" : ""} href="?data=many">
        Muchas
      </a>
    </div>
  );
}

type StopState = "done" | "current" | "pending";

function CompassLogo() {
  return (
    <div className="brand-lockup">
      <CompassMark />
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

// La onda de ECG (heartbeatPath) se dibuja una vez al montarse.

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

function resetDemo() {
  sessionStorage.clear();
  window.location.reload();
}

// Menú desplegable, no un role="menu": sus enlaces y botones se recorren con Tab y Escape lo cierra.
function AccountMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: { key: string }) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="account"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
      ref={wrapRef}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={compact ? "Bruno, 5.º año" : undefined}
        className="account-trigger"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Portrait patient="Bruno" />
        {!compact && (
          <span className="account-name">
            <strong>Bruno</strong>
            <small>5.º año</small>
          </span>
        )}
        <svg aria-hidden="true" className="account-chevron" fill="none" viewBox="0 0 12 12">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
      </button>
      <div className={`account-menu ${open ? "open" : ""}`} id={menuId}>
        <a href="/progreso">Mi progreso</a>
        <button onClick={resetDemo} type="button">
          Reiniciar demo
        </button>
        <a href="/">Salir</a>
      </div>
    </div>
  );
}

// En las pantallas de un caso no hay pestaña activa: «Explorar» solo lo está en /explorar.
function LoggedTopbar({ current }: { current?: "inicio" | "explorar" | "progreso" }) {
  const links = [
    { id: "inicio", label: "Inicio", href: "/inicio" },
    { id: "explorar", label: "Explorar", href: "/explorar" },
    { id: "progreso", label: "Mi progreso", href: "/progreso" },
  ];
  return (
    <header className="topbar logged-topbar">
      <div className="nav-content">
        <a href="/inicio" aria-label="Ir al inicio">
          <CompassLogo />
        </a>
        <nav aria-label="Navegación principal" className="logged-nav">
          {links.map((link) => (
            <a
              aria-current={current === link.id ? "page" : undefined}
              className={current === link.id ? "active" : ""}
              href={link.href}
              key={link.id}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <a className="territory-chip" href={RUTA_ENDOCRINOLOGIA}>
            <span aria-hidden="true" />
            Endocrinología
          </a>
          <AccountMenu />
        </div>
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

function answersLabel(count: number) {
  return `${count} ${count === 1 ? "respuesta" : "respuestas"}`;
}

// El % es σ(θ); sin al menos 2 respuestas no lo mostramos, igual que el estado.
function Competency({ competency }: { competency: CompetencyState }) {
  const { hasEvidence, progress } = describeCompetency(competency);
  return (
    <div className="competency-row">
      <div className="competency-head">
        <p>{competency.name}</p>
        <strong className="competency-percent">
          {hasEvidence ? `${Math.round(progress * 100)} %` : "—"}
        </strong>
      </div>
      <CompetencyTrack competency={competency} />
      <div className="competency-foot">
        <CompetencyStatus competency={competency} />
        <span>{answersLabel(competency.n)}</span>
      </div>
    </div>
  );
}

type RecentCaseData = {
  title: string;
  patient: string;
  portrait: PortraitName;
  decisions: Decision[];
  href: string;
  linkLabel: string;
};

// Lucía y Marta son historial de ejemplo; su detalle vive en «Mi progreso».
const exampleCases: Array<Omit<RecentCaseData, "decisions"> & { caseName: string }> = [
  {
    caseName: "Lucía",
    title: "Malestar tras una gastroenteritis",
    patient: useWorstCase ? `${worstCaseLongName}, 24 años` : "Lucía, 24 años",
    portrait: "Lucía",
    href: "/progreso",
    linkLabel: "Ver en mi progreso",
  },
  {
    caseName: "Marta",
    title: "Palpitaciones y pérdida de peso",
    patient: "Marta, 35 años",
    portrait: "Marta",
    href: "/progreso",
    linkLabel: "Ver en mi progreso",
  },
];

function RecentCase({ title, patient, portrait, decisions, href, linkLabel }: RecentCaseData) {
  if (decisions.length === 0) return null;
  const summary = summarizeCase(decisions, decisions[0]?.caseName ?? "");
  const total = decisions.length;
  const names = summary.competencies.map(
    (id) => seedCompetencies.find((competency) => competency.id === id)?.name ?? id,
  );
  return (
    <article className="recent-case">
      <Portrait patient={portrait} />
      <div className="recent-body">
        <h3>{title}</h3>
        <p className="recent-meta">
          {patient} ·{" "}
          <time dateTime={new Date(summary.at).toISOString()}>{formatRelativeDay(summary.at)}</time>
        </p>
        <ul aria-label="Competencias trabajadas" className="recent-chips">
          {names.map((name) => (
            <li key={name} title={name}>
              {name}
            </li>
          ))}
        </ul>
      </div>
      <div className="recent-result">
        <div
          className="recent-score"
          role="img"
          aria-label={`${summary.correct} de ${total} aciertos`}
        >
          <strong aria-hidden="true">
            {summary.correct}
            <span>/{total}</span>
          </strong>
          <small aria-hidden="true">aciertos</small>
        </div>
        <div className="recent-route" aria-hidden="true">
          {decisions.map((mark, index) => (
            <span className={`recent-mark ${stopMarkState(mark)}`} key={index}>
              <StopMark answer={mark} />
            </span>
          ))}
        </div>
        <span className="recent-time">
          <ClockIcon />
          {formatDuration(summary.seconds)}
        </span>
        <a className="recent-link" href={href}>
          {linkLabel}
          <ArrowRightIcon />
        </a>
      </div>
    </article>
  );
}

// Una ruta de niveles («Medicina Interna › Endocrinología»): lista con el separador dibujado en
// CSS, así el texto accesible no lleva comas ni «›» sueltos y no hay que armar cadenas a mano.
function RutaNiveles({ niveles }: { niveles: string[] }) {
  return (
    <ol className="ruta-niveles">
      {niveles.map((nivel) => (
        <li key={nivel}>{nivel}</li>
      ))}
    </ol>
  );
}

// Dónde vas en el territorio actual: una misión por punto, en el orden del catálogo.
function TuRecorrido({ history }: { history: Decision[] }) {
  const total = missionCatalog.length;
  const completadas = missionCatalog.filter(({ key }) =>
    history.some(({ caseName }) => caseName === key),
  ).length;
  // Los puntos cuentan avance, no posición en el catálogo: primero las completadas, luego la actual.
  const estado = (index: number) =>
    index < completadas ? "hecha" : index === completadas ? "actual" : "pendiente";
  const etiquetas = { hecha: "completada", actual: "actual", pendiente: "pendiente" };
  const nombres = missionCatalog.map(
    (_, index) => `Misión ${index + 1} de ${total}: ${etiquetas[estado(index)]}`,
  );
  return (
    <section aria-labelledby="recorrido-titulo" className="recorrido card">
      <div className="recorrido-cabecera">
        <span aria-hidden="true" className="recorrido-isla">
          <Isla estado={TERRITORIO_ACTUAL.estado} icono={TERRITORIO_ACTUAL.icono} />
        </span>
        <div>
          <h2 id="recorrido-titulo">Tu recorrido</h2>
          <RutaNiveles niveles={[MUNDO_ACTUAL.nombre, TERRITORIO_ACTUAL.nombre]} />
        </div>
      </div>
      <ol aria-label="Misiones del territorio" className="recorrido-puntos">
        {nombres.map((nombre, index) => (
          <li className={`recorrido-punto ${estado(index)}`} key={index}>
            <span className="sr-only">{nombre}</span>
          </li>
        ))}
      </ol>
      <p className="recorrido-avance">
        {completadas} de {total} {total === 1 ? "misión" : "misiones"}
      </p>
      <div className="progress-link-wrap">
        <a className="progress-link" href={RUTA_MEDICINA_INTERNA}>
          Ver mapa
          <ArrowRightIcon />
        </a>
      </div>
    </section>
  );
}

function StudentHome() {
  const answers = readElenaAnswers();
  const plan = readCasePlan();
  const competencies = competenciesAfterElena(answers, plan);
  const history = buildDecisionHistory(answers, plan);
  const finished = isCaseFinished(answers);
  // Del más reciente al más antiguo, según cuándo se respondió su última decisión.
  const recentCases = [
    ...(finished
      ? [
          {
            key: "Elena",
            decisions: history.filter(({ caseName }) => caseName === "Elena"),
            href: "/caso/elena/resultado",
            linkLabel: "Ver resultado",
            patient: "Elena, 68 años",
            portrait: "Elena" as PortraitName,
            title: "Consulta por cansancio",
          },
        ]
      : []),
    ...exampleCases.map(({ caseName, ...recentCase }) => ({
      key: caseName,
      decisions: history.filter((decision) => decision.caseName === caseName),
      ...recentCase,
    })),
  ].sort((a, b) => summarizeCase(b.decisions, b.key).at - summarizeCase(a.decisions, a.key).at);
  const homeCompetencies = competencies.filter(({ id }) =>
    elenaStops.some((stop) => stop.competencyId === id),
  );
  const recommended = finished ? recommendNextCase(competencies).candidate : null;

  return (
    <div className="student-page">
      <LoggedTopbar current="inicio" />
      <main className="student-main">
        <div className="home-greeting">
          <h1>Hola, Bruno</h1>
          <p>Sigue donde lo dejaste.</p>
        </div>
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
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.7" />
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
        <div className="student-side">
          <aside className="competencies-card card">
            <h2>Tus competencias</h2>
            {homeCompetencies.map((competency) => (
              <Competency competency={competency} key={competency.id} />
            ))}
            <div className="progress-link-wrap">
              <a className="progress-link" href="/progreso">
                Ver todo mi progreso
                <ArrowRightIcon />
              </a>
            </div>
          </aside>
          <TuRecorrido history={history} />
        </div>
        <section className="recent-cases">
          <h2>Casos recientes</h2>
          <div className="recent-case-list">
            {recentCases.map(({ key, ...recentCase }) => (
              <RecentCase key={key} {...recentCase} />
            ))}
          </div>
        </section>
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
            <ul className="case-meta">
              <li>
                <ClockIcon />
                Unos 6 minutos
              </li>
              <li>
                <RouteIcon />
                {elenaStops.length} paradas
              </li>
            </ul>
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
            <ul className="practice-chips">
              {startingCompetencies(learnerId)
                .filter(({ id }) => elenaStops.some((stop) => stop.competencyId === id))
                .map((competency) => (
                  <li key={competency.id}>
                    <CompetencyIcon id={competency.id} />
                    <span title={competency.name}>{competency.name}</span>
                    <CompetencyStatus competency={competency} />
                  </li>
                ))}
            </ul>
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

type CaseOption = { text: string; explanation: string; correct?: boolean; errorTitle?: string };

const errorStage = "Confunde estado subclínico y manifiesto";
const errorOrigin = "Confunde origen primario y central";
const errorHormone = "Confunde sustitución y bloqueo hormonal";
const errorFollowUp = "Confunde etiología y seguimiento";

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
      {
        text: "Hipotiroidismo subclínico",
        explanation: "No concuerda con T4 libre baja.",
        errorTitle: errorStage,
      },
      {
        text: "Hipotiroidismo central",
        explanation: "TSH marcadamente alta favorece falla primaria.",
        errorTitle: errorOrigin,
      },
      {
        text: "Hipertiroidismo primario",
        explanation: "El patrón hormonal es opuesto.",
        errorTitle: errorStage,
      },
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
        errorTitle: errorHormone,
      },
      {
        text: "Propranolol como único tratamiento",
        explanation: "No repone la hormona que falta.",
        errorTitle: errorHormone,
      },
      {
        text: "Liotironina de rutina como primera elección",
        explanation: "No es la opción rutinaria de primera línea.",
        errorTitle: errorHormone,
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
      {
        text: "Anticuerpos antiperoxidasa seriados",
        explanation: "No ajustan el reemplazo.",
        errorTitle: errorFollowUp,
      },
      {
        text: "Ecografía tiroidea seriada",
        explanation: "No mide la respuesta bioquímica.",
        errorTitle: errorFollowUp,
      },
      {
        text: "T3 total como única prueba",
        explanation: "No es la prueba principal de control.",
        errorTitle: errorFollowUp,
      },
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
  const base = devProgress
    ? seedCompetencies.map((competency) => {
        const own = devProgress.filter(({ competencyId }) => competencyId === competency.id);
        return { ...competency, n: own.length, theta: own[own.length - 1]?.thetaAfter ?? 0 };
      })
    : seedCompetencies;
  return base.map((competency) => {
    const named =
      useWorstCase && competency.id === "interpretacion"
        ? { ...competency, name: worstCompetencyName }
        : competency;
    return named.id === "interpretacion" && theta !== undefined ? { ...named, theta } : named;
  });
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

// Unos 6 minutos entre tres paradas, como dice la ficha del caso.
const estimatedSecondsPerDecision = 120;
const casesInTerritory = 26;

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
        <div className="focus-actions">
          <a href="/inicio">Salir</a>
          <AccountMenu compact />
        </div>
      </div>
    </header>
  );
}

const timerHiddenKey = "elena-timer-hidden";

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

// Tiempo transcurrido de la misión, nunca una cuenta atrás. Se puede ocultar y la preferencia se recuerda.
function PlayTimer({ running }: { running: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(timerHiddenKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    if (!running) return;
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [running, startedAt]);

  function toggle() {
    setHidden((current) => {
      try {
        sessionStorage.setItem(timerHiddenKey, current ? "0" : "1");
      } catch {
        // Sin almacenamiento, la preferencia vale solo para esta pantalla.
      }
      return !current;
    });
  }

  return (
    <div className="play-timer">
      {!hidden && (
        <span
          aria-label={`Llevas ${formatDuration(elapsed)} de unos 6 minutos`}
          aria-live="off"
          role="timer"
        >
          <ClockIcon />
          <b>{clock(elapsed)}</b>
          <small>de ~6 min</small>
        </span>
      )}
      <button
        aria-label={hidden ? "Mostrar el tiempo" : "Ocultar el tiempo"}
        aria-pressed={hidden}
        onClick={toggle}
        title={hidden ? "Mostrar el tiempo" : "Ocultar el tiempo"}
        type="button"
      >
        <EyeIcon hidden={hidden} />
      </button>
    </div>
  );
}

function PlayRoute({
  stop,
  answers,
  timer,
}: {
  stop: number;
  answers: Array<StopAnswer | undefined>;
  timer: ReactNode;
}) {
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
      <div className="play-meta">
        <strong className="stop-count">Parada {stop + 1} de 3</strong>
        {timer}
      </div>
    </div>
  );
}

function KnowledgeRow({
  label,
  value,
  learned = false,
}: {
  label: string;
  value: string;
  learned?: boolean;
}) {
  return (
    <div
      className={`knowledge-row ${learned ? "learned-row" : ""} ${value.length > 30 ? "stacked" : ""}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Laboratorio: solo el dato crudo y su referencia. Decir si está alto o bajo es trabajo del alumno.
function LabRow({ name, value, reference }: { name: string; value: string; reference: string }) {
  return (
    <div className="lab-row">
      <span className="lab-name">{name}</span>
      <strong className="lab-value">{value}</strong>
      <span className="lab-reference">Referencia: {reference}</span>
    </div>
  );
}

function ElenaKnowledge({ stop, variantId }: { stop: number; variantId: VariantId }) {
  const [tab, setTab] = useState("Historia");
  const [labSeen, setLabSeen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
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
    // Nombre, valor con unidad y referencia del banco de casos (EVENTOS_CLINICOS).
    Laboratorio: [
      ["TSH", "24 mUI/L", "0.4–4 mUI/L"],
      ["T4 libre", "0.5 ng/dL", "0.8–1.8 ng/dL"],
      ...(guided ? [["Hemoglobina", "13 g/dL", "12–16 g/dL"]] : []),
    ],
  };
  const tabNames = Object.keys(details);
  const activeIndex = tabNames.indexOf(tab);

  function selectTab(name: string) {
    setTab(name);
    if (name === "Laboratorio") setLabSeen(true);
  }

  // El enlace del relato desaparece al cambiar de pestaña: el foco pasa a la pestaña de destino.
  function openLaboratory() {
    selectTab("Laboratorio");
    tabsRef.current?.querySelector<HTMLButtonElement>("#knowledge-tab-lab")?.focus();
  }

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
    selectTab(tabNames[target]);
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
    <aside className="knowledge-panel card">
      <h2>Lo que sabes de Elena</h2>
      <div
        aria-label="Información del caso"
        className="knowledge-tabs"
        ref={tabsRef}
        role="tablist"
      >
        {tabNames.map((name, index) => (
          <button
            aria-controls={tab === name ? "knowledge-tabpanel" : undefined}
            aria-selected={tab === name}
            className={tab === name ? "active" : ""}
            id={name === "Laboratorio" ? "knowledge-tab-lab" : `knowledge-tab-${index}`}
            key={name}
            onClick={() => selectTab(name)}
            onKeyDown={(event) => moveWithKeyboard(event, index)}
            role="tab"
            tabIndex={tab === name ? 0 : -1}
            type="button"
          >
            {name}
            {name === "Laboratorio" && !labSeen && (
              <>
                <span aria-hidden="true" className="lab-dot" />
                <span className="sr-only">, con resultados nuevos</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={
          activeIndex === tabNames.indexOf("Laboratorio")
            ? "knowledge-tab-lab"
            : `knowledge-tab-${activeIndex}`
        }
        className="knowledge-rows"
        id="knowledge-tabpanel"
        role="tabpanel"
        tabIndex={0}
      >
        {details[tab].map(([label, value, reference]) =>
          tab === "Laboratorio" ? (
            <LabRow key={label} name={label} reference={reference} value={value} />
          ) : (
            <KnowledgeRow key={label} label={label} value={value} />
          ),
        )}
        {growingDetails.map(([label, value]) => (
          <KnowledgeRow key={label} label={label} learned value={value} />
        ))}
        {tab === "Historia" && (
          <p className="lab-hint">
            Hay resultados de laboratorio para esta parada
            <button onClick={openLaboratory} type="button">
              Ver laboratorio
              <ArrowRightIcon />
            </button>
          </p>
        )}
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
  const [answers, setAnswers] = useState<Array<SavedAnswer | undefined>>([]);
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
        at: Date.now(),
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
        <PlayRoute
          answers={answers}
          stop={stop}
          timer={<PlayTimer running={!(answered && stop === elenaStops.length - 1)} />}
        />
        <div className="play-grid">
          <section className="question-area card" onKeyDown={handleShortcuts}>
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
                <RememberCard className="reveal" collapsible reminder={data.reminder} />
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
          <ElenaKnowledge key={stop} stop={stop} variantId={plan.variantId} />
        </div>
        <DevDataToggle />
      </main>
    </div>
  );
}

type SavedAnswer = {
  correct: boolean;
  answer: string;
  confidence: string;
  time: number;
  /** Momento de la respuesta; las sesiones antiguas no lo tienen. */
  at?: number;
};

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
      return competencies.map((competency) =>
        competency.id === stop.competencyId
          ? applyAnswer(competency, answer.correct, stopDifficulty(index, plan))
          : competency,
      );
    },
    startingCompetencies(plan?.learnerId ?? "bruno"),
  );
}

function stopDifficulty(index: number, plan: CasePlan | null) {
  return index === 0 && plan ? planVariant(plan).difficulty : elenaStops[index].difficulty;
}

// El θ tras cada intento sale de la misma réplica del motor; así no puede contarse dos veces.
function buildDecisionHistory(answers: SavedAnswer[], plan: CasePlan | null): Decision[] {
  let competencies = startingCompetencies(plan?.learnerId ?? "bruno");
  const startTheta = competencies.find(({ id }) => id === "interpretacion")!.theta;
  const lastInterpretation = baseDecisions
    .map(({ competencyId }) => competencyId)
    .lastIndexOf("interpretacion");
  const base = baseDecisions.map((decision, index) =>
    index === lastInterpretation ? { ...decision, thetaAfter: startTheta } : decision,
  );
  const played = answers.flatMap((answer, index) => {
    const stop = elenaStops[index];
    if (!answer || !stop) return [];
    competencies = competencies.map((competency) =>
      competency.id === stop.competencyId
        ? applyAnswer(competency, answer.correct, stopDifficulty(index, plan))
        : competency,
    );
    const option = stop.options.find(({ text }) => text === answer.answer) as
      | CaseOption
      | undefined;
    return [
      {
        caseName: "Elena",
        stop: index + 1,
        at: answer.at ?? Date.now(),
        competencyId: stop.competencyId,
        correct: answer.correct,
        answer: answer.answer,
        confidence: answer.confidence,
        seconds: answer.time,
        thetaAfter: competencies.find(({ id }) => id === stop.competencyId)!.theta,
        errorTitle: answer.correct ? undefined : option?.errorTitle,
      },
    ];
  });
  return [...base, ...played];
}

function buildSystemDecisions(
  plan: CasePlan | null,
  competencies: CompetencyState[],
  finished: boolean,
): SystemDecision[] {
  if (import.meta.env.DEV && devDataParam === "many") return manySystemDecisions();
  if (devProgress) return [];
  const log = [...seededSystemDecisions];
  if (plan) {
    const variant = planVariant(plan);
    log.push({
      kind: "Variante",
      choice: `Elena, parada 1: versión ${variant.name.toLowerCase()}`,
      reason: "deja tu probabilidad de acierto más cerca del 75 %",
      chance: chanceOf(startingTheta(plan.learnerId), variant.difficulty),
    });
  }
  if (finished) {
    const { candidate, competency, chance } = recommendNextCase(competencies);
    const status = describeCompetency(competency).label.toLowerCase();
    log.push({
      kind: "Siguiente caso",
      choice: candidate.mapName,
      reason: `${competency.name.toLowerCase()} está en ${status}`,
      chance: Math.round(chance * 100),
    });
  }
  return log;
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

// Antes → después en una competencia, en columnas fijas que se alinean entre filas.
// Sin 2 respuestas no hay nivel que comparar: el texto ocupa de «antes» a «delta».
function LevelChange({ before, after }: { before: CompetencyState; after: CompetencyState }) {
  const beforeInfo = describeCompetency(before);
  const afterInfo = describeCompetency(after);
  const beforePercent = percentOf(before);
  const afterPercent = percentOf(after);
  const diff = afterPercent - beforePercent;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  return (
    <li className="level-change">
      <CompetencyIcon id={after.id} />
      <p className="level-change-name">{after.name}</p>
      {afterInfo.hasEvidence ? (
        <>
          <span className="before">
            {beforeInfo.hasEvidence ? `${beforePercent} %` : "—"}
            <span className="sr-only">Antes</span>
          </span>
          <ArrowRightIcon />
          <strong className="after">
            {afterPercent} %<span className="sr-only">Después</span>
          </strong>
          {beforeInfo.hasEvidence ? (
            <span className={`diff ${diff > 0 ? "up" : diff < 0 ? "down" : "same"}`}>
              {diff === 0
                ? "sin cambio"
                : `${sign}${Math.abs(diff)} ${Math.abs(diff) === 1 ? "punto" : "puntos"}`}
            </span>
          ) : (
            <span />
          )}
        </>
      ) : (
        <p className="level-change-pending">
          Aún sin evidencia suficiente: {after.n} de 2 respuestas
        </p>
      )}
      <CompetencyStatus competency={after} />
    </li>
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
  const plan = readCasePlan();
  const competencies = competenciesAfterElena(answers, plan);
  const before = startingCompetencies(plan?.learnerId ?? "bruno");
  const correctCount = answers.filter((answer) => answer?.correct).length;
  const noIdeaCount = answers.filter((answer) => answer?.answer === "No sé").length;
  const wrongCount = answers.length - correctCount - noIdeaCount;
  // El tiempo sale del mismo historial que ven /inicio y /progreso: el total es la suma de las paradas.
  const history = buildDecisionHistory(answers, plan);
  const stopSeconds = history
    .filter(({ caseName }) => caseName === "Elena")
    .map(({ seconds }) => seconds);
  const totalSeconds = caseSeconds(history, "Elena");
  const estimateSeconds = elenaStops.length * estimatedSecondsPerDecision;
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
          <div className="result-stack">
            <div className="result-overview">
              <section className="result-outcome card">
                <h2>Cómo te fue</h2>
                <OutcomeDonut correct={correctCount} noIdea={noIdeaCount} wrong={wrongCount} />
              </section>
              <section className="result-time card">
                <h2>Tiempo</h2>
                <p className="time-total">
                  <strong>{formatDuration(totalSeconds)}</strong>
                  <span>frente a unos {formatDuration(estimateSeconds)} estimados</span>
                </p>
                <TimeBars
                  estimate={estimatedSecondsPerDecision}
                  estimateText={`~${formatDuration(estimatedSecondsPerDecision)} estimados`}
                  items={elenaStops.map((item, index) => ({
                    label: item.title,
                    seconds: stopSeconds[index] ?? 0,
                    text: formatDuration(stopSeconds[index] ?? 0),
                  }))}
                />
              </section>
            </div>
            <section className="result-competencies card">
              <h2>Tus competencias</h2>
              <ul className="level-change-list">
                {elenaStops.map((stop) => (
                  <LevelChange
                    after={competencies.find(({ id }) => id === stop.competencyId)!}
                    before={before.find(({ id }) => id === stop.competencyId)!}
                    key={stop.competencyId}
                  />
                ))}
              </ul>
            </section>
            <section className="stops-summary-card card">
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
                    <time dateTime={`PT${stopSeconds[index] ?? 0}S`}>
                      {formatDuration(stopSeconds[index] ?? 0)}
                    </time>
                  </div>
                );
              })}
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

function wavePath(stops: Array<{ x: number; y: number }>) {
  return stops
    .map((stop, index) => {
      if (index === 0) return `M${stop.x} ${stop.y}`;
      const previous = stops[index - 1];
      const middle = (previous.x + stop.x) / 2;
      return `C${middle} ${previous.y} ${middle} ${stop.y} ${stop.x} ${stop.y}`;
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
      <svg
        aria-hidden="true"
        className="territory-contours"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 1200 360"
      >
        <path d="M-20 300C160 250 260 330 420 290S700 210 860 270 1100 300 1240 240" />
        <path d="M-20 250C150 205 270 280 430 240S690 160 850 222 1100 250 1240 190" />
        <path d="M-20 200C150 160 280 230 440 190S700 112 860 172 1110 200 1240 140" />
        <path d="M-20 150C170 110 290 180 450 140S710 66 870 122 1110 150 1240 92" />
        <path d="M-20 100C180 60 300 130 460 92S720 22 880 74 1120 100 1240 46" />
      </svg>
      <CompassRose />
      <svg
        className="territory-route"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path d={wavePath(territoryStops.slice(currentIndex))} className="route-pending" />
        <path d={wavePath(territoryStops.slice(0, currentIndex + 1))} className="route-travelled" />
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
              {stop.state === "current" && <span className="territory-next">Siguiente: </span>}
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

function percentOf(competency: CompetencyState) {
  return Math.round(describeCompetency(competency).progress * 100);
}

function ProgressRow({
  competency,
  points,
  showCalculation,
}: {
  competency: CompetencyState;
  points: ReturnType<typeof competencyPoints>;
  showCalculation: boolean;
}) {
  const { hasEvidence, progress } = describeCompetency(competency);
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const change = last && previous ? last.level - previous.level : null;
  const direction = change === null ? null : change > 0 ? "up" : change < 0 ? "down" : "flat";
  const changeText =
    change === null
      ? "Aún sin comparación"
      : change === 0
        ? "Igual que la respuesta anterior"
        : `${change > 0 ? "Sube" : "Baja"} ${Math.abs(change)} ${Math.abs(change) === 1 ? "punto" : "puntos"} respecto a la respuesta anterior`;
  return (
    <>
      <tr className="progress-row" role="row">
        <th className="progress-row-name" role="rowheader" scope="row">
          {competency.name}
        </th>
        <td className="progress-row-level" role="cell">
          <span className="ring-small">
            <StatRing segments={hasEvidence ? [{ fraction: progress, color: "#43d6be" }] : []}>
              <strong>{hasEvidence ? percentOf(competency) : "—"}</strong>
            </StatRing>
          </span>
          <span className="sr-only">{hasEvidence ? `${percentOf(competency)} %` : "Sin dato"}</span>
        </td>
        <td className="progress-row-status" role="cell">
          <CompetencyStatus competency={competency} />
        </td>
        <td className="progress-row-count" role="cell">
          {answersLabel(competency.n)}
        </td>
        <td className="progress-row-trend" role="cell">
          {direction ? (
            <span className={`trend ${direction}`}>
              <TrendIcon direction={direction} />
              <span className="sr-only">{changeText}</span>
              <span aria-hidden="true">
                {change === 0 ? "Igual" : `${change! > 0 ? "+" : "−"}${Math.abs(change!)}`}
              </span>
            </span>
          ) : (
            <span className="trend none">
              <span aria-hidden="true">—</span>
              <span className="sr-only">{changeText}</span>
            </span>
          )}
        </td>
      </tr>
      {showCalculation && (
        <tr className="calculation-tr" role="row">
          <td colSpan={5} role="cell">
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
          </td>
        </tr>
      )}
    </>
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

/** Mueve el recordatorio abierto o cerrado sin saltos: la altura sigue al contenido. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`collapse ${open ? "open" : ""}`} inert={!open}>
      <div>{children}</div>
    </div>
  );
}

const reminderSource = "Fuente: NICE NG145. Contenido sin validación médica.";

/** Lo que conviene recordar tras un error del banco, o undefined si el ejemplo no lo tiene. */
function reminderFor(errorTitle: string) {
  return elenaStops.find((stop) =>
    (stop.options as CaseOption[]).some((option) => option.errorTitle === errorTitle),
  )?.reminder;
}

// «Para recordar» es narrativa clínica: el texto va en la voz de la historia y la fuente al pie.
function RememberCard({
  reminder,
  collapsible = false,
  className = "",
}: {
  reminder: string;
  collapsible?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const content = (
    <>
      <div className="remember-body">
        <p>{reminder}</p>
      </div>
      <span className="remember-source">{reminderSource}</span>
    </>
  );
  return (
    <div className={`remember-card ${className}`}>
      {collapsible ? (
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className="remember-head"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <BookmarkIcon />
          <strong>Para recordar</strong>
          <ChevronIcon />
        </button>
      ) : (
        <div className="remember-head">
          <BookmarkIcon />
          <strong>Para recordar</strong>
        </div>
      )}
      {collapsible ? (
        <div id={panelId}>
          <Collapse open={open}>{content}</Collapse>
        </div>
      ) : (
        content
      )}
    </div>
  );
}

function ErrorCard({ title, count, cases }: { title: string; count: number; cases: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reminder = reminderFor(title);
  return (
    <li className={`error-card ${count > 1 ? "repeated" : "once"}`}>
      <div className="error-card-top">
        <h3>{title}</h3>
        <span className="error-count">
          <span aria-hidden="true">×{count}</span>
          <span className="sr-only">{count === 1 ? "una vez" : `${count} veces`}</span>
        </span>
      </div>
      {count === 1 && (
        <p className="error-note">Visto una vez. Lo confirmaremos si se repite en otro caso.</p>
      )}
      <div className="error-cases">
        <span>Apareció en</span>
        <ul>
          {cases.map((name) => (
            <li key={name}>
              {hasPortrait(name) ? (
                <Portrait patient={name} />
              ) : (
                <span aria-hidden="true" className="initial">
                  {name[0]}
                </span>
              )}
              {name}
            </li>
          ))}
        </ul>
      </div>
      {reminder && (
        <>
          <button
            aria-controls={`${id}-panel`}
            aria-expanded={open}
            className="review-button"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            Repasar
            <ChevronIcon />
          </button>
          <div id={`${id}-panel`}>
            <Collapse open={open}>
              <RememberCard reminder={reminder} />
            </Collapse>
          </div>
        </>
      )}
    </li>
  );
}

function LevelEvolution({
  competencies,
  decisions,
}: {
  competencies: CompetencyState[];
  decisions: Decision[];
}) {
  const withTrail = competencies.filter((competency) => competency.n >= 2);
  const [chosenId, setChosenId] = useState<CompetencyId | null>(null);
  // El trazo se dibuja al llegar; al explorar otras competencias aparece ya hecho.
  const [explored, setExplored] = useState(false);
  const labelId = useId();
  if (withTrail.length === 0) {
    return (
      <p className="metric-empty">Aparecerá cuando una competencia tenga al menos 2 respuestas.</p>
    );
  }
  const selected = withTrail.find(({ id }) => id === chosenId) ?? withTrail[0];
  const points = competencyPoints(decisions, selected.id);
  const ids = withTrail.map(({ id }) => id);
  return (
    <>
      <div className="level-toolbar">
        <span id={labelId}>Competencia</span>
        <div aria-labelledby={labelId} className="level-selector" role="radiogroup">
          {withTrail.map((competency, index) => (
            <button
              aria-checked={competency.id === selected.id}
              className={competency.id === selected.id ? "active" : ""}
              key={competency.id}
              onClick={() => {
                setExplored(true);
                setChosenId(competency.id);
              }}
              onKeyDown={(event) =>
                moveWithinRadioGroup(event, index, ids, (id) => {
                  setExplored(true);
                  setChosenId(id as CompetencyId);
                })
              }
              role="radio"
              tabIndex={competency.id === selected.id ? 0 : -1}
              type="button"
            >
              <CompetencyIcon id={competency.id} />
              <span>{competency.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="level-now">
        <CompetencyStatus competency={selected} />
        <span>
          Nivel actual: <strong>{percentOf(selected)} %</strong> · {answersLabel(selected.n)}
        </span>
      </div>
      <LevelChart
        animate={!explored}
        key={selected.id}
        name={selected.name}
        points={points}
        startLevel={startingLevel}
      />
    </>
  );
}

function ProgressMetrics({
  decisions,
  completedCount,
  competencies,
  systemDecisions,
}: {
  decisions: Decision[];
  completedCount: number;
  competencies: CompetencyState[];
  systemDecisions: SystemDecision[];
}) {
  const summary = summarizeDecisions(decisions);
  const enough = summary.total >= 2;
  const times = (count: number) => `${count} ${count === 1 ? "vez" : "veces"}`;
  const visibleLog = systemDecisions.slice(-10);
  const average = Math.round(summary.seconds / Math.max(1, summary.total));
  const share = (count: number) => (summary.total ? count / summary.total : 0);
  const indicators: Array<{
    label: string;
    caption?: string;
    value: string;
    segments: Parameters<typeof StatRing>[0]["segments"];
  }> = [
    {
      label: "Aciertos",
      value: `${summary.correctRate} %`,
      segments: [{ fraction: summary.correctRate / 100, color: "#43d6be" }],
    },
    {
      label: "Decisiones respondidas",
      value: summary.total.toLocaleString("es"),
      segments: [
        { fraction: share(summary.correctCount), color: "#43d6be" },
        { fraction: share(summary.wrongCount), color: "#c2392f" },
        { fraction: share(summary.noIdeaCount), color: "#b9b6d6" },
      ],
    },
    {
      label: "Casos completados",
      caption: `de ${casesInTerritory} en el territorio`,
      value: `${completedCount}/${casesInTerritory}`,
      segments: [{ fraction: completedCount / casesInTerritory, color: "#2e2a78" }],
    },
    {
      label: "Tiempo medio por decisión",
      caption: `de ~${formatDuration(estimatedSecondsPerDecision)} estimados`,
      value: formatDuration(average),
      segments: [
        { fraction: Math.min(1, average / estimatedSecondsPerDecision), color: "#2e2a78" },
      ],
    },
  ];
  // Los anillos se llenan casi a la vez; los pequeños desfases evitan un compás de metrónomo.
  const ringDelays = [0, 50, 90, 120];

  return (
    <div className="metrics">
      <section aria-label="Indicadores">
        <dl className="indicators">
          {indicators.map(({ label, caption, value, segments }, index) => (
            <div className="indicator" key={label}>
              <dd>
                <StatRing delay={ringDelays[index]} segments={enough ? segments : []}>
                  <strong className={enough && value.length > 5 ? "compact" : ""}>
                    {enough ? value : "—"}
                  </strong>
                </StatRing>
              </dd>
              <dt>
                {label}
                {enough && caption && <small>{caption}</small>}
                {!enough && <small>Sin evidencia suficiente</small>}
              </dt>
            </div>
          ))}
        </dl>
        {summary.total > 0 && (
          <div className="no-idea-callout">
            <InfoIcon />
            <div>
              <strong>
                Respondiste «No sé» en {summary.noIdeaCount} de {summary.total}{" "}
                {summary.total === 1 ? "decisión" : "decisiones"}.
              </strong>
              <p>Responder «No sé» es mejor que adivinar: nos ayuda a elegir tu siguiente caso.</p>
            </div>
          </div>
        )}
      </section>

      <section className="metric-section">
        <h2>Cómo evoluciona tu nivel</h2>
        <LevelEvolution competencies={competencies} decisions={decisions} />
      </section>

      <div className="metric-pair">
        <section className="metric-section">
          <h2>Tu seguridad frente a tus aciertos</h2>
          {summary.confidence.every(({ count }) => count === 0) ? (
            <p className="metric-empty">
              Aparecerá cuando respondas y marques cuánta seguridad tienes.
            </p>
          ) : (
            <ConfidenceChart
              average={summary.total ? summary.correctRate : null}
              rows={summary.confidence}
            />
          )}
          {summary.overconfidentCount > 0 && (
            <p className="overconfidence-note">
              <strong>{times(summary.overconfidentCount)}</strong> estabas muy seguro y no era la
              correcta. Vale la pena revisar esas decisiones.
            </p>
          )}
        </section>

        <section className="metric-section">
          <h2>Errores que más se repiten</h2>
          {summary.errors.length === 0 ? (
            <p className="metric-empty">Todavía no hay respuestas incorrectas que agrupar.</p>
          ) : (
            <ul className="error-list">
              {summary.errors.map(({ title, count, cases }) => (
                <ErrorCard cases={cases} count={count} key={title} title={title} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="metric-section system-voice">
        <header>
          <CompassIcon />
          <h2>Decisiones del sistema</h2>
        </header>
        {visibleLog.length === 0 ? (
          <p className="metric-empty">El sistema aún no ha tomado decisiones.</p>
        ) : (
          <>
            <ol className="system-timeline">
              {visibleLog.map((decision, index) => (
                <li key={`${decision.kind}-${decision.choice}-${index}`}>
                  <span aria-hidden="true" className="timeline-node" />
                  <div className="timeline-copy">
                    <span className="timeline-kind">{decision.kind}</span>
                    <p className="timeline-choice">{decision.choice}</p>
                    <p className="timeline-reason">Porque {decision.reason}.</p>
                  </div>
                  {decision.chance !== undefined && (
                    <span className="chance-chip">
                      <span aria-hidden="true">P {decision.chance} %</span>
                      <span className="sr-only">
                        Probabilidad de acierto estimada: {decision.chance} %
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {systemDecisions.length > visibleLog.length && (
              <p className="metric-empty">
                Mostramos las últimas {visibleLog.length} de {systemDecisions.length}.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ProgressPage() {
  const [showCalculation, setShowCalculation] = useState(false);
  const answers = readElenaAnswers();
  const plan = readCasePlan();
  const competencies = competenciesAfterElena(answers, plan);
  const finished = isCaseFinished(answers);
  const decisions = buildDecisionHistory(answers, plan);
  const completed = [
    ...new Set(baseDecisions.map(({ caseName }) => caseName)),
    ...(finished ? ["Elena"] : []),
  ];
  const onMap = completed.filter((name) => ["Lucía", "Marta", "Elena"].includes(name));
  const current = finished ? recommendNextCase(competencies).candidate.mapName : "Elena";

  return (
    <div className="student-page">
      <LoggedTopbar current="progreso" />
      <main className="progress-main">
        <h1>Tu progreso</h1>
        <p className="progress-summary">
          Endocrinología: {completed.length}{" "}
          {completed.length === 1 ? "caso completado" : "casos completados"} de {casesInTerritory}.
        </p>
        <TerritoryMap territoryStops={buildTerritoryStops(onMap, current)} />
        <ProgressMetrics
          competencies={competencies}
          completedCount={completed.length}
          decisions={decisions}
          systemDecisions={buildSystemDecisions(plan, competencies, finished)}
        />
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
          <table className="progress-table" role="table">
            <caption className="sr-only">Nivel, estado y tendencia por competencia</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  Competencia
                </th>
                <th role="columnheader" scope="col">
                  Nivel
                </th>
                <th role="columnheader" scope="col">
                  Estado
                </th>
                <th role="columnheader" scope="col">
                  Respuestas
                </th>
                <th role="columnheader" scope="col">
                  Tendencia
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {competencies.map((competency) => (
                <ProgressRow
                  competency={competency}
                  key={competency.id}
                  points={competencyPoints(decisions, competency.id)}
                  showCalculation={showCalculation}
                />
              ))}
            </tbody>
          </table>
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
        <DevDataToggle />
      </main>
    </div>
  );
}

type MissionState = "completed" | "recommended" | "available";

// Catálogo del territorio. Cada misión se muestra con su título público: nunca el tema ni el diagnóstico.
// Las edades y el título de Sofía son de ejemplo; la clave es el nombre que usa el mapa del territorio.
const missionCatalog: Array<{
  key: string;
  title: string;
  patient: string;
  age: number;
  portrait: PortraitName;
}> = [
  {
    key: "Elena",
    title: elenaPatient.caseTitle,
    patient: "Elena",
    age: 68,
    portrait: "Elena",
  },
  {
    key: "Rafael",
    title: "Una consulta preventiva y su seguimiento",
    patient: "Rafael",
    age: 52,
    portrait: "Rafael",
  },
  {
    key: "Lucía",
    title: "Malestar tras una gastroenteritis",
    patient: useWorstCase ? worstCaseLongName : "Lucía",
    age: 24,
    portrait: "Lucía",
  },
  {
    key: "Marta",
    title: "Palpitaciones y pérdida de peso",
    patient: "Marta",
    age: 35,
    portrait: "Marta",
  },
  {
    key: "Elena II",
    title: "Continuidad del cuidado",
    patient: "Elena",
    age: 68,
    portrait: "Elena",
  },
  {
    key: "Sofía",
    title: "Consulta por mareos",
    patient: "Sofía",
    age: 41,
    portrait: "Sofía",
  },
];

// Los casos sin historial siguen el formato de siempre: tres paradas.
const defaultStopCount = 3;

// La razón del motor, dicha sin nombrar el tema del caso.
const neutralReasons: Record<string, string> = {
  Elena: "Aún no tenemos evidencia de cómo interpretas resultados de pruebas.",
};

function MissionCard({
  mission,
  state,
  reason,
  decisions,
  finished,
}: {
  mission: (typeof missionCatalog)[number];
  state: MissionState;
  reason?: string;
  decisions: Decision[];
  finished: boolean;
}) {
  const stops =
    decisions.length || (mission.key === "Elena" ? elenaStops.length : defaultStopCount);
  const stateLabel =
    state === "completed"
      ? "Completado"
      : state === "recommended"
        ? "Recomendado para ti"
        : "Disponible";
  const isElena = mission.key === "Elena";
  const headingId = `mission-${mission.key.replace(/\s/g, "-")}`;
  return (
    <li className={`mission-card ${state}`}>
      <article aria-labelledby={headingId}>
        <div className="mission-head">
          <Portrait patient={mission.portrait} />
          <div className="mission-title">
            <h3 id={headingId}>{mission.title}</h3>
            <p>
              {mission.patient}, {mission.age} años
            </p>
          </div>
          <span className="mission-state">
            {state === "completed" && <CheckIcon />}
            {state === "recommended" && <CompassIcon />}
            {stateLabel}
          </span>
        </div>
        {state === "recommended" && reason && (
          <p className="mission-reason">
            <CompassIcon />
            {reason}
          </p>
        )}
        <div className="mission-foot">
          <ul className="mission-meta">
            <li>
              <RouteIcon />
              {stops} paradas
            </li>
            <li>
              <ClockIcon />~{formatDuration(stops * estimatedSecondsPerDecision)}
              <span className="sr-only"> estimados</span>
            </li>
          </ul>
          {state === "completed" && (
            <div aria-label="Resultado de cada parada" className="mission-route" role="group">
              {decisions.map((mark, index) => (
                <span className={`recent-mark ${stopMarkState(mark)}`} key={index}>
                  <StopMark answer={mark} />
                </span>
              ))}
            </div>
          )}
          <div className="mission-action">
            {isElena && !finished ? (
              <a
                className={`button-link ${state === "recommended" ? "next-case-button" : "case-start-button"}`}
                href="/caso/elena"
              >
                Empezar caso
              </a>
            ) : isElena ? (
              <>
                <a className="button-link case-start-button" href="/caso/elena/resultado">
                  Ver resultado
                </a>
                <a className="mission-link" href="/caso/elena">
                  Volver a jugar
                </a>
              </>
            ) : (
              <button className="mission-soon" disabled type="button">
                Disponible muy pronto
              </button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

type Nivel = { nombre: string; href?: string };

// Dónde estás en Mundo → Territorio → Misión. Un solo componente para todos los niveles:
// el botón vuelve al nivel anterior y la ruta enlaza los anteriores; el actual va en negrita.
function Migas({ niveles }: { niveles: Nivel[] }) {
  const anterior = niveles[niveles.length - 2];
  return (
    <div className="migas">
      {anterior?.href && (
        <a aria-label={`Volver a ${anterior.nombre}`} className="migas-volver" href={anterior.href}>
          <ArrowLeftIcon />
        </a>
      )}
      <nav aria-label="Ruta de navegación">
        <ol>
          {niveles.map((nivel, index) => (
            <li key={nivel.nombre}>
              {index === niveles.length - 1 || !nivel.href ? (
                <strong aria-current="page">{nivel.nombre}</strong>
              ) : (
                <a href={nivel.href}>{nivel.nombre}</a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

const nivelMundos: Nivel = { nombre: "Mundos", href: RUTA_MUNDOS };
const nivelMedicinaInterna: Nivel = { nombre: MUNDO_ACTUAL.nombre, href: RUTA_MEDICINA_INTERNA };

// Tercer nivel: las misiones de un territorio.
function MissionsPage() {
  const answers = readElenaAnswers();
  const plan = readCasePlan();
  const competencies = competenciesAfterElena(answers, plan);
  const history = buildDecisionHistory(answers, plan);
  const finished = isCaseFinished(answers);
  const recommended = finished ? recommendNextCase(competencies).candidate : null;
  const recommendedKey = recommended ? recommended.mapName : "Elena";
  const reason = recommended ? recommended.reason : neutralReasons.Elena;

  const missions = missionCatalog.map((mission) => {
    const decisions = history.filter(({ caseName }) => caseName === mission.key);
    const state: MissionState =
      mission.key === recommendedKey
        ? "recommended"
        : decisions.length > 0
          ? "completed"
          : "available";
    return { mission, decisions, state, at: summarizeCase(decisions, mission.key).at };
  });
  // Primero lo que te recomendamos, luego lo disponible y al final lo completado, lo más reciente primero.
  const rank: Record<MissionState, number> = { recommended: 0, available: 1, completed: 2 };
  missions.sort((a, b) => rank[a.state] - rank[b.state] || b.at - a.at);

  return (
    <div className="student-page">
      <LoggedTopbar current="explorar" />
      <main className="explore-main">
        <Migas
          niveles={[nivelMundos, nivelMedicinaInterna, { nombre: TERRITORIO_ACTUAL.nombre }]}
        />
        <header className="explore-head">
          <h1>Endocrinología</h1>
          <p>
            Casos clínicos para practicar decisiones. No te adelantamos el diagnóstico: lo descubres
            en el caso.
          </p>
        </header>
        <section aria-labelledby="missions-title" className="explore-missions">
          <h2 id="missions-title">Misiones</h2>
          <ul className="mission-list">
            {missions.map(({ mission, decisions, state }) => (
              <MissionCard
                decisions={decisions}
                finished={finished}
                key={mission.key}
                mission={mission}
                reason={state === "recommended" ? reason : undefined}
                state={state}
              />
            ))}
          </ul>
        </section>
        <DevDataToggle />
      </main>
    </div>
  );
}

// Primer nivel de Explorar: el mapa de mundos. No hay nivel anterior, así que no lleva migas.
function WorldsPage() {
  return (
    <div className="student-page">
      <LoggedTopbar current="explorar" />
      <main className="worlds-main">
        <MapaMundos misiones={missionCatalog.length} />
        <DevDataToggle />
      </main>
    </div>
  );
}

// Segundo nivel: los territorios de un mundo.
function TerritoriesPage() {
  return (
    <div className="student-page">
      <LoggedTopbar current="explorar" />
      <main className="worlds-main">
        <Migas niveles={[nivelMundos, { nombre: MUNDO_ACTUAL.nombre }]} />
        <MapaTerritorios misiones={missionCatalog.length} />
        <DevDataToggle />
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
  "/explorar": "Tus mundos · OddysMedic",
  [RUTA_MEDICINA_INTERNA]: "Medicina Interna · OddysMedic",
  [RUTA_ENDOCRINOLOGIA]: "Endocrinología · OddysMedic",
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

  if (window.location.pathname === "/explorar") {
    return <WorldsPage />;
  }

  if (window.location.pathname === RUTA_MEDICINA_INTERNA) {
    return <TerritoriesPage />;
  }

  if (window.location.pathname === RUTA_ENDOCRINOLOGIA) {
    return <MissionsPage />;
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
