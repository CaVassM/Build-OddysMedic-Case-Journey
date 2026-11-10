// Mapas de islas isométricas: una isla por mundo (especialidad) o por territorio.
// Solo la isla disponible se puede abrir. Los nombres son públicos: nunca un tema ni un diagnóstico.
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  MUNDOS,
  TERRITORIOS,
  TOTAL_TERRITORIOS,
  type IslaDato,
  type IslaIcono,
} from "./data/mundos";
import { CompassMark, heartbeatPath } from "./icons";

// El SVG de las rutas usa estas medidas como viewBox, y el lienzo HTML tiene la misma proporción,
// así que un % de las islas es el mismo punto que en las rutas.
const LIENZO = { w: 1000, h: 440 };
const TEXTO_TIP = "Disponible pronto";
const DURACION_TIP = 2200;

// Rutas: desde la isla disponible hacia las demás. El latido va en el tramo que sale hacia la segunda.
function rutasDe(islas: IslaDato[]) {
  return islas
    .slice(1)
    .map((isla, index) => ({ de: islas[0].id, a: isla.id, latido: index === 1 }));
}

const tonos = {
  disponible: {
    arriba: "#43D6BE",
    izquierda: "#127C69",
    derecha: "#0E5F51",
    placa: "#5ADBC7",
    icono: "#1A1840",
  },
  proximamente: {
    arriba: "#C9C6EA",
    izquierda: "#A9A5DB",
    derecha: "#9C97D2",
    placa: "#DAD8F2",
    icono: "#6B66B3",
  },
};

type Punto = { x: number; y: number };

function centroDe(isla: IslaDato): Punto {
  return { x: (isla.pos.x / 100) * LIENZO.w, y: (isla.pos.y / 100) * LIENZO.h };
}

function anchoDe(isla: IslaDato) {
  return (isla.ancho / 100) * LIENZO.w;
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
  latido?: { x: number; y: number; angulo: number; escala: number };
};

function calcularRutas(islas: IslaDato[]): RutaCalculada[] {
  const porId = new Map(islas.map((isla) => [isla.id, isla]));
  const huecoExtra = 7;
  const calculadas: RutaCalculada[] = [];
  rutasDe(islas).forEach((ruta, i) => {
    const iA = porId.get(ruta.de);
    const iB = porId.get(ruta.a);
    if (!iA || !iB) return;
    const A = centroDe(iA);
    const B = centroDe(iB);
    const largoTotal = Math.hypot(B.x - A.x, B.y - A.y);
    const ux = (B.x - A.x) / largoTotal;
    const uy = (B.y - A.y) / largoTotal;
    const tA = distanciaAlBorde(anchoDe(iA), ux, uy) + huecoExtra;
    const tB = distanciaAlBorde(anchoDe(iB), -ux, -uy) + huecoExtra;
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
    calculadas.push({ clave: `${ruta.de}-${ruta.a}`, d, latido });
  });
  return calculadas;
}

// ---------------------------------------------------------------------------------------------
// Íconos planos y simbólicos, dibujados en una caja de 48. `c` es el color del ícono y `k` el de
// los huecos, que es el de la placa sobre la que se apoya.
// ---------------------------------------------------------------------------------------------
const puas = [0, 45, 90, 135, 180, 225, 270, 315].map((grados) => {
  const radianes = (grados * Math.PI) / 180;
  return {
    x1: 24 + Math.cos(radianes) * 11,
    y1: 24 + Math.sin(radianes) * 11,
    x2: 24 + Math.cos(radianes) * 17,
    y2: 24 + Math.sin(radianes) * 17,
  };
});

function IconoIsla({ icono, c, k }: { icono: IslaIcono; c: string; k: string }) {
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
    case "tiroides": {
      // Dos lóbulos unidos por un istmo: la tiroides tiene forma de mariposa.
      const lobulo = "M22.5 41C15 42 8.5 37 7.5 29C6.5 22 8.5 15 12 8C18 11 22.5 18 22.5 27Z";
      return (
        <g>
          <path d={lobulo} fill={c} />
          <path d={lobulo} fill={c} transform="matrix(-1 0 0 1 48 0)" />
          <rect x="20" y="27" width="8" height="6.5" rx="2" fill={c} />
        </g>
      );
    }
    case "corazon":
      return (
        <g>
          <path
            d="M24 42C11 33 5 25.5 5 17.5C5 11 9.5 6.5 15.5 6.5C19.2 6.5 22.2 8.4 24 11.6C25.8 8.4 28.8 6.5 32.5 6.5C38.5 6.5 43 11 43 17.5C43 25.5 37 33 24 42Z"
            fill={c}
          />
          <path
            d="M13 16.5C13.4 13.8 15.2 12.3 17.4 12.1"
            fill="none"
            stroke={k}
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </g>
      );
    case "microbio":
      return (
        <g>
          {puas.map((pua) => (
            <g key={`${pua.x2}-${pua.y2}`}>
              <line
                stroke={c}
                strokeLinecap="round"
                strokeWidth="3"
                x1={pua.x1}
                x2={pua.x2}
                y1={pua.y1}
                y2={pua.y2}
              />
              <circle cx={pua.x2} cy={pua.y2} r="2.7" fill={c} />
            </g>
          ))}
          <circle cx="24" cy="24" r="12.5" fill={c} />
          <circle cx="20.5" cy="21" r="2.6" fill={k} />
          <circle cx="28.5" cy="27.5" r="2" fill={k} />
        </g>
      );
    case "rinon":
      return (
        <g>
          <path
            d="M28 4.5C38 5 44 13.5 43 25C42 37.5 34 44 26 43C19.5 42 17.5 36.5 20.5 32.5C23.5 28.5 23.5 24.5 20.5 20.5C17.5 16.5 19 10 24 7C25.2 5.5 26.4 4.4 28 4.5Z"
            fill={c}
          />
          <path
            d="M34 12.5C37.5 15.5 38.5 20 38 24.5"
            fill="none"
            stroke={k}
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </g>
      );
  }
}

// El dibujo de una isla. Se exporta para la tarjeta «Tu recorrido» de /inicio.
export function Isla({ estado, icono }: { estado: IslaDato["estado"]; icono: IslaIcono }) {
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
      <ellipse cx="100" cy="59" rx="19" ry="5.5" fill="#1A1840" opacity="0.16" />
      <g transform="translate(78 16.5) scale(0.92)">
        <IconoIsla c={t.icono} icono={icono} k={t.placa} />
      </g>
      {/* Contorno del foco de teclado: sigue la silueta de la isla. */}
      <path
        className="isla-foco"
        d="M1 52.5 100 2l99 50.5v26.5L100 128 1 79Z"
        stroke="#2E2A78"
        strokeLinejoin="round"
        strokeWidth="3.2"
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

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function IslaMapa({
  isla,
  detalle,
  tipVisible,
  onTip,
}: {
  isla: IslaDato;
  detalle: string;
  tipVisible: boolean;
  onTip: (id: string | null, esperar?: boolean) => void;
}) {
  const disponible = isla.estado === "disponible";
  const tipId = useId();
  const estilo = {
    "--x": isla.pos.x,
    "--y": isla.pos.y,
    "--ancho": isla.ancho,
    "--retraso": `${isla.entrada}ms`,
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
          if (disponible && isla.ruta) {
            window.location.assign(isla.ruta);
          } else if (!disponible) {
            onTip(isla.id, true);
          }
        }}
        onFocus={disponible ? undefined : () => onTip(isla.id)}
        onKeyDown={(evento) => {
          if (!disponible && evento.key === "Escape") onTip(null);
        }}
        onPointerEnter={
          disponible ? undefined : (evento) => evento.pointerType === "mouse" && onTip(isla.id)
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
              <Isla estado={isla.estado} icono={isla.icono} />
            </span>
          </span>
        </span>
        <span className="mundo-etiqueta">
          <span className="mundo-nombre">{isla.nombre}</span>
          <span className="mundo-estado">
            {disponible ? (
              detalle
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

function MapaIslas({
  titulo,
  subtitulo,
  islas,
  detalle,
}: {
  titulo: string;
  subtitulo: string;
  islas: IslaDato[];
  detalle: string;
}) {
  const tituloId = useId();
  const mascara = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [tip, setTip] = useState<string | null>(null);
  const temporizador = useRef<number | undefined>(undefined);
  // Si la pestaña está oculta al montarse, el movimiento ya habría pasado cuando se vea: estado final.
  const [sinEntrada] = useState(() => typeof document !== "undefined" && document.hidden);
  const { w, h } = LIENZO;
  const rutas = calcularRutas(islas);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  function mostrarTip(id: string | null, esperar = false) {
    window.clearTimeout(temporizador.current);
    setTip(id);
    // En pantallas táctiles no hay «salir con el puntero»: el aviso se retira solo.
    if (id && esperar) temporizador.current = window.setTimeout(() => setTip(null), DURACION_TIP);
  }

  return (
    <section aria-labelledby={tituloId} className={`mundos${sinEntrada ? " sin-entrada" : ""}`}>
      <header className="mundos-cabecera">
        <div>
          <h1 className="mundos-titulo" id={tituloId}>
            {titulo}
          </h1>
          <p className="mundos-subtitulo">{subtitulo}</p>
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
                  stroke="#2FC7AF"
                  strokeDasharray="4 6"
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
                      stroke="#2FC7AF"
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
          {islas.map((isla) => (
            <IslaMapa
              detalle={detalle}
              isla={isla}
              key={isla.id}
              onTip={mostrarTip}
              tipVisible={tip === isla.id}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

// Primer nivel: los mundos. `misiones` se cuenta fuera, donde viven los datos de los casos.
export function MapaMundos({ misiones }: { misiones: number }) {
  return (
    <MapaIslas
      detalle={`${plural(TOTAL_TERRITORIOS, "territorio", "territorios")} · ${plural(misiones, "misión", "misiones")}`}
      islas={MUNDOS}
      subtitulo="Explora especialidades y avanza por sus territorios."
      titulo="Tus mundos"
    />
  );
}

// Segundo nivel: los territorios de Medicina Interna.
export function MapaTerritorios({ misiones }: { misiones: number }) {
  return (
    <MapaIslas
      detalle={plural(misiones, "misión", "misiones")}
      islas={TERRITORIOS}
      subtitulo="Elige un territorio para practicar sus casos."
      titulo="Medicina Interna"
    />
  );
}
