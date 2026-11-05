import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import { dateKey, addDays, emptyState } from "../dist/core.js";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(predicate) {
  for (let i = 0; i < 150; i++) {
    if (await predicate()) return;
    await pause(10);
  }
  assert.fail("Timed out waiting for UI state");
}
test("interactive wardrobe loop persists changes and keeps sample and personal data separate", async (t) => {
  const dom = new JSDOM(
    await readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    { url: "https://form.test/" },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    indexedDB,
    FormData: dom.window.FormData,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  dom.window.scrollTo = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  await import("../dist/app.js");
  const { load, save } = await import("../dist/storage.js");
  const $ = (s) => document.querySelector(s);
  const click = async (s) => {
    assert.ok($(s), `Missing ${s}`);
    $(s).click();
    await pause(25);
  };
  await t.test(
    "initial view shows sample collection and honest sample weather",
    () => {
      assert.match($("#main").textContent, /Good clothes/);
      assert.match($("#main").textContent, /Sample weather/);
      assert.ok($(".outfit-board"));
    },
  );
  await t.test(
    "saving a future plan does not log a wear and cannot mark a future wear",
    async () => {
      const input = $("#outfit-date");
      input.value = addDays(dateKey(), 2);
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      assert.equal($('[data-action="wore"]').disabled, true);
      await click('[data-action="schedule"]');
      assert.equal((await load("demo")).wears.length, 0);
      assert.ok((await load("demo")).plans[addDays(dateKey(), 2)]);
      await click('[data-view="planner"]');
      assert.equal(
        $(".has-plan").querySelector(".plan-occasion").textContent,
        "Office day",
      );
    },
  );
  await t.test(
    "review, swap, favorite, and replace the saved plan",
    async () => {
      await click('[data-action="open-plan"]');
      const before = $(".board-piece").dataset.id;
      await click(".board-piece");
      assert.equal($("#modal").open, true);
      await click('[data-action="choose-swap"]');
      assert.notEqual($(".board-piece").dataset.id, before);
      await click('[data-action="love"]');
      assert.ok(Object.values((await load("demo")).feedback).includes("love"));
      await click('[data-action="schedule"]');
      assert.match($("#modal").textContent, /already an outfit/);
      await click('[data-action="replace-plan"]');
      assert.equal($("#modal").open, false);
    },
  );
  await t.test(
    "confirmed wear is persisted once, progress is derived, and undo works",
    async () => {
      await click(`[data-action="date"][data-date="${dateKey()}"]`);
      await click('[data-action="wore"]');
      await click('[data-action="wore"]');
      assert.equal((await load("demo")).wears.length, 1);
      await click('[data-view="insights"]');
      assert.ok($(".journal-row"));
      await click('[data-action="undo-wear"]');
      assert.equal((await load("demo")).wears.length, 0);
    },
  );
  await t.test(
    "editing availability persists and prevents that item from being generated",
    async () => {
      await click('[data-view="wardrobe"]');
      await click('[data-action="edit"][data-id="t1"]');
      $('#item-editor [name="status"]').value = "laundry";
      $("#item-editor").dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
      await until(
        async () =>
          (await load("demo")).items.find((i) => i.id === "t1").status ===
          "laundry",
      );
      await pause(25);
      await click('[data-view="today"]');
      assert.equal($('[data-id="t1"].board-piece'), null);
    },
  );
  await t.test("search and category filters remain usable", async () => {
    await click('[data-view="wardrobe"]');
    await click('[data-category="Shoes"]');
    assert.equal(document.querySelectorAll(".garment-card").length, 4);
    const input = $("#wardrobe-search");
    input.value = "loafers";
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.equal(document.querySelectorAll(".garment-card").length, 1);
    assert.match($(".garment-card").textContent, /loafers/);
    await click('[data-category="All pieces"]');
  });
  await t.test(
    "switching to personal starts empty without altering sample data",
    async () => {
      await click('[data-action="switch"]');
      assert.match($("#main").textContent, /Your wardrobe. A fresh start/);
      assert.equal((await load("personal")).items.length, 0);
      assert.equal((await load("demo")).items.length, 18);
      assert.equal(
        (await load("demo")).items.find((i) => i.id === "t1").status,
        "laundry",
      );
    },
  );
  await t.test(
    "upload review adds a real photo to the personal collection",
    async () => {
      await click('[data-action="upload"]');
      const photo = $("#photo-upload");
      const file = { name: "olive-chinos.jpg", size: 500, type: "image/jpeg" };
      Object.defineProperty(photo, "files", { value: [file] });
      const originalImage = global.Image,
        originalCreate = URL.createObjectURL,
        originalRevoke = URL.revokeObjectURL;
      URL.createObjectURL = () => "blob:test";
      URL.revokeObjectURL = () => {};
      global.Image = class {
        width = 500;
        height = 500;
        set src(value) {
          queueMicrotask(() => this.onload());
        }
      };
      dom.window.HTMLCanvasElement.prototype.getContext = () => ({
        fillRect() {},
        drawImage() {},
      });
      dom.window.HTMLCanvasElement.prototype.toDataURL = () =>
        "data:image/jpeg;base64,YWJj";
      try {
        photo.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
        await until(() => $("#item-editor"));
        assert.equal($('#item-editor [name="category"]').value, "Bottoms");
        $('#item-editor [name="name"]').value = "My olive trousers";
        $("#item-editor").dispatchEvent(
          new dom.window.Event("submit", { bubbles: true, cancelable: true }),
        );
        await until(async () => (await load("personal")).items.length === 1);
        assert.equal(
          (await load("personal")).items[0].name,
          "My olive trousers",
        );
      } finally {
        global.Image = originalImage;
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
      }
      await pause(25);
    },
  );
  await t.test(
    "mode switching preserves personal uploads and isolates sample history",
    async () => {
      await click('[data-action="switch"]');
      assert.equal((await load("demo")).items.length, 18);
      await click('[data-action="switch"]');
      assert.equal((await load("personal")).items.length, 1);
      await click('[data-view="wardrobe"]');
      assert.match($("#main").textContent, /My olive trousers/);
    },
  );
  await t.test("preferences are saved and survive storage reload", async () => {
    await click('[data-action="settings"]');
    $('#preferences [name="comfort"]').value = "cold";
    $('#preferences [name="adventure"]').value = "2";
    $("#preferences").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    await until(
      async () => (await load("personal")).preferences.comfort === "cold",
    );
    assert.equal((await load("personal")).preferences.adventure, 2);
  });
  await t.test(
    "UI escapes names rather than interpreting uploaded item names as markup",
    async () => {
      await pause(25);
      await click('[data-view="wardrobe"]');
      await click('[data-action="edit"]');
      $('#item-editor [name="name"]').value = "<img src=x onerror=alert(1)>";
      $("#item-editor").dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
      await until(() => !$("#modal").open);
      assert.match($(".garment-card h3").textContent, /<img/);
      assert.equal($('.garment-card img[src="x"]'), null);
    },
  );
  dom.window.close();
});
