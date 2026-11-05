import { emptyState, validateBackup } from "./core.js";
const DB = "form-wardrobe-v1";
let connection;
async function db() {
  if (connection) return connection;
  connection = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("wardrobes");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return connection;
}
export async function load(mode) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction("wardrobes")
      .objectStore("wardrobes")
      .get(mode);
    request.onsuccess = () => {
      try {
        resolve(
          request.result
            ? validateBackup(request.result)
            : emptyState(mode === "demo"),
        );
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function save(mode, state) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("wardrobes", "readwrite");
    tx.objectStore("wardrobes").put(state, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error || new Error("Storage was interrupted."));
  });
}
export async function resizePhoto(file) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error(`${file.name} exceeds 20 MB.`);
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type))
    throw new Error(
      "Choose JPEG, PNG or WebP photos. On iPhone, export HEIC as JPEG if needed.",
    );
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(
          new Error(`Could not open ${file.name}. Try exporting it as JPEG.`),
        );
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 1100 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f7f5ef";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
