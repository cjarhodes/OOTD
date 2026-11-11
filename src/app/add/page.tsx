"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ItemFields, type Draft } from "@/components/ItemFields";
import { makeItem } from "@/lib/kinds";
import type { CutoutFailure } from "@/lib/cutout";
import { isOwned, KINDS } from "@/lib/kinds";
import { preparePhoto, releasePhoto, taggingImage, type PreparedPhoto, type PhotoVersion } from "@/lib/photo";
import type { Slot } from "@/lib/types";
import { applyTags } from "@/lib/tagging";
import { useAI } from "@/state/ai";
import { newId, useWardrobe } from "@/state/wardrobe";

interface Pending {
  id: string;
  file: File;
  /** Null while the photo is still being prepared. */
  photo: PreparedPhoto | null;
  /** Save the garment on its own (true) or the photo as taken. */
  useCutout: boolean;
  draft: Draft;
  /** The colour was picked by hand or by AI: keep it when switching versions. */
  colorChosen: boolean;
  state: "preparing" | "review" | "tagging" | "saving" | "saved" | "skipped" | "failed";
  note?: string;
}

const FAILURE_NOTE: Record<CutoutFailure, string> = {
  "fills-frame": "The piece fills the photo, so its background stays. Step back so there’s floor or wall all round it.",
  "busy-background": "The background is too close to the piece, or too busy, to remove cleanly. A plain floor, bed or wall in daylight works best.",
  "no-subject": "Couldn’t find one clear piece in this photo, so its background stays. One garment per photo, the whole piece in frame.",
};

const SLOT_ORDER: Slot[] = ["base", "bottom", "shoes", "mid", "outer"];
const SLOT_NEED: Record<Slot, string> = { base: "a top", mid: "a knit or sweatshirt", outer: "a jacket or coat", bottom: "trousers", shoes: "shoes" };

/** The version of a pending piece's photo that will be saved. */
function chosen(p: Pending): PhotoVersion | null {
  if (!p.photo) return null;
  return p.useCutout && p.photo.cutout ? p.photo.cutout : p.photo.original;
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

export default function AddPage() {
  const { mode, setMode, addPieces, storageError, personalCount, items } = useWardrobe();
  const ai = useAI();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Background removal isn't in the main bundle; fetch it now so the first photo is quick.
  useEffect(() => {
    void import("@/lib/analyse").then((m) => m.warmUp());
  }, []);

  // Release preview URLs when leaving the page.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => () => queueRef.current.forEach((p) => p.photo && releasePhoto(p.photo)), []);

  // One piece at a time, in the order chosen; later photos prepare while this one is reviewed.
  const current = queue.find((p) => p.state !== "saved" && p.state !== "skipped");
  const done = queue.filter((p) => p.state === "saved").length;
  // Each new piece starts with its photo in view, not where the last form was scrolled to.
  const reviewRef = useRef<HTMLElement>(null);
  const shownId = useRef<string | null>(null);
  useEffect(() => {
    const id = current?.id ?? null;
    if (id && shownId.current && id !== shownId.current) {
      const top = reviewRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 80, behavior: "smooth" });
    }
    shownId.current = id;
  }, [current?.id]);
  const preparing = queue.filter((p) => p.state === "preparing").length;

  const update = (id: string, patch: Partial<Pending> | ((p: Pending) => Partial<Pending>)) =>
    setQueue((q) => q.map((p) => (p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p)));

  // Prepare queued photos one by one, in the background.
  const working = useRef(false);
  useEffect(() => {
    if (working.current) return;
    const next = queue.find((p) => p.state === "preparing");
    if (!next) return;
    working.current = true;
    void (async () => {
      try {
        const photo = await preparePhoto(next.file);
        const v = photo.cutout ?? photo.original;
        update(next.id, (p) => ({
          photo,
          useCutout: Boolean(photo.cutout),
          state: "review",
          draft: p.colorChosen ? p.draft : { ...p.draft, color: v.color },
          note: photo.failure ? FAILURE_NOTE[photo.failure] : undefined,
        }));
      } catch {
        update(next.id, { state: "failed", note: `“${next.file.name}” couldn’t be read. Try exporting it from Photos as a JPEG or PNG.` });
      } finally {
        working.current = false;
        // Trigger the next one.
        setQueue((q) => [...q]);
      }
    })();
  }, [queue]);

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    if (mode !== "personal") setMode("personal");
    setError(null);
    const seen = new Set(queueRef.current.map((p) => fileKey(p.file)));
    const list = [...files].filter((f) => !seen.has(fileKey(f)));
    const room = Math.max(0, 40 - queueRef.current.filter((p) => p.state !== "saved" && p.state !== "skipped").length);
    if (list.length > room) setError(`Added the first ${room} photos. Review those, then add the rest.`);
    const fresh: Pending[] = list.slice(0, room).map((file) => ({
      id: newId(),
      file,
      photo: null,
      useCutout: true,
      colorChosen: false,
      state: "preparing",
      draft: { name: "", nameEdited: false, kind: null, color: "Grey", material: "cotton", pattern: "solid", fit: "regular", formality: 2, boldness: 0 },
    }));
    setQueue((q) => [...q, ...fresh]);
    if (input.current) input.current.value = "";
  }

  /** Switch between the garment on its own and the photo as taken. */
  function toggleCutout(p: Pending) {
    if (!p.photo?.cutout) return;
    const useCutout = !p.useCutout;
    const v = useCutout ? p.photo.cutout : p.photo.original;
    const draft = p.colorChosen ? p.draft : { ...p.draft, color: v.color, name: p.draft.nameEdited || !p.draft.kind ? p.draft.name : `${v.color} ${KINDS[p.draft.kind].label}` };
    update(p.id, { useCutout, draft });
  }

  // What the wardrobe still needs before Today can dress someone.
  const slotsHave = new Set(items.filter(isOwned).map((i) => i.slot));
  const missing = SLOT_ORDER.filter((s) => (s === "base" || s === "bottom" || s === "shoes") && !slotsHave.has(s));

  async function tag(p: Pending) {
    const v = chosen(p);
    if (!v) return;
    update(p.id, { state: "tagging", note: undefined });
    const result = await ai.requestTags(await taggingImage(v.blob));
    if ("error" in result) {
      update(p.id, { state: "review", note: result.error });
      return;
    }
    update(p.id, { state: "review", colorChosen: true, draft: { ...result.tags, nameEdited: true }, note: "Tagged by Claude. Check it over." });
    void ai.refresh();
  }

  async function save(p: Pending) {
    const v = chosen(p);
    if (!p.draft.kind || !v) return;
    update(p.id, { state: "saving" });
    const base = makeItem({ id: p.id, name: p.draft.name || "Untitled piece", kind: p.draft.kind, color: p.draft.color });
    const item = applyTags(base, { ...p.draft, kind: p.draft.kind, name: p.draft.name || base.name });
    try {
      await addPieces([{ item, blob: v.blob }]);
      update(p.id, { state: "saved" });
    } catch {
      update(p.id, { state: "review", note: "This piece couldn’t be saved on this device." });
    }
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">
          Your wardrobe · {personalCount} {personalCount === 1 ? "piece" : "pieces"}
        </span>
        <h1 className="display page-title">Add pieces</h1>
      </div>

      {storageError && <div className="banner">{storageError}</div>}

      {!current && (
        <section className="add-intro">
          <Link href="/start" className="banner add-swipe">
            <span>
              <strong>No photos to hand?</strong> Swipe through the basics most men own and keep what you have, in a minute.
            </span>
            <span className="text-link">Swipe your wardrobe</span>
          </Link>
          <div className="steps">
            <div>
              <span className="label">Lay it out, take the photo</span>
              <p>
                One piece per photo, the whole garment in frame, on a plain floor, bed or wall in daylight. OOTD removes the background on your phone,
                so nothing is uploaded until you save.
              </p>
            </div>
            <div>
              <span className="label">Add many at once</span>
              <p>Choose a batch from your photos. The first is ready in a moment and the rest get ready while you go.</p>
            </div>
            <div>
              <span className="label">Already cut out?</span>
              <p>
                Photos with a clear background (in Photos, touch and hold the garment, then <strong>Share → Save Image</strong>) are kept exactly as they are.
              </p>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => input.current?.click()}>
              {queue.length ? "Add more photos" : "Choose photos"}
            </button>
            {done > 0 && (
              <Link href="/wardrobe" className="btn alt">
                See your wardrobe
              </Link>
            )}
          </div>
          <p className="footer-note">
            Photos are saved to your account and kept on this device.{" "}
            {ai.status.configured ? "AI tagging sends one small copy of a photo to Claude only when you tap Tag with AI." : ""}
          </p>
        </section>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
        aria-label="Choose garment photos"
      />
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}

      {current && (
        <section className="review" aria-label="Review this piece" ref={reviewRef}>
          <div className="review-photo plinth" aria-busy={current.state === "preparing"}>
            {current.state === "preparing" ? (
              <p className="review-wait label">Finding the garment…</p>
            ) : current.state === "failed" ? (
              <p className="review-wait label">Couldn’t read this photo</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chosen(current)!.previewUrl} alt="The garment being added" />
            )}
          </div>
          <div className="review-form">
            <div className="review-progress label">
              Piece {queue.filter((p) => p.state !== "skipped").indexOf(current) + 1} of {queue.filter((p) => p.state !== "skipped").length}
              {done > 0 && ` · ${done} saved`}
              {preparing > 0 && current.state !== "preparing" && ` · preparing ${preparing}`}
            </div>
            {current.photo?.cutout && !current.photo.madeCutout && (
              <div className="cutout-row">
                <span className="label">{current.useCutout ? "Background removed" : "Background kept"}</span>
                <button type="button" className="text-link" onClick={() => toggleCutout(current)} aria-pressed={!current.useCutout}>
                  {current.useCutout ? "Keep the background" : "Remove it again"}
                </button>
              </div>
            )}
            {current.note && <p className="hint">{current.note}</p>}
            {current.state !== "preparing" && current.state !== "failed" && (
              <>
                {ai.status.configured && (
                  <div className="ai-row">
                    <button type="button" className="btn alt" disabled={current.state !== "review" || !ai.canTag} onClick={() => void tag(current)}>
                      {current.state === "tagging" ? "Tagging…" : "Tag with AI"}
                    </button>
                    {ai.left !== null && (
                      <span className="label">
                        {ai.left} of {ai.status.limit} AI tags left this month
                      </span>
                    )}
                  </div>
                )}
                <ItemFields
                  key={current.id}
                  value={current.draft}
                  idPrefix={current.id}
                  onChange={(draft) => update(current.id, (p) => ({ draft, colorChosen: p.colorChosen || draft.color !== p.draft.color }))}
                />
              </>
            )}
            <div className="actions">
              {current.state !== "failed" && (
                <button type="button" className="btn" disabled={!current.draft.kind || current.state !== "review"} onClick={() => void save(current)}>
                  {current.state === "saving" ? "Saving…" : current.state === "preparing" ? "Preparing…" : current.draft.kind ? "Save piece" : "Choose what it is"}
                </button>
              )}
              <button type="button" className="btn quiet" onClick={() => update(current.id, { state: "skipped" })}>
                Skip
              </button>
            </div>
          </div>
        </section>
      )}

      {!current && done > 0 && (
        <div className="banner">
          <span>
            {done} {done === 1 ? "piece" : "pieces"} added.
            {missing.length > 0 && ` Add ${missing.map((m) => SLOT_NEED[m]).join(", ").replace(/, ([^,]*)$/, " and $1")} for a full look.`}
          </span>
          {missing.length === 0 && (
            <button type="button" className="text-link" onClick={() => router.push("/")}>
              Get today’s look
            </button>
          )}
        </div>
      )}
    </>
  );
}
