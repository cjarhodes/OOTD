"use client";

import { useMemo } from "react";
import { GarmentTile } from "@/components/art/Garment";
import type { NextBuy } from "@/lib/recommend";
import { useNextBuys } from "@/state/engine";
import { useWardrobe } from "@/state/wardrobe";

/**
 * The pieces that would do the most for this wardrobe, worked out by running
 * the outfit engine with each one added. Wishlist pieces can be marked as
 * bought; suggestions can go on the wishlist or straight into the wardrobe.
 */
export function NextBuys({ title = "Your best next buys" }: { title?: string }) {
  const { items, addPieces, updateItem } = useWardrobe();
  // Only owned and wanted pieces matter; recompute when they change.
  const key = items.map((i) => `${i.id}:${i.status}`).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const input = useMemo(() => items, [key]);
  const buys = useNextBuys(input);

  const act = async (b: NextBuy, status: "available" | "wanted") => {
    const existing = items.find((i) => i.id === b.item.id);
    if (existing) updateItem({ ...existing, status });
    else await addPieces([{ item: { ...b.item, status } }]);
  };

  return (
    <section className="next-buys" aria-labelledby="next-buys-title" aria-busy={buys === null}>
      <h2 id="next-buys-title" className="setting-title">
        {title}
      </h2>
      <p className="setting-note">Tried against your wardrobe across warm, mild, cold and wet days, at work and at the weekend.</p>
      {buys === null ? (
        <p className="label review-wait">Trying pieces against your wardrobe…</p>
      ) : buys.length === 0 ? (
        <p className="setting-note">Nothing stands out: your wardrobe covers the ground. Add pieces you love, not pieces you need.</p>
      ) : (
        <ol className="next-buys-list">
          {buys.map((b) => (
            <li key={b.item.id} className="next-buy">
              <div className="plinth next-buy-art">
                <GarmentTile item={b.item} decorative />
              </div>
              <div className="next-buy-text">
                <p className="next-buy-name">
                  {b.item.name}
                  {b.wanted && <span className="label"> · on your wishlist</span>}
                </p>
                <p className="next-buy-reason">{b.reason}</p>
                <div className="actions">
                  {!b.wanted && (
                    <button type="button" className="text-link" onClick={() => void act(b, "wanted")}>
                      Want it
                    </button>
                  )}
                  <button type="button" className="text-link" onClick={() => void act(b, "available")}>
                    {b.wanted ? "Got it" : "I have one"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
