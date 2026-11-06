// Retratos ilustrados de pacientes ficticios. Se generan en local y no hacen peticiones de red.
// Estilo: Open Peeps de Pablo Stanley (CC0 1.0), servido por DiceBear (código MIT).
import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";

type Tone = "aqua" | "lavender";

const withoutExtras = { accessoriesProbability: 0, facialHairProbability: 0, maskProbability: 0 };

// La semilla es fija y el aspecto se elige por paciente, para que el retrato encaje con su edad y su caso.
const looks: Record<string, { tone: Tone; options: openPeeps.Options }> = {
  Bruno: {
    tone: "aqua",
    options: {
      head: ["short3"],
      face: ["smile"],
      skinColor: ["edb98a"],
      headContrastColor: ["2c1b18"],
      clothingColor: ["2e2a78"],
    },
  },
  Elena: {
    tone: "aqua",
    options: {
      head: ["grayBun"],
      face: ["tired"],
      skinColor: ["edb98a"],
      headContrastColor: ["e8e1e1"],
      clothingColor: ["8f8bc4"],
    },
  },
  Rafael: {
    tone: "aqua",
    options: {
      head: ["noHair2"],
      face: ["calm"],
      skinColor: ["d08b5b"],
      headContrastColor: ["4a312c"],
      clothingColor: ["43d6be"],
      facialHair: ["chin"],
      facialHairProbability: 100,
    },
  },
  Lucía: {
    tone: "aqua",
    options: {
      head: ["long"],
      face: ["smile"],
      skinColor: ["ffdbb4"],
      headContrastColor: ["2c1b18"],
      clothingColor: ["43d6be"],
    },
  },
  Marta: {
    tone: "lavender",
    options: {
      head: ["medium2"],
      face: ["calm"],
      skinColor: ["ae5d29"],
      headContrastColor: ["2c1b18"],
      clothingColor: ["2e2a78"],
    },
  },
  Sofía: {
    tone: "lavender",
    options: {
      head: ["longCurly"],
      face: ["calm"],
      skinColor: ["d08b5b"],
      headContrastColor: ["724133"],
      clothingColor: ["43d6be"],
    },
  },
  // Primer paciente de los territorios que aún no están disponibles.
  Cardiología: {
    tone: "lavender",
    options: {
      head: ["short1"],
      face: ["calm"],
      skinColor: ["edb98a"],
      headContrastColor: ["2c1b18"],
      clothingColor: ["8f8bc4"],
    },
  },
  Neurología: {
    tone: "lavender",
    options: {
      head: ["mediumStraight"],
      face: ["calm"],
      skinColor: ["d08b5b"],
      headContrastColor: ["2c1b18"],
      clothingColor: ["8f8bc4"],
    },
  },
  Emergencias: {
    tone: "lavender",
    options: {
      head: ["short4"],
      face: ["calm"],
      skinColor: ["ffdbb4"],
      headContrastColor: ["724133"],
      clothingColor: ["8f8bc4"],
    },
  },
};

export type PortraitName = keyof typeof looks;

const rendered = new Map<string, string>();

export function portraitSrc(name: PortraitName) {
  let uri = rendered.get(name);
  if (!uri) {
    uri = createAvatar(openPeeps, {
      seed: name,
      ...withoutExtras,
      ...looks[name].options,
    }).toDataUri();
    rendered.set(name, uri);
  }
  return uri;
}

export function portraitTone(name: PortraitName) {
  return looks[name].tone;
}
