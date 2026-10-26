import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ViewMode } from "../models/viewMode";

export interface SidebarItem {
  view: ViewMode;
  label: string;
  icon: string;
}

/** Order here is also the keyboard focus order (ids viewMode-0..n). */
export const SIDEBAR_VIEWS: SidebarItem[] = [
  {
    view: ViewMode.All,
    label: "All",
    icon: "M4 5h16v2H4zm0 6h16v2H4zm0 6h16v2H4z",
  },
  {
    view: ViewMode.Categories,
    label: "Categories",
    icon: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
  },
  {
    view: ViewMode.Favorites,
    label: "Favorites",
    icon: "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  },
  {
    view: ViewMode.History,
    label: "History",
    icon: "M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z",
  },
  {
    view: ViewMode.Hidden,
    label: "Hidden",
    icon: "M12 7a5 5 0 0 1 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92A11.8 11.8 0 0 0 22.99 12C21.26 7.61 16.99 4.5 12 4.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.75 7.13 11.36 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55A5 5 0 0 1 7.53 9.8zm4.31-.78 3.15 3.15.02-.16a3 3 0 0 0-3-3z",
  },
];

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
})
export class SidebarComponent {
  readonly items = SIDEBAR_VIEWS;
  /** Active library view, or the live screen that is open. */
  @Input() active: ViewMode | "guide" | "sports" = ViewMode.All;
  @Input() showGuide = false;
  @Output() view = new EventEmitter<ViewMode>();
  @Output() guide = new EventEmitter<void>();
  @Output() sports = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();
}
