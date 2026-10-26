import { Injectable, NgZone } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { Channel } from "./models/channel";
import { EPG } from "./models/epg";
import { MediaType } from "./models/mediaType";
import { MemoryService } from "./memory.service";

const MAX_PARALLEL = 4;
const FRESH_FOR_MS = 30 * 60 * 1000;

interface CacheEntry {
  data: EPG[];
  fetched: number;
}

interface Job {
  channel: Channel;
  resolve: (data: EPG[]) => void;
  reject: (e: unknown) => void;
}

/**
 * Shared, rate-limited access to programme listings. Channel cards and the TV
 * guide both ask for listings here, so each channel is fetched at most once
 * every 30 minutes and never more than a few requests run at the same time.
 */
@Injectable({ providedIn: "root" })
export class EpgService {
  private cache = new Map<number, CacheEntry>();
  private pending = new Map<number, Promise<EPG[]>>();
  private queue: Job[] = [];
  private inFlight = 0;

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

  get(channel: Channel): Promise<EPG[]> {
    const id = channel.id!;
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.fetched < FRESH_FOR_MS) return Promise.resolve(cached.data);
    const pending = this.pending.get(id);
    if (pending) return pending;
    const promise = new Promise<EPG[]>((resolve, reject) => {
      this.queue.push({ channel, resolve, reject });
      this.pump();
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, promise);
    return promise;
  }

  /** Visible channels first: newer requests jump ahead of ones scrolled past. */
  private pump() {
    while (this.inFlight < MAX_PARALLEL && this.queue.length > 0) {
      const job = this.queue.pop()!;
      this.inFlight++;
      invoke<EPG[]>("get_epg", { channel: job.channel })
        .then((data) => {
          this.cache.set(job.channel.id!, { data, fetched: Date.now() });
          this.zone.run(() => job.resolve(data));
        })
        .catch((e) => this.zone.run(() => job.reject(e)))
        .finally(() => {
          this.inFlight--;
          this.pump();
        });
    }
  }

  /** The programme airing right now, if any. */
  static current(list: EPG[], at = Date.now() / 1000): EPG | undefined {
    const sorted = [...list].sort((a, b) => a.start_timestamp - b.start_timestamp);
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i].start_timestamp;
      const end = EpgService.end(sorted, i);
      if (start <= at && at < end) return sorted[i];
    }
    return undefined;
  }

  /** End time of entry i, falling back to the next programme's start. */
  static end(sorted: EPG[], i: number): number {
    return sorted[i].end_timestamp ?? sorted[i + 1]?.start_timestamp ?? sorted[i].start_timestamp + 30 * 60;
  }

  /** Calls `visible` once, the first time `el` scrolls near the viewport. */
  whenVisible(el: Element, visible: () => void) {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const cb = this.callbacks.get(entry.target);
            this.unobserve(entry.target);
            if (cb) this.zone.run(cb);
          }
        },
        { rootMargin: "200px 0px" },
      );
    }
    this.callbacks.set(el, visible);
    this.observer.observe(el);
  }

  unobserve(el: Element) {
    this.callbacks.delete(el);
    this.observer?.unobserve(el);
  }
}
