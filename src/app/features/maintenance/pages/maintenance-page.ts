import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather'; // Opcional para iconos

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule, FeatherModule], 
  templateUrl: './maintenance-page.html', // Apuntamos al archivo HTML
  styleUrls: ['./maintenance-page.scss']  // Apuntamos al archivo SCSS
})
export class MaintenancePageComponent {
  
  retry() {
    // Recargar la aplicación o ir al inicio
    window.location.href = '/';
  }
}