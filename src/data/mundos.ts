// Mundos (especialidades) y territorios del mapa de /explorar.
// Jerarquía: Mundo → Territorio → Misión → Paradas.
// Solo nombres públicos: ningún tema ni diagnóstico (contrato de visibilidad).

export type IslaIcono =
  | "estetoscopio"
  | "osito"
  | "luna-gota"
  | "sirena"
  | "tiroides"
  | "corazon"
  | "microbio"
  | "rinon";

export type Posicion = { x: number; y: number };

export type IslaDato = {
  id: string;
  nombre: string;
  estado: "disponible" | "proximamente";
  icono: IslaIcono;
  // Centro de la cara superior de la isla, en % del lienzo (x de izquierda a derecha, y de arriba abajo).
  pos: Posicion;
  // Ancho del dibujo de la isla, en % del ancho del lienzo. La disponible es la más grande.
  ancho: number;
  // Dónde aparece en la secuencia de entrada, en ms: primero la isla disponible.
  entrada: number;
  // A dónde lleva. Solo las islas disponibles tienen ruta.
  ruta?: string;
};

export const RUTA_MUNDOS = "/explorar";
export const RUTA_MEDICINA_INTERNA = "/explorar/medicina-interna";
export const RUTA_ENDOCRINOLOGIA = "/explorar/medicina-interna/endocrinologia";

// Mismo reparto para mundos y territorios: la isla disponible al centro y las demás a su alrededor.
const DISPOSICION: Array<Pick<IslaDato, "pos" | "ancho" | "entrada">> = [
  { pos: { x: 50, y: 46 }, ancho: 28, entrada: 0 },
  { pos: { x: 17, y: 62 }, ancho: 18, entrada: 60 },
  { pos: { x: 83, y: 25 }, ancho: 18, entrada: 110 },
  { pos: { x: 74, y: 70 }, ancho: 18, entrada: 150 },
];

type Base = Pick<IslaDato, "id" | "nombre" | "estado" | "icono" | "ruta">;

function disponer(bases: Base[]): IslaDato[] {
  return bases.map((base, index) => ({ ...base, ...DISPOSICION[index] }));
}

export const MUNDOS: IslaDato[] = disponer([
  {
    id: "medicina-interna",
    nombre: "Medicina Interna",
    estado: "disponible",
    icono: "estetoscopio",
    ruta: RUTA_MEDICINA_INTERNA,
  },
  { id: "pediatria", nombre: "Pediatría", estado: "proximamente", icono: "osito" },
  {
    id: "gineco-obstetricia",
    nombre: "Ginecología y Obstetricia",
    estado: "proximamente",
    icono: "luna-gota",
  },
  { id: "emergencias", nombre: "Emergencias", estado: "proximamente", icono: "sirena" },
]);

// Territorios de Medicina Interna. Endocrinología es el único con casos.
export const TERRITORIOS: IslaDato[] = disponer([
  {
    id: "endocrinologia",
    nombre: "Endocrinología",
    estado: "disponible",
    icono: "tiroides",
    ruta: RUTA_ENDOCRINOLOGIA,
  },
  { id: "cardiologia", nombre: "Cardiología", estado: "proximamente", icono: "corazon" },
  { id: "infectologia", nombre: "Infectología", estado: "proximamente", icono: "microbio" },
  { id: "nefrologia", nombre: "Nefrología", estado: "proximamente", icono: "rinon" },
]);

export const MUNDO_ACTUAL = MUNDOS[0];
export const TERRITORIO_ACTUAL = TERRITORIOS[0];
export const TOTAL_TERRITORIOS = TERRITORIOS.length;
