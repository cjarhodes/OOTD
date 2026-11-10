"use client";

import { useState } from "react";
import { useCloud, type Snapshot } from "@/state/cloud";
import { useWardrobe } from "@/state/wardrobe";

export const SOURCE_URL = "https://github.com/cjarhodes/OOTD";

export function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `today at ${time}` : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at ${time}`;
}

const pieces = (n: number | null) => `${n ?? 0} piece${n === 1 ? "" : "s"}`;

/** Saving to the account: status, history, and the choices it can need. */
export function CloudBackup({ onExport }: { onExport: () => void }) {
  const cloud = useCloud();
  const { personalCount, setMode } = useWardrobe();
  const { status } = cloud;
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [confirm, setConfirm] = useState<{ at?: string; label: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!cloud.available) return null;

  const restore = async (at?: string) => {
    setConfirm(null);
    setNote(null);
    const err = await cloud.restore(at);
    if (!err) setMode("personal");
    setNote(err ?? (at ? "That version is restored, here and in your account." : "Restored from your account."));
  };

  const line = (() => {
    switch (status.phase) {
      case "checking":
        return "Checking your account…";
      case "pending":
        return "Changes will be saved in a moment.";
      case "saving":
        return status.photosLeft > 0 ? `Saving · ${status.photosLeft} photo${status.photosLeft === 1 ? "" : "s"} to go` : "Saving…";
      case "restoring":
        return status.photosLeft > 0 ? `Restoring · ${status.photosLeft} photo${status.photosLeft === 1 ? "" : "s"} to go` : "Restoring…";
      case "synced":
        return status.savedAt ? `Saved to your account · ${pieces(status.remotePieces)} · ${when(status.savedAt)}` : "Signed in. Nothing to save yet.";
      default:
        return null;
    }
  })();

  return (
    <div className="cloud">
      {line && (
        <p className="cloud-line" role="status">
          <span className={`cloud-dot ${status.phase === "synced" ? "ok" : ""}`} aria-hidden="true" />
          {line}
        </p>
      )}

      {status.phase === "restore-available" && (
        <div className="banner stack" role="alert">
          <span>
            Your account has {pieces(status.remotePieces)}, saved {when(status.savedAt)}. This device has none yet.
          </span>
          <span className="actions">
            <button type="button" className="btn" onClick={() => void restore()}>
              Bring them to this device
            </button>
          </span>
        </div>
      )}

      {(status.phase === "conflict" || status.phase === "shrink") && (
        <div className="banner stack" role="alert">
          <span>
            {status.phase === "shrink"
              ? `Your account has ${pieces(status.remotePieces)} and this device has ${pieces(personalCount)}, so nothing was overwritten.`
              : `Your account (${pieces(status.remotePieces)}) and this device (${pieces(personalCount)}) both changed.`}{" "}
            Combine them to keep every piece from both, or keep just one; the other stays in Earlier versions.
          </span>
          <span className="actions">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                setNote(null);
                const err = await cloud.combine();
                if (!err) setMode("personal");
                setNote(err ?? "Combined: everything from this device and your account is here and saved.");
              }}
            >
              Combine both
            </button>
            <button
              type="button"
              className="btn alt"
              onClick={() => {
                setNote(null);
                cloud.keepThisDevice();
              }}
            >
              Keep this device’s
            </button>
            <button type="button" className="btn alt" onClick={() => setConfirm({ label: "the copy in your account" })}>
              Use my account’s copy
            </button>
            <button type="button" className="btn quiet" onClick={onExport}>
              Export this device first
            </button>
          </span>
        </div>
      )}

      {status.phase === "error" && (
        <div className="banner stack" role="alert">
          <span>{status.message ?? "Your wardrobe couldn’t be saved just now. It will retry."}</span>
          <span className="actions">
            <button type="button" className="btn alt" onClick={cloud.syncNow}>
              Try now
            </button>
          </span>
        </div>
      )}

      {confirm && (
        <div className="banner stack" role="alert">
          <span>
            Replace your wardrobe on this device with {confirm.label}? What’s on this device now stays in Earlier versions only if it was saved.
          </span>
          <span className="actions">
            <button type="button" className="btn" onClick={() => void restore(confirm.at)}>
              Replace
            </button>
            <button type="button" className="btn quiet" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </span>
        </div>
      )}

      {note && <p className="setting-note">{note}</p>}

      <p className="setting-note">
        Every change, photos included, is saved to your account a few seconds after you make it; only you can open it. Photos are kept by their
        content, so none are ever replaced. A copy from before each hour’s first change is kept for rolling back.
      </p>

      <div className="actions">
        <button type="button" className="btn quiet" onClick={cloud.syncNow} disabled={status.phase === "saving" || status.phase === "restoring"}>
          Save now
        </button>
        <button
          type="button"
          className="btn quiet"
          aria-expanded={snapshots !== null}
          onClick={async () => setSnapshots(snapshots ? null : await cloud.listSnapshots())}
        >
          Earlier versions
        </button>
      </div>

      {snapshots && (
        <ul className="snapshots">
          {snapshots.length === 0 && <li className="setting-note">No earlier versions yet. One is kept the first time you make changes in a new hour.</li>}
          {snapshots.map((s) => (
            <li key={s.at} className="setting-row">
              <span>
                {pieces(s.pieces)}, as saved {when(s.savedAt)}
              </span>
              <button type="button" className="text-link" onClick={() => setConfirm({ at: s.at, label: `the version saved ${when(s.savedAt)}` })}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
