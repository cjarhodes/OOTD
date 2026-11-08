"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { ItemFields, type Draft } from "@/components/ItemFields";
import { NextBuys } from "@/components/NextBuys";
import { wishToItem } from "@/lib/wishlist";
import { isOwned, SLOT_LABEL, fitOf } from "@/lib/kinds";
import { hasBackdrop, preparePhoto, releasePhoto } from "@/lib/photo";
import { applyTags } from "@/lib/tagging";
import type { Item, Slot, Status } from "@/lib/types";
import { useWardrobe } from "@/state/wardrobe";

const SLOTS: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];
const STATUS_LABEL: Record<Status, string> = { available: "Available", laundry: "In the wash", archived: "Archived" };

function draftOf(item: Item): Draft {
  return {
    name: item.name,
    nameEdited: true,
    kind: item.kind,
    color: item.color,
    material: item.material,
    pattern: item.pattern,
    fit: fitOf(item),
    formality: item.formality,
    boldness: item.boldness,
  };
}

function ItemSheet({ item, worn, onClose }: { item: Item; worn: number; onClose: () => void }) {
  const { updateItem, removeItem, replacePhoto, photoBlobs } = useWardrobe();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft>(draftOf(item));
  const [status, setStatus] = useState<Status>(item.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cutting, setCutting] = useState<"idle" | "working" | "failed">("idle");

  // Illustrated pieces (from the starter deck) can get a real photo, background removed.
  const photoInput = useRef<HTMLInputElement>(null);
  async function addPhoto(file: File) {
    setCutting("working");
    try {
      const prepared = await preparePhoto(file);
      const v = prepared.cutout ?? prepared.original;
      await replacePhoto(item.id, v.blob);
      releasePhoto(prepared);
      setCutting("idle");
    } catch {
      setCutting("failed");
    }
  }

  // Pieces saved with their background can have it removed now.
  async function removeBackdrop() {
    setCutting("working");
    try {
      const blob = (await photoBlobs([item.id])).get(item.id);
      if (!blob) throw new Error("no photo");
      const prepared = await preparePhoto(new File([blob], `${item.id}.jpg`, { type: blob.type }));
      const cut = prepared.cutout;
      if (!cut || prepared.madeCutout) {
        releasePhoto(prepared);
        setCutting("failed");
        return;
      }
      await replacePhoto(item.id, cut.blob);
      releasePhoto(prepared);
      setCutting("idle");
    } catch {
      setCutting("failed");
    }
  }

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const save = () => {
    if (!draft.kind) return;
    updateItem({ ...applyTags(item, { ...draft, kind: draft.kind, name: draft.name || item.name }), status });
    onClose();
  };

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onClose={onClose} onCancel={onClose}>
      <div className="sheet-head">
        <h2 id="sheet-title" className="display" style={{ fontSize: 26 }}>
          {item.name}
        </h2>
        <button type="button" className="text-link" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="sheet-photo plinth">
        <GarmentTile item={item} />
      </div>
      {!item.image && (
        <div className="cutout-row">
          <button type="button" className="btn alt" onClick={() => photoInput.current?.click()} disabled={cutting === "working"}>
            {cutting === "working" ? "Preparing photo…" : "Add a photo"}
          </button>
          <span className="setting-note">
            {cutting === "failed" ? "That photo couldn’t be read. Try a JPEG or PNG." : "Drawn for now. A photo of your own piece makes your looks yours."}
          </span>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            aria-label="Choose a photo of this piece"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void addPhoto(f);
            }}
          />
        </div>
      )}
      {hasBackdrop(item.image) && (
        <div className="cutout-row">
          <button type="button" className="btn alt" onClick={() => void removeBackdrop()} disabled={cutting === "working"}>
            {cutting === "working" ? "Removing background…" : "Remove background"}
          </button>
          {cutting === "failed" && <span className="hint">Couldn’t separate this piece from its background. A new photo on a plain floor or wall will.</span>}
        </div>
      )}
      <p className="label">{worn ? `Worn ${worn}×` : "Not worn yet"}</p>
      <div className="segmented" role="group" aria-label="Status" style={{ ["--count" as string]: 3 }}>
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <ItemFields value={draft} onChange={setDraft} idPrefix={`edit-${item.id}`} />
      <div className="actions">
        <button type="button" className="btn" onClick={save}>
          Save changes
        </button>
        <button type="button" className="btn alt" onClick={() => router.push(`/?pin=${encodeURIComponent(item.id)}`)} disabled={item.status !== "available"}>
          Style with this
        </button>
      </div>
      {confirmDelete ? (
        <div className="banner" role="alert">
          <span>Delete this piece and its photo? Archive it instead to keep its history.</span>
          <span className="actions">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                await removeItem(item.id);
                onClose();
              }}
            >
              Delete
            </button>
            <button type="button" className="btn quiet" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </span>
        </div>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirmDelete(true)}>
          Delete piece
        </button>
      )}
    </dialog>
  );
}

export default function WardrobePage() {
  const { ready, items, wears, mode, wishlist, gotWish, removeWish } = useWardrobe();
  const [filter, setFilter] = useState<Slot | "all" | "archived" | "wanted">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const personal = mode === "personal";

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of wears) for (const id of w.itemIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [wears]);

  const visible = items
    .filter((i) => (filter === "wanted" ? false : filter === "archived" ? i.status === "archived" : isOwned(i) && (filter === "all" || i.slot === filter)))
    .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.name.localeCompare(b.name));
  const active = items.filter(isOwned);
  const unworn = active.filter((i) => !counts.get(i.id)).length;
  const editingItem = editing ? items.find((i) => i.id === editing) : undefined;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">
          {personal ? "Your wardrobe" : "Sample wardrobe"} · {active.length} pieces{ready && unworn > 0 ? ` · ${unworn} not worn yet` : ""}
        </span>
        <h1 className="display page-title">Wardrobe</h1>
        <div className="head-actions">
          <Link href="/lookbook" className="chip chip-add">
            Lookbook
          </Link>
        </div>
      </div>

      {personal && ready && items.length === 0 ? (
        <div className="plinth empty">
          <p className="display" style={{ fontSize: 28, color: "var(--ink)" }}>
            Nothing here yet
          </p>
          <p>Swipe through the basics most men own and keep what you have, or photograph your own pieces.</p>
          <div className="actions">
            <Link href="/start" className="btn">
              Swipe your wardrobe
            </Link>
            <Link href="/add" className="btn alt">
              Add photos
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter by layer">
            <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All
            </button>
            {SLOTS.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {SLOT_LABEL[s]}
              </button>
            ))}
            {personal && wishlist.length > 0 && (
              <button type="button" className="chip" aria-pressed={filter === "wanted"} onClick={() => setFilter("wanted")}>
                Wishlist · {wishlist.length}
              </button>
            )}
            {personal && items.some((i) => i.status === "archived") && (
              <button type="button" className="chip" aria-pressed={filter === "archived"} onClick={() => setFilter("archived")}>
                Archived
              </button>
            )}
            {personal && (
              <Link href="/add" className="chip chip-add">
                + Add pieces
              </Link>
            )}
            {personal && (
              <Link href="/start" className="chip chip-add">
                Swipe the basics
              </Link>
            )}
          </div>

          {personal && filter === "wanted" && (
            <>
              {/* Wanted pieces are tracked here only: they never join the wardrobe or its looks until bought. */}
              <ul className="wardrobe-grid wishlist" aria-label="Wishlist">
                {wishlist.map((w) => {
                  const item = wishToItem(w);
                  return (
                    <li key={w.id} className="tile wish-tile">
                      <GarmentTile item={item} decorative />
                      <span className="tile-name">{w.name}</span>
                      <span className="tile-meta">{SLOT_LABEL[item.slot]} · Wanted</span>
                      <span className="wish-actions">
                        <button type="button" className="text-link" onClick={() => void gotWish(w.id)}>
                          Got it
                        </button>
                        <button type="button" className="text-link" onClick={() => removeWish(w.id)}>
                          Remove
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <NextBuys title="Best next buys" />
            </>
          )}

          <div className="wardrobe-grid" hidden={filter === "wanted"}>
            {visible.map((item) => {
              const worn = counts.get(item.id) ?? 0;
              const meta = (
                <span className={`tile-meta${ready && worn === 0 ? " new" : ""}`}>
                  {item.status === "laundry" ? "In the wash" : SLOT_LABEL[item.slot]} · {!ready ? "" : worn ? `Worn ${worn}×` : "Not worn yet"}
                </span>
              );
              return personal ? (
                <button key={item.id} type="button" className="tile" onClick={() => setEditing(item.id)}>
                  <GarmentTile item={item} decorative />
                  <span className="tile-name">{item.name}</span>
                  {meta}
                  <span className="sr-only">. Edit</span>
                </button>
              ) : (
                <Link key={item.id} href={`/?pin=${encodeURIComponent(item.id)}`} className="tile">
                  <GarmentTile item={item} decorative />
                  <span className="tile-name">{item.name}</span>
                  {meta}
                  <span className="sr-only">. Style a look around it</span>
                </Link>
              );
            })}
          </div>
          <p className="footer-note">
            {personal
              ? "Tap a piece to edit it, mark it as in the wash, or style a look around it."
              : "Tap a piece to build today’s look around it. The sample pieces are illustrations, not real clothes."}
          </p>
        </>
      )}

      {editingItem && <ItemSheet key={editingItem.id} item={editingItem} worn={counts.get(editingItem.id) ?? 0} onClose={() => setEditing(null)} />}
    </>
  );
}
