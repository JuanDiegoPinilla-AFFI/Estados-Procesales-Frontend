import { Component, OnInit, OnDestroy } from '@angular/core';

import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// Servicios y Modelos
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { MenuSection, MenuItem } from '../../models/plugin.interface';
import { AuthService, UserData } from '../../../features/auth/services/auth.service';

// 1. Importamos solo el módulo base (los íconos ya se registraron en app.config.ts)
import { FeatherModule } from 'angular-feather';
import { SupportService } from '../../services/support.service';
import { AffiAlert } from '../../../shared/services/affi-alert';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    FormsModule,
    FeatherModule
],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss'
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  // --- VARIABLES DE ESTADO (Estas eran las que faltaban) ---
  sidebarOpen = false;
  userName = 'Usuario';
  userRole = 'Invitado';
  userInitials = 'U';

  // VARIABLES NUEVAS PARA SOPORTE
  showSupportModal = false;
  isSendingTicket = false;
  ticketData = { subject: '', content: '' };
  
  menuSections: MenuSection[] = [];
  breadcrumbs: { label: string, active?: boolean }[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private pluginRegistry: PluginRegistryService,
    private authService: AuthService,
    private supportService: SupportService
  ) {}

  ngOnInit() {
    this.loadUserData();
    
    this.authService.refreshUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => this.updateUserView(user),
        error: () => console.log('No se pudo refrescar el perfil')
      });

    this.loadMenuSections();
    this.handleResize();
    
    window.addEventListener('resize', this.handleResize.bind(this));

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  isItemActive(item: MenuItem): boolean {
    // 1. Verificación Personalizada (Prioridad: matchRoutes)
    // Si la URL actual contiene alguno de los strings definidos en matchRoutes, está activo.
    if (item.matchRoutes && item.matchRoutes.length > 0) {
      const currentUrl = this.router.url;
      const isCustomMatch = item.matchRoutes.some(fragment => currentUrl.includes(fragment));
      if (isCustomMatch) return true;
    }

    // 2. Verificación Estándar (Ruta exacta o hija)
    if (item.route) {
      const routeCommands = Array.isArray(item.route) ? item.route : [item.route];
      const tree = this.router.createUrlTree(routeCommands);
      
      // 'subset' permite que /consultas/mis-procesos active el botón si la ruta es esa
      // pero no activará hermanos como /consultas/proceso/:id, por eso usamos el paso 1.
      return this.router.isActive(tree, {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored'
      });
    }

    return false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  // --- LÓGICA DE SOPORTE ---
  openSupportModal() {
    this.ticketData = { subject: '', content: '' };
    this.showSupportModal = true;
  }

  closeSupportModal() {
    this.showSupportModal = false;
  }

  sendTicket() {
    if (!this.ticketData.subject || !this.ticketData.content) {
      AffiAlert.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor completa el asunto y el mensaje.' });
      return;
    }

    this.isSendingTicket = true;

    this.supportService.createTicket(this.ticketData.subject, this.ticketData.content).subscribe({
      next: () => {
        this.isSendingTicket = false;
        this.closeSupportModal();
        AffiAlert.fire({ 
          icon: 'success', 
          title: 'Ticket Creado', 
          text: 'Hemos recibido tu solicitud. Nuestro equipo te contactará pronto.' 
        });
      },
      error: () => {
        this.isSendingTicket = false;
        AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No pudimos crear el ticket. Intenta de nuevo más tarde.' });
      }
    });
  }

  private loadMenuSections() {
    const user = this.authService.getUserData();
    const currentRole = user?.role || 'guest';
    const currentPermissions = user?.permissions || [];
    
    const isAdmin = currentRole === 'admin';

    this.pluginRegistry.getMenuSections()
      .pipe(takeUntil(this.destroy$))
      .subscribe(sections => {
        
        this.menuSections = sections.map(section => {
          
          const filteredItems = section.items.filter(item => {
            // 1. Admin ve todo siempre
            if (isAdmin) return true;

            // 2. Analizar requisitos del ítem
            const itemRoles = item.roles || [];
            // Cast a 'any' para leer permissions si no está en la interfaz base aún, 
            // aunque ya debería estar si actualizaste el modelo plugin.interface.ts
            const itemPerms = (item as any).permissions as string[] || []; 

            const requiresRoles = itemRoles.length > 0;
            const requiresPerms = itemPerms.length > 0;

            // 3. Si el ítem es público (sin roles ni permisos), mostrarlo
            if (!requiresRoles && !requiresPerms) return true;

            // 4. LÓGICA OR (Permisiva): 
            // Cumple si tiene el Rol correcto O si tiene el Permiso correcto
            const matchesRole = requiresRoles ? itemRoles.includes(currentRole) : false;
            const matchesPerms = requiresPerms ? itemPerms.some(p => currentPermissions.includes(p)) : false;

            // Si cumple cualquiera de los dos, pasa.
            // (Antes el matchesRole false te bloqueaba inmediatamente)
            return matchesRole || matchesPerms;
          });

          return { ...section, items: filteredItems };
        })
        .filter(section => section.items.length > 0);

        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs() {
    this.breadcrumbs = [];
    for (const section of this.menuSections) {
      if (!section.items) continue;
      for (const item of section.items) {
        if (!item.route) continue;
        const routeCommands = Array.isArray(item.route) ? item.route : [item.route];
        const itemUrlTree = this.router.createUrlTree(routeCommands as any[]);
        
        if (this.router.isActive(itemUrlTree, { 
          paths: 'subset', 
          queryParams: 'ignored', 
          fragment: 'ignored', 
          matrixParams: 'ignored' 
        })) {
          this.breadcrumbs = [
            { label: section.title },
            { label: item.label, active: true }
          ];
          return;
        }
      }
    }
    if (this.breadcrumbs.length === 0) {
       this.breadcrumbs = [{ label: 'Inicio', active: true }];
    }
  }

  private loadUserData() {
    const userData = this.authService.getUserData(); 
    if (userData) {
      this.updateUserView(userData);
    }
  }

  private updateUserView(data: UserData) {
    this.userName = data.name || data.email?.split('@')[0] || 'Usuario';
    const rawRole = data.role || 'user';
    this.userRole = this.formatRole(rawRole);
    this.userInitials = this.getInitials(this.userName);
  }

  formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador', 
      'affi': 'Colaborador Affi',
      'inmobiliaria': 'Inmobiliaria',
      'user': 'Inmobiliaria' 
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
    // Nos suscribimos al observable de logout
    this.authService.logout().subscribe({
      next: () => {
        // Éxito del backend: La limpieza ya se hizo en el 'finalize' del servicio
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Falla de red: La limpieza local YA SE HIZO. Navegamos igual.
        this.router.navigate(['/auth/login']);
      }
    });
  }
}