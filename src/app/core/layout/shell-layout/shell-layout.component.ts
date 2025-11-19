// src/app/core/layout/shell-layout/shell-layout.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PluginRegistryService } from '../../services/plugin-registry.service';
import { MenuSection } from '../../models/plugin.interface';

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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss'
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  userName = 'Usuario';
  userRole = 'Invitado';
  userInitials = 'U';
  
  menuSections: MenuSection[] = [];
  
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
      });
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