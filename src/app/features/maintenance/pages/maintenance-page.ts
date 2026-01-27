import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule, FeatherModule], 
  templateUrl: './maintenance-page.html',
  styleUrls: ['./maintenance-page.scss']
})
export class MaintenancePageComponent {
  
  retry() {
    window.location.href = '/';
  }
}