/*
  Cambios (30-12-2025) - Santiago Obando:
  - Añadí campo `ticketData.email` en el modal superior y validación básica.
  - El modal ahora prefill con el email del usuario y lo envía al backend como reply-to.
*/
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { of, Subject, takeUntil } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { MenuSection, MenuItem } from '../../models/plugin.interface';
import { AuthService, UserData } from '../../../features/auth/services/auth.service';
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
  sidebarOpen = false;
  userName = 'Usuario';
  userRole = 'Invitado';
  userInitials = 'U';
  showSupportModal = false;
  isSendingTicket = false;
  ticketData = { email: '', subject: '', content: '' };
  menuSections: MenuSection[] = [];
  breadcrumbs: { label: string, active?: boolean }[] = [];
  currentTip = '';

  readonly tipsAdmin = [
    'Usa la búsqueda global para localizar procesos de cualquier inmobiliaria rápidamente.',
    'Recuerda que puedes gestionar los accesos de las inmobiliarias desde el módulo de Usuarios.',
    'Al exportar informes masivos, usa el formato Excel para facilitar el análisis de datos.',
    'Recuerda usar los filtros para buscar información específica'
  ];

  readonly tipsInmobiliaria = [
    'Revisa diariamente la sección "Mis Procesos" para ver las últimas actualizaciones.',
    'Usa el filtro de "Radicado" para encontrar rápidamente un expediente específico.',
    'Descarga la Ficha Técnica en PDF para entregar reportes formales a tus propietarios.',
    'Si tienes dudas sobre un movimiento procesal, contáctanos desde el botón de Soporte.'
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private pluginRegistry: PluginRegistryService,
    private authService: AuthService,
    private supportService: SupportService
  ) {}

  ngOnInit() {
    this.loadUserData();

    this.selectRandomTip();
    
    this.authService.refreshUserProfile()
      .pipe(
        catchError((err: { status: number; }) => {
          if (err.status === 401) {
            this.authService.logoutClientSide();
            this.router.navigate(['/auth/login']);
          }
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((user) => {
        if (user) {
          this.updateUserView(user);
          this.selectRandomTip(); 
        }
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

  selectRandomTip() {
    const user = this.authService.getUserData();
    const role = user?.role || 'guest';
    
    let sourceTips = this.tipsInmobiliaria;

    if (role === 'admin' || role === 'affi') {
      sourceTips = this.tipsAdmin;
    }

    const randomIndex = Math.floor(Math.random() * sourceTips.length);
    this.currentTip = sourceTips[randomIndex];
  }

  isItemActive(item: MenuItem): boolean {
    if (item.matchRoutes && item.matchRoutes.length > 0) {
      const currentUrl = this.router.url;
      const isCustomMatch = item.matchRoutes.some(fragment => currentUrl.includes(fragment));
      if (isCustomMatch) return true;
    }

    if (item.route) {
      const routeCommands = Array.isArray(item.route) ? item.route : [item.route];
      const tree = this.router.createUrlTree(routeCommands);
      
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

  openSupportModal() {
    const user = this.authService.getUserData();
    this.ticketData = { email: user?.email || '', subject: '', content: '' };
    this.showSupportModal = true;
  }

  closeSupportModal() {
    this.showSupportModal = false;
  }

  sendTicket() {
    if (!this.ticketData.subject || !this.ticketData.content) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Campos incompletos', 
        text: 'Por favor completa el asunto y el mensaje.' 
      });
      return;
    }

    if (!this.ticketData.email) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Correo requerido', 
        text: 'Por favor ingresa tu correo electrónico.' 
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.ticketData.email)) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Email inválido', 
        text: 'Por favor ingresa un correo electrónico válido.' 
      });
      return;
    }

    this.isSendingTicket = true;

    const hubspotSubtema = 'Soporte Técnico';
    
    const Subject = this.ticketData.subject;

    const userEmail = this.authService.getUserData()?.email || '';
    const emailToSend = this.ticketData.email || userEmail;

    this.supportService.createTicket(
      hubspotSubtema,
      Subject,
      undefined, 
      emailToSend
    ).subscribe({
      next: () => {
        this.isSendingTicket = false;
        this.closeSupportModal();

        const mailIcon = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        `;

        AffiAlert.fire({ 
          icon: 'success', 
          title: 'Solicitud Recibida', 
          html: `
            <div style="color: #374151; font-size: 1rem;">
              <p style="margin: 0 0 12px 0;">El equipo de servicio al cliente te atenderá pronto.</p>
              
              <div style="background: #f9fafb; padding: 10px; border-radius: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                ${mailIcon} 
                <span>Te responderemos a: <strong style="color: #111827;">${emailToSend}</strong></span>
              </div>

              <p style="margin: 0; color: #9ca3af; font-size: 0.85em;">
                Revisa tu bandeja de entrada en los próximos minutos.
              </p>
            </div>
          `
        });
        
        this.ticketData.subject = '';
        this.ticketData.content = '';
      },
      error: (err) => {
        this.isSendingTicket = false;
        console.error('Error al crear ticket:', err);
        AffiAlert.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: 'No pudimos crear el ticket. Intenta de nuevo más tarde.' 
        });
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
            if (isAdmin) return true;
            const itemRoles = item.roles || [];
            const itemPerms = (item as any).permissions as string[] || []; 
            const requiresRoles = itemRoles.length > 0;
            const requiresPerms = itemPerms.length > 0;

            if (!requiresRoles && !requiresPerms) return true;

            const matchesRole = requiresRoles ? itemRoles.includes(currentRole) : false;
            const matchesPerms = requiresPerms ? itemPerms.some(p => currentPermissions.includes(p)) : false;

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
      'gerente_comercial': 'Gerente Comercial',
      'director_comercial': 'Director Comercial',
      'gerente_cuenta': 'Gerente de Cuenta',
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
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      }
    });
  }
}