// src/app/core/services/plugin-registry.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PluginConfig, MenuItem, MenuSection } from '../models/plugin.interface';

@Injectable({
  providedIn: 'root'
})
export class PluginRegistryService {
  private plugins = new Map<string, PluginConfig>();
  private menuSections$ = new BehaviorSubject<MenuSection[]>([]);

  constructor() {
    this.initializeDefaultSections();
  }

  private initializeDefaultSections(): void {
    const defaultSections: MenuSection[] = [
      {
        id: 'consultas',
        title: 'Consultas',
        items: [],
        order: 1
      },
      {
        id: 'reportes',
        title: 'Reportes',
        items: [],
        order: 2
      },
      {
        id: 'sistema',
        title: 'Sistema',
        items: [],
        order: 99
      }
    ];
    
    this.menuSections$.next(defaultSections);
  }

  register(plugin: PluginConfig): void {
    if (!plugin.enabled) {
      console.log(`Plugin ${plugin.id} está deshabilitado`);
      return;
    }

    if (plugin.dependencies?.length) {
      const missingDeps = plugin.dependencies.filter(
        dep => !this.plugins.has(dep)
      );
      
      if (missingDeps.length > 0) {
        console.error(`Plugin ${plugin.id} tiene dependencias faltantes:`, missingDeps);
        return;
      }
    }

    this.plugins.set(plugin.id, plugin);
    this.registerMenuItems(plugin.menuItems);
    
    console.log(`✅ Plugin registrado: ${plugin.name} v${plugin.version}`);
  }

  private registerMenuItems(items: MenuItem[]): void {
    if (!items || items.length === 0) return;

    const sections = this.menuSections$.value;
    
    items.forEach(item => {
      const sectionIndex = sections.findIndex(s => s.id === 'consultas');
      
      if (sectionIndex !== -1) {
        const existingItemIndex = sections[sectionIndex].items.findIndex(
          i => i.id === item.id
        );
        
        if (existingItemIndex === -1) {
          sections[sectionIndex].items.push({
            ...item,
            enabled: item.enabled ?? true
          });
        }
      }
    });
    
    this.menuSections$.next([...sections]);
  }

  getMenuSections(): Observable<MenuSection[]> {
    return this.menuSections$.asObservable();
  }

  getEnabledPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  getPlugin(id: string): PluginConfig | undefined {
    return this.plugins.get(id);
  }
}