"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { saveFailure } from "@/lib/account";
import { parseBackup } from "@/lib/backup";
import type { PersonalState } from "@/lib/db";
import { hashBlob } from "@/lib/photo";
import { mergeStates } from "@/lib/merge";
import { decide, fingerprint, retryDelay, type Remote, type SyncedMark } from "@/lib/sync";
import { useAuth } from "./auth";
import { useWardrobe } from "./wardrobe";

/**
 * Keeps the signed-in person's wardrobe saved to their account (OOTD's own
 * API: /api/wardrobe and /api/photos, backed by private storage). Changes are
 * sent a few seconds after they happen, photos first, so the account never
 * lists a piece whose photo it doesn't hold. Nothing on the device or in the
 * account is replaced without a choice when both have changed.
 */
export type CloudPhase =
  /** Signed out, or accounts aren't set up on this deployment. */
  | "off"
  | "checking"
  | "synced"
  | "pending"
  | "saving"
  | "restoring"
  /** A fresh device; the backup can be restored. */
  | "restore-available"
  /** Both copies changed. */
  | "conflict"
  /** This device has far fewer pieces than the backup; the server refused to shrink it. */
  | "shrink"
  /** Saving failed; it will retry. */
  | "error";

export interface CloudStatus {
  phase: CloudPhase;
  /** When the cloud copy was last saved. */
  savedAt: string | null;
  remotePieces: number | null;
  /** Photos waiting to upload. */
  photosLeft: number;
  message: string | null;
}

export interface Snapshot {
  at: string;
  savedAt: string;
  pieces: number;
}

interface CloudContext {
  status: CloudStatus;
  available: boolean;
  syncNow: () => void;
  /** Replace this device with the cloud copy (or an earlier snapshot of it). */
  restore: (at?: string) => Promise<string | null>;
  /** Keep this device's copy and overwrite the cloud one (the old one stays in history). */
  keepThisDevice: () => void;
  /** Keep everything from both copies, then save the result. */
  combine: () => Promise<string | null>;
  listSnapshots: () => Promise<Snapshot[]>;
}

const DEBOUNCE_MS = 6000;
/** No request may hang a save: Safari can stall one when the app is switched away. */
const REQUEST_MS = 20_000;
const PHOTO_MS = 60_000;
/** A save still "busy" after this long is treated as stuck, never as a reason to drop the next one. */
const STUCK_MS = 120_000;

/** fetch, given up on after `ms` (body included): resolves null on failure or timeout. */
async function fetchWithin(url: string, init: RequestInit = {}, ms = REQUEST_MS): Promise<Response | null> {
  const ctrl = new AbortController();
  // Left running past the response so reading the body is covered too; aborting a finished request does nothing.
  setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  }
}

// Per account, so two people on one device never confuse each other's copies.
let uid = "";
const markKey = () => `ootd.cloud.v2.${uid}`;
const photosKey = () => `ootd.cloud.photos.v2.${uid}`;

function readMark(): SyncedMark | null {
  try {
    const m = JSON.parse(localStorage.getItem(markKey()) ?? "null") as SyncedMark | null;
    return m && typeof m.etag === "string" && typeof m.fingerprint === "string" ? m : null;
  } catch {
    return null;
  }
}

function writeMark(mark: SyncedMark) {
  try {
    localStorage.setItem(markKey(), JSON.stringify(mark));
  } catch {
    // Without storage the next visit re-checks with the server, which is safe.
  }
}

function readUploaded(): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem(photosKey()) ?? "[]") as unknown;
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeUploaded(set: Set<string>) {
  try {
    localStorage.setItem(photosKey(), JSON.stringify([...set]));
  } catch {
    // The server skips photos it already has, so re-uploading is harmless.
  }
}

/** What gets backed up: the stored state, without runtime photo URLs. */
function cloudCopy(state: PersonalState): PersonalState {
  return { ...state, trips: state.trips ?? [], wishlist: state.wishlist ?? [], items: state.items.map(({ image: _i, ...rest }) => rest) };
}

/** Do two states hold the same wardrobe? Compared as the server stores them. */
function sameState(local: PersonalState, remote: unknown): boolean {
  const norm = (state: unknown) => {
    const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: "", state, images: {} });
    return parsed.ok ? fingerprint(parsed.backup.state) : null;
  };
  const a = norm(local);
  return a !== null && a === norm(remote);
}

type Fetched =
  | { kind: "ok"; remote: Remote; state: unknown }
  | { kind: "none" }
  | { kind: "off" }
  | { kind: "error"; message: string };

/** The account's wardrobe, or one of its history slots when `at` is given. */
async function fetchRemote(at?: string): Promise<Fetched> {
  if (!uid) return { kind: "off" };
  try {
    const res = await fetchWithin(at ? `/api/wardrobe/history?slot=${encodeURIComponent(at)}` : "/api/wardrobe", { cache: "no-store" });
    if (!res) return { kind: "error", message: "Couldn’t reach your account. It will retry." };
    if (res.status === 401) return { kind: "off" };
    const json = (await res.json().catch(() => ({}))) as {
      wardrobe?: { state: unknown; etag: string; savedAt: string; pieces: number } | null;
      state?: unknown;
      savedAt?: string;
      pieces?: number;
      error?: string;
    };
    if (!res.ok) return { kind: "error", message: json.error ?? "Couldn’t reach your account. It will retry." };
    if (at) return { kind: "ok", remote: { etag: "", savedAt: json.savedAt ?? "", pieces: json.pieces ?? 0 }, state: json.state };
    if (!json.wardrobe) return { kind: "none" };
    const w = json.wardrobe;
    return { kind: "ok", remote: { etag: w.etag, savedAt: w.savedAt, pieces: w.pieces }, state: w.state };
  } catch {
    return { kind: "error", message: "Couldn’t reach your account. It will retry." };
  }
}

const IDLE: CloudStatus = { phase: "off", savedAt: null, remotePieces: null, photosLeft: 0, message: null };
const Ctx = createContext<CloudContext | null>(null);

export function CloudProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { personalState, photoBlobs, replacePersonal } = useWardrobe();
  const available = Boolean(user);
  uid = user?.id ?? "";
  const [status, setStatus] = useState<CloudStatus>(IDLE);
  const set = useCallback((patch: Partial<CloudStatus>) => setStatus((s) => ({ ...s, ...patch })), []);

  // Refs so timers and async work always see the latest values.
  const stateRef = useRef(personalState);
  stateRef.current = personalState;
  const phaseRef = useRef<CloudPhase>("off");
  phaseRef.current = status.phase;
  const busy = useRef(false);
  const busySince = useRef(0);
  // A choice made while a save is running (Keep this device's, Combine) runs as soon as it finishes.
  const queued = useRef<(() => void) | null>(null);
  // "Keep this device's" holds until it lands: retries and Save now stay forced.
  const forceOwed = useRef(false);
  const isBusy = () => busy.current && Date.now() - busySince.current < STUCK_MS;
  const claim = () => {
    busy.current = true;
    busySince.current = Date.now();
  };
  const release = () => {
    busy.current = false;
    const next = queued.current;
    queued.current = null;
    if (next) setTimeout(next, 0);
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const remoteRef = useRef<Remote | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);

  const uploadPhotos = useCallback(
    async (state: PersonalState): Promise<string | null> => {
      const uploaded = readUploaded();
      const todo = state.items.filter((i) => i.photoHash && !uploaded.has(i.photoHash));
      set({ photosLeft: todo.length });
      if (!todo.length) return null;
      const blobs = await photoBlobs(todo.map((i) => i.id));
      let left = todo.length;
      for (const item of todo) {
        const blob = blobs.get(item.id);
        if (blob && item.photoHash) {
          // Only send bytes that still match the hash the state records.
          if ((await hashBlob(blob)) !== item.photoHash) return "A photo changed while it was saving. It will retry.";
          const res = await fetchWithin(
            `/api/photos/${item.photoHash}`,
            { method: "PUT", headers: { "Content-Type": blob.type || "image/png" }, body: blob },
            PHOTO_MS,
          );
          if (!res) return "A photo couldn’t be uploaded. It will retry.";
          if (!res.ok) {
            const json = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
            return json.code === "limit" ? (json.error ?? "Your account is full of photos.") : "A photo couldn’t be uploaded. It will retry.";
          }
          uploaded.add(item.photoHash);
          writeUploaded(uploaded);
        }
        left -= 1;
        set({ photosLeft: left });
      }
      return null;
    },
    [photoBlobs, set],
  );

  const push = useCallback(
    async (opts: { force?: boolean; ifMatch?: string } = {}) => {
      const state = stateRef.current;
      if (!state || isBusy()) return;
      claim();
      const force = opts.force === true || forceOwed.current;
      if (force) forceOwed.current = true;
      set({ phase: "saving", message: null });
      try {
        const copy = cloudCopy(state);
        const photoError = await uploadPhotos(copy);
        if (photoError) throw new Error(photoError);
        const ifMatch = opts.ifMatch ?? readMark()?.etag ?? remoteRef.current?.etag;
        const res = await fetchWithin("/api/wardrobe", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: copy, ifMatch: ifMatch ?? null, force }),
        });
        if (!res) throw new Error("Couldn’t reach your account. It will retry.");
        const data = (await res.json().catch(() => ({}))) as { etag?: string; savedAt?: string; pieces?: number; code?: string; details?: string; error?: string };
        if (res.ok && data.etag && data.savedAt) {
          forceOwed.current = false;
          writeMark({ etag: data.etag, savedAt: data.savedAt, fingerprint: fingerprint(copy) });
          remoteRef.current = { etag: data.etag, savedAt: data.savedAt, pieces: data.pieces ?? copy.items.length };
          attempts.current = 0;
          set({ phase: "synced", savedAt: data.savedAt, remotePieces: data.pieces ?? copy.items.length, message: null });
          return;
        }
        const error = { code: res.status === 401 ? "28000" : data.code, details: data.details, message: data.error };
        const failure = saveFailure(error);
        if (failure.kind === "conflict" || failure.kind === "shrink") {
          set({ phase: failure.kind, remotePieces: failure.remotePieces, message: error?.message ?? null });
          return;
        }
        if (failure.kind === "signed-out") {
          set({ phase: "off", message: null });
          return;
        }
        if (failure.kind === "rejected") {
          set({ phase: "error", message: failure.message });
          return;
        }
        throw new Error(failure.message);
      } catch (e) {
        attempts.current += 1;
        set({ phase: "error", message: e instanceof Error ? e.message : "The cloud backup couldn’t be saved. It will retry." });
        schedule(() => void push(), retryDelay(attempts.current));
      } finally {
        release();
      }
    },
    [schedule, set, uploadPhotos],
  );

  const restore = useCallback(
    async (at?: string): Promise<string | null> => {
      if (isBusy()) return "The backup is busy. Try again in a moment.";
      claim();
      forceOwed.current = false;
      set({ phase: "restoring", message: null });
      try {
        const fetched = await fetchRemote(at);
        if (fetched.kind !== "ok") {
          const message = fetched.kind === "error" ? fetched.message : "There’s no saved wardrobe in your account yet.";
          set({ phase: "error", message });
          return message;
        }
        const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: fetched.remote.savedAt, state: fetched.state, images: {} });
        if (!parsed.ok) {
          set({ phase: "error", message: parsed.error });
          return parsed.error;
        }
        const state = parsed.backup.state;
        const withPhotos = state.items.filter((i) => i.photoHash);
        set({ photosLeft: withPhotos.length });
        const photos = new Map<string, Blob>();
        let failed = 0;
        let left = withPhotos.length;
        // A few at a time; everything must arrive before anything is replaced.
        const queue = [...withPhotos];
        await Promise.all(
          Array.from({ length: 4 }, async () => {
            for (let item = queue.shift(); item; item = queue.shift()) {
              const res = await fetchWithin(`/api/photos/${item.photoHash}`, {}, PHOTO_MS);
              const blob = res && res.ok ? await res.blob() : null;
              if (blob && (await hashBlob(blob)) === item.photoHash) photos.set(item.id, blob);
              else failed += 1;
              left -= 1;
              set({ photosLeft: left });
            }
          }),
        );
        if (failed) {
          const message = `${failed} photo${failed === 1 ? "" : "s"} didn’t download, so nothing on this device was changed. Try again.`;
          set({ phase: "error", message });
          return message;
        }
        await replacePersonal(state, photos);
        writeUploaded(new Set(withPhotos.map((i) => i.photoHash!)));
        if (at) {
          // An earlier version becomes the current one; the newer copy stays in history.
          release();
          stateRef.current = state;
          await push({ force: true });
          return null;
        }
        writeMark({ etag: fetched.remote.etag, savedAt: fetched.remote.savedAt, fingerprint: fingerprint(cloudCopy(state)) });
        remoteRef.current = fetched.remote;
        set({ phase: "synced", savedAt: fetched.remote.savedAt, remotePieces: fetched.remote.pieces, photosLeft: 0, message: null });
        return null;
      } catch {
        const message = "The restore didn’t finish, so nothing on this device was changed.";
        set({ phase: "error", message });
        return message;
      } finally {
        if (busy.current) release();
      }
    },
    [push, replacePersonal, set],
  );

  /**
   * Keep everything: this device's pieces and the account's, merged
   * (lib/merge.ts), with the account's photos brought down first. The save
   * names the account version it merged, so a third device's change in the
   * meantime is caught as a conflict instead of being overwritten.
   */
  const combine = useCallback(async (): Promise<string | null> => {
    const local = stateRef.current;
    if (!local) return "Your wardrobe hasn’t loaded yet.";
    if (isBusy()) {
      queued.current = () => void combine();
      set({ phase: "saving", message: null });
      return null;
    }
    claim();
    let handedOn = false;
    set({ phase: "restoring", message: null });
    try {
      const fetched = await fetchRemote();
      if (fetched.kind !== "ok") {
        const message = fetched.kind === "error" ? fetched.message : "There’s no saved wardrobe in your account to combine with.";
        set({ phase: "error", message });
        return message;
      }
      const parsed = parseBackup({ app: "ootd", version: 1, exportedAt: fetched.remote.savedAt, state: fetched.state, images: {} });
      if (!parsed.ok) {
        set({ phase: "error", message: parsed.error });
        return parsed.error;
      }
      const merged = mergeStates(cloudCopy(local), parsed.backup.state);
      const here = new Set(local.items.map((i) => i.id));
      // This device's photos, plus the account's for the pieces it adds.
      const photos = await photoBlobs(merged.items.filter((i) => here.has(i.id)).map((i) => i.id));
      const fromAccount = merged.items.filter((i) => !here.has(i.id) && i.photoHash);
      set({ photosLeft: fromAccount.length });
      let failed = 0;
      for (const item of fromAccount) {
        const res = await fetchWithin(`/api/photos/${item.photoHash}`, {}, PHOTO_MS);
        const blob = res && res.ok ? await res.blob().catch(() => null) : null;
        if (blob && (await hashBlob(blob)) === item.photoHash) photos.set(item.id, blob);
        else failed += 1;
        set({ photosLeft: fromAccount.length - photos.size });
      }
      if (failed) {
        const message = `${failed} photo${failed === 1 ? "" : "s"} didn’t download, so nothing was combined. Try again.`;
        set({ phase: "error", message });
        return message;
      }
      await replacePersonal(merged, photos);
      const uploaded = readUploaded();
      for (const i of fromAccount) uploaded.add(i.photoHash!);
      writeUploaded(uploaded);
      stateRef.current = merged;
      handedOn = true;
      release();
      await push({ ifMatch: fetched.remote.etag });
      return null;
    } catch {
      const message = "Combining didn’t finish, so nothing on this device was changed.";
      set({ phase: "error", message });
      return message;
    } finally {
      if (!handedOn) release();
    }
  }, [photoBlobs, push, replacePersonal, set]);

  /** Compare with the cloud and act on the rules in lib/sync.ts. */
  const check = useCallback(async () => {
    const state = stateRef.current;
    if (!state || isBusy()) return;
    set({ phase: "checking" });
    const fetched = await fetchRemote();
    if (fetched.kind === "off") return set({ phase: "off" });
    if (fetched.kind === "error") {
      attempts.current += 1;
      schedule(() => void check(), retryDelay(attempts.current));
      return set({ phase: "error", message: fetched.message });
    }
    const remote = fetched.kind === "ok" ? fetched.remote : null;
    remoteRef.current = remote;
    const copy = cloudCopy(state);
    const localFingerprint = fingerprint(copy);
    const sameAsRemote = fetched.kind === "ok" && sameState(copy, fetched.state);
    const action = decide({ localPieces: copy.items.length, localFingerprint, mark: readMark(), remote, sameAsRemote });
    set({ savedAt: remote?.savedAt ?? null, remotePieces: remote?.pieces ?? null, message: null });
    if (action === "adopt" && remote) {
      writeMark({ etag: remote.etag, savedAt: remote.savedAt, fingerprint: localFingerprint });
      return set({ phase: "synced" });
    }
    if (action === "push") return void push({ ifMatch: remote?.etag });
    if (action === "pull") return void restore();
    if (action === "offer-restore") return set({ phase: "restore-available" });
    if (action === "conflict") return set({ phase: "conflict" });
    set({ phase: "synced" });
  }, [push, restore, schedule, set]);

  // Start (or stop) when someone signs in and their wardrobe has loaded.
  const loaded = personalState !== null;
  useEffect(() => {
    if (!available || !loaded) {
      set({ ...IDLE });
      return;
    }
    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible" && phaseRef.current === "synced") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // Only on start and stop: re-running check on every render would re-fetch.
  }, [available, loaded]);

  // Save a few seconds after each change; save at once when the app is hidden.
  // Re-runs when a save or check settles, to pick up changes made meanwhile.
  // (After an error the retry timer sends the latest state.)
  const localFingerprint = useMemo(() => (personalState ? fingerprint(cloudCopy(personalState)) : null), [personalState]);
  const settled = status.phase === "synced" || status.phase === "pending";
  useEffect(() => {
    if (!available || !localFingerprint || !settled) return;
    const mark = readMark();
    if (mark?.fingerprint === localFingerprint) return;
    // An empty device that has never synced has nothing worth sending.
    if (!mark && (personalState?.items.length ?? 0) === 0) return;
    set({ phase: "pending" });
    schedule(() => void push(), DEBOUNCE_MS);
    const flush = () => {
      if (document.visibilityState === "hidden" && phaseRef.current === "pending") void push();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
    // personalState is read only for its size; localFingerprint tracks its content.
  }, [available, localFingerprint, settled, push, schedule, set]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const value = useMemo<CloudContext>(
    () => ({
      status,
      available,
      syncNow: () => {
        if (isBusy()) queued.current = () => void push();
        else void (phaseRef.current === "pending" || phaseRef.current === "error" ? push() : check());
      },
      restore,
      keepThisDevice: () => {
        // Never dropped: if a save is running, this one goes straight after it.
        if (isBusy()) {
          queued.current = () => void push({ force: true });
          set({ phase: "saving", message: null });
        } else void push({ force: true });
      },
      combine,
      listSnapshots: async () => {
        try {
          const res = await fetch("/api/wardrobe/history", { cache: "no-store" });
          if (!res.ok) return [];
          const json = (await res.json()) as { snapshots?: { slot: number; savedAt: string; pieces: number }[] };
          return (json.snapshots ?? []).map((r) => ({ at: String(r.slot), savedAt: r.savedAt, pieces: r.pieces }));
        } catch {
          return [];
        }
      },
    }),
    [status, available, push, check, restore, combine, set],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud(): CloudContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCloud must be used inside CloudProvider");
  return ctx;
}
