"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ItemFields, type Draft } from "@/components/ItemFields";
import { makeItem } from "@/lib/kinds";
import { preparePhoto, taggingImage, type PreparedPhoto } from "@/lib/photo";
import { applyTags } from "@/lib/tagging";
import { useAI } from "@/state/ai";
import { newId, useWardrobe } from "@/state/wardrobe";

interface Pending {
  id: string;
  photo: PreparedPhoto;
  draft: Draft;
  state: "review" | "tagging" | "saving" | "saved" | "skipped";
  note?: string;
}

export default function AddPage() {
  const { mode, setMode, addPieces, storageError, personalCount } = useWardrobe();
  const ai = useAI();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Release preview URLs when leaving the page.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => () => queueRef.current.forEach((p) => URL.revokeObjectURL(p.photo.previewUrl)), []);

  const current = queue.find((p) => p.state === "review" || p.state === "tagging" || p.state === "saving");
  const done = queue.filter((p) => p.state === "saved").length;

  const update = (id: string, patch: Partial<Pending>) => setQueue((q) => q.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    if (mode !== "personal") setMode("personal");
    setError(null);
    const list = [...files].slice(0, 40);
    const prepared: Pending[] = [];
    for (let i = 0; i < list.length; i++) {
      setBusy(`Preparing photo ${i + 1} of ${list.length}…`);
      try {
        const photo = await preparePhoto(list[i]!);
        prepared.push({
          id: newId(),
          photo,
          state: "review",
          draft: { name: "", nameEdited: false, kind: null, color: photo.color, material: "cotton", pattern: "solid", fit: "regular", formality: 2, boldness: 0 },
        });
      } catch {
        setError(`“${list[i]!.name}” couldn’t be read. Try exporting it from Photos as a PNG or JPEG.`);
      }
    }
    setBusy(null);
    setQueue((q) => [...q, ...prepared]);
    if (input.current) input.current.value = "";
  }

  async function tag(p: Pending) {
    update(p.id, { state: "tagging", note: undefined });
    const result = await ai.requestTags(await taggingImage(p.photo.blob));
    if ("error" in result) {
      update(p.id, { state: "review", note: result.error });
      return;
    }
    update(p.id, { state: "review", draft: { ...result.tags, nameEdited: true }, note: "Tagged by Claude. Check it over." });
    void ai.refresh();
  }

  async function save(p: Pending) {
    if (!p.draft.kind) return;
    update(p.id, { state: "saving" });
    const base = makeItem({ id: p.id, name: p.draft.name || "Untitled piece", kind: p.draft.kind, color: p.draft.color });
    const item = applyTags(base, { ...p.draft, kind: p.draft.kind, name: p.draft.name || base.name });
    try {
      await addPieces([{ item, blob: p.photo.blob }]);
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
          <div className="steps">
            <div>
              <span className="label">Best: a batch of cut-outs</span>
              <p>
                In the Shortcuts app, make a shortcut that does <strong>Select Photos</strong> (multiple) →{" "}
                <strong>Repeat with Each</strong> → <strong>Remove Background</strong> → <strong>Save to Photo Album</strong>.
                Run it on your garment photos, then add the whole album here.
              </p>
            </div>
            <div>
              <span className="label">One at a time</span>
              <p>
                In Photos, touch and hold the garment until it lifts off the background, then <strong>Share → Save Image</strong>.
                The saved copy has a clear background.
              </p>
            </div>
            <div>
              <span className="label">Shooting tips</span>
              <p>Lay each piece flat or hang it against a plain wall in daylight. One garment per photo, the whole piece in frame.</p>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => input.current?.click()} disabled={Boolean(busy)}>
              {busy ?? (queue.length ? "Add more photos" : "Choose photos")}
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
        onChange={(e) => void onFiles(e.target.files)}
        aria-label="Choose garment photos"
      />
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}

      {current && (
        <section className="review" aria-label="Review this piece">
          <div className="review-photo plinth">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.photo.previewUrl} alt="The garment being added" />
          </div>
          <div className="review-form">
            <div className="review-progress label">
              Piece {queue.indexOf(current) + 1} of {queue.length}
              {done > 0 && ` · ${done} saved`}
            </div>
            {!current.photo.cutout && (
              <p className="hint">
                This photo still has its background. It will work, but cut-outs look much better in your looks.
              </p>
            )}
            {current.note && <p className="hint">{current.note}</p>}
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
            <ItemFields value={current.draft} idPrefix={current.id} onChange={(draft) => update(current.id, { draft })} />
            <div className="actions">
              <button type="button" className="btn" disabled={!current.draft.kind || current.state !== "review"} onClick={() => void save(current)}>
                {current.state === "saving" ? "Saving…" : current.draft.kind ? "Save piece" : "Choose what it is"}
              </button>
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
          </span>
          <button type="button" className="text-link" onClick={() => router.push("/")}>
            Get today’s look
          </button>
        </div>
      )}
    </>
  );
}
