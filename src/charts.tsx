// Gráficos de progreso y resultado. Recharts dibuja los ejes y los tooltips; aquí viven los colores con significado:
// aguamarina = acierto, #C2392F = error, gris = «No sé», índigo = voz del sistema.
import { Fragment, useEffect, useState, type CSSProperties, type Key, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate, type TrailPoint } from "./history";

export const colors = {
  correct: "#43d6be",
  correctInk: "#0f6b5c",
  wrong: "#c2392f",
  neutral: "#b9b6d6",
  neutralInk: "#5d5b7a",
  system: "#2e2a78",
  ink: "#1a1840",
  muted: "#5d5b7a",
  track: "#e3e1f0",
  paper: "#faf8f5",
};

/** Con movimiento reducido los gráficos aparecen ya dibujados. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Los gráficos y anillos se animan solo si se puede ver la animación: sin movimiento reducido y con la pestaña
 * visible al montarse. En una pestaña en segundo plano el reloj de animación no avanza y quedarían vacíos.
 */
export function useChartAnimation() {
  const reduced = usePrefersReducedMotion();
  const [visibleOnMount] = useState(() => document.visibilityState === "visible");
  return !reduced && visibleOnMount;
}

const animationMs = 600;

function pointLabel(wrong: boolean, noIdea: boolean) {
  return noIdea ? "No sé" : wrong ? "Incorrecta" : "Correcta";
}

/* -------------------------------------------------------------------------- */
/* Anillo de indicador                                                         */
/* -------------------------------------------------------------------------- */

const ringRadius = 44;
const ringLength = 2 * Math.PI * ringRadius;

export type RingSegment = { fraction: number; color: string };

/** Anillo de progreso. Con `segments` vacío dibuja solo el riel punteado: no hay evidencia. */
export function StatRing({
  segments,
  children,
  delay = 0,
}: {
  segments: RingSegment[];
  children: ReactNode;
  delay?: number;
}) {
  const motion = useChartAnimation();
  const gap = segments.filter(({ fraction }) => fraction > 0).length > 1 ? 3 : 0;
  let start = 0;
  return (
    <div className={`stat-ring ${motion ? "" : "still"}`}>
      <svg aria-hidden="true" viewBox="0 0 100 100">
        <circle
          className={segments.length === 0 ? "ring-track dashed" : "ring-track"}
          cx="50"
          cy="50"
          r={ringRadius}
        />
        {segments.map(({ fraction, color }, index) => {
          if (fraction <= 0) return null;
          const dash = Math.max(0, fraction * ringLength - gap);
          const offset = -start * ringLength;
          start += fraction;
          return (
            <circle
              className="ring-fill"
              cx="50"
              cy="50"
              key={index}
              r={ringRadius}
              stroke={color}
              strokeLinecap={gap === 0 ? "round" : "butt"}
              strokeDasharray={`${dash} ${ringLength}`}
              strokeDashoffset={offset}
              style={{ animationDelay: `${delay}ms` }}
            />
          );
        })}
      </svg>
      <div className="stat-ring-center">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Evolución del nivel                                                         */
/* -------------------------------------------------------------------------- */

type LevelDatum = TrailPoint & { start?: boolean };

type DotProps = { cx?: number; cy?: number; payload?: LevelDatum; index?: number };

function LevelDot({ cx, cy, payload, size }: DotProps & { size: number }) {
  if (cx === undefined || cy === undefined || !payload) return null;
  const common = { cx, cy, r: size };
  if (payload.start) {
    return (
      <circle {...common} fill={colors.system} r={size - 1} stroke="#ffffff" strokeWidth={2} />
    );
  }
  if (payload.noIdea) {
    return <circle {...common} fill={colors.neutral} stroke={colors.neutralInk} strokeWidth={2} />;
  }
  if (payload.correct) {
    return <circle {...common} fill={colors.correct} stroke={colors.correctInk} strokeWidth={2} />;
  }
  return <circle {...common} fill="#ffffff" stroke={colors.wrong} strokeWidth={2.5} />;
}

function LevelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: LevelDatum }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  if (point.start) {
    return (
      <div className="chart-tooltip">
        <strong>Inicio</strong>
        <span>Nivel de partida · {point.level} %</span>
      </div>
    );
  }
  const result = pointLabel(!point.correct, point.noIdea);
  return (
    <div className="chart-tooltip">
      <strong>Respuesta {point.n}</strong>
      <span>
        {point.caseName}, parada {point.stop} · {formatShortDate(point.at)} · {result} · nivel{" "}
        {point.level} %
      </span>
    </div>
  );
}

const bands = [
  { y1: 0, y2: 50, label: "Refuerzo sugerido", fill: "#fdf1f0", ink: "#a52d24" },
  { y1: 50, y2: 75, label: "En progreso", fill: "#f4f3fb", ink: "#2e2a78" },
  { y1: 75, y2: 100, label: "Adecuado", fill: "#ecf9f6", ink: "#0f6b5c" },
];

function chartTicks(count: number) {
  const step = count <= 10 ? 1 : Math.ceil(count / 8);
  const ticks: number[] = [0];
  for (let n = step; n <= count; n += step) ticks.push(n);
  if (ticks[ticks.length - 1] !== count) ticks.push(count);
  return ticks;
}

export function LevelChart({
  name,
  points,
  startLevel,
  animate = true,
}: {
  name: string;
  points: TrailPoint[];
  /** Nivel de partida, antes de la primera respuesta. */
  startLevel: number;
  /** Falso al cambiar de competencia: el gráfico se dibuja una sola vez, al entrar. */
  animate?: boolean;
}) {
  const motion = useChartAnimation();
  const size = points.length > 14 ? 4.5 : 6;
  const last = Math.max(points.length, 2);
  const data: LevelDatum[] = [
    {
      n: 0,
      level: startLevel,
      correct: false,
      noIdea: false,
      caseName: "",
      stop: 0,
      at: 0,
      start: true,
    },
    ...points,
  ];
  return (
    <figure className="level-chart">
      <div className="level-chart-plot">
        <ResponsiveContainer height={300} width="100%">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          >
            {bands.map((band) => (
              <ReferenceArea
                fill={band.fill}
                fillOpacity={1}
                ifOverflow="visible"
                key={band.label}
                label={{
                  value: band.label,
                  position: "insideTopLeft",
                  fill: band.ink,
                  fontSize: 13,
                  fontWeight: 700,
                  offset: 8,
                }}
                stroke="none"
                y1={band.y1}
                y2={band.y2}
              />
            ))}
            <XAxis
              allowDecimals={false}
              axisLine={{ stroke: "#c9c6e3" }}
              dataKey="n"
              domain={[0, last]}
              height={52}
              label={{
                value: "Respuesta",
                position: "insideBottom",
                offset: 0,
                fill: colors.muted,
                fontSize: 13,
                fontWeight: 700,
              }}
              padding={{ left: 14, right: 14 }}
              tick={{ fill: colors.muted, fontSize: 13 }}
              tickFormatter={(value) => (value === 0 ? "Inicio" : String(value))}
              tickLine={false}
              ticks={chartTicks(points.length)}
              type="number"
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tick={{ fill: colors.muted, fontSize: 13 }}
              tickFormatter={(value) => `${value} %`}
              tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
              width={58}
            />
            <Tooltip
              content={LevelTooltip}
              cursor={{ stroke: colors.system, strokeDasharray: "3 4", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              activeDot={(dot: DotProps) => <LevelDot {...dot} size={size + 2} />}
              animationDuration={animationMs}
              animationEasing="ease-out"
              dataKey="level"
              dot={(dot: DotProps & { key?: Key | null }) => (
                <LevelDot
                  cx={dot.cx}
                  cy={dot.cy}
                  key={dot.key ?? dot.index}
                  payload={dot.payload}
                  size={size}
                />
              )}
              isAnimationActive={animate && motion}
              stroke={colors.system}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul aria-hidden="true" className="chart-legend">
        <li>
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" fill={colors.system} r="4.5" stroke="#fff" strokeWidth="2" />
          </svg>
          Inicio
        </li>
        <li>
          <svg viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              fill={colors.correct}
              r="5.5"
              stroke={colors.correctInk}
              strokeWidth="2"
            />
          </svg>
          Acertó
        </li>
        <li>
          <svg viewBox="0 0 16 16">
            <circle cx="8" cy="8" fill="#fff" r="5.5" stroke={colors.wrong} strokeWidth="2.5" />
          </svg>
          Falló
        </li>
        <li>
          <svg viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              fill={colors.neutral}
              r="5.5"
              stroke={colors.neutralInk}
              strokeWidth="2"
            />
          </svg>
          «No sé»
        </li>
      </ul>
      <div className="sr-only">
        <table>
          <caption>Nivel en {name} después de cada respuesta</caption>
          <thead>
            <tr>
              <th scope="col">Respuesta</th>
              <th scope="col">Caso y parada</th>
              <th scope="col">Fecha</th>
              <th scope="col">Resultado</th>
              <th scope="col">Nivel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Inicio</th>
              <td>Nivel de partida</td>
              <td>—</td>
              <td>—</td>
              <td>{startLevel} %</td>
            </tr>
            {points.map((point) => (
              <tr key={point.n}>
                <th scope="row">{point.n}</th>
                <td>
                  {point.caseName}, parada {point.stop}
                </td>
                <td>{formatShortDate(point.at)}</td>
                <td>{pointLabel(!point.correct, point.noIdea)}</td>
                <td>{point.level} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Seguridad frente a aciertos                                                 */
/* -------------------------------------------------------------------------- */

export type ConfidenceRow = { level: string; count: number; right: number; rate: number | null };

type ConfidenceDatum = {
  level: string;
  count: number;
  right: number;
  wrong: number;
  correctShare: number;
  wrongShare: number;
  rate: number | null;
};

function ConfidenceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ConfidenceDatum }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="chart-tooltip">
      <strong>Seguridad: {row.level}</strong>
      <span>
        {row.count === 0
          ? "Sin respuestas con esta seguridad"
          : `${row.right} de ${row.count} correctas · ${row.rate} %`}
      </span>
    </div>
  );
}

export function ConfidenceChart({
  rows,
  average,
}: {
  rows: ConfidenceRow[];
  /** Porcentaje de aciertos del alumno en total, como marca de referencia. */
  average: number | null;
}) {
  const motion = useChartAnimation();
  const data: ConfidenceDatum[] = rows.map(({ level, count, right, rate }) => ({
    level,
    count,
    right,
    wrong: count - right,
    correctShare: rate ?? 0,
    wrongShare: rate === null ? 0 : 100 - rate,
    rate,
  }));
  return (
    <figure className="confidence-chart">
      <ResponsiveContainer height={176} width="100%">
        <BarChart
          accessibilityLayer
          barCategoryGap={14}
          data={data}
          layout="vertical"
          margin={{ top: 22, right: 4, bottom: 0, left: 0 }}
        >
          <XAxis domain={[0, 100]} hide type="number" />
          <YAxis
            axisLine={false}
            dataKey="level"
            tick={{ fill: colors.ink, fontSize: 15, fontWeight: 700 }}
            tickLine={false}
            type="category"
            width={56}
          />
          <YAxis
            axisLine={false}
            dataKey="level"
            orientation="right"
            tick={<RateTick data={data} />}
            tickLine={false}
            type="category"
            width={100}
            yAxisId="rate"
          />
          <Tooltip
            content={ConfidenceTooltip}
            cursor={{ fill: "rgba(46, 42, 120, 0.05)" }}
            isAnimationActive={false}
          />
          {average !== null && (
            <ReferenceLine
              ifOverflow="visible"
              label={{
                value: `Tu promedio ${average} %`,
                position: "insideTopRight",
                fill: colors.muted,
                fontSize: 13,
              }}
              stroke={colors.system}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              x={average}
            />
          )}
          <Bar
            animationDuration={animationMs}
            animationEasing="ease-out"
            barSize={24}
            dataKey="correctShare"
            isAnimationActive={motion}
            radius={[6, 0, 0, 6]}
            stackId="share"
            stroke={colors.paper}
            strokeWidth={2}
          >
            {data.map((row) => (
              <Cell fill={colors.correct} key={row.level} />
            ))}
          </Bar>
          <Bar
            animationDuration={animationMs}
            animationEasing="ease-out"
            barSize={24}
            dataKey="wrongShare"
            isAnimationActive={motion}
            radius={[0, 6, 6, 0]}
            stackId="share"
            stroke={colors.paper}
            strokeWidth={2}
          >
            {data.map((row) => (
              <Cell fill={row.level === "Mucho" ? colors.wrong : colors.track} key={row.level} />
            ))}
            <LabelList
              content={(props) => <WrongCount {...props} data={data} />}
              dataKey="wrongShare"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="sr-only">
        <table>
          <caption>Aciertos según la seguridad que marcaste</caption>
          <thead>
            <tr>
              <th scope="col">Seguridad</th>
              <th scope="col">Respuestas</th>
              <th scope="col">Correctas</th>
              <th scope="col">Porcentaje de acierto</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.level}>
                <th scope="row">{row.level}</th>
                <td>{row.count}</td>
                <td>{row.right}</td>
                <td>{row.rate === null ? "Sin datos" : `${row.rate} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

type TickProps = { x?: number; y?: number; payload?: { value: string } };

function RateTick({ x = 0, y = 0, payload, data }: TickProps & { data: ConfidenceDatum[] }) {
  const row = data.find(({ level }) => level === payload?.value);
  if (!row) return null;
  return (
    <text dominantBaseline="central" textAnchor="start" x={x + 10} y={y}>
      <tspan fill={colors.ink} fontSize="19" fontWeight="800">
        {row.rate === null ? "—" : `${row.rate} %`}
      </tspan>
      <tspan dx="6" fill={colors.muted} fontSize="13">
        {row.right}/{row.count}
      </tspan>
    </text>
  );
}

type LabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  index?: number;
};

// Solo la combinación «Mucho + incorrecta» lleva su número dentro de la barra.
function WrongCount({
  x,
  y,
  width,
  height,
  index,
  data,
}: LabelProps & { data: ConfidenceDatum[] }) {
  const row = index === undefined ? undefined : data[index];
  if (!row || row.level !== "Mucho" || row.wrong === 0) return null;
  const [left, top, w, h] = [Number(x), Number(y), Number(width), Number(height)];
  if (w < 22) return null;
  return (
    <text
      dominantBaseline="central"
      fill="#ffffff"
      fontSize="14"
      fontWeight="800"
      textAnchor="middle"
      x={left + w / 2}
      y={top + h / 2}
    >
      {row.wrong}
    </text>
  );
}

/* -------------------------------------------------------------------------- */
/* Dona del resultado                                                          */
/* -------------------------------------------------------------------------- */

export function OutcomeDonut({
  correct,
  wrong,
  noIdea,
}: {
  correct: number;
  wrong: number;
  noIdea: number;
}) {
  const motion = useChartAnimation();
  const total = correct + wrong + noIdea;
  const slices = [
    { name: "Correctas", value: correct, color: colors.correct },
    { name: "Incorrectas", value: wrong, color: colors.wrong },
    { name: "«No sé»", value: noIdea, color: colors.neutral },
  ];
  const visible = slices.filter(({ value }) => value > 0);
  return (
    <figure className="outcome-donut">
      <div className="donut-plot">
        <ResponsiveContainer height={188} width={188}>
          <PieChart accessibilityLayer>
            <Pie
              animationDuration={animationMs}
              animationEasing="ease-out"
              cornerRadius={visible.length > 1 ? 5 : 0}
              data={
                visible.length ? visible : [{ name: "Sin datos", value: 1, color: colors.track }]
              }
              dataKey="value"
              endAngle={-270}
              innerRadius={62}
              isAnimationActive={motion}
              nameKey="name"
              outerRadius={86}
              paddingAngle={visible.length > 1 ? 3 : 0}
              startAngle={90}
              stroke="none"
            >
              {(visible.length ? visible : [{ color: colors.track }]).map((slice, index) => (
                <Cell fill={slice.color} key={index} />
              ))}
            </Pie>
            <Tooltip content={DonutTooltip} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>
            {correct} de {total}
          </strong>
          <span>aciertos</span>
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((slice) => (
          <li key={slice.name}>
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <circle cx="8" cy="8" fill={slice.color} r="6" />
            </svg>
            <span>{slice.name}</span>
            <strong>{slice.value}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: unknown }>;
}) {
  const slice = payload?.[0];
  if (!active || !slice) return null;
  return (
    <div className="chart-tooltip">
      <strong>{slice.name}</strong>
      <span>{String(slice.value)}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiempo por parada                                                           */
/* -------------------------------------------------------------------------- */

export type TimeItem = { label: string; seconds: number; text: string };

// Tiempo por parada en una cuadrícula CSS: [etapa][barra][valor]. La línea punteada marca lo estimado
// y su etiqueta va encima, en una fila propia, para no tocar ninguna barra.
export function TimeBars({
  items,
  estimate,
  estimateText,
}: {
  items: TimeItem[];
  estimate: number;
  estimateText: string;
}) {
  const motion = useChartAnimation();
  const max = Math.max(estimate * 1.35, ...items.map(({ seconds }) => seconds * 1.25));
  // Fracción del ancho de la columna de barras que ocupa cada tiempo.
  const share = (seconds: number) => Math.min(1, seconds / max).toFixed(4);
  return (
    <figure className={`time-bars${motion ? " animate" : ""}`}>
      <div
        aria-hidden="true"
        className="time-grid"
        style={{ gridTemplateRows: `30px repeat(${items.length}, 40px)` }}
      >
        <span className="time-estimate-cell">
          <span className="time-estimate-label" style={{ "--p": share(estimate) } as CSSProperties}>
            {estimateText}
          </span>
        </span>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            <span className="time-stage" style={{ gridRow: index + 2 }}>
              {item.label}
            </span>
            <span className="time-track" style={{ gridRow: index + 2 }}>
              <span
                className="time-fill"
                style={{ "--w": share(item.seconds), "--index": index } as CSSProperties}
              />
            </span>
            <span className="time-value" style={{ gridRow: index + 2 }}>
              {item.text}
            </span>
          </Fragment>
        ))}
        <span className="time-estimate-span" style={{ gridRow: `2 / span ${items.length}` }}>
          <span
            className="time-estimate-line"
            style={{ "--p": share(estimate) } as CSSProperties}
          />
        </span>
      </div>
      <div className="sr-only">
        <table>
          <caption>Tiempo por parada, frente a {estimateText}</caption>
          <thead>
            <tr>
              <th scope="col">Parada</th>
              <th scope="col">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                <td>{item.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
