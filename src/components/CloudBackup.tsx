"use client";

import { useState } from "react";
import { useCloud, type Snapshot } from "@/state/cloud";
import { useOwner } from "@/state/owner";
import { useWardrobe } from "@/state/wardrobe";

export const SOURCE_URL = "https://github.com/cjarhodes/Clothing";

export function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `today at ${time}` : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} at ${time}`;
}

const pieces = (n: number | null) => `${n ?? 0} piece${n === 1 ? "" : "s"}`;

/** The cloud backup status and the choices it can need. */
export function CloudBackup({ onExport }: { onExport: () => void }) {
  const owner = useOwner();
  const cloud = useCloud();
  const { personalCount, setMode } = useWardrobe();
  const { status } = cloud;
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [confirm, setConfirm] = useState<{ at?: string; label: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!owner.status.cloud.configured) {
    return (
      <p className="setting-note">
        Cloud backup isn’t set up on this copy of OOTD. Your wardrobe is kept in this browser, so download an export below after adding pieces.
      </p>
    );
  }
  if (!owner.status.owner) {
    return (
      <p className="setting-note">
        Cloud backup is for whoever runs this copy of OOTD, after they unlock it above. Visiting? Your wardrobe is kept in this browser and never
        leaves it. Download an export below to keep it safe, or{" "}
        <a className="text-link" href={`${SOURCE_URL}#run-your-own-copy`} target="_blank" rel="noopener noreferrer">
          run your own copy
        </a>{" "}
        with its own private backup.
      </p>
    );
  }

  const restore = async (at?: string) => {
    setConfirm(null);
    setNote(null);
    const err = await cloud.restore(at);
    if (!err) setMode("personal");
    setNote(err ?? (at ? "That version is restored, here and in the cloud." : "Restored from the cloud backup."));
  };

  const line = (() => {
    switch (status.phase) {
      case "checking":
        return "Checking the cloud backup…";
      case "pending":
        return "Changes will be backed up in a moment.";
      case "saving":
        return status.photosLeft > 0 ? `Backing up · ${status.photosLeft} photo${status.photosLeft === 1 ? "" : "s"} to go` : "Backing up…";
      case "restoring":
        return status.photosLeft > 0 ? `Restoring · ${status.photosLeft} photo${status.photosLeft === 1 ? "" : "s"} to go` : "Restoring…";
      case "synced":
        return status.savedAt ? `Backed up · ${pieces(status.remotePieces)} · ${when(status.savedAt)}` : "On. Nothing to back up yet.";
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
            Your cloud backup has {pieces(status.remotePieces)}, saved {when(status.savedAt)}. This device has none yet.
          </span>
          <span className="actions">
            <button type="button" className="btn" onClick={() => void restore()}>
              Restore to this device
            </button>
          </span>
        </div>
      )}

      {(status.phase === "conflict" || status.phase === "shrink") && (
        <div className="banner stack" role="alert">
          <span>
            {status.phase === "shrink"
              ? `The cloud backup has ${pieces(status.remotePieces)} and this device has ${pieces(personalCount)}, so nothing was overwritten.`
              : `The cloud backup (${pieces(status.remotePieces)}) and this device (${pieces(personalCount)}) both changed.`}{" "}
            Choose which to keep. The other stays in Earlier versions.
          </span>
          <span className="actions">
            <button type="button" className="btn" onClick={() => setConfirm({ label: "the cloud backup" })}>
              Use the cloud backup
            </button>
            <button type="button" className="btn alt" onClick={cloud.keepThisDevice}>
              Keep this device’s
            </button>
            <button type="button" className="btn quiet" onClick={onExport}>
              Export this device first
            </button>
          </span>
        </div>
      )}

      {status.phase === "error" && (
        <div className="banner stack" role="alert">
          <span>{status.message ?? "The cloud backup couldn’t be saved. It will retry."}</span>
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
            Replace your wardrobe on this device with {confirm.label}? What’s on this device now stays in the cloud history only if it was backed up.
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
        Every change, photos included, is copied to a private store only you can open. Photos are kept by their content, so none are ever replaced
        or deleted. A copy from before each hour’s first change is kept for rolling back.
      </p>

      <div className="actions">
        <button type="button" className="btn quiet" onClick={cloud.syncNow} disabled={status.phase === "saving" || status.phase === "restoring"}>
          Back up now
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
          {snapshots.length === 0 && <li className="setting-note">No earlier versions yet. One is kept from the second hour you make changes.</li>}
          {snapshots.map((s) => (
            <li key={s.at} className="setting-row">
              <span>As saved {when(s.savedAt)}</span>
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
