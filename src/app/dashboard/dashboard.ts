import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

interface UserData {
  nombre?: string;
  name?: string;
  rol?: string;
  role?: string;
  email?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dashboard-layout" [class.sidebar-open]="sidebarOpen">
      <!-- OVERLAY MÓVIL -->
      <div class="overlay" *ngIf="sidebarOpen" (click)="toggleSidebar()"></div>

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.sidebar--open]="sidebarOpen">
        <div class="sidebar__logo">
          <img src="/Affi_logo.png" alt="Logo" class="logo-img" />
          <span class="logo-text">Redelex Panel</span>
        </div>

        <nav class="sidebar__nav">
          <div class="nav-section">
            <div class="nav-section__title">Consultas</div>
            <a routerLink="/dashboard/consultar"
               routerLinkActive="is-active"
               [routerLinkActiveOptions]="{exact: false}"
               class="nav-link"
               (click)="closeSidebarOnMobile()">
              <span class="nav-link__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </span>
              <span class="nav-link__text">Consultar Procesos</span>
            </a>
          </div>

          <div class="nav-section">
            <div class="nav-section__title">Sistema</div>
            <a class="nav-link" (click)="logout()">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
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
            <span class="breadcrumb__item">Dashboard</span>
            <span class="breadcrumb__separator">/</span>
            <span class="breadcrumb__item breadcrumb__item--active">Consultar Procesos</span>
          </div>

          <div class="top-header__actions">
            <div class="user-info">
              <div class="user-info__details">
                <span class="user-info__name">{{ userName }}</span>
                <span class="user-info__role">{{ userRole }}</span>
              </div>
              <div class="user-avatar">
                <span>{{ userInitials }}</span>
              </div>
            </div>
            
            <button class="icon-btn icon-btn--help" title="Ayuda">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <button class="icon-btn icon-btn--logout" (click)="logout()" title="Cerrar sesión">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
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
export class DashboardComponent implements OnInit {
  sidebarOpen = false;
  userName = 'Usuario';
  userRole = 'Invitado';
  userInitials = 'U';

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUserData();
    
    // Debug para ver la ruta actual
    console.log('Ruta actual:', this.router.url);
  }

  loadUserData() {
    // Intenta obtener los datos del usuario desde localStorage
    const userDataStr = localStorage.getItem('redelex_user');
    
    if (userDataStr) {
      try {
        const userData: UserData = JSON.parse(userDataStr);
        
        // Asigna el nombre (tu backend devuelve 'name')
        this.userName = userData.nombre || userData.name || userData.email?.split('@')[0] || 'Usuario';
        
        // Asigna el rol (tu backend devuelve 'role')
        this.userRole = this.formatRole(userData.rol || userData.role || 'Usuario');
        
        // Genera iniciales (primeras letras del nombre)
        this.userInitials = this.getInitials(this.userName);
      } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
      }
    }
  }

  formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Colaborador Affi',
      'user': 'Inmobiliaria',
      'guest': 'Invitado'
    };
    
    return roleMap[role.toLowerCase()] || role;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

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
    localStorage.removeItem('redelex_user');
    this.router.navigate(['/auth/login']);
  }
}