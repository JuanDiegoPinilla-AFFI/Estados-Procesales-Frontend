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

  // 1. DEFINICIÓN DEL ORDEN ESPECÍFICO
  readonly ORDER_EJECUTIVO = [
    'RECOLECCION Y VALIDACION DOCUMENTAL',
    'DEMANDA',
    'MANDAMIENTO DE PAGO',
    'NOTIFICACION',
    'EXCEPCIONES',
    'AUDIENCIA',
    'SENTENCIA',
    'LIQUIDACION',
    'LANZAMIENTO'
  ];

  readonly ORDER_RESTITUCION = [
    'RECOLECCION Y VALIDACION DOCUMENTAL',
    'DEMANDA',
    'ADMISION DEMANDA',
    'NOTIFICACION',
    'EXCEPCIONES',
    'AUDIENCIA',
    'SENTENCIA'
  ];

  kpis = {
    total: 0,
    enPreparacion: 0,
    enJuzgado: 0,
    conSentencia: 0
  };
  
  ciudadesStats: StatItem[] = [];

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
    this.kpis = { total: 0, enPreparacion: 0, enJuzgado: 0, conSentencia: 0 };
    this.ciudadesStats = [];
    
    this.ejecutivo = this.initGroup();
    this.restitucion = this.initGroup();
    this.otros = this.initGroup();

    if (!data || data.length === 0) return;

    this.kpis.total = data.length;

    const flowMapEjecutivo = new Map<string, number>();
    const flowMapRestitucion = new Map<string, number>();
    const flowMapOtros = new Map<string, number>();
    const ciudadesMap = new Map<string, number>();

    const etapasAvanzadas = ['SENTENCIA', 'LIQUIDACION', 'AVALUO', 'REMATE', 'LANZAMIENTO', 'TERMINACION', 'TERMINADO'];

    data.forEach(p => {
      const etapa = this.normalizeEtapa(p.etapaProcesal);
      const clase = (p.claseProceso || '').toUpperCase();
      
      // Descomentar para NO mostrar -- NO ESPECIFICADO -- 
      // const ciudad = p.ciudadInmueble ? p.ciudadInmueble.trim().toUpperCase() : 'SIN CIUDAD';
      // if (!ciudad.includes('NO ESPECIFICADO')) {
      //   ciudadesMap.set(ciudad, (ciudadesMap.get(ciudad) || 0) + 1);
      // }
      
      // Descomentar para que -- NO ESPECIFICADO -- se muestre diferente 
      // if (rawCiudad.includes('NO ESPECIFICADO')) {
        //   rawCiudad = 'PENDIENTE';
        // }
        
      // Descomentar para mostrar -- NO ESPECIFICADO --
      let rawCiudad = p.ciudadInmueble ? p.ciudadInmueble.trim().toUpperCase() : 'SIN CIUDAD';
      const ciudad = rawCiudad;
      ciudadesMap.set(ciudad, (ciudadesMap.get(ciudad) || 0) + 1);
      
      const isPrep = etapa === 'RECOLECCION Y VALIDACION DOCUMENTAL';
      const isSentencia = etapasAvanzadas.some(adv => etapa.includes(adv));
      const isJuzgado = !isPrep && !isSentencia;

      if (isPrep) this.kpis.enPreparacion++;
      else if (isSentencia) this.kpis.conSentencia++;
      else this.kpis.enJuzgado++;

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

    // --- CAMBIO CLAVE: Pasar el orden personalizado ---
    this.ejecutivo.flowStats = this.generateChartData(flowMapEjecutivo, this.ejecutivo.total, this.ORDER_EJECUTIVO);
    this.restitucion.flowStats = this.generateChartData(flowMapRestitucion, this.restitucion.total, this.ORDER_RESTITUCION);
    
    // Otros se mantiene ordenado por cantidad (sin tercer argumento)
    this.otros.flowStats = this.generateChartData(flowMapOtros, this.otros.total);

    // Ciudades se mantiene por cantidad
    this.ciudadesStats = this.mapToSortedArray(ciudadesMap, this.kpis.total).slice(0, 15);
  }

  private updateGroup(group: ClassGroup, map: Map<string, number>, etapa: string, isPrep: boolean, isJuzgado: boolean, isSentencia: boolean) {
    group.total++;
    if (isPrep) group.prep++;
    if (isJuzgado) group.juzgado++;
    if (isSentencia) group.sentencia++;
    map.set(etapa, (map.get(etapa) || 0) + 1);
  }

  // Ahora acepta un array opcional 'customOrder'
  private generateChartData(map: Map<string, number>, total: number, customOrder?: string[]): StatItem[] {
    let items = Array.from(map.entries()).map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      color: this.ETAPA_COLORS[label] || '#cbd5e1'
    }));

    if (customOrder && customOrder.length > 0) {
      // Ordenamiento Personalizado
      return items.sort((a, b) => {
        const idxA = customOrder.indexOf(a.label);
        const idxB = customOrder.indexOf(b.label);

        // Si ambos están en la lista, ordenar por su posición en la lista
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        
        // Si solo A está en la lista, A va primero
        if (idxA !== -1) return -1;
        
        // Si solo B está en la lista, B va primero
        if (idxB !== -1) return 1;

        // Si ninguno está en la lista, ordenar por cantidad descendente (comportamiento default para 'Otros')
        return b.count - a.count;
      });
    } else {
      // Ordenamiento por defecto (Mayor cantidad primero)
      return items.sort((a, b) => b.count - a.count);
    }
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

  get donutGradient(): string {
    if (this.kpis.total === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    const pctPrep = (this.kpis.enPreparacion / this.kpis.total) * 100;
    return `conic-gradient(#fbbf24 0% ${pctPrep}%, #260086 ${pctPrep}% 100%)`;
  }
}