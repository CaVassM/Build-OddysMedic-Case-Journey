// Los mundos (especialidades) del mapa de /explorar y /inicio.
// Solo nombres públicos: ningún tema ni diagnóstico (contrato de visibilidad).

export type MundoId = "medicina-interna" | "pediatria" | "gineco-obstetricia" | "emergencias";
export type MundoIcono = "estetoscopio" | "osito" | "luna-gota" | "sirena";
export type Posicion = { x: number; y: number };

export type Mundo = {
  id: MundoId;
  nombre: string;
  estado: "disponible" | "proximamente";
  icono: MundoIcono;
  // Centro de la cara superior de la isla, en % del lienzo (x de izquierda a derecha, y de arriba abajo).
  pos: Posicion;
  // El lienzo compacto es más ancho que alto: las islas se reparten distinto.
  posCompacta: Posicion;
  // Ancho del dibujo de la isla, en % del ancho del lienzo. La disponible es la más grande.
  ancho: number;
  anchoCompacto: number;
  // Dónde aparece en la secuencia de entrada, en ms: primero la isla disponible.
  entrada: number;
};

export const MUNDOS: Mundo[] = [
  {
    id: "medicina-interna",
    nombre: "Medicina Interna",
    estado: "disponible",
    icono: "estetoscopio",
    pos: { x: 50, y: 46 },
    posCompacta: { x: 38, y: 44 },
    ancho: 28,
    anchoCompacto: 26,
    entrada: 0,
  },
  {
    id: "pediatria",
    nombre: "Pediatría",
    estado: "proximamente",
    icono: "osito",
    pos: { x: 17, y: 62 },
    posCompacta: { x: 12, y: 54 },
    ancho: 18,
    anchoCompacto: 17,
    entrada: 60,
  },
  {
    id: "gineco-obstetricia",
    nombre: "Ginecología y Obstetricia",
    estado: "proximamente",
    icono: "luna-gota",
    pos: { x: 83, y: 25 },
    posCompacta: { x: 63, y: 36 },
    ancho: 18,
    anchoCompacto: 17,
    entrada: 110,
  },
  {
    id: "emergencias",
    nombre: "Emergencias",
    estado: "proximamente",
    icono: "sirena",
    pos: { x: 74, y: 70 },
    posCompacta: { x: 87, y: 58 },
    ancho: 18,
    anchoCompacto: 17,
    entrada: 150,
  },
];

// Territorios de Medicina Interna: Endocrinología es el único con casos; el resto se anuncia como «Muy pronto».
export const TERRITORIO_ACTIVO = "Endocrinología";
export const OTROS_TERRITORIOS = ["Cardiología", "Infectología", "Nefrología"];
export const TOTAL_TERRITORIOS = 1 + OTROS_TERRITORIOS.length;

export const RUTA_MEDICINA_INTERNA = "/explorar/medicina-interna";
