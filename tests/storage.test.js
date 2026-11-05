import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { emptyState } from "../dist/core.js";
globalThis.indexedDB = indexedDB;
const { load, save } = await import("../dist/storage.js");
test("invalid stored data rejects instead of leaving startup pending and is not overwritten", async () => {
  const invalid = { version: 99, items: ["damaged"] };
  await save("personal", invalid);
  await assert.rejects(load("personal"), /valid FORM backup/);
  const raw = await new Promise((resolve, reject) => {
    const request = indexedDB.open("form-wardrobe-v1", 1);
    request.onsuccess = () => {
      const db = request.result;
      const get = db
        .transaction("wardrobes")
        .objectStore("wardrobes")
        .get("personal");
      get.onsuccess = () => {
        resolve(get.result);
        db.close();
      };
      get.onerror = () => reject(get.error);
    };
    request.onerror = () => reject(request.error);
  });
  assert.deepEqual(raw, invalid);
  const restored = emptyState();
  await save("personal", restored);
  assert.deepEqual(await load("personal"), restored);
});
