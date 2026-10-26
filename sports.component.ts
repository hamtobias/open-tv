import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { MemoryService } from "../memory.service";
import { ErrorService } from "../error.service";
import { EpgCancelled, EpgService } from "../epg.service";
import { Channel } from "../models/channel";
import { EPG } from "../models/epg";
import { MediaType } from "../models/mediaType";
import { SourceType } from "../models/sourceType";
import { SortType } from "../models/sortType";
import { ViewMode } from "../models/viewMode";
import { Country, countryOf, OTHER_COUNTRY } from "../countries";
import { SPORTS, Sport, classify, eventKey, isExtra, isLiveTagged, isSportsChannel, variantKey } from "../sports";

/** One game/broadcast, possibly available on several channels. */
export interface SportEvent {
  key: string;
  sport: Sport;
  title: string;
  description: string;
  start: number;
  end: number;
  liveTag: boolean;
  extra: boolean;
  channels: Channel[];
}

interface SportSection {
  sport: Sport;
  events: SportEvent[];
  liveCount: number;
}

const PAGE_SIZE = 36;
const HORIZON_S = 4 * 3600;
const RESCAN_AFTER_MS = 25 * 60 * 1000;
const COUNTRY_KEY = "sportsCountry2";
/** Channels checked per batch, so the provider isn't flooded with listing requests. */
const SCAN_BATCH = 60;
const EXTRAS_KEY = "sportsShowExtras";

@Component({
  selector: "app-sports",
  templateUrl: "./sports.component.html",
  styleUrl: "./sports.component.css",
})
export class SportsComponent implements OnInit, OnDestroy {
  hasXtream = true;
  loadingChannels = true;

  /** Candidate channels (sports channels + favourites), favourites first. */
  private candidates: Channel[] = [];
  private groupNames = new Map<number, string>();
  private listings = new Map<number, EPG[]>();
  private failed = new Set<number>();
  private requested = new Set<number>();
  /** One channel per name (HD/SD/backup copies share listings) → all its copies. */
  private variants = new Map<number, Channel[]>();
  private scope: Channel[] = [];
  scanLimit = SCAN_BATCH;
  private lastScan = 0;

  countries: { country: Country; count: number }[] = [];
  countryKey = "all";
  showExtras = false;
  selectedSport = "all";

  sections: SportSection[] = [];
  sportTabs: { sport: Sport; count: number; live: number }[] = [];
  totalEvents = 0;

  playingId?: number;
  now = Date.now() / 1000;

  private timer?: ReturnType<typeof setInterval>;
  private recomputeQueued = false;
  private destroyed = false;

  constructor(
    public memory: MemoryService,
    private epg: EpgService,
    private error: ErrorService,
    private router: Router,
  ) {
    try {
      this.countryKey = localStorage.getItem(COUNTRY_KEY) ?? "";
      this.showExtras = localStorage.getItem(EXTRAS_KEY) == "true";
    } catch {}
  }

  async ngOnInit() {
    await this.memory.ensureSources();
    this.memory.get_epg_ids().catch(() => {});
    this.hasXtream = this.xtreamIds().length > 0;
    if (!this.hasXtream) {
      this.loadingChannels = false;
      return;
    }
    await this.loadChannels();
    this.loadingChannels = false;
    this.scan();
    this.timer = setInterval(() => {
      this.now = Date.now() / 1000;
      if (Date.now() - this.lastScan > RESCAN_AFTER_MS) {
        this.requested.clear();
        this.failed.clear();
        this.scan();
      }
      this.recompute();
    }, 60_000);
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.timer) clearInterval(this.timer);
    this.epg.cancelBackground();
  }

  /* ---------------- channels ---------------- */

  private xtreamIds(): number[] {
    return Array.from(this.memory.Sources.values())
      .filter((s) => s.source_type == SourceType.Xtream)
      .map((s) => s.id!);
  }

  private async searchAll(viewType: ViewMode): Promise<Channel[]> {
    const all: Channel[] = [];
    for (let page = 1; page <= 2000; page++) {
      const batch: Channel[] = await invoke("search", {
        filters: {
          source_ids: this.xtreamIds(),
          media_types: [MediaType.livestream],
          view_type: viewType,
          page,
          query: "",
          use_keywords: false,
          sort: SortType.provider,
        },
      });
      all.push(...batch);
      if (batch.length < PAGE_SIZE || this.destroyed) break;
    }
    return all;
  }

  private async loadChannels() {
    try {
      const [groups, channels] = await Promise.all([
        this.searchAll(ViewMode.Categories),
        this.searchAll(ViewMode.All),
      ]);
      groups.forEach((g) => this.groupNames.set(g.id!, g.name ?? ""));
      const favorites: Channel[] = [];
      const sports: Channel[] = [];
      for (const c of channels) {
        if (!this.epg.supports(c)) continue;
        if (c.favorite) favorites.push(c);
        else if (isSportsChannel(c.name, this.groupName(c))) sports.push(c);
      }
      this.candidates = this.collapseVariants(favorites.concat(sports));
      this.buildCountries();
      if (!this.countryKey) this.countryKey = this.defaultCountry(favorites);
      this.updateScope();
    } catch (e) {
      this.error.handleError(e);
    }
  }

  /** "DK: TV 2 SPORT ᴴᴰ", "DK: TV 2 SPORT SD" and "… BACKUP" are the same channel with the same listings. */
  private collapseVariants(channels: Channel[]): Channel[] {
    const byKey = new Map<string, Channel[]>();
    for (const c of channels) {
      const key = variantKey(c.name);
      const list = byKey.get(key) ?? [];
      if (!list.some((x) => x.id == c.id)) list.push(c);
      byKey.set(key, list);
    }
    const reps: Channel[] = [];
    for (const list of byKey.values()) {
      list.sort((a, b) => this.channelRank(a) - this.channelRank(b));
      this.variants.set(list[0].id!, list);
      reps.push(list[0]);
    }
    // favourites first, as collected
    return reps.sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }

  /** The country most of your favourites are from (else the one with most sports channels). */
  private defaultCountry(favorites: Channel[]): string {
    const tally = (list: Channel[]) => {
      const counts = new Map<string, number>();
      list.forEach((c) => {
        const key = this.countryOfChannel(c).key;
        if (key != "OTHER") counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    };
    return tally(favorites) ?? tally(this.candidates) ?? "all";
  }

  private updateScope() {
    this.scope = this.candidates.filter((c) => this.inScope(c));
  }

  private groupName(c: Channel): string | undefined {
    return c.group_id != undefined ? this.groupNames.get(c.group_id) : undefined;
  }

  countryOfChannel(c: Channel): Country {
    return countryOf(c.name) ?? countryOf(this.groupName(c)) ?? OTHER_COUNTRY;
  }

  private buildCountries() {
    const counts = new Map<string, { country: Country; count: number }>();
    for (const c of this.candidates) {
      const country = this.countryOfChannel(c);
      const entry = counts.get(country.key) ?? { country, count: 0 };
      entry.count++;
      counts.set(country.key, entry);
    }
    const rank = (c: Country) => (c.key == "OTHER" ? 2 : c.region ? 1 : 0);
    this.countries = [...counts.values()].sort(
      (a, b) => rank(a.country) - rank(b.country) || a.country.name.localeCompare(b.country.name),
    );
    if (this.countryKey && this.countryKey != "all" && !counts.has(this.countryKey)) this.countryKey = "";
  }

  private inScope(c: Channel): boolean {
    return this.countryKey == "all" || this.countryOfChannel(c).key == this.countryKey;
  }

  /** The channels being checked right now (favourites first, at most `scanLimit`). */
  scopeChannels(): Channel[] {
    return this.scope.slice(0, this.scanLimit);
  }

  get remainingCount(): number {
    return Math.max(0, this.scope.length - this.scanLimit);
  }

  checkMore() {
    this.scanLimit += SCAN_BATCH;
    this.scan();
  }

  /* ---------------- listings ---------------- */

  private scan() {
    this.lastScan = Date.now();
    for (const c of this.scopeChannels()) {
      const id = c.id!;
      if (this.requested.has(id)) continue;
      this.requested.add(id);
      this.epg
        .get(c, true)
        .then((data) => {
          this.listings.set(id, data);
          this.queueRecompute();
        })
        .catch((e) => {
          if (e instanceof EpgCancelled) this.requested.delete(id);
          else {
            this.failed.add(id);
            this.queueRecompute();
          }
        });
    }
    this.recompute();
  }

  get checkedCount(): number {
    return this.scopeChannels().filter((c) => this.listings.has(c.id!) || this.failed.has(c.id!)).length;
  }

  get scopeCount(): number {
    return this.scopeChannels().length;
  }

  get scanning(): boolean {
    return !this.loadingChannels && this.checkedCount < this.scopeCount;
  }

  private queueRecompute() {
    if (this.recomputeQueued) return;
    this.recomputeQueued = true;
    setTimeout(() => {
      this.recomputeQueued = false;
      this.recompute();
    }, 250);
  }

  private recompute() {
    if (this.destroyed) return;
    const now = (this.now = Date.now() / 1000);
    const events = new Map<string, SportEvent>();
    const byTitle = new Map<string, SportEvent[]>();
    for (const c of this.scopeChannels()) {
      const list = this.listings.get(c.id!);
      if (!list) continue;
      const copies = this.variants.get(c.id!) ?? [c];
      const sportsChannel = isSportsChannel(c.name, this.groupName(c));
      for (const slot of EpgService.slots(list)) {
        if (slot.end <= now || slot.start > now + HORIZON_S) continue;
        const title = slot.epg.title?.trim();
        if (!title) continue;
        const sport = classify(title, slot.epg.description, c.name ?? "", sportsChannel);
        if (!sport) continue;
        // The same game on another channel: same title and overlapping time (start times often differ a bit).
        const key = eventKey(title, 0);
        const existing = [...(byTitle.get(key) ?? [])].find((e) => slot.start < e.end && e.start < slot.end);
        if (existing) {
          for (const copy of copies) if (!existing.channels.some((x) => x.id == copy.id)) existing.channels.push(copy);
          existing.start = Math.min(existing.start, slot.start);
          existing.end = Math.max(existing.end, slot.end);
          continue;
        }
        events.set(key + "|" + slot.start, {
          key: key + "|" + slot.start,
          sport,
          title,
          description: slot.epg.description ?? "",
          start: slot.start,
          end: slot.end,
          liveTag: isLiveTagged(title),
          extra: isExtra(title),
          channels: [...copies],
        });
        byTitle.set(key, [...(byTitle.get(key) ?? []), events.get(key + "|" + slot.start)!]);
      }
    }

    const visible = [...events.values()].filter((e) => this.showExtras || !e.extra);
    visible.forEach((e) => e.channels.sort((a, b) => this.channelRank(a) - this.channelRank(b)));
    const bySport = new Map<string, SportEvent[]>();
    for (const e of visible) {
      const list = bySport.get(e.sport.key) ?? [];
      list.push(e);
      bySport.set(e.sport.key, list);
    }

    const sections: SportSection[] = [];
    for (const sport of SPORTS) {
      const list = bySport.get(sport.key);
      if (!list?.length) continue;
      list.sort(
        (a, b) =>
          Number(this.isNow(b)) - Number(this.isNow(a)) ||
          Number(a.extra) - Number(b.extra) ||
          a.start - b.start ||
          a.title.localeCompare(b.title),
      );
      sections.push({ sport, events: list, liveCount: list.filter((e) => this.isNow(e)).length });
    }
    // Most going on right now first.
    sections.sort((a, b) => b.liveCount - a.liveCount || b.events.length - a.events.length);
    this.sections = sections;
    this.sportTabs = sections.map((s) => ({ sport: s.sport, count: s.events.length, live: s.liveCount }));
    this.totalEvents = visible.length;
    if (this.selectedSport != "all" && !bySport.has(this.selectedSport) && !this.scanning) this.selectedSport = "all";
  }

  /** Favourites first, then HD/FHD/4K variants, then the rest. */
  private channelRank(c: Channel): number {
    const name = c.name ?? "";
    let rank = c.favorite ? 0 : 10;
    if (/\b(fhd|uhd|4k)\b/i.test(name)) rank += 0;
    else if (/\bhd\b|ᴴᴰ/i.test(name)) rank += 1;
    else if (/\bsd\b/i.test(name)) rank += 4;
    else rank += 2;
    if (/backup|multi|raw|ʳᵃʷ/i.test(name)) rank += 3;
    return rank;
  }

  visibleSections(): SportSection[] {
    if (this.selectedSport == "all") return this.sections;
    return this.sections.filter((s) => s.sport.key == this.selectedSport);
  }

  /* ---------------- template helpers ---------------- */

  isNow(e: SportEvent): boolean {
    return e.start <= this.now && this.now < e.end;
  }

  progress(e: SportEvent): number {
    return Math.min(100, Math.max(0, ((this.now - e.start) / (e.end - e.start)) * 100));
  }

  time(ts: number): string {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  startsIn(e: SportEvent): string {
    const min = Math.max(1, Math.round((e.start - this.now) / 60));
    if (min < 60) return `in ${min} min`;
    return this.time(e.start);
  }

  minutesLeft(e: SportEvent): string {
    const min = Math.max(1, Math.round((e.end - this.now) / 60));
    return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min left` : `${min} min left`;
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

  currentCountry(): Country | undefined {
    return this.countries.find((c) => c.country.key == this.countryKey)?.country;
  }

  trackEvent(_: number, e: SportEvent) {
    return e.key;
  }

  trackSection(_: number, s: SportSection) {
    return s.sport.key;
  }

  /* ---------------- actions ---------------- */

  selectSport(key: string) {
    this.selectedSport = key;
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  setCountry(key: string) {
    if (key == this.countryKey) return;
    this.countryKey = key;
    this.scanLimit = SCAN_BATCH;
    this.updateScope();
    try {
      localStorage.setItem(COUNTRY_KEY, key);
    } catch {}
    this.epg.cancelBackground();
    this.scan();
  }

  toggleExtras() {
    this.showExtras = !this.showExtras;
    try {
      localStorage.setItem(EXTRAS_KEY, String(this.showExtras));
    } catch {}
    this.recompute();
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

  goToView(view: ViewMode) {
    this.memory.PendingView = view;
    this.router.navigateByUrl("");
  }

  openGuide() {
    this.router.navigateByUrl("guide");
  }

  openSettings() {
    this.router.navigateByUrl("settings");
  }

  @HostListener("document:keydown", ["$event"])
  onKey(event: KeyboardEvent) {
    if ((event.key == "Escape" || event.key == "BrowserBack") && !this.memory.ModalRef && !this.memory.currentContextMenu?.menuOpen) {
      event.preventDefault();
      if (this.selectedSport != "all") this.selectSport("all");
      else this.goToView(ViewMode.All);
    }
  }
}
