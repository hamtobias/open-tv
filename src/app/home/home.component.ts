import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { Router } from "@angular/router";
import { AllowIn, ShortcutInput } from "ng-keyboard-shortcuts";
import {
  Subscription,
  debounceTime,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  skip,
} from "rxjs";
import { MemoryService } from "../memory.service";
import { Channel } from "../models/channel";
import { ViewMode } from "../models/viewMode";
import { MediaType } from "../models/mediaType";
import { ToastrService } from "ngx-toastr";
import { FocusArea, FocusAreaPrefix } from "../models/focusArea";
import { invoke } from "@tauri-apps/api/core";
import { Source } from "../models/source";
import { Filters } from "../models/filters";
import { SourceType } from "../models/sourceType";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { ErrorService } from "../error.service";
import { Settings } from "../models/settings";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { SortType } from "../models/sortType";
import { getVersion } from "@tauri-apps/api/app";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { WhatsNewModalComponent } from "../whats-new-modal/whats-new-modal.component";
import { LAST_MEDIA_TYPE, LAST_SEEN_VERSION } from "../models/localStorage";
import { isInputFocused } from "../utils";
import { Node } from "../models/node";
import { NodeType } from "../models/nodeType";
import { Stack } from "../models/stack";

import { BulkActionType } from '../models/bulkActionType';
import { SIDEBAR_VIEWS } from "../sidebar/sidebar.component";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
  animations: [
    trigger("fadeInOut", [
      transition(":enter", [
        style({ opacity: 0, height: 0, padding: "0", margin: "0" }),
        animate("250ms", style({ opacity: 1, height: "*", padding: "*", margin: "*" })),
      ]),
      transition(":leave", [
        style({ opacity: 1, height: "*", padding: "*", margin: "*" }),
        animate("250ms", style({ opacity: 0, height: 0, padding: "0", margin: "0" })),
      ]),
    ]),
    trigger("fade", [
      state(
        "visible",
        style({
          opacity: 1,
        }),
      ),
      state(
        "hidden",
        style({
          opacity: 0,
        }),
      ),
      transition("visible => hidden", [animate("250ms ease-out")]),
      transition("hidden => visible", [animate("250ms ease-in")]),
    ]),
  ],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  channels: Channel[] = [];
  readonly viewModeEnum = ViewMode;
  bulkActionType = BulkActionType;
  readonly mediaTypeEnum = MediaType;
  @ViewChild("search") search!: ElementRef;
  shortcuts: ShortcutInput[] = [];
  focus: number = 0;
  focusArea = FocusArea.Tiles;
  viewType = ViewMode.All;
  currentWindowSize: number = window.innerWidth;
  subscriptions: Subscription[] = [];
  filters?: Filters;
  /** The single media type shown (Live, Movies or Series). */
  activeMedia: MediaType = MediaType.livestream;
  reachedMax = false;
  private loadToken = 0;
  readonly PAGE_SIZE = 36;
  channelsVisible = true;
  prevSearchValue: String = "";
  loading = false;
  nodeStack: Stack = new Stack();
  showScrollTop = false;
  groups: Channel[] = [];
  groupsLoading = false;
  railQuery = "";
  private railGroupName?: string;
  private groupsToken = 0;

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  constructor(
    private router: Router,
    public memory: MemoryService,
    public toast: ToastrService,
    private error: ErrorService,
    private modal: NgbModal,
  ) {
    this.getSources();
  }

  getSources() {
    let get_settings = invoke("get_settings");
    let get_sources = invoke("get_sources");
    Promise.all([get_settings, get_sources])
      .then((data) => {
        let settings = data[0] as Settings;
        let sources = data[1] as Source[];
        if (settings.zoom) getCurrentWebview().setZoom(Math.trunc(settings.zoom! * 100) / 10000);
        this.memory.trayEnabled = settings.enable_tray_icon ?? true;
        this.memory.AlwaysAskSave = settings.always_ask_save ?? false;
        this.memory.Sources = new Map(sources.filter((x) => x.enabled).map(s => [s.id!, s]));
        if (sources.length == 0) this.reset();
        else {
          getVersion().then((version) => {
            if (localStorage.getItem(LAST_SEEN_VERSION) != version) {
              this.memory.AppVersion = version;
              this.memory.ModalRef = this.modal.open(WhatsNewModalComponent, {
                backdrop: "static",
                size: "xl",
                keyboard: false,
              });
              this.memory.ModalRef.componentInstance.name = "WhatsNewModal";
            }
          });
          sources
            .filter((x) => x.source_type == SourceType.Custom)
            .map((x) => x.id!)
            .forEach((x) => this.memory.CustomSourceIds?.add(x));
          sources
            .filter((x) => x.source_type == SourceType.Xtream)
            .map((x) => x.id!)
            .forEach((x) => this.memory.XtreamSourceIds.add(x));
          if (
            this.memory.XtreamSourceIds.size > 0 &&
            !sessionStorage.getItem("epgCheckedOnStart")
          ) {
            sessionStorage.setItem("epgCheckedOnStart", "true");
            invoke("on_start_check_epg");
          }
          this.filters = {
            source_ids: Array.from(this.memory.Sources.keys()),
            view_type: this.memory.PendingView ?? settings.default_view ?? ViewMode.All,
            media_types: [this.activeMedia],
            page: 1,
            use_keywords: false,
            sort: SortType.provider,
          };
          if (settings.default_sort != undefined && settings.default_sort != SortType.provider) {
            this.memory.Sort.next([settings.default_sort, false]);
            this.filters.sort = settings.default_sort;
          }
          this.memory.PendingView = undefined;
          this.activeMedia = this.restoreMedia();
          this.filters.media_types = [this.activeMedia];
          if (settings.refresh_on_start === true && !sessionStorage.getItem("refreshedOnStart")) {
            sessionStorage.setItem("refreshedOnStart", "true");
            this.refreshOnStart().then((_) => _);
          }
          this.load().then((_) => _);
          if (this.filters.view_type == ViewMode.Categories) this.loadGroups();
        }
      })
      .catch((e) => {
        this.error.handleError(e);
        this.reset();
      });
  }

  async refreshOnStart() {
    this.toast.info("Refreshing all sources... (refresh on start enabled)");
    await this.memory.tryIPC(
      "Successfully refreshed all sources (refresh on start enabled)",
      "Failed to refresh all sources (refresh on start enabled)",
      async () => {
        await invoke("refresh_all");
      },
    );
  }

  async reload() {
    await this.load();
  }

  reset() {
    this.router.navigateByUrl("setup");
  }

  async addEvents() {
    this.subscriptions.push(
      this.memory.HideChannels.subscribe((val) => {
        this.channelsVisible = val;
      }),
    );
    this.subscriptions.push(
      this.memory.SetFocus.subscribe((focus) => {
        this.focus = focus;
      }),
    );
    this.subscriptions.push(
      this.memory.SetNode.subscribe(async (dto) => {
        this.nodeStack.add(
          new Node(
            dto.id,
            dto.name,
            dto.type,
            this.filters?.query,
            this.filters?.view_type,
          ),
        );
        if (dto.type == NodeType.Category) this.filters!.group_id = dto.id;
        else if (dto.type == NodeType.Series) {
          this.filters!.series_id = dto.id;
          this.filters!.source_ids = [dto.sourceId!];
        } else if (dto.type == NodeType.Season) this.filters!.season = dto.id;

        if (this.filters!.view_type == ViewMode.Hidden) {
          this.filters!.view_type = ViewMode.Categories;
        }

        this.clearSearch();
        await this.load();
        if (this.focusArea == FocusArea.Tiles) this.selectFirstChannelDelayed(100);
      }),
    );
    this.subscriptions.push(
      this.memory.Refresh.subscribe((scroll) => {
        this.load();
        if(scroll)
          window.scrollTo({ top: 0, behavior: "instant" });
      }),
    );
    this.subscriptions.push(
      this.memory.Sort.pipe(skip(1)).subscribe(async ([sort, load]) => {
        if (!this.filters || !load) return;
        this.filters!.sort = sort;
        await this.load();
      }),
    );
  }

  clearSearch() {
    this.search.nativeElement.value = "";
    this.prevSearchValue = "";
    this.filters!.query = "";
  }

  /** Kept for callers from before everything was loaded up front; nothing more to fetch. */
  async loadMore() {}

  /**
   * Loads every page of the current view. The first page is shown right away and
   * the rest are appended as they arrive, so there is no "Load more" step.
   * A newer call (view switch, search, …) cancels an older one.
   */
  async load(_more = false) {
    if (!this.filters) return;
    const token = ++this.loadToken;
    this.loading = true;
    this.reachedMax = false;
    this.filters.page = 1;
    const filters: Filters = { ...this.filters, media_types: [...this.filters.media_types] };
    try {
      for (let page = 1; ; page++) {
        const batch: Channel[] = await invoke("search", { filters: { ...filters, page } });
        if (token != this.loadToken) return;
        if (page == 1) {
          this.channels = batch;
          this.channelsVisible = true;
          // prevent flicker of hiding opacity
          this.viewType = filters.view_type;
        } else {
          this.channels = this.channels.concat(batch);
        }
        if (batch.length < this.PAGE_SIZE) break;
      }
      this.reachedMax = true;
    } catch (e) {
      if (token == this.loadToken) this.error.handleError(e);
    } finally {
      if (token == this.loadToken) this.loading = false;
    }
  }

  checkScrollTop() {
    const scrollPosition =
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollTop = scrollPosition > 300;
  }

  @HostListener("window:scroll", ["$event"])
  scroll(event: any) {
    this.checkScrollTop();
  }

  ngAfterViewInit(): void {
    this.addEvents().then((_) => _);
    this.subscriptions.push(
      fromEvent(this.search.nativeElement, "keyup")
        .pipe(
          filter((event: any) => event.key !== "Escape"),
          map((event: any) => {
            this.focus = 0;
            this.focusArea = FocusArea.Tiles;
            if (this.channelsVisible && event.target.value != this.prevSearchValue)
              this.channelsVisible = false;
            this.prevSearchValue = event.target.value;
            return event.target.value;
          }),
          debounceTime(300),
        )
        .subscribe(async (term: string) => {
          this.filters!.query = term;
          await this.load();
        }),
    );

    this.shortcuts.push(
      {
        key: ["ctrl + f", "ctrl + space", "cmd + f"],
        label: "Search",
        description: "Go to search",
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: (_) => this.focusSearch(),
      },
      {
        key: ["ctrl + a", "cmd + a"],
        label: "Switching modes",
        description: "Selects the all channels view",
        preventDefault: true,
        command: async (_) => await this.switchMode(this.viewModeEnum.All),
      },
      {
        key: ["ctrl + s", "cmd + s"],
        label: "Switching modes",
        description: "Selects the categories view",
        command: async (_) => await this.switchMode(this.viewModeEnum.Categories),
      },
      {
        key: ["ctrl + d", "cmd + d"],
        label: "Switching modes",
        description: "Selects the history view",
        command: async (_) => await this.switchMode(this.viewModeEnum.History),
      },
      {
        key: ["ctrl + r", "cmd + r"],
        label: "Switching modes",
        description: "Selects the favorites view",
        command: async (_) => await this.switchMode(this.viewModeEnum.Favorites),
      },
      {
        key: "ctrl + q",
        label: "Media Type Filters",
        description: "Show livestreams",
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => await this.selectMedia(MediaType.livestream),
      },
      {
        key: "ctrl + w",
        label: "Media Type Filters",
        description: "Show movies",
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => await this.selectMedia(MediaType.movie),
      },
      {
        key: "ctrl + e",
        label: "Media Type Filters",
        description: "Show series",
        preventDefault: true,
        allowIn: [AllowIn.Input],
        command: async (_) => await this.selectMedia(MediaType.serie),
      },
      {
        key: "left",
        label: "Navigation",
        description: "Go left",
        allowIn: [AllowIn.Input],
        command: async (_) => await this.nav("ArrowLeft"),
      },
      {
        key: "right",
        label: "Navigation",
        description: "Go right",
        allowIn: [AllowIn.Input],
        command: async (_) => await this.nav("ArrowRight"),
      },
      {
        key: "up",
        label: "Navigation",
        description: "Go up",
        allowIn: [AllowIn.Input],
        preventDefault: true,
        command: async (_) => await this.nav("ArrowUp"),
      },
      {
        key: "down",
        label: "Navigation",
        description: "Go down",
        allowIn: [AllowIn.Input],
        preventDefault: true,
        command: async (_) => await this.nav("ArrowDown"),
      },
    );
  }

  /** Switches the library to exactly one media type (Live, Movies or Series). */
  async selectMedia(mediaType: MediaType) {
    if (!this.filters) return;
    if (mediaType == MediaType.serie && !this.anyXtream()) return;
    if (mediaType == this.activeMedia && this.filters.media_types.length == 1) return;
    this.activeMedia = mediaType;
    this.filters.media_types = [mediaType];
    try {
      localStorage.setItem(LAST_MEDIA_TYPE, String(mediaType));
    } catch {}
    // A category picked for one media type rarely exists for another.
    if (this.filters.view_type == ViewMode.Categories) {
      this.filters.group_id = undefined;
      this.railGroupName = undefined;
      this.nodeStack.clear();
    }
    await this.load();
    if (this.filters.view_type == ViewMode.Categories) this.loadGroups();
  }

  restoreMedia(): MediaType {
    let saved: number | undefined;
    try {
      const raw = localStorage.getItem(LAST_MEDIA_TYPE);
      saved = raw == null ? undefined : Number(raw);
    } catch {}
    if (saved == MediaType.movie) return MediaType.movie;
    if (saved == MediaType.serie && this.anyXtream()) return MediaType.serie;
    return MediaType.livestream;
  }

  readonly mediaOptions = [
    { type: MediaType.livestream, label: "Live" },
    { type: MediaType.movie, label: "Movies" },
    { type: MediaType.serie, label: "Series" },
  ];

  visibleMediaOptions() {
    if (this.anyXtream()) return this.mediaOptions;
    return [this.mediaOptions[0], { type: MediaType.movie, label: "Movies & Series" }];
  }

  filtersVisible() {
    return !this.filters?.series_id;
  }

  async switchMode(viewMode: ViewMode) {
    if (viewMode == this.filters?.view_type) return;
    this.filters!.series_id = undefined;
    this.filters!.group_id = undefined;
    this.filters!.view_type = viewMode;
    this.filters!.season = undefined;
    this.filters!.source_ids = Array.from(this.memory.Sources.keys());
    this.railGroupName = undefined;
    this.clearSearch();
    this.nodeStack.clear();
    await this.load();
    if (viewMode == ViewMode.Categories) this.loadGroups();
  }

  searchFocused(): boolean {
    return document.activeElement?.id == "search";
  }

  focusSearch() {
    if (this.searchFocused()) {
      this.selectFirstChannel();
      return;
    } else {
      this.focus = 0;
      this.focusArea = FocusArea.Tiles;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.search.nativeElement.focus({
      preventScroll: true,
    });
  }

  async goBackHotkey() {
    if (this.memory.ModalRef) {
      if (
        this.memory.ModalRef.componentInstance.name != "RestreamModalComponent" ||
        !this.memory.ModalRef.componentInstance.started
      )
        this.memory.ModalRef.close("close");
      return;
    } else if (this.memory.currentContextMenu?.menuOpen) {
      this.closeContextMenu();
    } else if (this.searchFocused()) {
      this.selectFirstChannel();
    } else if (this.filters?.query) {
      if (this.filters?.query) {
        this.clearSearch();
        await this.load();
      }
      this.selectFirstChannelDelayed(100);
    } else if (this.canGoBack()) {
      await this.goBack();
      this.selectFirstChannelDelayed(100);
    } else {
      this.selectFirstChannel();
    }
  }

  selectFirstChannelDelayed(milliseconds: number) {
    setTimeout(() => this.selectFirstChannel(), milliseconds);
  }

  async goBack() {
    if (!this.nodeStack.hasNodes()) {
      if (this.filters?.group_id) await this.selectCategory();
      return;
    }
    var node = this.nodeStack.pop();
    if (node.type == NodeType.Category) this.filters!.group_id = undefined;
    else if (node.type == NodeType.Series) {
      this.filters!.series_id = undefined;
      this.filters!.source_ids = Array.from(this.memory.Sources.keys());
    } else if (node.type == NodeType.Season) {
      this.filters!.season = undefined;
    }
    if (node.query) {
      this.search.nativeElement.value = node.query;
      this.filters!.query = node.query;
    }
    if (node.fromViewType && this.filters!.view_type !== node.fromViewType) {
      this.filters!.view_type = node.fromViewType;
    }
    await this.load();
  }

  openSettings() {
    this.router.navigateByUrl("settings");
  }

  openGuide() {
    this.router.navigateByUrl("guide");
  }

  async nav(key: string) {
    if (this.searchFocused()) return;
    if (this.memory.currentContextMenu?.menuOpen || this.memory.ModalRef) return;

    if (this.focusArea == FocusArea.ViewMode) {
      if (key == "ArrowUp" || key == "ShiftTab") this.focusAt(FocusArea.ViewMode, Math.max(0, this.focus - 1));
      else if (key == "ArrowDown" || key == "Tab") {
        if (this.focus + 1 < this.sidebarCount()) this.focusAt(FocusArea.ViewMode, this.focus + 1);
        else this.focusAt(FocusArea.Tiles, 0);
      } else if (key == "ArrowRight") this.focusAt(FocusArea.Tiles, 0);
      return;
    }

    if (this.focusArea == FocusArea.Filters) {
      if (key == "ArrowLeft" || key == "ShiftTab") {
        if (this.focus > 0) this.focusAt(FocusArea.Filters, this.focus - 1);
        else this.focusSidebar();
      } else if (key == "ArrowRight" || key == "Tab") {
        if (this.focus + 1 < this.filterCount()) this.focusAt(FocusArea.Filters, this.focus + 1);
        else this.focusAt(FocusArea.Tiles, 0);
      } else if (key == "ArrowDown") this.focusAt(FocusArea.Tiles, 0);
      return;
    }

    // Tiles: the grid is responsive, so measure how many tiles fit in a row.
    const cols = this.tileColumns();
    let next = this.focus;
    switch (key) {
      case "ArrowUp":
        next -= cols;
        break;
      case "ArrowDown":
        next += cols;
        break;
      case "ShiftTab":
      case "ArrowLeft":
        next -= 1;
        break;
      case "Tab":
      case "ArrowRight":
        next += 1;
        break;
    }
    if (key == "ArrowLeft" && this.focus % cols == 0) return this.focusSidebar();
    if (next < 0) {
      if (key == "ArrowUp" && this.filtersVisible()) return this.focusAt(FocusArea.Filters, 0);
      if (key == "ShiftTab") return this.focusSidebar();
      return;
    }
    if (next >= this.channels.length) {
      next = this.channels.length - 1;
      if (next < 0) return;
    }
    this.focusAt(FocusArea.Tiles, next);
  }

  focusAt(area: FocusArea, index: number) {
    this.focusArea = area;
    this.focus = index;
    setTimeout(() => document.getElementById(`${FocusAreaPrefix[area]}${index}`)?.focus(), 0);
  }

  focusSidebar() {
    const index = SIDEBAR_VIEWS.findIndex((x) => x.view == this.filters?.view_type);
    this.focusAt(FocusArea.ViewMode, Math.max(index, 0));
  }

  tileColumns(): number {
    const tiles = Array.from(document.querySelectorAll<HTMLElement>(".tile-grid > app-channel-tile"));
    if (tiles.length < 2) return 1;
    const top = tiles[0].offsetTop;
    let cols = 0;
    for (const tile of tiles) {
      if (tile.offsetTop != top) break;
      cols++;
    }
    return Math.max(cols, 1);
  }

  sidebarCount(): number {
    return SIDEBAR_VIEWS.length + (this.anyXtream() ? 1 : 0) + 1;
  }

  filterCount(): number {
    return this.anyXtream() ? 3 : 2;
  }

  shortFiltersMode() {
    return this.filters?.source_ids.findIndex((x) => this.memory.XtreamSourceIds.has(x)) == -1;
  }

  anyXtream() {
    return Array.from(this.memory.Sources.values()).findIndex((x) => x.source_type == SourceType.Xtream) != -1;
  }

  /* ---------- Category rail ---------- */
  showRail(): boolean {
    return this.filters?.view_type == ViewMode.Categories && !this.filters?.series_id;
  }

  async loadGroups() {
    if (!this.filters) return;
    const token = ++this.groupsToken;
    this.groupsLoading = true;
    const all: Channel[] = [];
    try {
      for (let page = 1; page <= 100; page++) {
        const batch: Channel[] = await invoke("search", {
          filters: {
            ...this.filters,
            view_type: ViewMode.Categories,
            group_id: undefined,
            series_id: undefined,
            season: undefined,
            query: "",
            use_keywords: false,
            source_ids: Array.from(this.memory.Sources.keys()),
            page,
          },
        });
        if (token != this.groupsToken) return;
        all.push(...batch);
        this.groups = [...all];
        if (batch.length < this.PAGE_SIZE) break;
      }
    } catch (e) {
      this.error.handleError(e);
    } finally {
      if (token == this.groupsToken) this.groupsLoading = false;
    }
  }

  filteredGroups(): Channel[] {
    const q = this.railQuery.trim().toLowerCase();
    if (!q) return this.groups;
    return this.groups.filter((g) => g.name?.toLowerCase().includes(q));
  }

  async selectCategory(group?: Channel) {
    if (!this.filters) return;
    this.nodeStack.clear();
    this.filters.series_id = undefined;
    this.filters.season = undefined;
    this.filters.source_ids = Array.from(this.memory.Sources.keys());
    this.filters.group_id = group?.id;
    this.railGroupName = group?.name;
    this.clearSearch();
    await this.load();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  trackById(index: number, item: Channel) {
    return item.id ?? index;
  }

  /* ---------- Headings ---------- */
  canGoBack(): boolean {
    return this.nodeStack.hasNodes() || (this.filters?.view_type == ViewMode.Categories && !!this.filters?.group_id);
  }

  crumbs(): string[] {
    const view = SIDEBAR_VIEWS.find((x) => x.view == this.filters?.view_type)?.label ?? "All";
    const list = [view];
    const nodes = this.nodeStack.all();
    if (this.railGroupName && this.filters?.group_id && !nodes.some((n) => n.type == NodeType.Category))
      list.push(this.railGroupName);
    nodes.forEach((n) => list.push(n.name));
    return list;
  }

  pageTitle(): string {
    const crumbs = this.crumbs();
    return crumbs[crumbs.length - 1];
  }

  searchPlaceholder(): string {
    return `Search ${this.pageTitle()}…`;
  }

  countNoun(): string {
    if (this.showRail() && !this.filters?.group_id) return "categories";
    if (this.filters?.season) return "episodes";
    if (this.filters?.series_id) return "seasons";
    switch (this.activeMedia) {
      case MediaType.movie:
        return "movies";
      case MediaType.serie:
        return "series";
      default:
        return "channels";
    }
  }

  emptyHint(): string {
    if (this.filters?.query) return "No results — try a different search or turn on keyword search.";
    switch (this.filters?.view_type) {
      case ViewMode.Favorites:
        return "Right-click anything and choose Favorite to pin it here.";
      case ViewMode.History:
        return "Things you watch will show up here.";
      case ViewMode.Hidden:
        return "Hidden channels and categories show up here.";
      default:
        return "Try switching between Live, Movies and Series.";
    }
  }

  //Temporary solution because the ng-keyboard-shortcuts library doesn't seem to support ESC
  @HostListener("document:keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (
      event.key == "Escape" ||
      event.key == "BrowserBack" ||
      (event.key == "Backspace" && !isInputFocused())
    ) {
      this.goBackHotkey();
      event.preventDefault();
    }
    if (event.key == "Tab" && !this.memory.ModalRef) {
      event.preventDefault();
      this.nav(event.shiftKey ? "ShiftTab" : "Tab");
    }
  }

  selectFirstChannel() {
    this.focusArea = FocusArea.Tiles;
    this.focus = 0;
    (document.getElementById("first")?.firstChild as HTMLElement)?.focus();
  }

  closeContextMenu() {
    if (this.memory.currentContextMenu?.menuOpen) {
      this.memory.currentContextMenu?.closeMenu();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((x) => x.unsubscribe());
  }

  async toggleKeywords() {
    this.filters!.use_keywords = !this.filters!.use_keywords;
    await this.load();
  }

  async bulkAction(action: BulkActionType) {
    if (this.filters?.series_id && !this.filters?.season) {
      return;
    }
    const actionName = BulkActionType[action].toLowerCase();
    try {
      await invoke("bulk_update", { filters: this.filters, action: action });
      await this.load();
      this.toast.success(`Successfully executed bulk update: ${actionName}`);
    } catch (e) {
      this.error.handleError(e);
    }
  }
}
