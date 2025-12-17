import { Component, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { FormsModule } from '@angular/forms';
import { RedelexService, InformeInmobiliaria } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';
import { AffiAlert } from '../../../../shared/services/affi-alert';

registerLocaleData(localeEsCo, 'es-CO');

interface DemandanteOption {
  nombre: string;
  identificacion: string;
}

// --- CONFIGURACIÓN CENTRALIZADA SEGÚN IMAGEN DE EXCEL ---
interface EtapaConfig {
  triggers: string[]; // Nombres que vienen de la BD
  summaryTitle: string; // Nombre para mostrar en las cajitas de resumen
  colorHex: string; // Color Hex con #
  desc: string; // Descripción para el resumen
}

const ETAPAS_CONFIG: EtapaConfig[] = [
  {
    triggers: ['ALISTAMIENTO MES', 'ALISTAMIENTO MESES ANTERIORES', 'DOCUMENTACION COMPLETA', 'ASIGNACION'],
    summaryTitle: 'RECOLECCION Y VALIDACION DOCUMENTAL',
    colorHex: '#FFFF99',
    desc: 'Se está completando y revisando la información necesaria para iniciar los procesos.'
  },
  {
    triggers: ['DEMANDA'],
    summaryTitle: 'DEMANDA',
    colorHex: '#F1A983',
    desc: 'Hemos iniciado el proceso judicial.'
  },
  {
    triggers: ['MANDAMIENTO DE PAGO'],
    summaryTitle: 'MANDAMIENTO DE PAGO',
    colorHex: '#FBE2D5',
    desc: 'El juez acepta tramitar la demanda'
  },
  {
    triggers: ['ADMISION DEMANDA'],
    summaryTitle: 'ADMISION DEMANDA',
    colorHex: '#92D050',
    desc: 'El juez acepta tramitar la demanda'
  },
  {
    triggers: ['NOTIFICACION'],
    summaryTitle: 'NOTIFICACION',
    colorHex: '#B5E6A2',
    desc: 'Etapa en la que se comunica la existencia del proceso.'
  },
  {
    triggers: ['EXCEPCIONES'],
    summaryTitle: 'EXCEPCIONES',
    colorHex: '#00B0F0',
    desc: 'Demandado presentó objeciones a la demanda'
  },
  {
    triggers: ['AUDIENCIA'],
    summaryTitle: 'AUDIENCIA',
    colorHex: '#C0E6F5',
    desc: 'Diligencia donde el juez escucha a las partes.'
  },
  {
    triggers: ['SENTENCIA'],
    summaryTitle: 'SENTENCIA',
    colorHex: '#D86DCD',
    desc: 'El juez decidió sobre la demanda.'
  },
  {
    triggers: ['LIQUIDACION', 'AVALUO DE BIENES', 'REMATE'],
    summaryTitle: 'LIQUIDACION',
    colorHex: '#E49EDD',
    desc: 'Etapa en la que se cuantifica con exactitud las obligaciones.'
  },
  {
    triggers: ['LANZAMIENTO'],
    summaryTitle: 'LANZAMIENTO',
    colorHex: '#FFC000',
    desc: 'Se está gestionando el desalojo de los inquilinos.'
  },
  {
    triggers: ['TERMINACION', 'TERMINADO DESISTIMIENTO'],
    summaryTitle: 'TERMINACION',
    colorHex: '#FF6D6D',
    desc: 'Terminación del proceso'
  }
];

@Component({
  selector: 'app-informe-inmobiliaria',
  standalone: true,
  imports: [CommonModule, FormsModule, ClaseProcesoPipe],
  providers: [DatePipe, ClaseProcesoPipe],
  templateUrl: './informe-inmobiliaria.html',
  styleUrls: ['./informe-inmobiliaria.scss']
})

export class InformeInmobiliariaComponent implements OnInit {
  private redelexService = inject(RedelexService);
  private elementRef = inject(ElementRef);
  private datePipe = inject(DatePipe);
  private titleService = inject(Title);
  private clasePipe = inject(ClaseProcesoPipe);

  ngOnInit(): void {
    this.titleService.setTitle('Estados Procesales - Informe Inmobiliaria');
    this.loadInforme();
  }

  // --- ESTADÍSTICAS KPI (NUEVO) ---
  stats = {
    total: 0,
    topClase: 'N/A',
    topClaseCount: 0,
    topClasePct: 0,
    topEtapa: 'N/A',
    topEtapaCount: 0,
    topEtapaPct: 0,
    activos: 0,
    terminados: 0,
    pctActivos: 0,
    pctTerminados: 0
  };

  exportState: 'idle' | 'excel' | 'pdf' = 'idle';

  readonly INFORME_ID = 5626;
  loading = true;
  error = '';
  
  rawData: InformeInmobiliaria[] = [];
  filteredData: InformeInmobiliaria[] = [];

  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50, 100];
  
  showExportModal = false;
  exportColumns = [
    { key: 'idProceso', label: 'ID Proceso', selected: true },
    { key: 'claseProceso', label: 'Clase Proceso', selected: true },
    { key: 'numeroRadicacion', label: 'Número Radicación', selected: true },
    { key: 'demandadoIdentificacion', label: 'Identificación Demandado', selected: true },
    { key: 'demandadoNombre', label: 'Nombre Demandado', selected: true },
    { key: 'codigoAlterno', label: 'Número Cuenta', selected: true },
    { key: 'etapaProcesal', label: 'Etapa Procesal', selected: true },
    { key: 'fechaRecepcionProceso', label: 'Fecha Presentación Demanda', selected: true },
    { key: 'sentenciaPrimeraInstancia', label: 'Fallo Sentencia', selected: true },
    { key: 'despacho', label: 'Despacho', selected: true },
    { key: 'ciudadInmueble', label: 'Ciudad', selected: true },
  ];

  listaEtapas: string[] = [];
  listaClaseProceso: string[] = [];
  listaDespachos: string[] = [];
  listaDemandantes: DemandanteOption[] = [];

  filtros = {
    busquedaGeneral: '', 
    claseProceso: '',
    identificacion: '',
    nombre: '',
    despacho: '',
    etapa: '',
    demandante: null as DemandanteOption | null
  };

  activeDropdown: string | null = null;
  searchClase = '';
  searchEtapa = '';
  searchDespacho = '';
  searchDemandante = '';
  mostrarFiltros = true;

  get filteredClaseList() { return this.listaClaseProceso.filter(c => c.toLowerCase().includes(this.searchClase.toLowerCase())); }
  get filteredEtapaList() { return this.listaEtapas.filter(e => e.toLowerCase().includes(this.searchEtapa.toLowerCase())); }
  get filteredDespachoList() { return this.listaDespachos.filter(d => d.toLowerCase().includes(this.searchDespacho.toLowerCase())); }
  
  get filteredDemandanteList() {
    const term = this.searchDemandante.toLowerCase();
    return this.listaDemandantes.filter(d => 
      d.nombre.toLowerCase().includes(term) || d.identificacion.includes(term)
    );
  }
  
  get paginatedData(): InformeInmobiliaria[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }
  get totalPages(): number { return Math.ceil(this.filteredData.length / this.itemsPerPage); }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.activeDropdown = null;
    }
  }

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    if (this.activeDropdown === name) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = name;
      this.searchClase = '';
      this.searchEtapa = '';
      this.searchDespacho = '';
      this.searchDemandante = '';
    }
  }

  selectOption(field: 'claseProceso' | 'etapa' | 'despacho', value: string) {
    this.filtros[field] = value;
    this.activeDropdown = null;
    this.applyFilters();
  }

  selectDemandante(value: DemandanteOption | null) {
    this.filtros.demandante = value;
    this.activeDropdown = null;
    this.applyFilters();
  }

  selectPageSize(size: number) {
    this.itemsPerPage = size;
    this.changeItemsPerPage();
    this.activeDropdown = null;
  }

  loadInforme() {
    this.loading = true;
    this.redelexService.getInformeInmobiliaria(this.INFORME_ID).subscribe({
      next: (response) => {
        const datosLimpios = (response.data || []).map(item => {
          const newItem = { ...item };
          if (newItem.demandadoNombre && newItem.demandadoNombre.includes(',')) {
            newItem.demandadoNombre = newItem.demandadoNombre.split(',')[0].trim();
          }
          if (newItem.demandadoIdentificacion && newItem.demandadoIdentificacion.includes(',')) {
            newItem.demandadoIdentificacion = newItem.demandadoIdentificacion.split(',')[0].trim();
          }
          if (newItem.demandanteNombre && newItem.demandanteNombre.includes(',')) {
            newItem.demandanteNombre = newItem.demandanteNombre.split(',')[0].trim();
          }
          return newItem;
        });
        
        this.rawData = datosLimpios;
        this.filteredData = datosLimpios;
        this.extraerListasUnicas();
        this.calculateStats(); // <--- CÁLCULO DE KPIs
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar la información.';
        this.loading = false;
      }
    });
  }

  // --- LÓGICA DE CÁLCULO DE KPIs (NUEVO) ---
  calculateStats() {
    const data = this.rawData; // Estadísticas Globales (Base completa)
    const total = data.length;
    this.stats.total = total;
    
    if (total === 0) return;

    // 1. Clase más común
    const claseCounts: Record<string, number> = {};
    data.forEach(d => {
      const c = this.clasePipe.transform(d.claseProceso) || 'Sin Clase';
      claseCounts[c] = (claseCounts[c] || 0) + 1;
    });
    const topClaseArr = Object.entries(claseCounts).sort((a,b) => b[1] - a[1]);
    if (topClaseArr.length > 0) {
      this.stats.topClase = topClaseArr[0][0];
      this.stats.topClaseCount = topClaseArr[0][1];
      this.stats.topClasePct = Math.round((topClaseArr[0][1] / total) * 100);
    }

    // 2. Etapa más frecuente
    const etapaCounts: Record<string, number> = {};
    data.forEach(d => {
      const e = d.etapaProcesal || 'Sin Etapa';
      etapaCounts[e] = (etapaCounts[e] || 0) + 1;
    });
    const topEtapaArr = Object.entries(etapaCounts).sort((a,b) => b[1] - a[1]);
    if (topEtapaArr.length > 0) {
      this.stats.topEtapa = topEtapaArr[0][0];
      this.stats.topEtapaCount = topEtapaArr[0][1];
      this.stats.topEtapaPct = Math.round((topEtapaArr[0][1] / total) * 100);
    }

    // 3. Activos vs Terminados
    // Usamos ETAPAS_CONFIG para identificar cuáles son de terminación
    const termConfig = ETAPAS_CONFIG.find(c => c.summaryTitle === 'TERMINACION');
    const termTriggers = termConfig ? termConfig.triggers : [];
    
    const terminados = data.filter(d => termTriggers.includes(d.etapaProcesal ? d.etapaProcesal.toUpperCase() : '')).length;
    const activos = total - terminados;

    this.stats.activos = activos;
    this.stats.terminados = terminados;
    this.stats.pctActivos = Math.round((activos / total) * 100);
    this.stats.pctTerminados = Math.round((terminados / total) * 100);
  }

  extraerListasUnicas() {
    const etapasSet = new Set<string>();
    const despachosSet = new Set<string>();
    const clasesSet = new Set<string>();
    const demandantesMap = new Map<string, DemandanteOption>();

    this.rawData.forEach(item => {
      if (item.etapaProcesal) etapasSet.add(item.etapaProcesal);
      if (item.despacho) despachosSet.add(item.despacho);
      
      if (item.claseProceso) {
        clasesSet.add(this.clasePipe.transform(item.claseProceso));
      }

      if (item.demandanteIdentificacion && item.demandanteNombre) {
        if (!demandantesMap.has(item.demandanteIdentificacion)) {
          demandantesMap.set(item.demandanteIdentificacion, {
            nombre: item.demandanteNombre,
            identificacion: item.demandanteIdentificacion
          });
        }
      }
    });

    this.listaEtapas = Array.from(etapasSet).sort();
    this.listaDespachos = Array.from(despachosSet).sort();
    this.listaClaseProceso = Array.from(clasesSet).sort();
    this.listaDemandantes = Array.from(demandantesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  applyFilters() {
    this.currentPage = 1;
    this.filteredData = this.rawData.filter(item => {
      if (this.filtros.busquedaGeneral) {
        const term = this.filtros.busquedaGeneral.toLowerCase();
        const claseTransformada = this.clasePipe.transform(item.claseProceso).toLowerCase();

        const generalMatch = 
          item.demandadoNombre?.toLowerCase().includes(term) ||
          item.demandanteNombre?.toLowerCase().includes(term) ||
          item.demandadoIdentificacion?.includes(term) ||
          item.demandanteIdentificacion?.includes(term) ||
          item.numeroRadicacion?.includes(term) ||
          item.despacho?.toLowerCase().includes(term) ||
          item.ciudadInmueble?.toLowerCase().includes(term) ||
          item.etapaProcesal?.toLowerCase().includes(term) ||
          claseTransformada.includes(term);
        if (!generalMatch) return false;
      }

      if (this.filtros.identificacion && !item.demandadoIdentificacion?.includes(this.filtros.identificacion.trim())) return false;
      if (this.filtros.nombre && !item.demandadoNombre?.toLowerCase().includes(this.filtros.nombre.toLowerCase().trim())) return false;
      
      if (this.filtros.etapa && item.etapaProcesal !== this.filtros.etapa) return false;
      if (this.filtros.despacho && item.despacho !== this.filtros.despacho) return false;
      
      if (this.filtros.claseProceso) {
        const valTransformado = this.clasePipe.transform(item.claseProceso);
        if (valTransformado !== this.filtros.claseProceso) return false;
      }

      if (this.filtros.demandante && item.demandanteIdentificacion !== this.filtros.demandante.identificacion) {
        return false;
      }

      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = { 
      busquedaGeneral: '', 
      claseProceso: '', 
      identificacion: '', 
      nombre: '', 
      despacho: '', 
      etapa: '',
      demandante: null 
    };
    this.applyFilters();
  }
  
  toggleFiltros() { this.mostrarFiltros = !this.mostrarFiltros; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  changeItemsPerPage() { this.currentPage = 1; }

  openExportModal() { this.showExportModal = true; }
  closeExportModal() { this.showExportModal = false; }
  toggleColumn(colKey: string) {
    const col = this.exportColumns.find(c => c.key === colKey);
    if (col) col.selected = !col.selected;
  }
  selectAllColumns(select: boolean) { this.exportColumns.forEach(c => c.selected = select); }

  private getReportInmobiliariaName(): string {
    return this.filtros.demandante ? this.filtros.demandante.nombre : 'TODAS LAS INMOBILIARIAS';
  }

  private getReportInmobiliariaNit(): string {
    return this.filtros.demandante ? this.filtros.demandante.identificacion : 'N/A';
  }

  getEtapaConfig(nombreEtapa: string | undefined): EtapaConfig | undefined {
    if (!nombreEtapa) return undefined;
    const nombreNormalizado = nombreEtapa.toUpperCase();
    return ETAPAS_CONFIG.find(conf => conf.triggers.includes(nombreNormalizado));
  }

  getDynamicCounts() {
    return ETAPAS_CONFIG.map(config => {
      const count = this.filteredData.filter(item => {
        const etapa = item.etapaProcesal ? item.etapaProcesal.toUpperCase() : '';
        return config.triggers.includes(etapa);
      }).length;

      return {
        ...config,
        count
      };
    });
  }

  get hasSelectedColumns(): boolean {
    return this.exportColumns.some(col => col.selected);
  }

  async exportToExcel() {
    if (!this.hasSelectedColumns) {
      AffiAlert.fire({
        icon: 'warning',
        title: 'Selecciona columnas',
        text: 'Debes seleccionar al menos una columna para exportar.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Informe Estado Procesal');
      const summaryData = this.getDynamicCounts();

      const colSpans: { [key: string]: number } = {
        'numeroRadicacion': 2, 'demandadoNombre': 2, 'despacho': 2, 
      };
      const UNIFORM_WIDTH = 22; 
      
      let totalPhysicalColumns = 0;
      activeColumns.forEach(col => { totalPhysicalColumns += (colSpans[col.key] || 1); });
      for (let i = 1; i <= 50; i++) { sheet.getColumn(i).width = UNIFORM_WIDTH; }

      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 90, height: 90 } });

      const titleEndCol = Math.max(10, totalPhysicalColumns); 
      sheet.mergeCells(2, 3, 2, titleEndCol);
      const titleCell = sheet.getCell(2, 3);
      titleCell.value = 'INFORME ESTADO PROCESAL - TODOS LOS PROCESOS';
      titleCell.font = { bold: true, size: 14, name: 'Calibri' };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells(3, 3, 3, titleEndCol);
      const dateCell = sheet.getCell(3, 3);
      dateCell.value = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO');
      dateCell.font = { size: 11, name: 'Calibri', color: { argb: 'FF555555' } };
      dateCell.alignment = { horizontal: 'center' };

      const setInfo = (row: number, text: string) => {
        sheet.mergeCells(row, 1, row, 3);
        const c = sheet.getCell(row, 1);
        c.value = text;
        c.font = { bold: true, size: 10, name: 'Calibri' };
      };
      setInfo(6, `Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`);
      setInfo(8, `NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`);
      setInfo(10, `Cantidad de procesos: ${this.filteredData.length}`);

      const splitIndex = 6; 
      const row1Data = summaryData.slice(0, splitIndex);
      const row2Data = summaryData.slice(splitIndex);

      const drawBoxRow = (startRow: number, datos: any[]) => {
        let currentBoxCol = 4;
        datos.forEach(box => {
          const argbColor = 'FF' + box.colorHex.replace('#', ''); 
          const cellTitle = sheet.getCell(startRow, currentBoxCol);
          cellTitle.value = box.summaryTitle;
          cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
          cellTitle.font = { bold: true, size: 8, name: 'Calibri' };
          cellTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellTitle.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          sheet.mergeCells(startRow + 1, currentBoxCol, startRow + 2, currentBoxCol);
          const cellDesc = sheet.getCell(startRow + 1, currentBoxCol);
          cellDesc.value = box.desc;
          cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
          cellDesc.font = { size: 7, name: 'Calibri' };
          cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellDesc.border = { left: {style:'thin'}, right: {style:'thin'} };

          const cellCount = sheet.getCell(startRow + 3, currentBoxCol);
          cellCount.value = box.count; 
          cellCount.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
          cellCount.font = { bold: true, size: 11, name: 'Calibri' };
          cellCount.alignment = { horizontal: 'center', vertical: 'middle' };
          cellCount.border = { bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          currentBoxCol++;
        });
      };

      drawBoxRow(6, row1Data);
      if (row2Data.length > 0) {
        drawBoxRow(11, row2Data);
      }

      const tableStartRow = row2Data.length > 0 ? 16 : 11; 
      const headerRow = sheet.getRow(tableStartRow);
      let currentPhysicalCol = 1;

      activeColumns.forEach((col) => {
        const span = colSpans[col.key] || 1;
        if (span > 1) { sheet.mergeCells(tableStartRow, currentPhysicalCol, tableStartRow, currentPhysicalCol + span - 1); }

        const cell = sheet.getCell(tableStartRow, currentPhysicalCol);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: {style:'thin', color: {argb:'FFFFFFFF'}}, left: {style:'thin', color: {argb:'FFFFFFFF'}}, right: {style:'thin', color: {argb:'FFFFFFFF'}} };
        currentPhysicalCol += span;
      });

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };

      this.filteredData.forEach((item, index) => {
        const currentRowIndex = tableStartRow + 1 + index;
        let rowPhysicalCol = 1;

        activeColumns.forEach((col) => {
          const span = colSpans[col.key] || 1;
          let val = item[col.key as keyof InformeInmobiliaria];
          
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val as string);

          if (span > 1) { sheet.mergeCells(currentRowIndex, rowPhysicalCol, currentRowIndex, rowPhysicalCol + span - 1); }

          const cell = sheet.getCell(currentRowIndex, rowPhysicalCol);
          cell.value = val || '';
          cell.font = { size: 8, name: 'Calibri', color: { argb: 'FF333333' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle;

          if (col.key === 'etapaProcesal') {
             const config = this.getEtapaConfig(item.etapaProcesal);
             if (config) {
               const argbColor = 'FF' + config.colorHex.replace('#', '');
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
             }
          }
          rowPhysicalCol += span;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

      AffiAlert.fire({
        icon: 'success',
        title: 'Excel generado',
        text: 'El archivo se ha descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error Excel:', error);
      AffiAlert.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el archivo Excel.', confirmButtonText: 'Cerrar' });
    } finally {
      this.exportState = 'idle';
    }
  }

  private saveFile(buffer: any, extension: string) {
    const blob = new Blob([buffer], { type: extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `INFORME INMOBILIARIA ${this.getReportInmobiliariaName()}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async exportToPdf() { 
    if (!this.hasSelectedColumns) {
      AffiAlert.fire({ icon: 'warning', title: 'Selecciona columnas', text: 'Debes seleccionar al menos una columna para exportar.', confirmButtonText: 'Entendido' });
      return;
    }

    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const etapaColIndex = activeColumns.findIndex(c => c.key === 'etapaProcesal');
      const summaryData = this.getDynamicCounts();

      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [255, 255, 255];
      };

      const doc = new jsPDF('landscape', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.width; 
      const margin = 5; 
      const usableWidth = pageWidth - (margin * 2);

      const doubleColumns = ['numeroRadicacion', 'demandadoNombre', 'despacho'];
      let totalUnits = 0;
      activeColumns.forEach(c => { totalUnits += doubleColumns.includes(c.key) ? 2 : 1; });
      const unitWidth = usableWidth / totalUnits;

      const dynamicColumnStyles: { [key: number]: any } = {};
      activeColumns.forEach((col, index) => {
        const weight = doubleColumns.includes(col.key) ? 2 : 1;
        dynamicColumnStyles[index] = { cellWidth: unitWidth * weight, overflow: 'linebreak' };
      });

      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 5, 20, 20);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('INFORME ESTADO PROCESAL - TODOS LOS PROCESOS', pageWidth / 2, 10, { align: 'center' });
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 15, { align: 'center' });

      const infoY = 28;
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text(`Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`, margin, infoY);
      doc.text(`NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`, margin, infoY + 4);
      doc.text(`Cantidad de procesos: ${this.filteredData.length}`, margin, infoY + 8);

      const boxWidth = 42; 
      const boxHeight = 22; 
      const boxGap = 4;
      
      const drawPDFBoxRow = (y: number, items: any[]) => {
        const numBoxes = items.length;
        const totalBlockWidth = (numBoxes * boxWidth) + ((numBoxes - 1) * boxGap);
        const startX = margin + (usableWidth - totalBlockWidth) / 2;

        items.forEach((item, i) => {
          const x = startX + (i * (boxWidth + boxGap)); 
          const rgb = hexToRgb(item.colorHex);

          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(x, y, boxWidth, boxHeight, 'F');
          doc.setDrawColor(100); doc.setLineWidth(0.1);
          doc.rect(x, y, boxWidth, boxHeight, 'S');

          doc.setTextColor(0);
          doc.setFontSize(6); doc.setFont('helvetica', 'bold');
          doc.text(item.summaryTitle, x + (boxWidth/2), y + 4, { align: 'center', maxWidth: boxWidth - 4 }); 

          doc.setFontSize(5); doc.setFont('helvetica', 'normal');
          doc.text(item.desc, x + (boxWidth/2), y + 11, { align: 'center', maxWidth: boxWidth - 4 });

          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); 
          doc.text(item.count.toString(), x + (boxWidth/2), y + 18, { align: 'center' });
        });
      };

      const splitIndex = 6; 
      const row1Data = summaryData.slice(0, splitIndex);
      const row2Data = summaryData.slice(splitIndex);
      
      let currentY = 42; 

      drawPDFBoxRow(currentY, row1Data);
      
      if (row2Data.length > 0) {
        currentY += boxHeight + boxGap;
        drawPDFBoxRow(currentY, row2Data);
      }

      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key as keyof InformeInmobiliaria];
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val as string);
          return val || '';
        });
      });

      const tableStartY = currentY + boxHeight + 4; 

      autoTable(doc, {
        startY: tableStartY, 
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1, valign: 'middle', halign: 'center', overflow: 'linebreak', lineWidth: 0.1, lineColor: [180, 180, 180], textColor: [0, 0, 0] },
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6, lineWidth: 0.1, lineColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        columnStyles: dynamicColumnStyles,
        didParseCell: (data) => {
          if (data.section === 'body' && etapaColIndex !== -1 && data.column.index === etapaColIndex) {
            const rawEtapa = data.cell.raw as string;
            const config = this.getEtapaConfig(rawEtapa);
            
            if (config) {
              const rgb = hexToRgb(config.colorHex);
              data.cell.styles.fillColor = rgb;
            }
          }
        }
      });

    doc.save(`INFORME INMOBILIARIA ${this.getReportInmobiliariaName()}.pdf`);
    this.closeExportModal();

    AffiAlert.fire({ icon: 'success', title: 'PDF generado', text: 'El archivo se ha descargado correctamente.', timer: 2000, showConfirmButton: false });

    } catch (error) {
      console.error('Error PDF:', error);
      AffiAlert.fire({ icon: 'error', title: 'Error al exportar', text: 'No se pudo generar el archivo PDF.', confirmButtonText: 'Cerrar' });
    } finally {
      this.exportState = 'idle';
    }
  }
}