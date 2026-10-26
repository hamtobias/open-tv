import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { Country } from "../countries";

/** A small rounded country flag (bundled SVGs from flag-icons), or a globe for regions. */
@Component({
  selector: "app-flag",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img *ngIf="country?.flag && !failed; else globe" class="flag" [src]="'assets/flags/' + country!.flag + '.svg'"
      [alt]="country!.name" loading="lazy" (error)="failed = true" />
    <ng-template #globe>
      <svg class="flag globe" viewBox="0 0 24 24" aria-hidden="true">
        <path [attr.d]="globePath" />
      </svg>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
      }
      .flag {
        width: 20px;
        height: 15px;
        border-radius: 3px;
        object-fit: cover;
        box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.2);
      }
      .globe {
        box-shadow: none;
        fill: var(--text-2);
      }
    `,
  ],
})
export class FlagComponent {
  @Input() country?: Country;
  failed = false;
  readonly globePath = "M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z";
}
