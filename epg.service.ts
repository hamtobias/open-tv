import { Injectable, NgZone } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { Channel } from "./models/channel";
import { EPG } from "./models/epg";
import { MediaType } from "./models/mediaType";
import { MemoryService } from "./memory.service";

/** Keep load on the provider low: some block accounts that send many requests quickly. */
const MAX_PARALLEL = 3;
const MAX_PARALLEL_BACKGROUND = 2;
const BACKGROUND_GAP_MS = 400;
/** A card must stay on screen this long before its listings are requested (skips fast scrolling). */
const DWELL_MS = 450;
const FRESH_FOR_MS = 30 * 60 * 1000;
const MIN_LENGTH_S = 2 * 60;

interface CacheEntry {
  data: EPG[];
  fetched: number;
}

interface Job {
  channel: Channel;
  resolve: (data: EPG[]) => void;
  reject: (e: unknown) => void;
}

/** A programme with cleaned-up times (no overlaps with its neighbours). */
export interface Slot {
  epg: EPG;
  start: number; // unix seconds
  end: number; // unix seconds
}

export class EpgCancelled extends Error {}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const sameTitle = (a: EPG, b: EPG) => norm(a.title) == norm(b.title);

/**
 * Shared, rate-limited access to programme listings. Channel cards, the TV
 * guide and the sports page all ask for listings here, so each channel is
 * fetched at most once every 30 minutes and only a few requests run at once.
 *
 * Two queues: "visible" requests (newest first, so what's on screen wins) and
 * "background" scans (oldest first) that only run when nothing visible waits.
 */
@Injectable({ providedIn: "root" })
export class EpgService {
  private cache = new Map<number, CacheEntry>();
  private pending = new Map<number, Promise<EPG[]>>();
  private visible: Job[] = [];
  private background: Job[] = [];
  private inFlight = 0;
  private backgroundInFlight = 0;
  private lastBackgroundStart = 0;
  private wakeTimer?: ReturnType<typeof setTimeout>;
  private dwellTimers = new Map<Element, ReturnType<typeof setTimeout>>();

  private observer?: IntersectionObserver;
  private callbacks = new Map<Element, () => void>();

  constructor(
    private memory: MemoryService,
    private zone: NgZone,
  ) {}

  /** Only Xtream livestreams have listings in Fred TV. */
  supports(channel?: Channel): boolean {
    return (
      !!channel &&
      channel.media_type == MediaType.livestream &&
      channel.stream_id != undefined &&
      this.memory.XtreamSourceIds.has(channel.source_id!)
    );
  }

  /** Listings already fetched (and still fresh) for a channel, without fetching. */
  peek(channel: Channel): EPG[] | undefined {
    const cached = this.cache.get(channel.id!);
    return cached && Date.now() - cached.fetched < FRESH_FOR_MS ? cached.data : undefined;
  }

  get(channel: Channel, background = false): Promise<EPG[]> {
    const id = channel.id!;
    const cached = this.peek(channel);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(id);
    if (pending) {
      // Someone on screen now wants a channel that was only queued in the background: bump it.
      if (!background) this.promote(id);
      return pending;
    }
    const promise = new Promise<EPG[]>((resolve, reject) => {
      (background ? this.background : this.visible).push({ channel, resolve, reject });
      this.pump();
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }

  /** Drops queued background requests (e.g. when leaving the sports page). */
  cancelBackground() {
    const jobs = this.background;
    this.background = [];
    jobs.forEach((j) => j.reject(new EpgCancelled()));
  }

  private promote(id: number) {
    const index = this.background.findIndex((j) => j.channel.id == id);
    if (index >= 0) this.visible.push(...this.background.splice(index, 1));
  }

  private pump() {
    while (this.inFlight < MAX_PARALLEL) {
      let job: Job | undefined;
      let background = false;
      if (this.visible.length > 0) job = this.visible.pop();
      else if (this.background.length > 0 && this.backgroundInFlight < MAX_PARALLEL_BACKGROUND) {
        const wait = this.lastBackgroundStart + BACKGROUND_GAP_MS - Date.now();
        if (wait > 0) {
          // space background requests out instead of firing them all at once
          if (!this.wakeTimer)
            this.wakeTimer = setTimeout(() => {
              this.wakeTimer = undefined;
              this.pump();
            }, wait);
          return;
        }
        job = this.background.shift();
        background = true;
        this.lastBackgroundStart = Date.now();
        this.backgroundInFlight++;
      }
      if (!job) return;
      const current = job;
      this.inFlight++;
      invoke<EPG[]>("get_epg", { channel: current.channel })
        .then((data) => {
          this.cache.set(current.channel.id!, { data, fetched: Date.now() });
          this.zone.run(() => current.resolve(data));
        })
        .catch((e) => this.zone.run(() => current.reject(e)))
        .finally(() => {
          this.inFlight--;
          if (background) this.backgroundInFlight--;
          this.pump();
        });
    }
  }


  /**
   * Sorted, non-overlapping programmes. Providers often send duplicates or
   * entries that overlap (e.g. 17:30–20:00 and 18:00–20:00 for the same match);
   * an exact duplicate start is dropped and an earlier entry is cut off where the
   * next one begins, so nothing is drawn on top of anything else.
   */
  static slots(list: EPG[]): Slot[] {
    const sorted = [...list].sort((a, b) => a.start_timestamp - b.start_timestamp || (b.end_timestamp ?? 0) - (a.end_timestamp ?? 0));
    const out: Slot[] = [];
    sorted.forEach((epg, i) => {
      const start = epg.start_timestamp;
      let end = epg.end_timestamp;
      if (end == undefined || end <= start) {
        const next = sorted.slice(i + 1).find((x) => x.start_timestamp > start);
        end = next?.start_timestamp ?? start + 30 * 60;
      }
      const last = out[out.length - 1];
      if (last && start < last.end) {
        if (start - last.start < MIN_LENGTH_S || sameTitle(last.epg, epg)) {
          // Same slot listed twice: keep the first, but let it run as long as the longer one.
          last.end = Math.max(last.end, end);
          return;
        }
        last.end = start;
      }
      out.push({ epg, start, end });
    });
    return out.filter((s) => s.end - s.start >= MIN_LENGTH_S);
  }

  /** The programme airing right now, if any. */
  static current(list: EPG[], at = Date.now() / 1000): Slot | undefined {
    return EpgService.slots(list).find((s) => s.start <= at && at < s.end);
  }

  /** Calls `visible` once, the first time `el` scrolls near the viewport. */
  whenVisible(el: Element, visible: () => void) {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target;
            if (!entry.isIntersecting) {
              clearTimeout(this.dwellTimers.get(el));
              this.dwellTimers.delete(el);
              continue;
            }
            if (this.dwellTimers.has(el)) continue;
            this.dwellTimers.set(
              el,
              setTimeout(() => {
                this.dwellTimers.delete(el);
                const cb = this.callbacks.get(el);
                this.unobserve(el);
                if (cb) this.zone.run(cb);
              }, DWELL_MS),
            );
          }
        },
        { rootMargin: "0px" },
      );
    }
    this.callbacks.set(el, visible);
    this.observer.observe(el);
  }

  unobserve(el: Element) {
    clearTimeout(this.dwellTimers.get(el));
    this.dwellTimers.delete(el);
    this.callbacks.delete(el);
    this.observer?.unobserve(el);
  }
}
