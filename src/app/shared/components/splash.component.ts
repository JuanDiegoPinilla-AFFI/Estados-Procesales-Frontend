import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash" *ngIf="visible">
      <img src="/Affi.png" alt="logo" class="splash-logo" />
    </div>
  `,
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent {
  @Input() visible = false;
}