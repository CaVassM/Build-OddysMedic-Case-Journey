// Mapa de mundos: una isla isométrica por especialidad. Solo Medicina Interna se puede abrir.
// Los nombres son públicos: aquí nunca aparece un tema ni un diagnóstico.
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  MUNDOS,
  RUTA_MEDICINA_INTERNA,
  TOTAL_TERRITORIOS,
  type Mundo,
  type MundoIcono,
  type MundoId,
} from "./data/mundos";
import { CompassMark, heartbeatPath } from "./icons";

type Variante = "completa" | "compacta";

// Cada variante tiene su propio lienzo. El SVG de las rutas usa estas medidas como viewBox, y el
// lienzo HTML tiene la misma proporción, así que un % de las islas es el mismo punto que en las rutas.
const LIENZO: Record<Variante, { w: number; h: number }> = {
  completa: { w: 1000, h: 440 },
  compacta: { w: 1000, h: 305 },
};

type Ruta = { de: MundoId; a: MundoId; latido?: boolean };

// El latido va en el tramo que sale de Medicina Interna hacia el mundo de la derecha.
const RUTAS: Record<Variante, Ruta[]> = {
  completa: [
    { de: "medicina-interna", a: "pediatria" },
    { de: "medicina-interna", a: "gineco-obstetricia", latido: true },
    { de: "medicina-interna", a: "emergencias" },
  ],
  // En el lienzo ancho las islas quedan en fila: la ruta pasa de una a la siguiente.
  compacta: [
    { de: "medicina-interna", a: "pediatria" },
    { de: "medicina-interna", a: "gineco-obstetricia", latido: true },
    { de: "gineco-obstetricia", a: "emergencias" },
  ],
};

// Medidas del dibujo de la isla (viewBox 200 × 130) frente a su ancho.
const ISLA_PROPORCION = 130 / 200;
const CARA_CENTRO = 53 / 200; // del borde superior al centro de la cara superior, en anchos de isla
const TEXTO_TIP = "Disponible pronto";
const DURACION_TIP = 2200;

const tonos = {
  disponible: {
    arriba: "#43D6BE",
    izquierda: "#127C69",
    derecha: "#0E5F51",
    placa: "#5ADBC7",
    icono: "#1A1840",
  },
  proximamente: {
    arriba: "#46409A",
    izquierda: "#3A3588",
    derecha: "#322E7D",
    placa: "#524CA8",
    icono: "#DAD8F1",
  },
};

type Punto = { x: number; y: number };

function centroDe(m: Mundo, v: Variante): Punto {
  const { w, h } = LIENZO[v];
  const pos = v === "compacta" ? m.posCompacta : m.pos;
  return { x: (pos.x / 100) * w, y: (pos.y / 100) * h };
}

function anchoDe(m: Mundo, v: Variante) {
  const { w } = LIENZO[v];
  return ((v === "compacta" ? m.anchoCompacto : m.ancho) / 100) * w;
}

// Distancia del centro al borde del rombo en la dirección (ux, uy). Hacia abajo cuentan también las caras laterales.
function distanciaAlBorde(ancho: number, ux: number, uy: number) {
  const a = ancho * 0.47;
  const b = ancho * 0.235 + (uy > 0 ? ancho * 0.1 * uy : 0);
  return 1 / (Math.abs(ux) / a + Math.abs(uy) / b);
}

type RutaCalculada = {
  clave: string;
  d: string;
  largo: number;
  latido?: { x: number; y: number; angulo: number; escala: number };
};

function calcularRutas(v: Variante): RutaCalculada[] {
  const porId = new Map(MUNDOS.map((m) => [m.id, m]));
  const huecoExtra = 7;
  const calculadas: RutaCalculada[] = [];
  RUTAS[v].forEach((ruta, i) => {
    const mA = porId.get(ruta.de);
    const mB = porId.get(ruta.a);
    if (!mA || !mB) return;
    const A = centroDe(mA, v);
    const B = centroDe(mB, v);
    const largoTotal = Math.hypot(B.x - A.x, B.y - A.y);
    const ux = (B.x - A.x) / largoTotal;
    const uy = (B.y - A.y) / largoTotal;
    const tA = distanciaAlBorde(anchoDe(mA, v), ux, uy) + huecoExtra;
    const tB = distanciaAlBorde(anchoDe(mB, v), -ux, -uy) + huecoExtra;
    const s = { x: A.x + ux * tA, y: A.y + uy * tA };
    const e = { x: B.x - ux * tB, y: B.y - uy * tB };
    const largo = Math.hypot(e.x - s.x, e.y - s.y);
    if (largo < 24) return;
    // Una curva suave, para que las rutas se lean como caminos y no como cables.
    const lado = i % 2 === 0 ? 1 : -1;
    const c = {
      x: (s.x + e.x) / 2 - uy * largo * 0.12 * lado,
      y: (s.y + e.y) / 2 + ux * largo * 0.12 * lado,
    };
    const d = `M${s.x.toFixed(1)} ${s.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
    let latido: RutaCalculada["latido"];
    if (ruta.latido) {
      latido = {
        x: 0.25 * s.x + 0.5 * c.x + 0.25 * e.x,
        y: 0.25 * s.y + 0.5 * c.y + 0.25 * e.y,
        angulo: (Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI,
        escala: Math.min(0.95, Math.max(0.5, (largo * 0.55) / 80)),
      };
    }
    calculadas.push({ clave: `${ruta.de}-${ruta.a}`, d, largo, latido });
  });
  return calculadas;
}

// ---------------------------------------------------------------------------------------------
// Íconos planos y simbólicos, dibujados en una caja de 48. `c` es el color del ícono y `k` el de
// los huecos, que es el de la placa sobre la que se apoya.
// ---------------------------------------------------------------------------------------------
function IconoMundo({ icono, c, k }: { icono: MundoIcono; c: string; k: string }) {
  switch (icono) {
    case "estetoscopio":
      return (
        <g>
          <circle cx="13" cy="6.5" r="3.2" fill={c} />
          <circle cx="33" cy="6.5" r="3.2" fill={c} />
          <path
            d="M13 9.5V19a10 10 0 0 0 20 0V9.5M23 29v5a6 6 0 0 0 6 6h1.5"
            fill="none"
            stroke={c}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.4"
          />
          <circle cx="36" cy="40" r="5.6" fill={c} />
          <circle cx="36" cy="40" r="2.2" fill={k} />
        </g>
      );
    case "osito":
      return (
        <g>
          <circle cx="11.5" cy="12" r="6.5" fill={c} />
          <circle cx="36.5" cy="12" r="6.5" fill={c} />
          <circle cx="11.5" cy="12" r="2.8" fill={k} />
          <circle cx="36.5" cy="12" r="2.8" fill={k} />
          <circle cx="24" cy="27" r="17" fill={c} />
          <ellipse cx="24" cy="33" rx="7.4" ry="5.6" fill={k} />
          <ellipse cx="24" cy="31" rx="2.8" ry="2.1" fill={c} />
          <circle cx="17" cy="23.5" r="2.1" fill={k} />
          <circle cx="31" cy="23.5" r="2.1" fill={k} />
        </g>
      );
    case "luna-gota":
      return (
        <g>
          <path d="M30 4A20 20 0 1 0 30 44A31 31 0 0 1 30 4Z" fill={c} />
          <path d="M36 18C36 18 29.5 26 29.5 31a6.5 6.5 0 0 0 13 0C42.5 26 36 18 36 18Z" fill={c} />
          <circle cx="34" cy="32.4" r="1.6" fill={k} />
        </g>
      );
    case "sirena":
      return (
        <g>
          <path d="M14 36V26a10 10 0 0 1 20 0v10Z" fill={c} />
          <rect x="9" y="36" width="30" height="7" rx="2.4" fill={c} />
          <path
            d="M18.5 28a5.5 5.5 0 0 1 3.6-5.2"
            fill="none"
            stroke={k}
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="M24 4.5v4.2M9.2 10.2l3 3M38.8 10.2l-3 3M3.5 24h4.2M44.5 24h-4.2"
            fill="none"
            stroke={c}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </g>
      );
  }
}

function Isla({ estado, icono }: { estado: Mundo["estado"]; icono: MundoIcono }) {
  const t = tonos[estado];
  return (
    <svg className="isla" viewBox="0 0 200 130" fill="none" aria-hidden="true" focusable="false">
      {/* Caras laterales: la izquierda recibe más luz que la derecha. */}
      <path
        d="M6 53 100 100v24L6 77Z"
        fill={t.izquierda}
        stroke={t.izquierda}
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M194 53 100 100v24l94-47Z"
        fill={t.derecha}
        stroke={t.derecha}
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M100 6 194 53 100 100 6 53Z"
        fill={t.arriba}
        stroke={t.arriba}
        strokeLinejoin="round"
        strokeWidth="6"
      />
      {/* Placa sobre la que se apoya el ícono. */}
      <path d="M100 21 164 53 100 85 36 53Z" fill={t.placa} />
      <ellipse cx="100" cy="59" rx="19" ry="5.5" fill="#1A1840" opacity="0.22" />
      <g transform="translate(78 16.5) scale(0.92)">
        <IconoMundo c={t.icono} icono={icono} k={t.placa} />
      </g>
      {/* Contorno del foco de teclado: sigue la silueta de la isla. */}
      <path
        className="isla-foco"
        d="M1 52.5 100 2l99 50.5v26.5L100 128 1 79Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function Candado() {
  return (
    <svg className="mundo-candado" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7.2" width="10" height="7" rx="1.8" fill="currentColor" />
      <path
        d="M5.4 7.2V5.4a2.6 2.6 0 0 1 5.2 0v1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function resumenTerritorios(misiones: number) {
  const territorios = `${TOTAL_TERRITORIOS} ${TOTAL_TERRITORIOS === 1 ? "territorio" : "territorios"}`;
  return `${territorios} · ${misiones} ${misiones === 1 ? "misión" : "misiones"}`;
}

function MundoIsla({
  mundo,
  variante,
  misiones,
  tipVisible,
  onTip,
}: {
  mundo: Mundo;
  variante: Variante;
  misiones: number;
  tipVisible: boolean;
  onTip: (id: MundoId | null, esperar?: boolean) => void;
}) {
  const disponible = mundo.estado === "disponible";
  const pos = variante === "compacta" ? mundo.posCompacta : mundo.pos;
  const ancho = variante === "compacta" ? mundo.anchoCompacto : mundo.ancho;
  const tipId = useId();
  const estilo = {
    "--x": pos.x,
    "--y": pos.y,
    "--ancho": ancho,
    "--retraso": `${mundo.entrada}ms`,
    "--sube": disponible ? "8px" : "6px",
  } as CSSProperties;

  return (
    <li
      className={`mundo ${disponible ? "disponible" : "proximamente"}${tipVisible ? " con-tip" : ""}`}
      style={estilo}
    >
      <button
        aria-describedby={disponible ? undefined : tipId}
        aria-disabled={disponible ? undefined : true}
        className="mundo-boton"
        onBlur={disponible ? undefined : () => onTip(null)}
        onClick={() => {
          if (disponible) {
            window.location.assign(RUTA_MEDICINA_INTERNA);
          } else {
            onTip(mundo.id, true);
          }
        }}
        onFocus={disponible ? undefined : () => onTip(mundo.id)}
        onKeyDown={(evento) => {
          if (!disponible && evento.key === "Escape") onTip(null);
        }}
        onPointerEnter={
          disponible ? undefined : (evento) => evento.pointerType === "mouse" && onTip(mundo.id)
        }
        onPointerLeave={
          disponible ? undefined : (evento) => evento.pointerType === "mouse" && onTip(null)
        }
        type="button"
      >
        <span className="mundo-arte">
          {disponible && <span className="mundo-halo" />}
          <span className="mundo-sube">
            <span className="mundo-flota">
              <Isla estado={mundo.estado} icono={mundo.icono} />
            </span>
          </span>
        </span>
        <span className="mundo-etiqueta">
          <span className="mundo-nombre">{mundo.nombre}</span>
          <span className="mundo-estado">
            {disponible ? (
              resumenTerritorios(misiones)
            ) : (
              <>
                <Candado />
                Próximamente
              </>
            )}
          </span>
        </span>
        {!disponible && (
          <span className={`mundo-tip${tipVisible ? " visible" : ""}`} id={tipId} role="tooltip">
            {TEXTO_TIP}
          </span>
        )}
      </button>
    </li>
  );
}

export function MapaMundos({
  variante = "completa",
  misiones,
}: {
  variante?: Variante;
  // Cuántas misiones hay hoy en el catálogo; se cuenta fuera, donde viven los datos de los casos.
  misiones: number;
}) {
  const titulo = useId();
  const mascara = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [tip, setTip] = useState<MundoId | null>(null);
  const temporizador = useRef<number | undefined>(undefined);
  // Si la pestaña está oculta al montarse, el movimiento ya habría pasado cuando se vea: estado final.
  const [sinEntrada] = useState(() => typeof document !== "undefined" && document.hidden);
  const { w, h } = LIENZO[variante];
  const rutas = calcularRutas(variante);
  const Titulo = variante === "completa" ? "h1" : "h2";

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function mostrarTip(id: MundoId | null, esperar = false) {
    window.clearTimeout(temporizador.current);
    setTip(id);
    // En pantallas táctiles no hay «salir con el puntero»: el aviso se retira solo.
    if (id && esperar) temporizador.current = window.setTimeout(() => setTip(null), DURACION_TIP);
  }

  return (
    <section
      aria-labelledby={titulo}
      className={`mundos mundos-${variante}${sinEntrada ? " sin-entrada" : ""}`}
    >
      <header className="mundos-cabecera">
        <div>
          <Titulo className="mundos-titulo" id={titulo}>
            Tus mundos
          </Titulo>
          <p className="mundos-subtitulo">Explora especialidades y avanza por sus territorios.</p>
        </div>
        <CompassMark className="mundos-brujula" />
      </header>
      <div className="mundos-lienzo" style={{ aspectRatio: `${w} / ${h}` } as CSSProperties}>
        <svg
          aria-hidden="true"
          className="mundos-rutas"
          fill="none"
          focusable="false"
          viewBox={`0 0 ${w} ${h}`}
        >
          {rutas.map((ruta, i) => {
            const retraso = `${160 + i * 50}ms`;
            const id = `${mascara}-${i}`;
            return (
              <g key={ruta.clave} style={{ "--retraso": retraso } as CSSProperties}>
                <mask height={h} id={id} maskUnits="userSpaceOnUse" width={w} x="0" y="0">
                  <path
                    className="ruta-trazo"
                    d={ruta.d}
                    pathLength="1"
                    stroke="white"
                    strokeWidth="12"
                  />
                  {ruta.latido && (
                    <rect
                      fill="black"
                      height="38"
                      transform={`translate(${ruta.latido.x.toFixed(1)} ${ruta.latido.y.toFixed(1)}) rotate(${ruta.latido.angulo.toFixed(1)})`}
                      width={80 * ruta.latido.escala + 12}
                      x={-(80 * ruta.latido.escala + 12) / 2}
                      y="-19"
                    />
                  )}
                </mask>
                <path
                  d={ruta.d}
                  mask={`url(#${id})`}
                  stroke="#43D6BE"
                  strokeDasharray="4 6"
                  strokeOpacity="0.8"
                  strokeWidth="2.5"
                />
                {ruta.latido && (
                  <g
                    transform={`translate(${ruta.latido.x.toFixed(1)} ${ruta.latido.y.toFixed(1)}) rotate(${ruta.latido.angulo.toFixed(1)}) scale(${ruta.latido.escala.toFixed(2)}) translate(-40 -16)`}
                  >
                    <path
                      className="ruta-latido"
                      d={heartbeatPath}
                      pathLength="1"
                      stroke="#43D6BE"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={(2.6 / ruta.latido.escala).toFixed(2)}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <ul className="mundos-lista">
          {MUNDOS.map((mundo) => (
            <MundoIsla
              key={mundo.id}
              misiones={misiones}
              mundo={mundo}
              onTip={mostrarTip}
              tipVisible={tip === mundo.id}
              variante={variante}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
