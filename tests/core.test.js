import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleItems,
  emptyState,
  generateOutfits,
  outfitItems,
  isWearable,
  stats,
  guessItem,
  validateBackup,
  dateKey,
  addDays,
  validDate,
} from "../dist/core.js";
import {
  dayWeather,
  weatherLabel,
  searchCities,
  forecast,
} from "../dist/weather.js";
const make = (options = {}) =>
  generateOutfits({ items: sampleItems(), date: "2026-11-05", ...options });
test("generates three different complete outfits using only existing available pieces", () => {
  const items = sampleItems();
  items[0].status = "laundry";
  items[1].status = "archived";
  const outfits = make({ items });
  assert.equal(outfits.length, 3);
  assert.equal(new Set(outfits.map((o) => o.signature)).size, 3);
  for (const o of outfits) {
    assert.ok(isWearable(o, items));
    assert.ok(!o.ids.includes("t1"));
    assert.ok(!o.ids.includes("t2"));
  }
});
test("does not fabricate missing shoes or warm layers", () => {
  assert.deepEqual(
    make({ items: sampleItems().filter((i) => i.category !== "Shoes") }),
    [],
  );
  assert.deepEqual(
    make({
      items: sampleItems().filter((i) => i.category !== "Layers"),
      weather: { high: 4 },
    }),
    [],
  );
});
test("weather excludes suede in rain, requires available rain layer, and warm layers for cold", () => {
  for (const o of make({ weather: { high: 12, rain: 90 } })) {
    const items = outfitItems(o, sampleItems());
    assert.ok(items.some((i) => i.category === "Layers" && i.waterproof));
    assert.ok(items.every((i) => !i.delicate));
  }
  for (const o of make({ weather: { high: 3, rain: 0 } }))
    assert.ok(
      outfitItems(o, sampleItems()).some(
        (i) => i.category === "Layers" && i.warmth === 3,
      ),
    );
});
test("hot weather recommendations do not add heavy layers", () => {
  for (const o of make({ weather: { high: 29, rain: 0 } }))
    assert.ok(
      outfitItems(o, sampleItems()).every((i) => i.category !== "Layers"),
    );
});
test("every pinned-piece recommendation includes the requested piece", () => {
  const result = make({ pin: "b3" });
  assert.ok(result.length);
  for (const o of result) assert.ok(o.ids.includes("b3"));
  assert.deepEqual(make({ pin: "not-owned" }), []);
});
test("generation is repeatable and refresh yields fresh choices", () => {
  assert.deepEqual(make(), make());
  assert.notDeepEqual(make({ nonce: 8 }), make());
});
test("planned outfits do not count as wears; metrics come from confirmed history", () => {
  const state = emptyState(true);
  state.plans["2026-11-07"] = { ids: ["t1", "b1", "s1"] };
  assert.equal(stats(state).worn, 0);
  assert.equal(stats(state).looks, 0);
  state.wears.push({ date: "2026-11-05", ids: ["t1", "b1", "s1"] });
  assert.equal(stats(state).worn, 3);
  assert.equal(stats(state).newLooks, 1);
});
test("date arithmetic survives month and year boundaries and rejects impossible dates", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(dateKey(new Date(2026, 0, 2, 23)), "2026-01-02");
});
test("filename tags are editable suggestions without imagined visual recognition", () => {
  assert.equal(guessItem("olive-chinos.jpg").category, "Bottoms");
  assert.equal(guessItem("olive-chinos.jpg").color, "Olive");
  assert.equal(guessItem("white-sneakers.jpg").kind, "sneakers");
  assert.equal(guessItem("IMG_0001.jpeg").name, "New wardrobe piece");
});
test("backup validation rejects duplicate IDs, remote images, broken references and bad locations", () => {
  const good = emptyState(true);
  assert.equal(validateBackup(good), good);
  for (const mutate of [
    (s) => s.items.push(s.items[0]),
    (s) => (s.items[0].image = "https://example.com/tracking.png"),
    (s) => s.wears.push({ date: "2026-11-05", ids: ["unknown"] }),
    (s) => (s.preferences.city = { name: "Bad", latitude: 300, longitude: 0 }),
  ]) {
    const state = structuredClone(good);
    mutate(state);
    assert.throws(() => validateBackup(state));
  }
});
test("unknown forecast dates remain unknown rather than fabricated", () => {
  const data = {
    daily: {
      time: ["2026-11-05"],
      temperature_2m_max: [12],
      temperature_2m_min: [5],
      precipitation_probability_max: [70],
      wind_speed_10m_max: [15],
      weather_code: [61],
    },
  };
  assert.equal(dayWeather(data, "2026-12-30"), null);
  assert.equal(dayWeather(data, "2026-11-05").rain, 70);
  assert.equal(weatherLabel(dayWeather(data, "2026-11-05")), "Rain likely");
});
test("weather location search and forecast handle failures and reuse a fresh cache", async () => {
  const original = global.fetch,
    session = global.sessionStorage;
  const memory = new Map();
  global.sessionStorage = {
    getItem: (k) => memory.get(k),
    setItem: (k, v) => memory.set(k, v),
  };
  let calls = 0;
  global.fetch = async (url) => {
    calls++;
    return {
      ok: true,
      json: async () =>
        url.hostname.startsWith("geocoding")
          ? {
              results: [
                {
                  name: "London",
                  country: "United Kingdom",
                  latitude: 51.5,
                  longitude: -0.12,
                },
              ],
            }
          : { daily: { time: ["2026-11-05"] } },
    };
  };
  try {
    const cities = await searchCities("London");
    assert.equal(cities[0].latitude, 51.5);
    await forecast(cities[0]);
    await forecast(cities[0]);
    assert.equal(calls, 2);
    global.fetch = async () => ({ ok: false });
    await assert.rejects(searchCities("London"));
  } finally {
    global.fetch = original;
    global.sessionStorage = session;
  }
});
test("large wardrobes have a bounded candidate search and retain pinned items", () => {
  const items = Array.from({ length: 20 }, (_, n) =>
    sampleItems().map((i) => ({ ...i, id: `${i.id}-${n}` })),
  ).flat();
  const start = performance.now();
  const result = make({ items, pin: "b3-19" });
  assert.equal(result.length, 3);
  assert.ok(result.every((o) => o.ids.includes("b3-19")));
  assert.ok(performance.now() - start < 3000);
});

test("hot rain still allows a rain-ready layer rather than dropping all outfits", () => {
  const outfits = make({ weather: { high: 29, rain: 90 } });
  assert.ok(outfits.length > 0);
  for (const o of outfits)
    assert.ok(
      outfitItems(o, sampleItems()).some(
        (i) => i.category === "Layers" && i.waterproof,
      ),
    );
});
test("missing forecast temperatures are unknown, never displayed as zero degrees", () => {
  assert.equal(
    dayWeather(
      {
        daily: {
          time: ["2026-11-05"],
          temperature_2m_max: [null],
          temperature_2m_min: [null],
        },
      },
      "2026-11-05",
    ),
    null,
  );
});
