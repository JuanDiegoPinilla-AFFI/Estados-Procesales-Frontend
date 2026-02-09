import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RedelexService, ProcesoDetalleDto, AbogadoDto, SujetosDto, MedidasDto } from '../../services/redelex.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { saveAs } from 'file-saver';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';
import { UserOptions } from 'jspdf-autotable';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import { InmobiliariaService } from '../../../inmobiliaria/services/inmobiliaria.service';
import type * as ExcelJS from 'exceljs';

interface ProcesoPorCedula {
  procesoId: number;
  demandadoNombre: string;
  demandadoIdentificacion: string;
  demandanteNombre: string;
  demandanteIdentificacion: string;
  claseProceso?: string;
}

interface EtapaConfig {
  id: number;
  nombreInterno: string[];
  color: string;
  nombreCliente: string;
  definicion: string;
}

interface BloqueActuaciones {
  label: string;
  year: number;
  periodo: number;
  actuaciones: any[];
}

const ETAPAS_MASTER: EtapaConfig[] = [
  { 
    id: 1, 
    nombreInterno: ['ALISTAMIENTO', 'DOCUMENTACION', 'ASIGNACION'], 
    color: '#FFFF99', 
    nombreCliente: 'RECOLECCION Y VALIDACION', 
    definicion: 'Se está completando y revisando la información necesaria para iniciar los procesos.' 
  },
  { 
    id: 2, 
    nombreInterno: ['DEMANDA'], 
    color: '#F1A983', 
    nombreCliente: 'DEMANDA', 
    definicion: 'Hemos iniciado el proceso judicial.' 
  },
  { 
    id: 3, 
    nombreInterno: ['MANDAMIENTO'], 
    color: '#FBE2D5', 
    nombreCliente: 'MANDAMIENTO PAGO', 
    definicion: 'El juez ordena el pago de la obligación.' 
  },
  { 
    id: 4, 
    nombreInterno: ['ADMISION'], 
    color: '#92D050', 
    nombreCliente: 'ADMISION DEMANDA', 
    definicion: 'El juez acepta tramitar la demanda de restitución.' 
  },
  { 
    id: 5, 
    nombreInterno: ['NOTIFICACION', 'EMPLAZAMIENTO'], 
    color: '#B5E6A2', 
    nombreCliente: 'NOTIFICACION', 
    definicion: 'Etapa en la que se comunica la existencia del proceso.' 
  },
  { 
    id: 6, 
    nombreInterno: ['EXCEPCIONES', 'CONTESTACION'], 
    color: '#00B0F0', 
    nombreCliente: 'EXCEPCIONES', 
    definicion: 'El demandado presentó objeciones o contestó la demanda.' 
  },
  { 
    id: 7, 
    nombreInterno: ['AUDIENCIA'], 
    color: '#C0E6F5', 
    nombreCliente: 'AUDIENCIA', 
    definicion: 'Diligencia donde el juez escucha a las partes.' 
  },
  { 
    id: 8, 
    nombreInterno: ['SENTENCIA'], 
    color: '#D86DCD', 
    nombreCliente: 'SENTENCIA', 
    definicion: 'El juez decidió sobre la demanda.' 
  },
  { 
    id: 9, 
    nombreInterno: ['LIQUIDACION', 'AVALUO', 'REMATE'], 
    color: '#E49EDD', 
    nombreCliente: 'LIQUIDACION', 
    definicion: 'Etapa en la que se cuantifica la deuda, se avalúan bienes o se realiza el remate.' 
  },
  { 
    id: 10, 
    nombreInterno: ['LANZAMIENTO', 'ENTREGA'], 
    color: '#FFC000', 
    nombreCliente: 'LANZAMIENTO', 
    definicion: 'Se está gestionando la restitución o entrega del inmueble.' 
  },
  { 
    id: 11, 
    nombreInterno: ['TERMINACION', 'TERMINADO', 'DESISTIMIENTO'], 
    color: '#FF6D6D', 
    nombreCliente: 'TERMINACION', 
    definicion: 'El proceso ha finalizado judicialmente.' 
  }
];

const REGLAS_VISIBILIDAD: any = {
  'EJECUTIVO SINGULAR': [1, 2, 3, 5, 6, 7, 8, 9, 10, 11], 
  'VERBAL SUMARIO': [1, 2, 4, 5, 6, 7, 8, 11], 
};

@Component({
  selector: 'app-consultar-proceso',
  standalone: true,
  imports: [CommonModule, FormsModule, ClaseProcesoPipe],
  providers: [ClaseProcesoPipe, DatePipe], 
  templateUrl: './consultar-proceso.html',
  styleUrl: './consultar-proceso.scss',
})

export class ConsultarProcesoComponent implements OnInit {
  private clasePipe = inject(ClaseProcesoPipe);
  bloquesActuaciones: BloqueActuaciones[] = [];
  openBloques = new Set<string>();
  openActuaciones = new Set<string>();
  loadingInmoNit: string | null = null;

  etapasStepper: EtapaConfig[] = [];
  etapaActualIndex: number = -1;
  etapaActualConfig: EtapaConfig | null = null;

  procesoId!: number | null; 
  proceso: ProcesoDetalleDto | null = null;
  
  abogadoPrincipal: AbogadoDto | null = null;
  abogadosInternos: AbogadoDto[] = [];
  otrosAbogados: AbogadoDto[] = [];

  sujetoDemandado: SujetosDto[] = [];
  sujetoDemandante: SujetosDto[] = [];
  sujetosSolidarios: SujetosDto[] = [];
  otrosSujetos: SujetosDto[] = [];

  identificacion: string = '';
  procesosPorCedula: ProcesoPorCedula[] = [];
  procesosFiltrados: ProcesoPorCedula[] = [];
  filtroProcesoId: string = '';

  openMedidas = new Set<number>();
  hasSearched: boolean = false; 
  medidas: MedidasDto[] = [];
  loading = false;

  currentPage = 1;
  itemsPerPage = 10;

  exportState: 'idle' | 'excel' | 'pdf' = 'idle';

  sectionOpen = {
    proceso: true,
    demandante: true,
    demandado: true,
    solidarios: true,
    otrosSujetos: true,
    medidas: true,
    abogados: true,
  };

  showModalInmo = false;
  infoInmo: any = null;

  constructor(
    private redelexService: RedelexService,
    private titleService: Title,
    private datePipe: DatePipe,
    private inmoService: InmobiliariaService
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Estados Procesales - Consultar Procesos');
  }

  formatDate(date?: string): string {
    return date
      ? this.datePipe.transform(date, 'dd/MM/yyyy', 'UTC') ?? ''
      : '';
  }

  toggleBloque(label: string) {
    if (this.openBloques.has(label)) {
      this.openBloques.delete(label);
    } else {
      this.openBloques.clear(); 
      this.openBloques.add(label);
    }
  }

  formatMoney(value?: number | string): string {
    if (value === null || value === undefined || value === '') return '-';

    const numberValue = Number(value);
    if (isNaN(numberValue)) return '-';

    return numberValue.toLocaleString('es-CO');
  }

  toggleActuacion(id: any) {
    const actId = String(id);
    if (this.openActuaciones.has(actId)) {
      this.openActuaciones.delete(actId);
    } else {
      this.openActuaciones.add(actId);
    }
  }
  
  abrirModalInmo(nit: string) {
    if (!nit) {
      console.warn('NIT vacío o indefinido');
      return;
    }

    this.loadingInmoNit = nit;

    const cleanNit = nit.replace(/\D/g, ''); 
    
    this.inmoService.getDetallePorNit(cleanNit).subscribe({
      next: (data: any) => {
        this.loadingInmoNit = null;

        if (data) {
          this.infoInmo = data;
          this.showModalInmo = true;
        } else {
          AffiAlert.fire({ 
            icon: 'info', 
            title: 'Sin información', 
            text: 'No se encontraron datos ampliados en HubSpot para este NIT.' 
          });
        }
      },
      error: (err: any) => {
        this.loadingInmoNit = null;
        console.error('Error en la petición:', err);
        AffiAlert.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: 'Hubo un error al consultar la información de la inmobiliaria.' 
        });
      }
    });
  }

  cerrarModalInmo() {
    this.showModalInmo = false;
    this.infoInmo = null;
  }

  private agruparActuacionesPorCuatrimestre() {
    if (!this.proceso || !this.proceso.actuacionesRecientes) return;

    const grupos: { [key: string]: BloqueActuaciones } = {};
    const labels = ["Ene - Abr", "May - Ago", "Sep - Dic"];

    this.proceso.actuacionesRecientes.forEach(act => {
      const fecha = new Date(act.fecha);
      const year = fecha.getFullYear();
      const periodo = Math.floor(fecha.getMonth() / 4);
      const key = `${year}-${periodo}`;

      if (!grupos[key]) {
        grupos[key] = {
          label: `${labels[periodo]} ${year}`,
          year: year,
          periodo: periodo,
          actuaciones: []
        };
      }
      grupos[key].actuaciones.push(act);
    });

    this.bloquesActuaciones = Object.values(grupos).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.periodo - a.periodo;
    });
  }

  private construirStepper() {
    if (!this.proceso) return;

    const claseRaw = (this.proceso.claseProceso || '').toUpperCase();
    let idsVisibles: number[] = []; 

    if (claseRaw.includes('VERBAL SUMARIO') || claseRaw.includes('VERBAL SUMARIO')) {
      idsVisibles = REGLAS_VISIBILIDAD['VERBAL SUMARIO'];
    } else if (claseRaw.includes('EJECUTIVO SINGULAR')) {
      idsVisibles = REGLAS_VISIBILIDAD['EJECUTIVO SINGULAR'];
    }

    this.etapasStepper = ETAPAS_MASTER.filter(etapa => idsVisibles.includes(etapa.id));
    const etapaBD = (this.proceso.etapaProcesal || '').toUpperCase().trim();
    const configFound = ETAPAS_MASTER.find(e => 
      e.nombreInterno.some(keyword => etapaBD.includes(keyword))
    );

    if (configFound) {
      this.etapaActualConfig = configFound;
      
      if (this.etapasStepper.length > 0) {
        const visualIndex = this.etapasStepper.findIndex(e => e.id === configFound.id);
        
        if (visualIndex !== -1) {
          this.etapaActualIndex = visualIndex;
        } else {
          const prevStep = this.etapasStepper.filter(e => e.id < configFound.id).pop();
          if (prevStep) {
             this.etapaActualIndex = this.etapasStepper.indexOf(prevStep);
          } else {
             this.etapaActualIndex = 0;
          }
        }
      }
    } else {
      this.etapaActualIndex = 0;
      this.etapaActualConfig = {
        id: 0,
        nombreInterno: [etapaBD],
        nombreCliente: etapaBD || 'No se encuentra información de la etapa', 
        color: '#E5E7EB',
        definicion: 'No se encuentra información de la etapa.'
      };
    }
  }

  toggleMedida(index: number) {
    if (this.openMedidas.has(index)) {
      this.openMedidas.delete(index);
    } else {
      this.openMedidas.add(index);
    }
  }

  getMedidaIconType(tipoBien: string | null): string {
    if (!tipoBien) return 'default';
    const tipo = tipoBien.trim().toUpperCase();
    if (tipo.includes('SALARIO') || tipo.includes('DINERO') || tipo.includes('CUENTA')) return 'money';
    if (tipo.includes('INMUEBLE') || tipo.includes('CASA') || tipo.includes('APARTAMENTO') || tipo.includes('FINCA')) return 'house';
    if (tipo.includes('TITULO JUDICIAL') || tipo.includes('JURIDICO') || tipo.includes('SENTENCIA')) return 'legal';
    return 'default';
  }

  formatObservaciones(obs: string | null | undefined): string {
    if (!obs || !obs.trim()) return '-';
    return obs.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
  }

  toggleSection(section: keyof typeof this.sectionOpen) {
    this.sectionOpen[section] = !this.sectionOpen[section];
  }

  consultarPorId() {
    if (!this.procesoId) {
      AffiAlert.fire({ icon: 'info', title: 'Dato requerido', text: 'Ingresa el ID del proceso para consultar.' });
      return;
    }
    this.loading = true;
    this.limpiarDatos();

    this.redelexService.getProceso(this.procesoId).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res || !res.success || !res.data) {
          this.proceso = null;
          AffiAlert.fire({ icon: 'warning', title: 'Proceso no encontrado', text: 'No se encontró información para el ID de proceso ingresado.' });
          return;
        }
        this.proceso = res.data;
        this.procesarDatosProceso();
        this.construirStepper();
        
        AffiAlert.fire({ icon: 'success', title: 'Proceso cargado', text: `Se cargó la información del proceso ${this.procesoId}.`, timer: 1400, showConfirmButton: false });
      },
      error: () => {
        this.loading = false;
        this.limpiarDatos();
        AffiAlert.fire({ icon: 'error', title: 'Error al consultar', text: 'No se encontró el proceso' });
      },
    });
  }

  private limpiarDatos() {
    this.proceso = null;
    this.abogadoPrincipal = null;
    this.abogadosInternos = [];
    this.otrosAbogados = [];
    this.sujetoDemandante = [];
    this.sujetoDemandado = [];
    this.sujetosSolidarios = [];
    this.otrosSujetos = [];
    this.medidas = [];
    this.openMedidas.clear();
    this.openActuaciones.clear(); 
    this.etapasStepper = [];
    this.etapaActualIndex = -1;
    this.etapaActualConfig = null;
  }

  private procesarDatosProceso() {
    if (!this.proceso) return;
    const raw = this.proceso as any;
    if (this.proceso.actuacionesRecientes) {
      this.proceso.actuacionesRecientes = (this.proceso.actuacionesRecientes as any[]).map((act, index) => ({
        ...act,
        id: act.id || `act-${index}-${new Date(act.fecha).getTime()}`
      }));
    }

    this.agruparActuacionesPorCuatrimestre();

    const abogados: AbogadoDto[] = (raw.abogados ?? []) as AbogadoDto[];
    this.abogadoPrincipal = abogados.find((a) => a.ActuaComo?.toUpperCase().includes('PRINCIPAL')) ?? null;
    this.abogadosInternos = abogados.filter((a) => a.ActuaComo?.toUpperCase().includes('INTERNO'));
    this.otrosAbogados = abogados.filter((a) => {
      const actuaComo = a.ActuaComo?.toUpperCase() ?? '';
      return !actuaComo.includes('PRINCIPAL') && !actuaComo.includes('INTERNO');
    });

    const sujetos: SujetosDto[] = (raw.sujetos ?? []) as SujetosDto[];
    this.sujetoDemandante = sujetos.filter((s) => s.Tipo?.toUpperCase().includes('DEMANDANTE'));
    this.sujetoDemandado = sujetos.filter((s) => s.Tipo?.toUpperCase().includes('DEMANDADO'));
    this.sujetosSolidarios = sujetos.filter((s) => s.Tipo?.toUpperCase().includes('SOLIDARIO'));
    this.otrosSujetos = sujetos.filter((s) => {
      const tipo = s.Tipo?.toUpperCase() ?? '';
      return !tipo.includes('DEMANDANTE') && !tipo.includes('DEMANDADO') && !tipo.includes('SOLIDARIO');
    });

    const medidasRaw = raw.medidasCautelares;
    const medidasArray: any[] = Array.isArray(medidasRaw) ? medidasRaw : medidasRaw ? [medidasRaw] : [];

    this.medidas = medidasArray.map((m: any): MedidasDto => ({
      tipoBien: m.tipoBien ?? null,
      sujeto: m.sujeto ?? null,
      tipoMedida: m.tipoMedida ?? null,
      descripcion: m.descripcion ?? null,
      medidaEfectiva: m.medidaEfectiva ?? null,
      avaluoJudicial: typeof m.avaluoJudicial === 'number' ? m.avaluoJudicial : m.avaluoJudicial ? Number(m.avaluoJudicial) : null,
      observaciones: m.observaciones ?? null,
      identificacionSujeto: m.identificacionSujeto ?? null,
      area: m.area ?? null,
      fecha: m.fecha ?? null,
    }));
    (this.proceso as any).medidasCautelares = this.medidas;
  }

  buscarPorCedula() {
    const cedula = this.identificacion.trim();
    if (!cedula) {
      AffiAlert.fire({ icon: 'info', title: 'Dato requerido', text: 'Ingresa una cédula o NIT para buscar procesos.' });
      return;
    }
    this.procesoId = null; 
    this.limpiarDatos(); 
    this.loading = true;
    this.procesosPorCedula = [];
    this.procesosFiltrados = [];
    this.filtroProcesoId = '';
    this.currentPage = 1;
    this.hasSearched = false;

    this.redelexService.getProcesosByIdentificacion(cedula).subscribe({
      next: (res) => {
        this.loading = false;
        this.hasSearched = true;
        if (!res || !res.success) return;

        const rawProcesos = res.procesos || [];
        this.procesosPorCedula = rawProcesos.map((proc: any) => {
          let nombreLimpio = proc.demandadoNombre || '';
          let idLimpio = proc.demandadoIdentificacion || '';
          if (nombreLimpio.includes(',')) nombreLimpio = nombreLimpio.split(',')[0].trim();
          if (idLimpio.includes(',')) idLimpio = idLimpio.split(',')[0].trim();
          return { ...proc, demandadoNombre: nombreLimpio, demandadoIdentificacion: idLimpio };
        });
        this.procesosFiltrados = [...this.procesosPorCedula];

        if (!this.procesosPorCedula.length) {
          AffiAlert.fire({ icon: 'info', title: 'Sin procesos', text: 'No se encontraron procesos para esa identificación.' });
        } else {
          AffiAlert.fire({ icon: 'success', title: 'Procesos encontrados', text: `Se encontraron ${this.procesosPorCedula.length} proceso(s).`, timer: 1500, showConfirmButton: false });
        }
      },
      error: () => {
        this.loading = false;
        this.hasSearched = true;
        this.procesosPorCedula = [];
        this.procesosFiltrados = [];
        this.limpiarDatos();
        AffiAlert.fire({ icon: 'error', title: 'Error al consultar', text: 'No se pudieron obtener los procesos.' });
      },
    });
  }

  filtrarProcesos() {
    const f = this.filtroProcesoId.trim().toLowerCase();
    if (!f) {
      this.procesosFiltrados = [...this.procesosPorCedula];
    } else {
      this.procesosFiltrados = this.procesosPorCedula.filter((p) => {
        const idProceso = p.procesoId?.toString() ?? '';
        const demandadoNombre = p.demandadoNombre?.toLowerCase() ?? '';
        const demandadoId = p.demandadoIdentificacion?.toLowerCase() ?? '';
        const demandanteNombre = p.demandanteNombre?.toLowerCase() ?? '';
        const demandanteId = p.demandanteIdentificacion?.toLowerCase() ?? '';
        const claseOriginal = p.claseProceso ? p.claseProceso.toLowerCase() : '';
        const claseTransformada = this.clasePipe.transform(p.claseProceso).toLowerCase();

        return (
          idProceso.includes(f) ||
          demandadoNombre.includes(f) ||
          demandadoId.includes(f) ||
          demandanteNombre.includes(f) ||
          demandanteId.includes(f) ||
          claseOriginal.includes(f) || 
          claseTransformada.includes(f) 
        );
      });
    }
    this.currentPage = 1;
  }

  get procesosPaginados(): ProcesoPorCedula[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.procesosFiltrados.slice(start, end);
  }

  get totalPages(): number { return Math.ceil(this.procesosFiltrados.length / this.itemsPerPage); }

  cambiarPagina(direccion: 'prev' | 'next') {
    if (direccion === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    } else if (direccion === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  seleccionarProceso(id: number) {
    this.procesoId = id;
    this.consultarPorId();
  }

  private buildExportRows() {
     if (!this.proceso) return [];
     const p = this.proceso;
     const rows: { Seccion: string; Campo: string; Valor: string | number }[] = [];
     const joinOrDash = (values: (string | null | undefined)[]) => values.length ? values.map(v => v || '-').join(', ') : '-';
     
     if (this.sujetoDemandante.length) {
       rows.push({ Seccion: 'Datos del demandante', Campo: 'Nombres', Valor: joinOrDash(this.sujetoDemandante.map(s => s.Nombre)) });
       rows.push({ Seccion: 'Datos del demandante', Campo: 'Identificación', Valor: joinOrDash(this.sujetoDemandante.map(s => s.NumeroIdentificacion)) });
     }
     if (this.sujetoDemandado.length) {
        rows.push({ Seccion: 'Datos del demandado', Campo: 'Nombres', Valor: joinOrDash(this.sujetoDemandado.map(s => s.Nombre)) });
        rows.push({ Seccion: 'Datos del demandado', Campo: 'Identificación', Valor: joinOrDash(this.sujetoDemandado.map(s => s.NumeroIdentificacion)) });
     }
     if (this.sujetosSolidarios.length) {
        rows.push({ Seccion: 'Datos deudor solidario', Campo: 'Nombres', Valor: joinOrDash(this.sujetosSolidarios.map(s => s.Nombre)) });
        rows.push({ Seccion: 'Datos deudor solidario', Campo: 'Identificación', Valor: joinOrDash(this.sujetosSolidarios.map(s => s.NumeroIdentificacion)) });
     }
     if (this.otrosSujetos.length) {
       this.otrosSujetos.forEach((s, idx) => {
         rows.push(
           { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Tipo', Valor: s.Tipo || '-' },
           { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Nombre', Valor: s.Nombre || '-' },
           { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Identificación', Valor: s.NumeroIdentificacion || '-' },
         );
       });
     }
     rows.push(
       { Seccion: 'Datos del proceso', Campo: 'ID Proceso', Valor: p.idProceso ?? '' },
       { Seccion: 'Datos del Proceso', Campo: 'Despacho actual', Valor: p.despacho || '' },
       { Seccion: 'Datos del Proceso', Campo: 'Despacho de origen', Valor: p.despachoOrigen || '' },
       { Seccion: 'Datos del proceso', Campo: 'Número de radicación', Valor: p.numeroRadicacion || '' },
       { Seccion: 'Datos del proceso', Campo: 'Cuenta', Valor: p.codigoAlterno || '' },
       { Seccion: 'Datos del proceso', Campo: 'Clase de proceso', Valor: this.clasePipe.transform(p.claseProceso) },
       { Seccion: 'Datos del proceso', Campo: 'Etapa procesal', Valor: p.etapaProcesal || '' },
       { Seccion: 'Datos del proceso', Campo: 'Estado', Valor: p.estado || '' },
       { Seccion: 'Datos del proceso', Campo: 'Regional', Valor: p.regional || '' },
       { Seccion: 'Datos del proceso', Campo: 'Tema', Valor: p.tema || '' },
       { Seccion: 'Datos del proceso', Campo: 'Fecha creación', Valor: p.fechaCreacion || '' },
       { Seccion: 'Datos del proceso', Campo: 'Fecha entrega', Valor: p.fechaEntregaAbogado || '' },
       { Seccion: 'Datos del proceso', Campo: 'Fecha admisión', Valor: p.fechaAdmisionDemanda || '' },
       { Seccion: 'Datos del proceso', Campo: 'Fecha recepción', Valor: p.fechaRecepcionProceso || '' },
       { Seccion: 'Datos del proceso', Campo: 'Ubicación contrato', Valor: p.ubicacionContrato || '' },
       { Seccion: 'Datos del proceso', Campo: 'Sentencia 1ra', Valor: p.sentenciaPrimeraInstanciaResultado || '' },
       { Seccion: 'Datos del proceso', Campo: 'Fecha sentencia', Valor: p.sentenciaPrimeraInstanciaFecha || '' },
       { Seccion: 'Datos del proceso', Campo: 'Calificación', Valor: p.calificacion || '' },
       { Seccion: 'Datos del proceso', Campo: 'Última actuación', Valor: [p.ultimaActuacionTipo || '', p.ultimaActuacionFecha || '', p.ultimaActuacionObservacion || ''].filter(Boolean).join(' | ') }
     );
     
     if (p.actuacionesRecientes && p.actuacionesRecientes.length > 0) {
       p.actuacionesRecientes.forEach((act, idx) => {
         rows.push({ 
           Seccion: `Historial - Actuación ${idx + 1}`, 
           Campo: `${this.formatDate(act.fecha)} | ${act.tipo}`, 
           Valor: act.observacion || 'Sin observación' 
         });
       });
     }

     rows.push({ Seccion: 'Abogados', Campo: 'Abogado principal', Valor: this.abogadoPrincipal?.Nombre || 'Sin asignar' });
     if (this.abogadosInternos.length) rows.push({ Seccion: 'Abogados', Campo: 'Abogados internos', Valor: this.abogadosInternos.map(ab => ab.Nombre).join(', ') });
     this.otrosAbogados.forEach((ab, idx) => { rows.push({ Seccion: 'Abogados', Campo: `Otro abogado ${idx + 1} (${ab.ActuaComo || 'N/A'})`, Valor: ab.Nombre || '-' }); });
     

     if (this.medidas.length) {
       this.medidas.forEach((m, idx) => {
         rows.push(
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Tipo medida', Valor: m.tipoMedida || '' },
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Estado medida', Valor: m.medidaEfectiva || '' },
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Sujeto', Valor: m.sujeto|| '' },
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Tipo bien', Valor: m.tipoBien || '' },
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Avalúo judicial', Valor: m.avaluoJudicial ?? '' },
           { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Observaciones', Valor: m.observaciones || '' }
          );
        });
      }
      return rows;
  }

  async exportarExcel() {
    if (!this.proceso) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'Primero consulta un proceso para poder exportar.',
      });
      return;
    }

    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const ExcelJS = await import('exceljs');  
      const rows = this.buildExportRows();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Detalle proceso');

      try {
        const imageId = workbook.addImage({
          base64: AFFI_LOGO_BASE64,
          extension: 'png',
        });
        sheet.addImage(imageId, {
          tl: { col: 0.2, row: 0.1 },
          ext: { width: 100, height: 100 } 
        });
      } catch (e) { console.warn('No se pudo cargar el logo', e); }

      sheet.mergeCells('B2:C2');
      const titleCell = sheet.getCell('B2');
      titleCell.value = `DETALLE DEL PROCESO ${this.proceso.idProceso || ''}`;
      titleCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const demandadoNombres = this.sujetoDemandado.map(s => s.Nombre || '').join(', ');
      sheet.mergeCells('B3:C3');
      const subTitleCell = sheet.getCell('B3');
      subTitleCell.value = demandadoNombres.toUpperCase();
      subTitleCell.font = { bold: false, size: 11, name: 'Arial', color: { argb: 'FF555555' } };
      subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const headerRowIdx = 6;
      
      sheet.getColumn(1).width = 25;
      sheet.getColumn(2).width = 35;
      sheet.getColumn(3).width = 80;

      const headerRow = sheet.getRow(headerRowIdx);
      headerRow.values = ['Sección', 'Campo', 'Valor'];

      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { 
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, 
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      });

      const borderStyle = { style: 'thin', color: { argb: 'FFD3D3D3' } } as ExcelJS.Border;

      rows.forEach((r, index) => {
        const currentRow = sheet.addRow([r.Seccion, r.Campo, r.Valor]);
        
        const isEven = index % 2 === 0;
        const fillConfig = isEven ? null : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };

        currentRow.eachCell((cell) => {
          cell.font = { size: 10, name: 'Arial', color: { argb: 'FF000000' } };
          cell.alignment = { vertical: 'top', wrapText: true };
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

          if (fillConfig) {
            cell.fill = fillConfig as ExcelJS.Fill;
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });

      const fileName = `PROCESO ${this.proceso.idProceso || 'detalle'}.xlsx`;
      saveAs(blob, fileName);

      AffiAlert.fire({
        icon: 'success',
        title: 'Excel generado',
        text: 'Proceso descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error(error);
      AffiAlert.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el Excel. Intenta nuevamente.', confirmButtonText: 'Cerrar' });
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportarPdf() {
    if (!this.proceso) {
      AffiAlert.fire({ icon: 'info', title: 'Sin datos', text: 'Primero consulta un proceso para poder exportar.' });
      return;
    }

    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const p = this.proceso;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      if (AFFI_LOGO_BASE64) {
        try {
          doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 6, 30, 30); 
        } catch {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`PROCESO ID ${p.idProceso ?? ''}`, pageWidth / 2, 18, { align: 'center' });

      const demandadoNombres = this.sujetoDemandado.length ? this.sujetoDemandado.map(s => s.Nombre || '-').join(', ') : '-';
      const demandadoIdentificaciones = this.sujetoDemandado.length ? this.sujetoDemandado.map(s => s.NumeroIdentificacion || '-').join(', ') : '-';
      const subtitle = (demandadoNombres !== '-' ? demandadoNombres : demandadoIdentificaciones).toUpperCase();

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, pageWidth / 2, 24, { align: 'center' });

      const commonTableStyles: UserOptions = {
        theme: 'grid',
        headStyles: { 
          fillColor: [52, 73, 94],
          textColor: 255, 
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        styles: { 
          textColor: 0, 
          fontSize: 8, 
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      };

      let currentY = 40;

      const demandanteNombres = this.sujetoDemandante.length ? this.sujetoDemandante.map(s => s.Nombre || '-').join(', ') : '-';
      const demandanteIdentificaciones = this.sujetoDemandante.length ? this.sujetoDemandante.map(s => s.NumeroIdentificacion || '-').join(', ') : '-';

      autoTable(doc, {
        startY: currentY,
        ...commonTableStyles,
        head: [[
          'Demandado', demandadoNombres,
          'Identificación', demandadoIdentificaciones,
          'Radicación', p.numeroRadicacion || '-'
        ]],
        body: [[
          'Demandante', demandanteNombres,
          'Identificación', demandanteIdentificaciones,
          'Cuenta', p.codigoAlterno || '-'
        ]],
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25, fillColor: [240, 240, 240] },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 25, fillColor: [240, 240, 240] },
          3: { cellWidth: 35 },
          4: { fontStyle: 'bold', cellWidth: 25, fillColor: [240, 240, 240] },
          5: { cellWidth: 'auto' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      if (this.sujetosSolidarios.length) {
        const solidarioNombres = this.sujetosSolidarios.map(s => s.Nombre || '-').join(', ');
        const solidarioIdentificaciones = this.sujetosSolidarios.map(s => s.NumeroIdentificacion || '-').join(', ');

        autoTable(doc, {
          startY: currentY,
          ...commonTableStyles,
          head: [['Deudores Solidarios', 'Información']],
          body: [['Nombres', solidarioNombres], ['Identificación', solidarioIdentificaciones]],
          columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (this.otrosSujetos.length) {
        const otrosSujetosBody = this.otrosSujetos.flatMap(s => [
          [`${s.Tipo || 'Otro'} - Nombre`, s.Nombre || '-'],
          [`${s.Tipo || 'Otro'} - ID`, s.NumeroIdentificacion || '-'],
        ]);

        autoTable(doc, {
          startY: currentY,
          ...commonTableStyles,
          head: [['Otros Sujetos', 'Detalle']],
          body: otrosSujetosBody,
          columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      autoTable(doc, {
        startY: currentY,
        ...commonTableStyles,
        head: [['Campo', 'Valor']],
        body: [
          ['Clase de proceso', this.clasePipe.transform(p.claseProceso) || ''],
          ['Etapa procesal', p.etapaProcesal || ''],
          ['Estado', p.estado || ''],
          ['Regional', p.regional || ''],
          ['Tema', p.tema || ''],
          ['Fecha creación', p.fechaCreacion || ''],
          ['Fecha entrega abogado', p.fechaEntregaAbogado || ''],
          ['Fecha admisión', p.fechaAdmisionDemanda || ''],
          ['Fecha recepción', p.fechaRecepcionProceso || ''],
          ['Calificación', p.calificacion || ''],
          ['Sentencia 1ra Inst.', p.sentenciaPrimeraInstanciaResultado || ''],
        ],
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;

      if (p.actuacionesRecientes && p.actuacionesRecientes.length > 0) {
        if (currentY > 180) { doc.addPage(); currentY = 20; }

        doc.setFont('helvetica', 'bold');
        doc.text('HISTÓRICO DE ACTUACIONES', margin, currentY);
        currentY += 5;

        const actuacionesBody = p.actuacionesRecientes.map(act => [
          this.formatDate(act.fecha),
          act.cuaderno || '-',
          act.tipo || '-',
          act.observacion || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          ...commonTableStyles,
          head: [['Fecha', 'Cuaderno', 'Actuación', 'Detalle/Anotación']],
          body: actuacionesBody,
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 20 },
            2: { cellWidth: 45, fontStyle: 'bold' },
            3: { cellWidth: 'auto' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              data.cell.styles.fontSize = 7;
            }
          }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (currentY > 170) { doc.addPage(); currentY = 20; }

      const abogadosBody: any[] = [['Abogado Principal', this.abogadoPrincipal?.Nombre || 'Sin asignar']];

      if (this.abogadosInternos.length) {
        const internos = this.abogadosInternos.map(ab => ab.Nombre || '-').join(', ');
        abogadosBody.push(['Abogados Internos', internos]);
      }

      this.otrosAbogados.forEach(ab => {
        abogadosBody.push([`${ab.ActuaComo || 'Otro Abogado'}`, ab.Nombre || '-']);
      });
      
      autoTable(doc, {
        startY: currentY,
        ...commonTableStyles,
        head: [['Rol', 'Nombre del Abogado']],
        body: abogadosBody,
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10; 


      if (this.medidas.length) {
        this.medidas.forEach((m, idx) => {
          if (currentY > 170) { doc.addPage(); currentY = 20; } 

          autoTable(doc, {
            startY: currentY,
            ...commonTableStyles,
            head: [[`Medida Cautelar #${idx + 1}`, 'Detalle']],
            body: [
              ['Tipo medida', m.tipoMedida || ''],
              ['Estado medida', m.medidaEfectiva || ''],
              ['Sujeto', m.sujeto || ''],
              ['Tipo bien', m.tipoBien || ''],
              ['Avalúo judicial', m.avaluoJudicial ?? ''],
              ['Observaciones', m.observaciones || ''],
            ],
            columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } }
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
        });
      }

      const fileName = `PROCESO ${p.idProceso || 'detalle'}.pdf`;
      doc.save(fileName);
 
      AffiAlert.fire({
        icon: 'success',
        title: 'PDF generado',
        text: 'Proceso descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error(error);
      AffiAlert.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el PDF. Intenta nuevamente.', confirmButtonText: 'Cerrar' });
    } finally {
      this.exportState = 'idle';
    }
  }
}