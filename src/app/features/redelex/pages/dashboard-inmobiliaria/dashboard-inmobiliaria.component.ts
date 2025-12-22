import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { FeatherModule } from 'angular-feather';

registerLocaleData(localeEsCo, 'es-CO');

interface StatItem {
  label: string;
  count: number;
  pct: number;
  color?: string;
}

// Interfaz para grupos específicos (Ejecutivo/Restitución)
interface ClassGroup {
  total: number;
  prep: number;
  juzgado: number;
  sentencia: number;
  flowStats: StatItem[];
}

@Component({
  selector: 'app-dashboard-inmobiliaria',
  standalone: true,
  imports: [CommonModule, FeatherModule],
  providers: [DatePipe],
  templateUrl: './dashboard-inmobiliaria.component.html',
  styleUrls: ['./dashboard-inmobiliaria.component.scss']
})
export class DashboardInmobiliariaComponent implements OnInit {
  private redelexService = inject(RedelexService);
  private titleService = inject(Title);
  public datePipe = inject(DatePipe);

  loading = true;
  nombreInmobiliaria = '';
  fechaActual = new Date();

  // 1. ESTADÍSTICAS GLOBALES (Resumen de toda la cartera)
  kpis = {
    total: 0,
    enPreparacion: 0,
    enJuzgado: 0,
    conSentencia: 0
  };
  
  ciudadesStats: StatItem[] = [];

  // 2. GRUPOS ESPECÍFICOS (Para el detalle por clase)
  ejecutivo: ClassGroup = this.initGroup();
  restitucion: ClassGroup = this.initGroup();
  otros: ClassGroup = this.initGroup();

  readonly ETAPA_COLORS: Record<string, string> = {
    'RECOLECCION Y VALIDACION DOCUMENTAL': '#fbbf24',
    'DEMANDA': '#f97316',
    'MANDAMIENTO DE PAGO': '#f43f5e',
    'ADMISION DEMANDA': '#84cc16',
    'NOTIFICACION': '#22c55e',
    'EXCEPCIONES': '#06b6d4',
    'AUDIENCIA': '#3b82f6',
    'SENTENCIA': '#8b5cf6',
    'LIQUIDACION': '#d946ef',
    'LANZAMIENTO': '#eab308',
    'TERMINADO': '#9ca3af',
    'TERMINACION': '#9ca3af'
  };

  ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Tablero de Control');
    this.loadData();
  }

  private initGroup(): ClassGroup {
    return { total: 0, prep: 0, juzgado: 0, sentencia: 0, flowStats: [] };
  }

  loadData() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        this.nombreInmobiliaria = res.nombreInmobiliaria || 'Inmobiliaria';
        const procesos = res.procesos || [];
        this.calculateMetrics(procesos);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando datos:', err);
        this.loading = false;
      }
    });
  }

  calculateMetrics(data: any[]) {
    // Reiniciar Globales
    this.kpis = { total: 0, enPreparacion: 0, enJuzgado: 0, conSentencia: 0 };
    this.ciudadesStats = [];
    
    // Reiniciar Grupos
    this.ejecutivo = this.initGroup();
    this.restitucion = this.initGroup();
    this.otros = this.initGroup();

    if (!data || data.length === 0) return;

    this.kpis.total = data.length;

    // Mapas temporales
    const flowMapEjecutivo = new Map<string, number>();
    const flowMapRestitucion = new Map<string, number>();
    const flowMapOtros = new Map<string, number>();
    const ciudadesMap = new Map<string, number>();

    const etapasAvanzadas = ['SENTENCIA', 'LIQUIDACION', 'AVALUO', 'REMATE', 'LANZAMIENTO', 'TERMINACION', 'TERMINADO'];

    data.forEach(p => {
      const etapa = this.normalizeEtapa(p.etapaProcesal);
      const clase = (p.claseProceso || '').toUpperCase();
      const ciudad = p.ciudadInmueble ? p.ciudadInmueble.trim().toUpperCase() : 'SIN CIUDAD';

      // --- CÁLCULOS GLOBALES ---
      ciudadesMap.set(ciudad, (ciudadesMap.get(ciudad) || 0) + 1);
      
      const isPrep = etapa === 'RECOLECCION Y VALIDACION DOCUMENTAL';
      const isSentencia = etapasAvanzadas.some(adv => etapa.includes(adv));
      const isJuzgado = !isPrep && !isSentencia; // Simplificación para gráfica

      // Actualizar KPIs Globales
      if (isPrep) this.kpis.enPreparacion++;
      else if (isSentencia) this.kpis.conSentencia++;
      else this.kpis.enJuzgado++; // Asumimos resto en juzgado para el KPI global

      // --- CÁLCULOS POR GRUPO (EJECUTIVO / RESTITUCIÓN) ---
      if (clase.includes('EJECUTIVO') || clase.includes('SINGULAR')) {
        this.updateGroup(this.ejecutivo, flowMapEjecutivo, etapa, isPrep, isJuzgado, isSentencia);
      } 
      else if (clase.includes('VERBAL') || clase.includes('RESTITUCION') || clase.includes('SUMARIO')) {
        this.updateGroup(this.restitucion, flowMapRestitucion, etapa, isPrep, isJuzgado, isSentencia);
      } 
      else {
        this.updateGroup(this.otros, flowMapOtros, etapa, isPrep, isJuzgado, isSentencia);
      }
    });

    // Generar Arrays para gráficas de flujo
    this.ejecutivo.flowStats = this.generateChartData(flowMapEjecutivo, this.ejecutivo.total);
    this.restitucion.flowStats = this.generateChartData(flowMapRestitucion, this.restitucion.total);
    this.otros.flowStats = this.generateChartData(flowMapOtros, this.otros.total);

    // Generar Top Ciudades Global
    this.ciudadesStats = this.mapToSortedArray(ciudadesMap, this.kpis.total).slice(0, 15);
  }

  private updateGroup(group: ClassGroup, map: Map<string, number>, etapa: string, isPrep: boolean, isJuzgado: boolean, isSentencia: boolean) {
    group.total++;
    if (isPrep) group.prep++;
    if (isJuzgado) group.juzgado++;
    if (isSentencia) group.sentencia++;
    map.set(etapa, (map.get(etapa) || 0) + 1);
  }

  private generateChartData(map: Map<string, number>, total: number): StatItem[] {
    return this.mapToSortedArray(map, total)
      .map(item => ({ ...item, color: this.ETAPA_COLORS[item.label] || '#cbd5e1' }));
  }

  private mapToSortedArray(map: Map<string, number>, total: number): StatItem[] {
    if (total === 0) return [];
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        pct: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }

  private normalizeEtapa(raw: string): string {
    if (!raw) return 'SIN ETAPA';
    const upper = raw.toUpperCase();
    if (upper.includes('ALISTAMIENTO') || upper.includes('DOCUMENTACION') || upper.includes('ASIGNACION')) return 'RECOLECCION Y VALIDACION DOCUMENTAL';
    if (upper.includes('AVALUO') || upper.includes('REMATE')) return 'LIQUIDACION';
    return upper;
  }

  // Getter para el gradiente de la dona
  get donutGradient(): string {
    if (this.kpis.total === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    
    // Segmentos: Prep (Amarillo) vs Juzgado/Sentencia (Azul)
    const pctPrep = (this.kpis.enPreparacion / this.kpis.total) * 100;
    
    // #fbbf24 = Amarillo (Prep), #260086 = Azul (Resto)
    return `conic-gradient(#fbbf24 0% ${pctPrep}%, #260086 ${pctPrep}% 100%)`;
  }
}