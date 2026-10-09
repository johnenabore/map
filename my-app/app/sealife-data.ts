// Generated: sea serpents and boats cut out of the map art (public/sealife/s-<name>.webp, with paper patches
// p-<name>.webp that hide the originals). Boxes are in map px (the map is 1679x937).
export interface SeaItem {
  name: string;
  kind: "serpent" | "ship";
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SEA_LIFE: SeaItem[] = [
  { name: "serpent-north", kind: "serpent", x: 566, y: 110, w: 158, h: 102 },
  { name: "serpent-south", kind: "serpent", x: 568, y: 474, w: 184, h: 114 },
  { name: "boat-west", kind: "ship", x: 315, y: 349, w: 52, h: 46 },
  { name: "boat-mid", kind: "ship", x: 430, y: 453, w: 56, h: 59 },
  { name: "boat-east", kind: "ship", x: 464, y: 453, w: 46, h: 54 },
];
