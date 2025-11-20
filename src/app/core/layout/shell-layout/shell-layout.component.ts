import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators'; // Importante para filtrar eventos de navegación
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { MenuSection } from '../../models/plugin.interface';
import { FormsModule } from '@angular/forms';

interface UserData {
  nombre?: string;
  name?: string;
  rol?: string;
  role?: string;
  email?: string;
}

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss'
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  userName = 'Usuario';
  userRole = 'Invitado';
  userInitials = 'U';
  
  menuSections: MenuSection[] = [];
  
  // Variable para el breadcrumb dinámico
  breadcrumbs: { label: string, active?: boolean }[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private pluginRegistry: PluginRegistryService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadMenuSections();
    this.handleResize();
    
    window.addEventListener('resize', this.handleResize.bind(this));

    // SUSCRIPCIÓN A CAMBIOS DE RUTA
    // Actualiza el breadcrumb cada vez que navegas
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  private loadMenuSections() {
    this.pluginRegistry.getMenuSections()
      .pipe(takeUntil(this.destroy$))
      .subscribe(sections => {
        this.menuSections = sections.filter(s => s.items.length > 0);
        // Actualizar breadcrumbs una vez cargado el menú por si recargas la página
        this.updateBreadcrumbs();
      });
  }

  // --- LÓGICA DE BREADCRUMBS CORREGIDA ---
  private updateBreadcrumbs() {
    this.breadcrumbs = [];

    // Recorremos las secciones y sus ítems para ver cuál coincide con la URL actual
    for (const section of this.menuSections) {
      if (!section.items) continue;

      for (const item of section.items) {
        // Validación de seguridad: si no tiene ruta, saltamos
        if (!item.route) continue;

        // CORRECCIÓN AQUÍ: Normalizamos 'route' para que siempre sea un array compatible con createUrlTree
        const routeCommands = Array.isArray(item.route) ? item.route : [item.route];

        // createUrlTree maneja correctamente rutas relativas y parámetros
        // Casteamos a 'any[]' para silenciar el error de tipado estricto si la interfaz dice string
        const itemUrlTree = this.router.createUrlTree(routeCommands as any[]);
        
        // 'subset' permite que /redelex/consultar/123 coincida con /redelex/consultar
        if (this.router.isActive(itemUrlTree, { 
          paths: 'subset', 
          queryParams: 'ignored', 
          fragment: 'ignored', 
          matrixParams: 'ignored' 
        })) {
          
          this.breadcrumbs = [
            { label: section.title },          // Ej: Consultas
            { label: item.label, active: true } // Ej: Consultar Procesos
          ];
          return; // Encontrado, terminamos
        }
      }
    }

    // Fallback por defecto si no está en el menú
    if (this.breadcrumbs.length === 0) {
       this.breadcrumbs = [{ label: 'Inicio', active: true }];
    }
  }

  private loadUserData() {
    const userDataStr = localStorage.getItem('redelex_user');
    
    if (userDataStr) {
      try {
        const userData: UserData = JSON.parse(userDataStr);
        this.userName = userData.nombre || userData.name || userData.email?.split('@')[0] || 'Usuario';
        this.userRole = this.formatRole(userData.rol || userData.role || 'Usuario');
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

  handleResize() {
    if (window.innerWidth > 768) {
      this.sidebarOpen = false;
      document.body.style.overflow = '';
    }
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = !this.sidebarOpen;
      
      if (this.sidebarOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
      document.body.style.overflow = '';
    }
  }

  logout() {
    localStorage.removeItem('redelex_token');
    localStorage.removeItem('redelex_user');
    this.router.navigate(['/auth/login']);
  }
}