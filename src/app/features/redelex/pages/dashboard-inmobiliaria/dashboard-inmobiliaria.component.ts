import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO'; // Importar configuración regional
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { FeatherModule } from 'angular-feather';

// Registrar idioma español Colombia
registerLocaleData(localeEsCo, 'es-CO');

interface StatItem {
  label: string;
  count: number;
  pct: number;
  color?: string;
}

interface TimeStat {
  year: string;
  count: number;
  heightPct: number;
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
  identificacionUsuario = '';
  
  // Fecha actual (Angular se encargará de formatearla)
  fechaActual = new Date();

  // KPIs
  kpis = {
    total: 0,
    enPreparacion: 0, 
    enJuzgado: 0,
    conSentencia: 0,
    nuevosEsteMes: 0
  };

  // Datos Gráficos
  etapasStats: StatItem[] = [];
  clasesStats: StatItem[] = [];
  ciudadesStats: StatItem[] = [];
  despachosStats: StatItem[] = [];
  timelineStats: TimeStat[] = [];

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
    'TERMINADO': '#9ca3af'
  };

  ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Tablero');
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        this.nombreInmobiliaria = res.nombreInmobiliaria;
        this.identificacionUsuario = res.identificacion;
        const procesos = res.procesos || [];
        this.calculateMetrics(procesos);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  calculateMetrics(data: any[]) {
    const total = data.length;
    this.kpis.total = total;

    if (total === 0) return;

    const etapasMap = new Map<string, number>();
    const clasesMap = new Map<string, number>();
    const ciudadesMap = new Map<string, number>();
    const despachosMap = new Map<string, number>();
    const aniosMap = new Map<string, number>();

    let prepCount = 0;
    let juzgadoCount = 0;
    let sentenciaCount = 0;
    let nuevosMesCount = 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const etapasAvanzadas = ['SENTENCIA', 'LIQUIDACION', 'AVALUO', 'REMATE', 'LANZAMIENTO'];

    data.forEach(p => {
      // 1. Etapas
      let etapa = this.normalizeEtapa(p.etapaProcesal);
      etapasMap.set(etapa, (etapasMap.get(etapa) || 0) + 1);

      if (etapa === 'RECOLECCION Y VALIDACION DOCUMENTAL') {
        prepCount++;
      } else {
        juzgadoCount++;
        if (etapasAvanzadas.some(adv => etapa.includes(adv))) sentenciaCount++;
      }

      // 2. Clases
      const clase = p.claseProceso || 'Sin Clasificar';
      clasesMap.set(clase, (clasesMap.get(clase) || 0) + 1);

      // 3. Ciudades
      const ciudad = p.ciudadInmueble ? p.ciudadInmueble.trim().toUpperCase() : 'SIN CIUDAD';
      ciudadesMap.set(ciudad, (ciudadesMap.get(ciudad) || 0) + 1);

      // 4. Despachos
      let despacho = p.despacho ? p.despacho.trim() : 'SIN DESPACHO';
      despachosMap.set(despacho, (despachosMap.get(despacho) || 0) + 1);

      // 5. Fechas
      if (p.fechaRecepcionProceso) {
        const fecha = new Date(p.fechaRecepcionProceso);
        if (!isNaN(fecha.getTime())) {
          const year = fecha.getFullYear().toString();
          aniosMap.set(year, (aniosMap.get(year) || 0) + 1);

          if (fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear) {
            nuevosMesCount++;
          }
        }
      }
    });

    this.kpis.enPreparacion = prepCount;
    this.kpis.enJuzgado = juzgadoCount;
    this.kpis.conSentencia = sentenciaCount;
    this.kpis.nuevosEsteMes = nuevosMesCount;

    // Generar Arrays Ordenados
    this.etapasStats = this.mapToSortedArray(etapasMap, total)
      .map(item => ({ ...item, color: this.ETAPA_COLORS[item.label] || '#cbd5e1' }));

    this.clasesStats = this.mapToSortedArray(clasesMap, total).slice(0, 5);
    this.ciudadesStats = this.mapToSortedArray(ciudadesMap, total).slice(0, 5);
    this.despachosStats = this.mapToSortedArray(despachosMap, total).slice(0, 5);

    const aniosArray = Array.from(aniosMap.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    const maxCountYear = Math.max(...aniosArray.map(a => a[1]), 1);
    
    this.timelineStats = aniosArray.map(([year, count]) => ({
      year,
      count,
      heightPct: Math.round((count / maxCountYear) * 100)
    }));
  }

  private mapToSortedArray(map: Map<string, number>, total: number): StatItem[] {
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
    if (this.kpis.total === 0) return 'conic-gradient(#260086 0% 100%)';
    const pctJuzgado = (this.kpis.enJuzgado / this.kpis.total) * 100;
    return `conic-gradient(#260086 0% ${pctJuzgado}%, #fbbf24 ${pctJuzgado}% 100%)`;
  }
}