import Link from "next/link";
import { ADD_ROUTES, type AddRouteId } from "@/lib/addroutes";

/**
 * The four ways to add pieces, each a name and a line of explanation. A route
 * given a handler is a button (Wardrobe opens Quick add and Type a list
 * in place); the rest are links.
 */
export function AddRoutes({ onPick }: { onPick?: Partial<Record<AddRouteId, () => void>> }) {
  return (
    <ul className="add-routes" aria-label="Ways to add pieces">
      {ADD_ROUTES.map((r) => {
        const inner = (
          <>
            <span className="add-route-name">{r.name}</span>
            <span className="add-route-note">{r.note}</span>
          </>
        );
        const pick = onPick?.[r.id];
        return (
          <li key={r.id}>
            {pick ? (
              <button type="button" className="add-route" onClick={pick}>
                {inner}
              </button>
            ) : (
              <Link href={r.href} className="add-route">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
