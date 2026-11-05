import type { ReactNode } from "react";
import { PALETTE } from "@/lib/palette";
import type { Item, Kind, Slot } from "@/lib/types";

/**
 * Original garment illustrations for the sample wardrobe. Every upper-body
 * piece is drawn in one shared 320×260 space (centred on x=130) so layers stack
 * correctly: the outer layer behind, the base collar and hem peeking out.
 * Bottoms sit at x≈230–292, shoes below them.
 */

const SHADE = "rgba(0,0,0,.16)";
const LINE = "rgba(0,0,0,.22)";
const MIRROR = "translate(260 0) scale(-1 1)";

function halves(left: string, color: string, extra?: ReactNode) {
  return (
    <>
      <path d={left} fill={color} />
      <path d={left} fill={color} transform={MIRROR} />
      {extra}
    </>
  );
}

/* ---------- upper-body shapes ---------- */

const TEE = "M104 48 Q130 60 156 48 L186 62 L178 90 L166 86 L166 198 L94 198 L94 86 L82 90 L74 62 Z";
const SHIRT =
  "M102 46 L116 40 L130 50 L144 40 L158 46 L186 62 L194 132 L180 134 L172 92 L170 204 L90 204 L88 92 L80 134 L66 132 L74 62 Z";
const SHIRT_COLLAR = "M114 40 L130 62 L146 40 L139 34 L130 46 L121 34 Z";
const CAMP_COLLAR = "M110 42 L130 64 L150 42 L142 37 L130 52 L118 37 Z";
const KNIT_CREW =
  "M100 48 L118 42 Q130 54 142 42 L160 48 L190 66 L198 140 L182 143 L174 96 L172 190 L88 190 L86 96 L78 143 L62 140 L70 66 Z";
const KNIT_V =
  "M100 48 L118 42 L130 72 L142 42 L160 48 L190 66 L198 140 L182 143 L174 96 L172 190 L88 190 L86 96 L78 143 L62 140 L70 66 Z";
const KNIT_RIBS = "M88 182 L172 182 L172 190 L88 190 Z M78 135 L62 132 L62 140 L78 143 Z M182 135 L198 132 L198 140 L182 143 Z";
const CARDIGAN_LEFT = "M118 42 L100 48 L70 66 L62 140 L78 143 L86 96 L88 190 L127 190 L127 98 Z";
const OVERSHIRT_LEFT = "M118 38 L98 44 L68 62 L58 137 L74 140 L84 94 L86 200 L128 200 L128 70 Z";
const GILET_LEFT = "M118 40 L102 46 Q86 58 88 80 L88 188 L127 188 L127 72 Z";

function jacketLeft(hem: number) {
  return `M116 32 L92 38 L55 58 L42 150 L62 154 L72 92 L74 ${hem} L122 ${hem} L124 110 Z`;
}

function shoeShapes(color: string, kind: Kind) {
  const sole = kind === "runners" ? 6 : kind === "loafers" ? 2 : 4;
  const boot = kind === "boots";
  const back = boot
    ? "M228 230 L228 200 L246 200 L250 214 Q268 218 278 222 L278 230 Z"
    : "M228 214 Q228 204 237 204 L249 204 Q253 214 268 218 Q278 220 278 230 L228 230 Z";
  const front = boot
    ? "M242 222 L242 192 L260 192 L264 206 Q282 210 290 214 L290 222 Z"
    : "M244 206 Q244 197 252 197 L262 197 Q266 207 280 211 Q290 213 290 222 L244 222 Z";
  const soleColor = kind === "loafers" || kind === "boots" ? "rgba(0,0,0,.35)" : "#f4f2ec";
  return (
    <>
      <path d={back} fill={color} />
      <rect x="228" y={230 - sole} width="50" height={sole} fill={soleColor} />
      <path d={front} fill={color} />
      <rect x="244" y={222 - sole} width="46" height={sole} fill={soleColor} />
      {kind === "loafers" && <path d="M252 202 L262 204" stroke={LINE} strokeWidth="2" />}
      {(kind === "sneakers" || kind === "runners") && <path d="M252 201 L260 210 M256 199 L264 208" stroke={LINE} strokeWidth="1.2" />}
    </>
  );
}

function bottomShape(color: string, kind: Kind) {
  const hem = kind === "shorts" ? 112 : 196;
  const crotch = kind === "shorts" ? 78 : 84;
  return (
    <>
      <path
        d={`M232 36 L288 36 L291 ${hem} L266 ${hem} L260 ${crotch} L254 ${hem} L229 ${hem} Z`}
        fill={color}
      />
      <path d="M232 36 L288 36 L288.4 44 L231.6 44 Z" fill="rgba(0,0,0,.18)" />
      {kind === "jeans" && (
        <path
          d={`M236 46 Q244 58 252 46 M268 46 Q276 58 284 46 M241 ${hem - 2} L243 60 M279 ${hem - 2} L277 60`}
          fill="none"
          stroke="rgba(214,170,110,.55)"
          strokeWidth="1"
        />
      )}
      {kind === "trousers" && (
        <path d={`M243 50 L242 ${hem} M277 50 L278 ${hem}`} stroke="rgba(255,255,255,.14)" strokeWidth="1.2" />
      )}
    </>
  );
}

export type ArtPart = "body" | "top";

/** Draw one garment. `top` is the part that sits over the next layer (a shirt collar). */
export function GarmentShape({ item, part = "body" }: { item: Item; part?: ArtPart }) {
  const c = PALETTE[item.color].hex;
  const k = item.kind;
  const stripe = item.pattern === "stripe";

  if (part === "top") {
    if (k === "oxford") return <path d={SHIRT_COLLAR} fill={c} stroke={LINE} strokeWidth="1" />;
    if (k === "polo") return <path d="M116 46 L128 58 L130 50 L132 58 L144 46 L140 42 L130 50 L120 42 Z" fill={c} stroke={LINE} strokeWidth="1" />;
    if (k === "camp-shirt") return <path d={CAMP_COLLAR} fill={c} stroke={LINE} strokeWidth="1" />;
    return null;
  }

  const stripes = stripe ? (
    <path
      d="M100 70 L160 70 M96 90 L164 90 M94 110 L166 110 M94 130 L166 130 M94 150 L166 150 M94 170 L166 170 M94 190 L166 190"
      stroke="rgba(255,255,255,.45)"
      strokeWidth="5"
    />
  ) : null;

  switch (k) {
    case "tee":
    case "henley":
      return (
        <>
          <path d={TEE} fill={c} />
          <path d="M104 48 Q130 60 156 48" fill="none" stroke={LINE} strokeWidth="3" />
          {k === "henley" && <path d="M130 56 L130 84" stroke={LINE} strokeWidth="1.5" />}
          {stripes}
        </>
      );
    case "polo":
      return (
        <>
          <path d={TEE} fill={c} />
          <path d="M130 52 L130 78" stroke={LINE} strokeWidth="1.5" />
        </>
      );
    case "turtleneck":
    case "mock-neck": {
      const top = k === "turtleneck" ? 28 : 38;
      return (
        <>
          <path d={TEE} fill={c} />
          <path d={`M114 ${top} L146 ${top} L146 52 Q130 58 114 52 Z`} fill={c} />
          <path d={`M114 ${top} L146 ${top} L146 52 Q130 58 114 52 Z`} fill={SHADE} opacity=".6" />
        </>
      );
    }
    case "oxford":
    case "camp-shirt":
      return (
        <>
          <path d={SHIRT} fill={c} />
          <path d="M130 52 L130 204" stroke="rgba(0,0,0,.14)" strokeWidth="1.2" />
          {stripe && (
            <path d="M110 60 L110 204 M150 60 L150 204 M96 80 L96 204 M164 80 L164 204" stroke="rgba(255,255,255,.45)" strokeWidth="5" />
          )}
          <path d={k === "camp-shirt" ? CAMP_COLLAR : SHIRT_COLLAR} fill={c} stroke={LINE} strokeWidth="1" />
        </>
      );
    case "crewneck":
    case "sweatshirt":
    case "v-neck":
      return (
        <>
          <path d={k === "v-neck" ? KNIT_V : KNIT_CREW} fill={c} />
          <path d={KNIT_RIBS} fill={SHADE} />
          {k !== "v-neck" && <path d="M118 42 Q130 54 142 42" fill="none" stroke={SHADE} strokeWidth="3" />}
        </>
      );
    case "quarter-zip":
      return (
        <>
          <path d={KNIT_CREW} fill={c} />
          <path d={KNIT_RIBS} fill={SHADE} />
          <path d="M112 34 L148 34 L146 52 L114 52 Z" fill={c} />
          <path d="M112 34 L148 34 L146 52 L114 52 Z" fill={SHADE} opacity=".7" />
          <path d="M130 34 L130 84" stroke="rgba(0,0,0,.35)" strokeWidth="1.6" />
        </>
      );
    case "hoodie":
      return (
        <>
          <path d="M106 50 Q100 20 130 18 Q160 20 154 50 Z" fill={c} />
          <path d="M114 48 Q112 30 130 30 Q148 30 146 48 Z" fill="rgba(0,0,0,.2)" />
          <path d={KNIT_CREW} fill={c} />
          <path d={KNIT_RIBS} fill={SHADE} />
          <path d="M104 138 L156 138 L162 170 L98 170 Z" fill="rgba(0,0,0,.1)" />
        </>
      );
    case "cardigan":
      return halves(
        CARDIGAN_LEFT,
        c,
        <>
          <path d={KNIT_RIBS} fill={SHADE} />
          {[110, 130, 150, 170].map((y) => (
            <circle key={y} cx="124" cy={y} r="2" fill="rgba(0,0,0,.35)" />
          ))}
        </>,
      );
    case "overshirt":
      return halves(
        OVERSHIRT_LEFT,
        c,
        <>
          <path d="M118 38 L128 70 L108 50 Z M142 38 L132 70 L152 50 Z" fill={SHADE} />
          <path d="M98 84 L118 84 L118 104 L98 104 Z M142 84 L162 84 L162 104 L142 104 Z" fill="rgba(0,0,0,.1)" />
        </>,
      );
    case "gilet":
      return halves(
        GILET_LEFT,
        c,
        <path d="M90 90 L170 90 M88 115 L172 115 M88 140 L172 140 M88 165 L172 165" stroke={SHADE} strokeWidth="1.5" />,
      );
    case "chore-coat":
      return halves(
        jacketLeft(222),
        c,
        <>
          <path d="M116 32 L104 42 L114 60 Z M144 32 L156 42 L146 60 Z" fill={SHADE} />
          <path d="M84 120 L110 120 L110 146 L84 146 Z M150 120 L176 120 L176 146 L150 146 Z M90 80 L110 80 L110 98 L90 98 Z" fill="rgba(0,0,0,.1)" />
        </>,
      );
    case "waxed-jacket":
      return halves(
        jacketLeft(222),
        c,
        <>
          <path d="M104 36 Q130 46 156 36 L152 28 Q130 38 108 28 Z" fill="#5b4636" />
          <path d="M82 140 L112 140 L112 150 L82 150 Z M148 140 L178 140 L178 150 L148 150 Z" fill="rgba(0,0,0,.16)" />
          <path d="M70 70 Q130 82 190 70" stroke="rgba(255,255,255,.08)" strokeWidth="10" fill="none" />
        </>,
      );
    case "blazer":
    case "overcoat": {
      const hem = k === "overcoat" ? 250 : 214;
      return halves(
        jacketLeft(hem),
        c,
        <>
          <path d="M116 32 L124 110 L110 72 L102 40 Z M144 32 L136 110 L150 72 L158 40 Z" fill={SHADE} />
          <circle cx="124" cy="132" r="2.5" fill="rgba(0,0,0,.35)" />
          <path d={`M86 ${hem - 70} L110 ${hem - 72} M150 ${hem - 72} L174 ${hem - 70}`} stroke={LINE} strokeWidth="1.5" />
        </>,
      );
    }
    case "bomber":
      return halves(
        jacketLeft(196),
        c,
        <>
          <path d="M108 30 Q130 40 152 30 L150 40 Q130 48 110 40 Z" fill="rgba(0,0,0,.25)" />
          <path d="M74 188 L122 188 L122 196 L74 196 Z M138 188 L186 188 L186 196 L138 196 Z" fill="rgba(0,0,0,.22)" />
        </>,
      );
    case "rain-shell":
      return (
        <>
          <path d="M106 40 Q100 14 130 12 Q160 14 154 40 Z" fill={c} />
          {halves(jacketLeft(220), c, <path d="M124 40 L124 220 M136 40 L136 220" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />)}
        </>
      );
    case "puffer":
      return halves(
        jacketLeft(208),
        c,
        <path d="M50 80 L210 80 M47 110 L213 110 M45 140 L215 140 M74 170 L186 170 M74 196 L186 196" stroke="rgba(0,0,0,.18)" strokeWidth="2" />,
      );
    case "jeans":
    case "chinos":
    case "trousers":
    case "shorts":
      return bottomShape(c, k);
    case "sneakers":
    case "runners":
    case "loafers":
    case "boots":
      return shoeShapes(c, k);
  }
}

/** Where a photo cut-out sits, per slot, in the shared drawing space. */
export const SLOT_BOX: Record<Slot, [number, number, number, number]> = {
  outer: [36, 24, 188, 228],
  mid: [56, 36, 148, 160],
  base: [62, 30, 136, 178],
  bottom: [222, 30, 76, 170],
  shoes: [222, 192, 72, 42],
};

/** Crop of the shared space that frames a single garment on its own. */
export const SLOT_CROP: Record<Slot, string> = {
  outer: "34 8 192 248",
  mid: "54 14 152 182",
  base: "60 24 140 186",
  bottom: "220 28 80 172",
  shoes: "222 186 74 48",
};

export function GarmentArt({ item, part = "body", box }: { item: Item; part?: ArtPart; box?: [number, number, number, number] }) {
  if (item.image) {
    if (part === "top") return null;
    const [x, y, w, h] = box ?? SLOT_BOX[item.slot];
    return <image href={item.image} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />;
  }
  return <GarmentShape item={item} part={part} />;
}

/** A single garment framed on its own, for wardrobe tiles. */
export function GarmentTile({ item, label }: { item: Item; label?: string }) {
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image} alt={label ?? item.name} className="garment-svg garment-img" />;
  }
  return (
    <svg viewBox={SLOT_CROP[item.slot]} role="img" aria-label={label ?? item.name} className="garment-svg">
      <g className="cutout">
        <GarmentArt item={item} />
      </g>
    </svg>
  );
}
