import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { Router } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { Subject, Subscription, debounceTime } from "rxjs";
import { MemoryService } from "../memory.service";
import { ErrorService } from "../error.service";
import { Channel } from "../models/channel";
import { EPG } from "../models/epg";
import { EPGNotify } from "../models/epgNotify";
import { MediaType } from "../models/mediaType";
import { Source } from "../models/source";
import { SourceType } from "../models/sourceType";
import { SortType } from "../models/sortType";
import { ViewMode } from "../models/viewMode";
import { EpgService } from "../epg.service";

/** One programme block positioned on the timeline. */
export interface GuideProgramme {
  epg: EPG;
  start: number; // unix seconds
  end: number; // unix seconds
  left: number; // px from timeline start
  width: number; // px
}

interface GuideTick {
  left: number;
  label: string;
  hour: boolean;
  day?: string;
}

type EpgState = "loading" | "done" | "error";

const PAGE_SIZE = 36;
const PX_PER_MIN = 5;
const WINDOW_BEFORE_MIN = 120; // how far back the timeline starts
const WINDOW_LENGTH_MIN = 26 * 60;

@Component({
  selector: "app-guide",
  templateUrl: "./guide.component.html",
  styleUrl: "./guide.component.css",
})
export class GuideComponent implements AfterViewInit, OnDestroy {
  readonly pxPerMin = PX_PER_MIN;
  readonly timelineWidth = WINDOW_LENGTH_MIN * PX_PER_MIN;

  @ViewChild("scroller") scroller!: ElementRef<HTMLDivElement>;
  @ViewChildren("row") rows!: QueryList<ElementRef<HTMLDivElement>>;

  channels: Channel[] = [];
  groups: Channel[] = [];
  groupId?: number;
  favoritesOnly = false;
  query = "";
  page = 1;
  reachedMax = false;
  loading = false;
  hasXtream = true;

  windowStart = 0; // unix seconds
  nowOffset = 0; // px
  ticks: GuideTick[] = [];

  programmes = new Map<number, GuideProgramme[]>();
  epgState = new Map<number, EpgState>();

  selected?: { channel: Channel; prog: GuideProgramme };
  playingId?: number;
  busy = false;

  private observer?: IntersectionObserver;
  private subs: Subscription[] = [];
  private search$ = new Subject<string>();
  private clock?: ReturnType<typeof setInterval>;
  private loadToken = 0;

  constructor(
    public memory: MemoryService,
    private error: ErrorService,
    private router: Router,
    private zone: NgZone,
    private epg: EpgService,
  ) {
    this.buildTimeline();
  }

  async ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => this.onRowsVisible(entries), {
      root: this.scroller.nativeElement,
      rootMargin: "300px 0px",
    });
    this.subs.push(this.rows.changes.subscribe(() => this.observeRows()));
    this.subs.push(
      this.search$.pipe(debounceTime(300)).subscribe((q) => {
        this.query = q;
        this.reload();
      }),
    );
    this.clock = setInterval(() => this.zone.run(() => this.updateNow()), 30_000);

    await this.ensureSources();
    this.hasXtream = this.xtreamIds().length > 0;
    if (!this.hasXtream) return;
    this.memory.get_epg_ids().catch(() => {});
    this.loadGroups();
    await this.reload();
    setTimeout(() => this.scrollToNow(false), 0);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.subs.forEach((s) => s.unsubscribe());
    if (this.clock) clearInterval(this.clock);
  }

  /* ---------------- data ---------------- */

  private async ensureSources() {
    if (this.memory.Sources.size > 0) return;
    try {
      const sources: Source[] = await invoke("get_sources");
      this.memory.Sources = new Map(sources.filter((x) => x.enabled).map((s) => [s.id!, s]));
      sources
        .filter((x) => x.source_type == SourceType.Xtream)
        .forEach((x) => this.memory.XtreamSourceIds.add(x.id!));
    } catch (e) {
      this.error.handleError(e);
    }
  }

  private xtreamIds(): number[] {
    return Array.from(this.memory.Sources.values())
      .filter((s) => s.source_type == SourceType.Xtream)
      .map((s) => s.id!);
  }

  private filters(page: number, groupsOnly = false) {
    return {
      source_ids: this.xtreamIds(),
      media_types: [MediaType.livestream],
      view_type: groupsOnly
        ? ViewMode.Categories
        : this.favoritesOnly
          ? ViewMode.Favorites
          : ViewMode.All,
      page,
      group_id: groupsOnly ? undefined : this.groupId,
      query: groupsOnly ? "" : this.query,
      use_keywords: false,
      sort: SortType.provider,
    };
  }

  async loadGroups() {
    const all: Channel[] = [];
    try {
      for (let page = 1; page <= 100; page++) {
        const batch: Channel[] = await invoke("search", { filters: this.filters(page, true) });
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      this.groups = all;
    } catch (e) {
      this.error.handleError(e);
    }
  }

  async reload() {
    this.page = 1;
    this.reachedMax = false;
    this.channels = [];
    this.selected = undefined;
    this.scroller?.nativeElement.scrollTo({ top: 0 });
    await this.loadPage();
  }

  async loadPage() {
    if (this.loading || this.reachedMax) return;
    const token = ++this.loadToken;
    this.loading = true;
    try {
      const batch: Channel[] = await invoke("search", { filters: this.filters(this.page) });
      if (token != this.loadToken) return;
      this.channels = this.channels.concat(batch);
      this.reachedMax = batch.length < PAGE_SIZE;
      this.page++;
    } catch (e) {
      this.error.handleError(e);
    } finally {
      if (token == this.loadToken) this.loading = false;
    }
  }

  /* ---------------- lazy EPG loading ---------------- */

  private observeRows() {
    this.rows.forEach((r) => this.observer?.observe(r.nativeElement));
  }

  private onRowsVisible(entries: IntersectionObserverEntry[]) {
    this.zone.run(() => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = Number((entry.target as HTMLElement).dataset["id"]);
        const channel = this.channels.find((c) => c.id == id);
        this.observer?.unobserve(entry.target);
        if (!channel || this.epgState.has(id)) continue;
        this.epgState.set(id, "loading");
        this.epg
          .get(channel)
          .then((data) => {
            this.programmes.set(id, this.layout(data));
            this.epgState.set(id, "done");
          })
          .catch(() => this.epgState.set(id, "error"));
      }
    });
  }

  private layout(data: EPG[]): GuideProgramme[] {
    const sorted = [...data].sort((a, b) => a.start_timestamp - b.start_timestamp);
    const windowEnd = this.windowStart + WINDOW_LENGTH_MIN * 60;
    const out: GuideProgramme[] = [];
    sorted.forEach((epg, i) => {
      const start = epg.start_timestamp;
      const end = epg.end_timestamp ?? sorted[i + 1]?.start_timestamp ?? start + 30 * 60;
      if (end <= this.windowStart || start >= windowEnd || end <= start) return;
      const from = Math.max(start, this.windowStart);
      const to = Math.min(end, windowEnd);
      out.push({
        epg,
        start,
        end,
        left: ((from - this.windowStart) / 60) * PX_PER_MIN,
        width: ((to - from) / 60) * PX_PER_MIN,
      });
    });
    return out;
  }

  /* ---------------- timeline ---------------- */

  private buildTimeline() {
    const now = Date.now() / 1000;
    const half = 30 * 60;
    this.windowStart = Math.floor((now - WINDOW_BEFORE_MIN * 60) / half) * half;
    this.ticks = [];
    for (let m = 0; m < WINDOW_LENGTH_MIN; m += 30) {
      const date = new Date((this.windowStart + m * 60) * 1000);
      const midnight = date.getHours() == 0 && date.getMinutes() == 0;
      this.ticks.push({
        left: m * PX_PER_MIN,
        label: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hour: date.getMinutes() == 0,
        day: midnight || m == 0 ? date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : undefined,
      });
    }
    this.updateNow();
  }

  private updateNow() {
    this.nowOffset = ((Date.now() / 1000 - this.windowStart) / 60) * PX_PER_MIN;
  }

  scrollToNow(smooth = true) {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, this.nowOffset - 30 * PX_PER_MIN), behavior: smooth ? "smooth" : "instant" });
  }

  onScroll() {
    const el = this.scroller.nativeElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) this.loadPage();
  }

  /* ---------------- template helpers ---------------- */

  isLive(p: GuideProgramme): boolean {
    const now = Date.now() / 1000;
    return p.start <= now && now < p.end;
  }

  isPast(p: GuideProgramme): boolean {
    return p.end <= Date.now() / 1000;
  }

  isFuture(p: GuideProgramme): boolean {
    return p.start > Date.now() / 1000;
  }

  progress(p: GuideProgramme): number {
    const now = Date.now() / 1000;
    return Math.min(100, Math.max(0, ((now - p.start) / (p.end - p.start)) * 100));
  }

  time(ts: number): string {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  durationLabel(p: GuideProgramme): string {
    const min = Math.round((p.end - p.start) / 60);
    return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? (min % 60) + "m" : ""}`.trim() : `${min}m`;
  }

  dayLabel(): string {
    return new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  }

  nowPlaying(channel: Channel): GuideProgramme | undefined {
    return this.programmes.get(channel.id!)?.find((p) => this.isLive(p));
  }

  trackById(_: number, c: Channel) {
    return c.id;
  }

  trackProg(_: number, p: GuideProgramme) {
    return p.epg.epg_id + p.start;
  }

  initials(name?: string): string {
    return (name ?? "")
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase();
  }

  /* ---------------- filters ---------------- */

  onSearch(value: string) {
    this.search$.next(value);
  }

  setGroup(value: string) {
    this.groupId = value ? Number(value) : undefined;
    this.reload();
  }

  toggleFavorites() {
    this.favoritesOnly = !this.favoritesOnly;
    this.reload();
  }

  /* ---------------- actions ---------------- */

  select(channel: Channel, prog: GuideProgramme) {
    this.selected = { channel, prog };
  }

  closeDetails() {
    this.selected = undefined;
  }

  async watch(channel: Channel) {
    if (this.playingId != undefined) return;
    this.playingId = channel.id;
    try {
      await invoke("play", { channel, record: false });
      invoke("add_last_watched", { id: channel.id }).catch(() => {});
    } catch (e) {
      this.error.handleError(e);
    } finally {
      this.playingId = undefined;
    }
  }

  canCatchUp(p: GuideProgramme): boolean {
    return !!p.epg.has_archive && !!p.epg.timeshift_url && !this.isFuture(p);
  }

  async catchUp(channel: Channel, p: GuideProgramme) {
    if (this.busy) return;
    this.busy = true;
    const vod: Channel = {
      id: -1,
      url: p.epg.timeshift_url,
      name: p.epg.title,
      media_type: MediaType.movie,
      favorite: false,
      source_id: channel.source_id,
    };
    try {
      await invoke("play", { channel: vod, record: false });
    } catch (e) {
      this.error.handleError(e);
    } finally {
      this.busy = false;
    }
  }

  reminderOn(p: GuideProgramme): boolean {
    return this.memory.Watched_epgs.has(p.epg.epg_id);
  }

  async toggleReminder(channel: Channel, p: GuideProgramme) {
    if (this.memory.LoadingNotification) return;
    if (this.memory.trayEnabled === false) {
      this.error.handleError("Reminders need the tray icon enabled (Settings → Enable tray icon)");
      return;
    }
    this.memory.LoadingNotification = true;
    try {
      if (this.reminderOn(p)) {
        await invoke("remove_epg", { epgId: p.epg.epg_id });
        this.error.success("Reminder removed");
      } else {
        const notify: EPGNotify = {
          epg_id: p.epg.epg_id,
          title: p.epg.title,
          channel_name: channel.name!,
          start_timestamp: p.epg.start_timestamp,
        };
        await invoke("add_epg", { epg: notify });
        this.error.success(`You'll get a notification when "${p.epg.title}" starts`);
      }
      await this.memory.get_epg_ids();
    } catch (e) {
      this.error.handleError(e);
    } finally {
      this.memory.LoadingNotification = false;
    }
  }

  /* ---------------- navigation ---------------- */

  goToView(view: ViewMode) {
    this.memory.PendingView = view;
    this.router.navigateByUrl("");
  }

  openSettings() {
    this.router.navigateByUrl("settings");
  }

  @HostListener("document:keydown", ["$event"])
  onKey(event: KeyboardEvent) {
    if (event.key != "Escape" && event.key != "BrowserBack") return;
    if (this.memory.ModalRef) return;
    event.preventDefault();
    if (this.selected) this.closeDetails();
    else this.goToView(ViewMode.All);
  }
}
