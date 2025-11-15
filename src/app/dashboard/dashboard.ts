import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="dashboard-layout" [class.sidebar-open]="sidebarOpen">
      <!-- OVERLAY MÓVIL -->
      <div class="overlay" *ngIf="sidebarOpen" (click)="toggleSidebar()"></div>

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.sidebar--open]="sidebarOpen">
        <div class="sidebar__logo">
          <img src="/Affi_logo.png" alt="Logo" class="logo-img" />
          <span class="logo-text">Consulta Redelex</span>
        </div>

        <nav class="sidebar__nav">
          <div class="nav-section">
            <div class="nav-section__title">Consultas</div>
            <a routerLink="/dashboard/consultar"
               routerLinkActive="is-active"
               class="nav-link is-active"
               (click)="closeSidebarOnMobile()">
              <span class="nav-link__icon">📄</span>
              <span class="nav-link__text">Consultar Procesos</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section__title">Sistema</div>
            <a class="nav-link" (click)="logout()">
              <span class="nav-link__icon">🚪</span>
              <span class="nav-link__text">Cerrar Sesión</span>
            </a>
          </div>
        </nav>

        <div class="sidebar__footer">
          <div class="promo-card">
            <div class="promo-card__title">💡 Tip del día</div>
            <div class="promo-card__text">
              Usa el filtro para encontrar procesos rápidamente en listas grandes
            </div>
          </div>
          <div class="version-badge">v1.0.0</div>
        </div>
      </aside>

      <!-- MAIN AREA -->
      <div class="main">
        <!-- TOP HEADER -->
        <header class="top-header">
          <button class="menu-btn" (click)="toggleSidebar()">
            <span class="menu-icon" [class.open]="sidebarOpen">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          <div class="breadcrumb">
            <span class="breadcrumb__item">Consultas</span>
            <span class="breadcrumb__separator">/</span>
            <span class="breadcrumb__item breadcrumb__item--active">Consultar Procesos</span>
          </div>

          <div class="top-header__actions">
            <button class="icon-btn icon-btn--desktop" title="Ayuda">
              <span>❓</span>
            </button>
            <button class="icon-btn icon-btn--logout" (click)="logout()" title="Cerrar sesión">
              <span>🚪</span>
            </button>
          </div>
        </header>

        <!-- CONTENT -->
        <main class="main__content">
          <router-outlet></router-outlet>
        </main>

        <!-- FOOTER -->
        <footer class="footer">
          <div class="footer__text">Copyright ©2025 Affi latam</div>
          <div class="footer__links">
            <a href="#">Política de privacidad</a>
            <a href="#" class="footer__links--desktop">Términos de servicio</a>
            <a href="#" class="footer__links--desktop">Soporte</a>
          </div>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {
  sidebarOpen = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
  }

  logout() {
    localStorage.removeItem('redelex_token');
    this.router.navigate(['/auth/login']);
  }
}