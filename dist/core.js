export const CATEGORIES = ["Tops", "Bottoms", "Shoes", "Layers"];
export const COLORS = {
  White: "#e9e5dc",
  Cream: "#d8cbb3",
  Black: "#30302d",
  Navy: "#303f53",
  Blue: "#7895ad",
  Olive: "#797b5b",
  Brown: "#81624c",
  Grey: "#96958f",
  Burgundy: "#85484c",
  Green: "#45634e",
};
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateObject(value) {
  return new Date(`${value}T12:00:00`);
}
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(dateObject(value).getTime()) &&
    dateKey(dateObject(value)) === value
  );
}
export function addDays(value, n) {
  const d = dateObject(value);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
const seed = [
  ["t1", "Heavyweight white tee", "Tops", "White", "tee", 1, 1, 0],
  ["t2", "Oxford button-down", "Tops", "Blue", "shirt", 2, 1, 0],
  ["t3", "Black everyday tee", "Tops", "Black", "tee", 1, 1, 0],
  ["t4", "Ecru knit polo", "Tops", "Cream", "polo", 2, 2, 1],
  ["t5", "Burgundy pocket tee", "Tops", "Burgundy", "tee", 1, 1, 2],
  ["t6", "Striped camp-collar shirt", "Tops", "Green", "shirt", 2, 1, 2],
  ["b1", "Straight-leg indigo denim", "Bottoms", "Navy", "jeans", 1, 2, 0],
  ["b2", "Pleated charcoal trousers", "Bottoms", "Grey", "trousers", 3, 2, 1],
  ["b3", "Relaxed olive chinos", "Bottoms", "Olive", "trousers", 2, 2, 1],
  ["b4", "Ecru straight-leg jeans", "Bottoms", "Cream", "jeans", 1, 2, 2],
  ["s1", "Off-white leather sneakers", "Shoes", "White", "sneakers", 2, 1, 0],
  ["s2", "Chocolate suede loafers", "Shoes", "Brown", "loafers", 3, 1, 2],
  ["s3", "Black leather boots", "Shoes", "Black", "boots", 3, 3, 1],
  ["s4", "Grey suede runners", "Shoes", "Grey", "sneakers", 1, 1, 1],
  ["l1", "Olive cotton overshirt", "Layers", "Olive", "overshirt", 2, 2, 1],
  ["l2", "Oatmeal crewneck knit", "Layers", "Cream", "sweater", 2, 3, 0],
  ["l3", "Navy unstructured blazer", "Layers", "Navy", "blazer", 3, 2, 1],
  ["l4", "Black rain shell", "Layers", "Black", "jacket", 1, 3, 0],
];
export function sampleItems() {
  return seed.map(
    ([id, name, category, color, kind, formality, warmth, boldness]) => ({
      id,
      name,
      category,
      color,
      kind,
      formality,
      warmth,
      boldness,
      fit: "Relaxed / straight",
      status: "available",
      waterproof: kind === "boots" || kind === "jacket",
      delicate: kind === "loafers",
      image: `assets/${id}.svg`,
      sample: true,
    }),
  );
}
export function emptyState(demo = false) {
  return {
    version: 1,
    items: demo ? sampleItems() : [],
    plans: {},
    wears: [],
    feedback: {},
    preferences: { city: null, comfort: "neutral", adventure: 1 },
    created: dateKey(),
  };
}
const neutrals = ["White", "Cream", "Black", "Navy", "Grey", "Brown"];
function harmony(a, b) {
  if (a === b) return 0.2;
  if (neutrals.includes(a) && neutrals.includes(b)) return 1.4;
  if (neutrals.includes(a) || neutrals.includes(b)) return 1;
  return -0.7;
}
export function outfitItems(outfit, items) {
  return (outfit?.ids || [])
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);
}
export function isWearable(outfit, items) {
  const used = outfitItems(outfit, items);
  return (
    used.length === outfit?.ids?.length &&
    ["Tops", "Bottoms", "Shoes"].every((c) =>
      used.some((i) => i.category === c),
    ) &&
    used.every((i) => i.status === "available")
  );
}
export function generateOutfits({
  items,
  occasion = "Office day",
  weather = null,
  date = dateKey(),
  wears = [],
  feedback = {},
  pin = null,
  nonce = 0,
  comfort = "neutral",
  adventure = 1,
}) {
  const available = items.filter((i) => i.status === "available");
  const wearCounts = new Map();
  for (const wear of wears)
    for (const id of wear.ids)
      wearCounts.set(id, (wearCounts.get(id) || 0) + 1);
  const recentSignatures = new Set(
    wears
      .filter((w) => w.date <= date && w.date >= addDays(date, -3))
      .map((w) => [...w.ids].sort().join("|")),
  );
  const sets = Object.fromEntries(
    CATEGORIES.map((c) => {
      let pool = available.filter((i) => i.category === c);
      const pinned = pool.find((i) => i.id === pin);
      if (pinned) pool = [pinned];
      else {
        pool.sort(
          (a, b) =>
            (wearCounts.get(a.id) || 0) - (wearCounts.get(b.id) || 0) ||
            a.id.localeCompare(b.id),
        );
        if (pool.length > 16) {
          const offset = nonce % pool.length;
          pool = [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, 16);
        }
      }
      return [c, pool];
    }),
  );
  if (["Tops", "Bottoms", "Shoes"].some((c) => !sets[c].length)) return [];
  const temp = weather?.high ?? null;
  const cold =
    temp !== null &&
    temp < (comfort === "cold" ? 21 : comfort === "warm" ? 13 : 17);
  const hot = temp !== null && temp > 26;
  const wet = (weather?.rain ?? 0) >= 45;
  if (cold && !sets.Layers.length) return [];
  let layers = cold ? sets.Layers : [null, ...sets.Layers];
  if (hot)
    layers = wet ? [null, ...sets.Layers.filter((i) => i.waterproof)] : [null];
  const formal =
    occasion === "Customer meeting"
      ? 2.5
      : occasion === "Dinner out"
        ? 2
        : occasion === "Weekend"
          ? 1
          : 1.8;
  const candidates = [];
  for (const top of sets.Tops)
    for (const bottom of sets.Bottoms)
      for (const shoe of sets.Shoes)
        for (const layer of layers) {
          const pieces = [top, bottom, shoe, ...(layer ? [layer] : [])];
          if (pin && !pieces.some((i) => i.id === pin)) continue;
          if (wet && pieces.some((i) => i.delicate)) continue;
          if (
            temp !== null &&
            temp < 7 &&
            (!layer || layer.warmth < 3 || shoe.kind === "loafers")
          )
            continue;
          if (
            wet &&
            sets.Layers.some((i) => i.waterproof) &&
            !layer?.waterproof
          )
            continue;
          const ids = pieces.map((i) => i.id);
          const signature = [...ids].sort().join("|");
          const bold =
            pieces.reduce((s, i) => s + i.boldness, 0) / pieces.length;
          let score =
            harmony(top.color, bottom.color) +
            harmony(bottom.color, shoe.color) * 0.6;
          score -=
            pieces.reduce((s, i) => s + Math.abs(i.formality - formal), 0) *
            0.35;
          if (cold && layer) score += 1;
          if (!cold && layer?.warmth === 3) score -= 1.8;
          const avgWears =
            pieces.reduce((s, i) => s + (wearCounts.get(i.id) || 0), 0) /
            pieces.length;
          score += 1 / (1 + avgWears);
          if (recentSignatures.has(signature)) score -= 3;
          const opinion = feedback[signature];
          if (opinion === "love") score += 1.4;
          if (opinion === "skip") score -= 8;
          // Stable daily variation, with explicit refresh nonce; no invented garments.
          const hash = [...(signature + date + nonce)].reduce(
            (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
            0,
          );
          score += (hash % 1000) / 1600;
          candidates.push({ ids, signature, bold, score });
        }
  const chosen = [];
  const targets = [0, 0.5 + adventure * 0.1, 1 + adventure * 0.15];
  for (let index = 0; index < 3; index++) {
    const ranked = candidates
      .map((c) => ({
        ...c,
        rank:
          c.score -
          Math.abs(c.bold - targets[index]) * 2.5 -
          chosen.reduce(
            (s, o) =>
              s + c.ids.filter((id) => o.ids.includes(id)).length * 0.55,
            0,
          ),
      }))
      .sort((a, b) => b.rank - a.rank);
    const pick = ranked.find(
      (c) => !chosen.some((o) => o.signature === c.signature),
    );
    if (pick) chosen.push({ ...pick, level: index });
  }
  return chosen;
}
export function explain(outfit, items, weather) {
  const pieces = outfitItems(outfit, items);
  const top = pieces.find((i) => i.category === "Tops"),
    bottom = pieces.find((i) => i.category === "Bottoms"),
    shoe = pieces.find((i) => i.category === "Shoes"),
    layer = pieces.find((i) => i.category === "Layers");
  if (!top || !bottom || !shoe) return "";
  const contrast =
    top.color !== bottom.color
      ? `The ${top.color.toLowerCase()} and ${bottom.color.toLowerCase()} create a considered contrast.`
      : `A tonal ${top.color.toLowerCase()} base keeps the silhouette clean.`;
  const styling =
    layer?.kind === "overshirt"
      ? "Leave the overshirt open and let the base layer show."
      : layer?.kind === "sweater"
        ? "Let a little of the neckline show under the knit."
        : top.kind === "shirt"
          ? "Try a relaxed front tuck and roll the sleeves once."
          : top.kind === "polo"
            ? "Tuck the polo loosely to give the trousers a clean line."
            : "Try a small front tuck to define the waist without looking too formal.";
  return `${contrast} ${styling} ${weather?.rain >= 45 ? "Keep the weather-ready layer close." : shoe.kind === "sneakers" ? "The sneakers keep it grounded and easy." : "The shoes give the outfit a more deliberate finish."}`;
}
export function stats(state) {
  const ids = new Set(state.wears.flatMap((w) => w.ids));
  return {
    pieces: state.items.length,
    worn: state.items.filter((i) => ids.has(i.id)).length,
    looks: state.wears.length,
    newLooks: new Set(state.wears.map((w) => [...w.ids].sort().join("|"))).size,
  };
}
export function guessItem(filename) {
  const name = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();
  const lower = name.toLowerCase();
  let category = "Tops",
    kind = "tee";
  if (/jean|denim|trouser|pant|chino/.test(lower)) {
    category = "Bottoms";
    kind = /jean|denim/.test(lower) ? "jeans" : "trousers";
  } else if (/sneaker|trainer|runner|loafer|boot|shoe/.test(lower)) {
    category = "Shoes";
    kind = /loafer/.test(lower)
      ? "loafers"
      : /boot/.test(lower)
        ? "boots"
        : "sneakers";
  } else if (
    /overshirt|sweater|knit|jacket|blazer|shell|coat|cardigan/.test(lower)
  ) {
    category = "Layers";
    kind = /sweater|knit|cardigan/.test(lower)
      ? "sweater"
      : /blazer/.test(lower)
        ? "blazer"
        : /overshirt/.test(lower)
          ? "overshirt"
          : "jacket";
  } else if (/polo/.test(lower)) kind = "polo";
  else if (/shirt/.test(lower) && !/t ?shirt/.test(lower)) kind = "shirt";
  const color =
    Object.keys(COLORS).find((c) => lower.includes(c.toLowerCase())) || "Grey";
  return {
    name: /^(img|image|dsc|pxl)\b/i.test(name)
      ? "New wardrobe piece"
      : name || "New wardrobe piece",
    category,
    kind,
    color,
    formality: 2,
    warmth: category === "Layers" ? 2 : 1,
    boldness: 1,
    fit: "Relaxed / straight",
    status: "available",
    waterproof: false,
    delicate: kind === "loafers",
  };
}
export function validateBackup(data) {
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.items) ||
    data.items.length > 1000 ||
    !Array.isArray(data.wears) ||
    !data.plans ||
    typeof data.plans !== "object" ||
    Array.isArray(data.plans) ||
    !data.feedback ||
    typeof data.feedback !== "object" ||
    !data.preferences ||
    typeof data.preferences !== "object" ||
    Array.isArray(data.preferences)
  )
    throw new Error("This is not a valid FORM backup.");
  const ids = new Set();
  for (const i of data.items) {
    if (
      !i ||
      typeof i.id !== "string" ||
      ids.has(i.id) ||
      !i.id ||
      typeof i.name !== "string" ||
      i.name.length > 160 ||
      !CATEGORIES.includes(i.category) ||
      !Object.hasOwn(COLORS, i.color) ||
      !["available", "laundry", "archived"].includes(i.status) ||
      ![1, 2, 3].includes(i.formality) ||
      ![1, 2, 3].includes(i.warmth) ||
      ![0, 1, 2].includes(i.boldness) ||
      typeof i.kind !== "string" ||
      typeof i.fit !== "string" ||
      (i.image &&
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(i.image) &&
        !/^assets\/[a-z][a-z0-9]*\.svg$/.test(i.image))
    )
      throw new Error("The backup contains an invalid clothing item.");
    ids.add(i.id);
  }
  const validIds = (values) =>
    Array.isArray(values) &&
    values.length <= 4 &&
    new Set(values).size === values.length &&
    values.every((id) => ids.has(id));
  if (data.wears.some((w) => !w || !validDate(w.date) || !validIds(w.ids)))
    throw new Error("Invalid wear history.");
  for (const [date, p] of Object.entries(data.plans)) {
    if (
      !validDate(date) ||
      !p ||
      !validIds(p.ids) ||
      typeof p.occasion !== "string"
    )
      throw new Error("Invalid outfit plan.");
  }
  if (
    !["cold", "neutral", "warm"].includes(data.preferences.comfort) ||
    ![0, 1, 2].includes(data.preferences.adventure)
  )
    throw new Error("Invalid style preferences.");
  const city = data.preferences.city;
  if (
    city &&
    (!Number.isFinite(city.latitude) ||
      Math.abs(city.latitude) > 90 ||
      !Number.isFinite(city.longitude) ||
      Math.abs(city.longitude) > 180 ||
      typeof city.name !== "string")
  )
    throw new Error("Invalid location.");
  return data;
}
