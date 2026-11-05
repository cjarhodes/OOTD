"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GarmentTile } from "@/components/art/Garment";
import { SLOT_LABEL } from "@/lib/kinds";
import type { Slot } from "@/lib/types";
import { useWardrobe } from "@/state/wardrobe";

const SLOTS: Slot[] = ["base", "mid", "outer", "bottom", "shoes"];

export default function WardrobePage() {
  const { ready, items, wears } = useWardrobe();
  const [filter, setFilter] = useState<Slot | "all">("all");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of wears) for (const id of w.itemIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [wears]);

  const visible = items
    .filter((i) => i.status !== "archived" && (filter === "all" || i.slot === filter))
    .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  const unworn = items.filter((i) => !counts.get(i.id)).length;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">
          {items.length} pieces{ready && unworn > 0 ? ` · ${unworn} not worn yet` : ""}
        </span>
        <h1 className="display page-title">Wardrobe</h1>
      </div>

      <div className="chips" role="group" aria-label="Filter by layer">
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All
        </button>
        {SLOTS.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="wardrobe-grid">
        {visible.map((item) => {
          const worn = counts.get(item.id) ?? 0;
          return (
            <Link key={item.id} href={`/?pin=${encodeURIComponent(item.id)}`} className="tile" aria-label={`${item.name}. Style a look around it.`}>
              <GarmentTile item={item} />
              <span className="tile-name">{item.name}</span>
              <span className={`tile-meta${ready && worn === 0 ? " new" : ""}`}>
                {SLOT_LABEL[item.slot]} · {!ready ? "" : worn ? `Worn ${worn}×` : "Not worn yet"}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="footer-note">Tap a piece to build today’s look around it. The sample pieces are illustrations, not real clothes.</p>
    </>
  );
}
