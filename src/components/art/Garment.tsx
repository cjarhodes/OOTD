import { useId, type ReactNode } from "react";
import { hasBackdrop } from "@/lib/photo";
import { fitOf } from "@/lib/kinds";
import { PALETTE } from "@/lib/palette";
import type { Fit, Item, Kind, Slot } from "@/lib/types";

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
// A shirt worn open: the front edge stands well off centre so the tee shows.
const OPEN_SHIRT_LEFT = "M116 38 L102 44 L74 60 L66 132 L80 134 L88 92 L90 204 L113 204 L110 72 Z";
const OPEN_SHIRT_LAPEL = "M116 38 L126 50 L110 72 Z";
// Long sleeves, a closer fit than a sweater, for roll and mock necks.
const FINE_KNIT =
  "M104 48 Q130 58 156 48 L184 62 L194 138 L181 140 L173 94 L170 196 L90 196 L87 94 L79 140 L66 138 L76 62 Z";
const GILET_LEFT = "M118 40 L102 46 Q86 58 88 80 L88 188 L127 188 L127 72 Z";

function jacketLeft(hem: number) {
  return `M116 32 L92 38 L55 58 L42 150 L62 154 L72 92 L74 ${hem} L122 ${hem} L124 110 Z`;
}

/** One front of a jacket worn open: the edge stands off centre so the layers under it show. */
function jacketFrontLeft(hem: number) {
  return `M116 32 L92 38 L55 58 L42 150 L62 154 L72 92 L74 ${hem} L95 ${hem} L98 110 Z`;
}

/**
 * A jacket in three states. Closed, on its own. Worn open over other layers it
 * is drawn twice: `back` (the whole shape, shaded like a lining) goes under
 * the layers, `front` (two fronts, with the details clipped to them) goes over.
 */
function Jacket({ hem, color, state, children }: { hem: number; color: string; state: "closed" | "back" | "front"; children?: ReactNode }) {
  const clip = useId();
  if (state === "closed") return halves(jacketLeft(hem), color, children);
  if (state === "back") {
    // The lining: the whole shape with no gap down the middle, a shade darker.
    const middle = `M116 32 L144 32 L138 ${hem} L122 ${hem} Z`;
    return (
      <>
        {halves(jacketLeft(hem), color)}
        <path d={middle} fill={color} />
        {halves(jacketLeft(hem), "rgba(0,0,0,.28)")}
        <path d={middle} fill="rgba(0,0,0,.28)" />
      </>
    );
  }
  const left = jacketFrontLeft(hem);
  const edge = `M116 32 L98 110 L95 ${hem}`;
  return (
    <>
      <clipPath id={clip}>
        <path d={left} />
        <path d={left} transform={MIRROR} />
      </clipPath>
      {halves(left, color)}
      <g clipPath={`url(#${clip})`}>{children}</g>
      <path d={edge} fill="none" stroke={LINE} strokeWidth="1.2" />
      <path d={edge} fill="none" stroke={LINE} strokeWidth="1.2" transform={MIRROR} />
    </>
  );
}

const CORK = "#c8a77e";
const RUBBER = "#f4f2ec";

/** Two shoes, the back one up and to the left: `draw(dx, dy)` draws one at an offset. */
function pair(draw: (dx: number, dy: number) => ReactNode) {
  return (
    <>
      {draw(0, 0)}
      {draw(14, -8)}
    </>
  );
}

function shoeShapes(color: string, kind: Kind) {
  if (kind === "sandals")
    // A cork footbed with two straps across it.
    return pair((x, y) => (
      <g key={x}>
        <path d={`M${228 + x} ${228 + y} Q${228 + x} ${222 + y} ${236 + x} ${222 + y} L${270 + x} ${222 + y} Q${278 + x} ${222 + y} ${278 + x} ${228 + y} Z`} fill={CORK} />
        <rect x={228 + x} y={228 + y} width="50" height="3" fill="rgba(0,0,0,.4)" />
        <path d={`M${237 + x} ${222 + y} Q${244 + x} ${208 + y} ${251 + x} ${222 + y} Z M${255 + x} ${222 + y} Q${262 + x} ${207 + y} ${269 + x} ${222 + y} Z`} fill={color} />
        <circle cx={248 + x} cy={214 + y} r="1.6" fill="rgba(214,190,140,.95)" />
        <circle cx={266 + x} cy={213 + y} r="1.6" fill="rgba(214,190,140,.95)" />
      </g>
    ));
  if (kind === "clogs")
    // A rounded, closed toe with an open heel, on a cork sole.
    return pair((x, y) => (
      <g key={x}>
        <path d={`M${234 + x} ${224 + y} Q${236 + x} ${210 + y} ${252 + x} ${206 + y} Q${272 + x} ${204 + y} ${278 + x} ${224 + y} Z`} fill={color} />
        <rect x={230 + x} y={224 + y} width="50" height="4" fill={CORK} />
        <rect x={230 + x} y={228 + y} width="50" height="2.5" fill="rgba(0,0,0,.4)" />
        <path d={`M${246 + x} ${208 + y} L${250 + x} ${222 + y}`} stroke={LINE} strokeWidth="1.5" />
        <circle cx={249 + x} cy={215 + y} r="1.6" fill="rgba(214,190,140,.95)" />
      </g>
    ));
  if (kind === "high-tops")
    // Canvas to the ankle, rubber toe cap and sole.
    return pair((x, y) => (
      <g key={x}>
        <path d={`M${228 + x} ${224 + y} L${228 + x} ${194 + y} Q${228 + x} ${188 + y} ${236 + x} ${188 + y} L${246 + x} ${188 + y} L${250 + x} ${210 + y} Q${268 + x} ${214 + y} ${278 + x} ${222 + y} L${278 + x} ${224 + y} Z`} fill={color} />
        <rect x={228 + x} y={224 + y} width="50" height="6" fill={RUBBER} />
        <path d={`M${268 + x} ${224 + y} Q${276 + x} ${216 + y} ${278 + x} ${224 + y} Z`} fill={RUBBER} />
        <path d={`M${236 + x} ${194 + y} L${244 + x} ${198 + y} M${236 + x} ${200 + y} L${245 + x} ${204 + y} M${237 + x} ${206 + y} L${247 + x} ${210 + y}`} stroke={LINE} strokeWidth="1.2" />
        <path d={`M${228 + x} ${226 + y} L${278 + x} ${226 + y}`} stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      </g>
    ));
  if (kind === "trail")
    // Low and technical: a chunky lugged sole, toe bumper and lace cage.
    return pair((x, y) => (
      <g key={x}>
        <path d={`M${228 + x} ${222 + y} Q${228 + x} ${204 + y} ${238 + x} ${204 + y} L${248 + x} ${204 + y} Q${254 + x} ${212 + y} ${268 + x} ${215 + y} Q${278 + x} ${217 + y} ${278 + x} ${222 + y} Z`} fill={color} />
        <rect x={228 + x} y={222 + y} width="50" height="8" fill="#2b2b2b" />
        <path d={`M${232 + x} ${230 + y} l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3`} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
        <path d={`M${266 + x} ${222 + y} Q${274 + x} ${214 + y} ${278 + x} ${222 + y} Z`} fill="rgba(0,0,0,.35)" />
        <path d={`M${240 + x} ${206 + y} L${246 + x} ${218 + y} M${246 + x} ${206 + y} L${252 + x} ${218 + y} M${252 + x} ${209 + y} L${257 + x} ${219 + y}`} stroke="rgba(255,255,255,.35)" strokeWidth="1.3" />
      </g>
    ));
  const sole = kind === "runners" || kind === "canvas" ? 6 : kind === "loafers" ? 2 : 4;
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
      {(kind === "sneakers" || kind === "runners" || kind === "canvas") && <path d="M252 201 L260 210 M256 199 L264 208" stroke={LINE} strokeWidth="1.2" />}
      {kind === "canvas" && (
        <>
          <path d="M268 230 Q278 222 278 230 Z M280 222 Q290 213 290 222 Z" fill="#f4f2ec" />
          <path d="M232 224 L276 224 M247 216 L289 216" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        </>
      )}
    </>
  );
}

/** How far each hem moves out from a regular leg, per fit. */
const LEG_FLARE: Record<Fit, number> = { slim: -4, regular: 0, relaxed: 3, boxy: 3, wide: 7 };

function bottomShape(color: string, kind: Kind, fit: Fit) {
  const hem = kind === "shorts" ? 112 : 196;
  const crotch = kind === "shorts" ? 78 : 84;
  const f = LEG_FLARE[fit];
  const inner = f * 0.4;
  return (
    <>
      <path
        d={`M232 36 L288 36 L${291 + f} ${hem} L${266 - inner} ${hem} L260 ${crotch} L${254 + inner} ${hem} L${229 - f} ${hem} Z`}
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
      {kind === "cargos" && (
        <path d={`M${229 - f * 0.6} 104 L250 104 L250 132 L${229 - f * 0.7} 132 Z M270 104 L${291 + f * 0.6} 104 L${291 + f * 0.7} 132 L270 132 Z`} fill="rgba(0,0,0,.12)" />
      )}
      {kind === "sweatpants" && (
        <>
          <path d={`M${229 - f} ${hem - 10} L${254 + inner} ${hem - 10} L${254 + inner} ${hem} L${229 - f} ${hem} Z M${266 - inner} ${hem - 10} L${291 + f} ${hem - 10} L${291 + f} ${hem} L${266 - inner} ${hem} Z`} fill="rgba(0,0,0,.14)" />
          <path d="M256 44 L254 62 M264 44 L266 62" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
        </>
      )}
      {kind === "trousers" && (
        <path d={`M243 50 L242 ${hem} M277 50 L278 ${hem}`} stroke="rgba(255,255,255,.14)" strokeWidth="1.2" />
      )}
    </>
  );
}

/** `body` is the garment; `top` its collar, over the next layer; `back` and `front` an open jacket's two passes. */
export type ArtPart = "body" | "top" | "back" | "front";

/** Draw one garment. `top` is the part that sits over the next layer (a shirt collar). */
export function GarmentShape({ item, part = "body" }: { item: Item; part?: ArtPart }) {
  const c = PALETTE[item.color].hex;
  const k = item.kind;
  const stripe = item.pattern === "stripe";

  const state = part === "back" ? "back" : part === "front" ? "front" : "closed";

  if (part === "top") {
    if (k === "oxford" || k === "flannel") return <path d={SHIRT_COLLAR} fill={c} stroke={LINE} strokeWidth="1" />;
    if (k === "rugby") return <path d={SHIRT_COLLAR} fill="#f4f2ec" stroke={LINE} strokeWidth="1" />;
    if (k === "polo") return <path d="M116 46 L128 58 L130 50 L132 58 L144 46 L140 42 L130 50 L120 42 Z" fill={c} stroke={LINE} strokeWidth="1" />;
    if (k === "camp-shirt") return <path d={CAMP_COLLAR} fill={c} stroke={LINE} strokeWidth="1" />;
    return null;
  }

  // Check lines show up on any colour: light on dark cloth, dark on light.
  const checkInk = PALETTE[item.color].lightness < 0.4 ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.18)";
  const checks =
    item.pattern === "check" ? (
      <path
        d="M90 76 L170 76 M88 106 L172 106 M88 136 L172 136 M88 166 L172 166 M88 196 L172 196 M104 52 L104 204 M130 54 L130 204 M156 52 L156 204"
        stroke={checkInk}
        strokeWidth="6"
      />
    ) : null;
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
    case "long-sleeve":
      return (
        <>
          <path d={FINE_KNIT} fill={c} />
          <path d="M104 48 Q130 60 156 48" fill="none" stroke={LINE} strokeWidth="3" />
          {stripes}
        </>
      );
    case "rugby":
      return (
        <>
          <path d={FINE_KNIT} fill={c} />
          {stripes}
          <path d="M122 50 L138 50 L138 84 L122 84 Z" fill="#f4f2ec" />
          <path d="M130 54 L130 80" stroke={LINE} strokeWidth="1.2" />
          <path d={SHIRT_COLLAR} fill="#f4f2ec" stroke={LINE} strokeWidth="1" />
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
          <path d={FINE_KNIT} fill={c} />
          <path d="M90 188 L170 188 L170 196 L90 196 Z" fill={SHADE} opacity=".6" />
          <path d={`M114 ${top} L146 ${top} L146 52 Q130 58 114 52 Z`} fill={c} />
          <path d={`M114 ${top} L146 ${top} L146 52 Q130 58 114 52 Z`} fill={SHADE} opacity=".6" />
        </>
      );
    }
    case "oxford":
    case "camp-shirt":
    case "flannel":
      // Worn open over a tee: two fronts with the tee showing between them.
      if (item.front === "open")
        return (
          <>
            {halves(OPEN_SHIRT_LEFT, c)}
            {item.pattern === "check" && (
              <>
                <path d="M78 100 L112 100 M76 140 L112 140 M78 180 L112 180 M96 60 L98 204" stroke={checkInk} strokeWidth="6" />
                <path d="M78 100 L112 100 M76 140 L112 140 M78 180 L112 180 M96 60 L98 204" stroke={checkInk} strokeWidth="6" transform={MIRROR} />
              </>
            )}
            {stripe && (
              <>
                <path d="M100 66 L102 204 M84 96 L86 204" stroke="rgba(255,255,255,.45)" strokeWidth="5" />
                <path d="M100 66 L102 204 M84 96 L86 204" stroke="rgba(255,255,255,.45)" strokeWidth="5" transform={MIRROR} />
              </>
            )}
            {halves(OPEN_SHIRT_LAPEL, SHADE)}
          </>
        );
      return (
        <>
          <path d={SHIRT} fill={c} />
          <path d="M130 52 L130 204" stroke="rgba(0,0,0,.14)" strokeWidth="1.2" />
          {checks}
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
    case "fleece":
      return (
        <>
          <path d={KNIT_CREW} fill={c} />
          <path d="M88 182 L172 182 L172 190 L88 190 Z" fill={SHADE} />
          <path d="M110 28 L150 28 L148 52 L112 52 Z" fill={c} />
          <path d="M110 28 L150 28 L148 52 L112 52 Z" fill={SHADE} opacity=".5" />
          <path d="M130 28 L130 96" stroke="rgba(0,0,0,.35)" strokeWidth="1.8" />
          <path d="M142 72 L166 72 L166 96 L142 96 Z" fill="rgba(0,0,0,.18)" />
          <path d="M70 66 Q130 80 190 66" stroke="rgba(255,255,255,.1)" strokeWidth="8" fill="none" />
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
      return (
        <Jacket hem={222} color={c} state={state}>
        <>
          <path d="M116 32 L104 42 L114 60 Z M144 32 L156 42 L146 60 Z" fill={SHADE} />
          <path d="M84 120 L110 120 L110 146 L84 146 Z M150 120 L176 120 L176 146 L150 146 Z M90 80 L110 80 L110 98 L90 98 Z" fill="rgba(0,0,0,.1)" />
        </>
        </Jacket>
      );
    case "waxed-jacket":
      return (
        <Jacket hem={222} color={c} state={state}>
        <>
          <path d="M104 36 Q130 46 156 36 L152 28 Q130 38 108 28 Z" fill="#5b4636" />
          <path d="M82 140 L112 140 L112 150 L82 150 Z M148 140 L178 140 L178 150 L148 150 Z" fill="rgba(0,0,0,.16)" />
          <path d="M70 70 Q130 82 190 70" stroke="rgba(255,255,255,.08)" strokeWidth="10" fill="none" />
        </>
        </Jacket>
      );
    case "blazer":
    case "overcoat": {
      const hem = k === "overcoat" ? 250 : 214;
      return (
        <Jacket hem={hem} color={c} state={state}>
        <>
          <path d="M116 32 L124 110 L110 72 L102 40 Z M144 32 L136 110 L150 72 L158 40 Z" fill={SHADE} />
          <circle cx="124" cy="132" r="2.5" fill="rgba(0,0,0,.35)" />
          <path d={`M86 ${hem - 70} L110 ${hem - 72} M150 ${hem - 72} L174 ${hem - 70}`} stroke={LINE} strokeWidth="1.5" />
        </>
        </Jacket>
      );
    }
    case "bomber":
      return (
        <Jacket hem={196} color={c} state={state}>
        <>
          <path d="M108 30 Q130 40 152 30 L150 40 Q130 48 110 40 Z" fill="rgba(0,0,0,.25)" />
          <path d="M74 188 L122 188 L122 196 L74 196 Z M138 188 L186 188 L186 196 L138 196 Z" fill="rgba(0,0,0,.22)" />
        </>
        </Jacket>
      );
    case "denim-jacket":
      return (
        <Jacket hem={186} color={c} state={state}>
        <>
          <path d="M116 32 L100 40 L112 62 Z M144 32 L160 40 L148 62 Z" fill={SHADE} />
          <path d="M88 84 L112 84 L112 100 L88 100 Z M148 84 L172 84 L172 100 L148 100 Z" fill="rgba(0,0,0,.16)" />
          <path d="M72 112 L124 112 M136 112 L188 112 M74 176 L122 176 M138 176 L186 176" stroke="rgba(214,170,110,.6)" strokeWidth="1.2" />
          <circle cx="124" cy="130" r="2.5" fill="rgba(214,170,110,.9)" />
          <circle cx="124" cy="156" r="2.5" fill="rgba(214,170,110,.9)" />
        </>
        </Jacket>
      );
    case "rain-shell":
      return (
        <>
          {state !== "front" && <path d="M106 40 Q100 14 130 12 Q160 14 154 40 Z" fill={c} />}
          <Jacket hem={220} color={c} state={state}>
            <path d="M124 40 L124 220 M136 40 L136 220" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
          </Jacket>
        </>
      );
    case "puffer":
      return (
        <Jacket hem={208} color={c} state={state}>
        <path d="M50 80 L210 80 M47 110 L213 110 M45 140 L215 140 M74 170 L186 170 M74 196 L186 196" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
        </Jacket>
      );
    case "jeans":
    case "chinos":
    case "trousers":
    case "shorts":
    case "cargos":
    case "sweatpants":
      return bottomShape(c, k, fitOf(item));
    case "sneakers":
    case "runners":
    case "loafers":
    case "boots":
    case "canvas":
    case "high-tops":
    case "trail":
    case "sandals":
    case "clogs":
      return shoeShapes(c, k);
    default: {
      // Every kind needs a drawing: a new kind without one fails to compile here.
      const missing: never = k;
      return missing;
    }
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

/** How wide an upper-body cut is drawn, around the body's centre line. */
const UPPER_WIDTH: Record<Fit, number> = { slim: 0.93, regular: 1, relaxed: 1.05, boxy: 1.1, wide: 1.1 };

/** Width and height scale for a piece's cut. Boxy pieces are also drawn a little shorter. */
function fitScale(item: Item): [number, number] {
  if (item.slot === "bottom" || item.slot === "shoes") return [1, 1];
  const fit = fitOf(item);
  return [UPPER_WIDTH[fit], fit === "boxy" ? 0.95 : 1];
}

export function GarmentArt({ item, part = "body", box }: { item: Item; part?: ArtPart; box?: [number, number, number, number] }) {
  if (item.image) {
    if (part !== "body") return null;
    const [x, y, w, h] = box ?? SLOT_BOX[item.slot];
    if (hasBackdrop(item.image)) return <PhotoPrint href={item.image} box={[x, y, w, h]} />;
    return <image href={item.image} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />;
  }
  const [sx, sy] = fitScale(item);
  if (sx === 1 && sy === 1) return <GarmentShape item={item} part={part} />;
  // Scale from the collar point, so collars and hems still line up between layers.
  return (
    <g transform={`translate(130 40) scale(${sx} ${sy}) translate(-130 -40)`}>
      <GarmentShape item={item} part={part} />
    </g>
  );
}

/**
 * A photo that still has its background, shown as a small framed print in its
 * slot instead of a full-size rectangle that would cover the other layers.
 */
function PhotoPrint({ href, box: [x, y, w, h] }: { href: string; box: [number, number, number, number] }) {
  const clip = useId();
  const side = Math.min(w, h) * 0.72;
  const px = x + (w - side) / 2;
  const py = y + (h - side) / 2;
  const border = Math.max(2, side * 0.04);
  return (
    <g>
      <rect x={px - border} y={py - border} width={side + border * 2} height={side + border * 2} rx={3} fill="#fbfaf7" />
      <clipPath id={clip}>
        <rect x={px} y={py} width={side} height={side} rx={2} />
      </clipPath>
      <image href={href} x={px} y={py} width={side} height={side} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
    </g>
  );
}

/** The tile crop, widened for a roomy cut so it isn't clipped. */
function cropFor(item: Item): string {
  const [x, y, w, h] = SLOT_CROP[item.slot].split(" ").map(Number) as [number, number, number, number];
  const [sx] = fitScale(item);
  if (item.image || sx <= 1) return SLOT_CROP[item.slot];
  const grow = (w * (sx - 1)) / 2;
  return `${x - grow} ${y} ${w + grow * 2} ${h}`;
}

/** A single garment framed on its own. `decorative` when its name is already written beside it. */
export function GarmentTile({ item, label, decorative = false }: { item: Item; label?: string; decorative?: boolean }) {
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image} alt={decorative ? "" : (label ?? item.name)} className={`garment-svg garment-img${hasBackdrop(item.image) ? " backdrop" : ""}`} />;
  }
  return (
    <svg viewBox={cropFor(item)} {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label ?? item.name })} className="garment-svg">
      <g className="cutout">
        <GarmentArt item={item} />
      </g>
    </svg>
  );
}
