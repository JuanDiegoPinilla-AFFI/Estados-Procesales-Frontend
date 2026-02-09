import { Component, OnInit, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import type * as ExcelJS from 'exceljs';

registerLocaleData(localeEsCo, 'es-CO');

interface EtapaConfig {
  id: number;
  nombreInterno: string[];
  color: string;
  colorRGB: [number, number, number];
  nombreCliente: string;
  definicion: string;
}

const ETAPAS_MASTER: EtapaConfig[] = [
  { 
    id: 1, 
    nombreInterno: ['ALISTAMIENTO', 'DOCUMENTACION', 'ASIGNACION'], 
    color: 'FFFFFF99', colorRGB: [255, 255, 153],
    nombreCliente: 'RECOLECCION Y VALIDACION DOCUMENTAL', 
    definicion: 'Se está completando y revisando la información necesaria para iniciar los procesos.' 
  },
  { 
    id: 2, 
    nombreInterno: ['DEMANDA'], 
    color: 'FFF1A983', colorRGB: [241, 169, 131],
    nombreCliente: 'DEMANDA', 
    definicion: 'Hemos iniciado el proceso judicial.' 
  },
  { 
    id: 3, 
    nombreInterno: ['MANDAMIENTO'], 
    color: 'FFFBE2D5', colorRGB: [251, 226, 213],
    nombreCliente: 'MANDAMIENTO DE PAGO', 
    definicion: 'El juez ordena el pago de la obligación.' 
  },
  { 
    id: 4, 
    nombreInterno: ['ADMISION'], 
    color: 'FF92D050', colorRGB: [146, 208, 80],
    nombreCliente: 'ADMISION DEMANDA', 
    definicion: 'El juez acepta tramitar la demanda de restitución.' 
  },
  { 
    id: 5, 
    nombreInterno: ['NOTIFICACION', 'EMPLAZAMIENTO'], 
    color: 'FFB5E6A2', colorRGB: [181, 230, 162],
    nombreCliente: 'NOTIFICACION', 
    definicion: 'Etapa en la que se comunica la existencia del proceso.' 
  },
  { 
    id: 6, 
    nombreInterno: ['EXCEPCIONES', 'CONTESTACION'], 
    color: 'FF00B0F0', colorRGB: [0, 176, 240],
    nombreCliente: 'EXCEPCIONES', 
    definicion: 'El demandado presentó objeciones o contestó la demanda.' 
  },
  { 
    id: 7, 
    nombreInterno: ['AUDIENCIA'], 
    color: 'FFC0E6F5', colorRGB: [192, 230, 245],
    nombreCliente: 'AUDIENCIA', 
    definicion: 'Diligencia donde el juez escucha a las partes.' 
  },
  { 
    id: 8, 
    nombreInterno: ['SENTENCIA'], 
    color: 'FFD86DCD', colorRGB: [216, 109, 205],
    nombreCliente: 'SENTENCIA', 
    definicion: 'El juez decidió sobre la demanda.' 
  },
  { 
    id: 9, 
    nombreInterno: ['LIQUIDACION', 'AVALUO', 'REMATE'], 
    color: 'FFE49EDD', colorRGB: [228, 158, 221],
    nombreCliente: 'LIQUIDACION', 
    definicion: 'Etapa en la que se cuantifica la deuda, se avalúan bienes o se realiza el remate.' 
  },
  { 
    id: 10, 
    nombreInterno: ['LANZAMIENTO', 'ENTREGA'], 
    color: 'FFFFC000', colorRGB: [255, 192, 0],
    nombreCliente: 'LANZAMIENTO', 
    definicion: 'Se está gestionando la restitución o entrega del inmueble.' 
  },
];

@Component({
  selector: 'app-mis-procesos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ClaseProcesoPipe],
  providers: [DatePipe, ClaseProcesoPipe],
  templateUrl: './mis-procesos.html',
  styleUrls: ['./mis-procesos.scss']
})
export class MisProcesosComponent implements OnInit {
  private redelexService = inject(RedelexService);
  private titleService = inject(Title);
  private datePipe = inject(DatePipe);
  private elementRef = inject(ElementRef);
  private clasePipe = inject(ClaseProcesoPipe);

  rawData: any[] = [];
  filteredData: any[] = [];
  listaEtapas: string[] = [];
  loading = true;
  error = '';
  
  identificacionUsuario = '';
  nombreInmobiliaria = '';

  mostrarFiltros = true;

  stats = {
    total: 0,
    topClase: 'N/A',
    topClaseCount: 0,
    topClasePct: 0,
    topEtapa: 'N/A',
    topEtapaCount: 0,
    topEtapaPct: 0,
    topCiudad: 'N/A',
    topCiudadCount: 0,
    topCiudadPct: 0,
  };

  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50, 100];

  filtros = {
    busquedaGeneral: '',
    claseProceso: '',
    etapa: '',
    radicado: '',       
    idDemandado: '',    
    nombreDemandado: '' 
  };
  
  listaClaseProceso: string[] = [];
  activeDropdown: string | null = null;
  showExportModal = false;
  exportState: 'idle' | 'excel' | 'pdf' = 'idle';

  exportColumns = [
    { key: 'procesoId', label: 'ID Proceso', selected: true },
    { key: 'claseProceso', label: 'Clase', selected: true },
    { key: 'numeroRadicacion', label: 'Radicado', selected: true },
    { key: 'demandadoNombre', label: 'Nombre Demandado', selected: true },
    { key: 'demandadoIdentificacion', label: 'ID Demandado', selected: true },
    { key: 'despacho', label: 'Despacho', selected: true },
    { key: 'sentencia', label: 'Sentencia', selected: true },
    { key: 'etapaProcesal', label: 'Etapa', selected: true },
    { key: 'sentenciaPrimeraInstancia', label: 'Sentencia 1ra', selected: true },
    { key: 'fechaRecepcionProceso', label: 'Fecha Presentación', selected: true },
    { key: 'ciudadInmueble', label: 'Ciudad', selected: true },
  ];

  ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Mis Procesos');
    this.cargarMisProcesos();
  }

  getEtapaDisplay(etapaRaw: string): string {
    const etapaNormalizada = etapaRaw ? etapaRaw.toUpperCase().trim() : '';
    
    if (etapaNormalizada.includes('TERMINA') || etapaNormalizada.includes('DESISTIMIENTO')) {
      return 'No se muestran al cliente';
    }

    const found = ETAPAS_MASTER.find(e => 
      e.nombreInterno.some(k => etapaNormalizada.includes(k))
    );

    return found ? found.nombreCliente : (etapaRaw || 'EN TRÁMITE');
  }

  cargarMisProcesos() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        this.identificacionUsuario = res.identificacion;
        this.nombreInmobiliaria = res.nombreInmobiliaria || '';

        const rawProcesos = res.procesos || [];
        const datosLimpios = rawProcesos.map((item: any) => {
          const p = { ...item };

          if (p.demandadoNombre?.includes(',')) p.demandadoNombre = p.demandadoNombre.split(',')[0].trim();
          if (p.demandadoIdentificacion?.includes(',')) p.demandadoIdentificacion = p.demandadoIdentificacion.split(',')[0].trim();
          
          p.etapaProcesal = this.getEtapaDisplay(p.etapaProcesal);
          
          return p;
        });
        
        this.rawData = datosLimpios;
        this.extraerListasUnicas();
        this.calculateStats();
        this.applyFilters();
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los procesos.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  calculateStats() {
    const data = this.rawData;
    const total = data.length;
    this.stats.total = total;

    if (total === 0) return;

    const claseCounts: Record<string, number> = {};
    data.forEach(item => {
      const c = this.clasePipe.transform(item.claseProceso) || 'Sin Clase';
      claseCounts[c] = (claseCounts[c] || 0) + 1;
    });
    
    const sortedClases = Object.entries(claseCounts).sort((a,b) => b[1] - a[1]);
    if (sortedClases.length > 0) {
      this.stats.topClase = sortedClases[0][0];
      this.stats.topClaseCount = sortedClases[0][1];
      this.stats.topClasePct = Math.round((sortedClases[0][1] / total) * 100);
    }

    const etapaCounts: Record<string, number> = {};
    data.forEach(item => {
      const e = item.etapaProcesal || 'Sin Etapa';
      etapaCounts[e] = (etapaCounts[e] || 0) + 1;
    });

    const sortedEtapas = Object.entries(etapaCounts).sort((a,b) => b[1] - a[1]);
    if (sortedEtapas.length > 0) {
      this.stats.topEtapa = sortedEtapas[0][0];
      this.stats.topEtapaCount = sortedEtapas[0][1];
      this.stats.topEtapaPct = Math.round((sortedEtapas[0][1] / total) * 100);
    }

    const ciudadCounts: Record<string, number> = {};
    data.forEach(item => {
      const c = item.ciudadInmueble ? item.ciudadInmueble.trim() : 'Sin Ciudad';
      ciudadCounts[c] = (ciudadCounts[c] || 0) + 1;
    });

    const sortedCiudades = Object.entries(ciudadCounts).sort((a,b) => b[1] - a[1]);
    if (sortedCiudades.length > 0) {
      this.stats.topCiudad = sortedCiudades[0][0];
      this.stats.topCiudadCount = sortedCiudades[0][1];
      this.stats.topCiudadPct = Math.round((sortedCiudades[0][1] / total) * 100);
    }
  }

  extraerListasUnicas() {
    const clasesSet = new Set<string>();
    const etapasSet = new Set<string>();

    this.rawData.forEach(item => {
      if (item.claseProceso) clasesSet.add(this.clasePipe.transform(item.claseProceso));
      if (item.etapaProcesal) etapasSet.add(item.etapaProcesal);
    });

    this.listaClaseProceso = Array.from(clasesSet).sort();
    this.listaEtapas = Array.from(etapasSet).sort();
  }

  applyFilters() {
    this.currentPage = 1;
    this.filteredData = this.rawData.filter(item => {
      if (this.filtros.busquedaGeneral) {
        const term = this.filtros.busquedaGeneral.toLowerCase();
        const claseTransformada = this.clasePipe.transform(item.claseProceso).toLowerCase();
        const etapa = (item.etapaProcesal || '').toLowerCase();
        const match = 
          item.procesoId?.toString().includes(term) ||
          item.demandadoNombre?.toLowerCase().includes(term) ||
          item.demandadoIdentificacion?.includes(term) ||
          etapa.includes(term) ||
          item.numeroRadicacion?.toLowerCase().includes(term) ||
          claseTransformada.includes(term);
        if (!match) return false;
      }
      if (this.filtros.radicado && !item.numeroRadicacion?.toLowerCase().includes(this.filtros.radicado.toLowerCase())) return false;
      if (this.filtros.idDemandado && !item.demandadoIdentificacion?.includes(this.filtros.idDemandado)) return false;
      if (this.filtros.nombreDemandado && !item.demandadoNombre?.toLowerCase().includes(this.filtros.nombreDemandado.toLowerCase())) return false;
      if (this.filtros.claseProceso) {
        const valorFila = this.clasePipe.transform(item.claseProceso);
        if (valorFila !== this.filtros.claseProceso) return false;
      }
      if (this.filtros.etapa) {
      if (item.etapaProcesal !== this.filtros.etapa) return false;
    }
      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = { busquedaGeneral: '', claseProceso: '', etapa: '', radicado: '', idDemandado: '', nombreDemandado: '' };
    this.applyFilters();
  }

  toggleFiltros() { this.mostrarFiltros = !this.mostrarFiltros; }

  get paginatedData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }
  get totalPages() { return Math.ceil(this.filteredData.length / this.itemsPerPage); }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  selectPageSize(size: number) { this.itemsPerPage = size; this.currentPage = 1; this.activeDropdown = null; }

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  selectOption(type: 'clase' | 'etapa', value: string) {
    if (type === 'clase') {
      this.filtros.claseProceso = value;
    } else if (type === 'etapa') {
      this.filtros.etapa = value;
    }
    this.activeDropdown = null;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) this.activeDropdown = null;
  }

  openExportModal() { this.showExportModal = true; }
  closeExportModal() { this.showExportModal = false; }
  toggleColumn(key: string) { const col = this.exportColumns.find(c => c.key === key); if (col) col.selected = !col.selected; }
  selectAllColumns(select: boolean) { this.exportColumns.forEach(c => c.selected = select); }

  private contarEtapaDisplay(displayName: string): number {
    return this.filteredData.filter(item => {
      const etapa = item.etapaProcesal || '';
      return etapa === displayName;
    }).length;
  }

  get hasSelectedColumns(): boolean {
    return this.exportColumns.some(col => col.selected);
  }

  private getResumenBoxes() {
    return ETAPAS_MASTER.map(etapa => ({
      title: etapa.nombreCliente,
      desc: etapa.definicion,
      count: this.contarEtapaDisplay(etapa.nombreCliente),
      color: etapa.color,
      colorRGB: etapa.colorRGB
    }));
  }

  async exportToExcel() {
    if (!this.hasSelectedColumns) return;

    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const ExcelJSModule = await import('exceljs');
      const Excel = ExcelJSModule.default;
      const workbook = new Excel.Workbook();
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const sheet = workbook.addWorksheet('Mis Procesos');
      const allBoxes = this.getResumenBoxes();
      const midPoint = Math.ceil(allBoxes.length / 2);
      const datosFila1 = allBoxes.slice(0, midPoint);
      const datosFila2 = allBoxes.slice(midPoint);

      const colSpans: { [key: string]: number } = { 'numeroRadicacion': 2, 'demandadoNombre': 2, 'despacho': 2 };
      
      const UNIFORM_WIDTH = 22;
      for (let i = 1; i <= 50; i++) { sheet.getColumn(i).width = UNIFORM_WIDTH; }

      let totalPhysicalColumns = 0;
      activeColumns.forEach(col => { totalPhysicalColumns += (colSpans[col.key] || 1); });

      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 90, height: 90 } });

      const titleEndCol = Math.max(10, totalPhysicalColumns);
      sheet.mergeCells(2, 3, 2, titleEndCol);
      const titleCell = sheet.getCell(2, 3);
      titleCell.value = 'REPORTE MIS PROCESOS JURÍDICOS';
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
      setInfo(6, `NIT Asociado: ${this.identificacionUsuario}`);
      setInfo(8, `Inmobiliaria: ${this.nombreInmobiliaria || 'N/A'}`);
      setInfo(10, `Total Procesos: ${this.filteredData.length}`);

      const drawBoxRow = (startRow: number, datos: any[]) => {
        let currentBoxCol = 4;
        datos.forEach(box => {
          const cellTitle = sheet.getCell(startRow, currentBoxCol);
          cellTitle.value = box.title;
          cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellTitle.font = { bold: true, size: 8, name: 'Calibri' };
          cellTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellTitle.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          sheet.mergeCells(startRow + 1, currentBoxCol, startRow + 2, currentBoxCol);
          const cellDesc = sheet.getCell(startRow + 1, currentBoxCol);
          cellDesc.value = box.desc;
          cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellDesc.font = { size: 7, name: 'Calibri' };
          cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellDesc.border = { left: {style:'thin'}, right: {style:'thin'} };

          const cellCount = sheet.getCell(startRow + 3, currentBoxCol);
          cellCount.value = box.count;
          cellCount.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellCount.font = { bold: true, size: 11, name: 'Calibri' };
          cellCount.alignment = { horizontal: 'center', vertical: 'middle' };
          cellCount.border = { bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          currentBoxCol++;
        });
      };

      drawBoxRow(6, datosFila1);
      drawBoxRow(11, datosFila2);

      const tableStartRow = 16;
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
          let val = item[col.key];
          
          if (col.key.includes('fecha') || col.key.includes('Fecha')) val = this.datePipe.transform(val, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val);

          if (span > 1) { sheet.mergeCells(currentRowIndex, rowPhysicalCol, currentRowIndex, rowPhysicalCol + span - 1); }

          const cell = sheet.getCell(currentRowIndex, rowPhysicalCol);
          cell.value = val || '';
          cell.font = { size: 8, name: 'Calibri', color: { argb: 'FF333333' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle;

          if (col.key === 'etapaProcesal') {
            const etapaDisplay = val || '';
            const config = ETAPAS_MASTER.find(e => e.nombreCliente === etapaDisplay);
            if (config) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: config.color } };
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
      AffiAlert.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo Excel. Intenta nuevamente.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportToPdf() {
    if (!this.hasSelectedColumns) return;

    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const etapaColIndex = activeColumns.findIndex(c => c.key === 'etapaProcesal');
      const allBoxes = this.getResumenBoxes();
      const midPoint = Math.ceil(allBoxes.length / 2);
      const boxesRow1 = allBoxes.slice(0, midPoint);
      const boxesRow2 = allBoxes.slice(midPoint);
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
        dynamicColumnStyles[index] = { 
          cellWidth: unitWidth * weight, 
          overflow: 'linebreak'
        };
      });

      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 5, 20, 20);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('REPORTE MIS PROCESOS JURÍDICOS', pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 15, { align: 'center' });

      const infoY = 28;
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text(`NIT Asociado: ${this.identificacionUsuario}`, margin, infoY);
      doc.text(`Inmobiliaria: ${this.nombreInmobiliaria || 'N/A'}`, margin, infoY + 4);
      doc.text(`Total Procesos: ${this.filteredData.length}`, margin, infoY + 8);

      const numBoxes = 5;
      const boxGap = 4;
      const boxWidth = 52;
      const boxHeight = 14;
      const startBoxY = 42;

      const totalBlockWidth = (numBoxes * boxWidth) + ((numBoxes - 1) * boxGap);
      const startX = margin + (usableWidth - totalBlockWidth) / 2;

      const drawPDFBoxRow = (y: number, items: any[]) => {
        items.forEach((item, i) => {
          const x = startX + (i * (boxWidth + boxGap));
          doc.setFillColor(item.colorRGB[0], item.colorRGB[1], item.colorRGB[2]);
          doc.rect(x, y, boxWidth, boxHeight, 'F');
          doc.setDrawColor(100); doc.setLineWidth(0.1);
          doc.rect(x, y, boxWidth, boxHeight, 'S');

          doc.setTextColor(0);
          doc.setFontSize(6); doc.setFont('helvetica', 'bold');
          doc.text(item.title, x + (boxWidth/2), y + 3, { align: 'center' });

          doc.setFontSize(5); doc.setFont('helvetica', 'normal');
          doc.text(item.desc, x + (boxWidth/2), y + 6.5, { align: 'center', maxWidth: boxWidth - 2 });

          doc.setFontSize(8); doc.setFont('helvetica', 'bold');
          doc.text(item.count.toString(), x + (boxWidth/2), y + 11.5, { align: 'center' });
        });
      };

      drawPDFBoxRow(startBoxY, boxesRow1);
      drawPDFBoxRow(startBoxY + boxHeight + boxGap, boxesRow2);

      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key];
          if (col.key.includes('fecha') || col.key.includes('Fecha')) val = this.datePipe.transform(val, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val);
          return val || '';
        });
      });

      autoTable(doc, {
        startY: startBoxY + (boxHeight * 2) + (boxGap * 2) + 5,
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
            const cellValue = data.cell.raw;
            const etapaDisplay = cellValue ? String(cellValue) : '';
            
            const config = ETAPAS_MASTER.find(e => e.nombreCliente === etapaDisplay);
            if (config) {
              data.cell.styles.fillColor = config.colorRGB;
            }
          }
        }
      });

      doc.save(`Mis_Procesos_${new Date().getTime()}.pdf`);
      this.closeExportModal();

      AffiAlert.fire({
        icon: 'success',
        title: 'PDF generado',
        text: 'El archivo se ha descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error PDF:', error);
      AffiAlert.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo PDF. Intenta nuevamente.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.exportState = 'idle';
    }
  }

  private saveFile(buffer: any, extension: string) {
    const blob = new Blob([buffer], { type: extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mis_Procesos_${this.identificacionUsuario}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}