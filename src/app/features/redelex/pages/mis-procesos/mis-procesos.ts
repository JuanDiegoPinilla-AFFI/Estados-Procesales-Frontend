import { Component, OnInit, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

registerLocaleData(localeEsCo, 'es-CO');

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
  loading = true;
  error = '';
  
  // Datos de cabecera
  identificacionUsuario = '';
  nombreInmobiliaria = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50, 100];

  // Filtros Avanzados
  filtros = {
    busquedaGeneral: '',
    claseProceso: '',
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
    { key: 'fechaRecepcionProceso', label: 'Fecha Pres.', selected: true },
    { key: 'ciudadInmueble', label: 'Ciudad', selected: true },
  ];

  ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Mis Procesos');
    this.cargarMisProcesos();
  }

  cargarMisProcesos() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        this.identificacionUsuario = res.identificacion;
        this.nombreInmobiliaria = res.nombreInmobiliaria || '';
        const rawProcesos = res.procesos || [];

        const datosLimpios = rawProcesos.map((item: any) => {
          const newItem = { ...item };
          if (newItem.demandadoNombre?.includes(',')) newItem.demandadoNombre = newItem.demandadoNombre.split(',')[0].trim();
          if (newItem.demandadoIdentificacion?.includes(',')) newItem.demandadoIdentificacion = newItem.demandadoIdentificacion.split(',')[0].trim();
          if (newItem.demandanteNombre?.includes(',')) newItem.demandanteNombre = newItem.demandanteNombre.split(',')[0].trim();
          
          newItem.numeroRadicacion = newItem.numeroRadicacion || 'N/A';
          newItem.etapaProcesal = newItem.etapaProcesal || 'EN TRÁMITE';
          
          return newItem;
        });
        
        this.rawData = datosLimpios;
        this.extraerListasUnicas();
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

  extraerListasUnicas() {
    const clasesSet = new Set<string>();
    this.rawData.forEach(item => {
      if (item.claseProceso) clasesSet.add(this.clasePipe.transform(item.claseProceso));
    });
    this.listaClaseProceso = Array.from(clasesSet).sort();
  }

  applyFilters() {
    this.currentPage = 1;
    this.filteredData = this.rawData.filter(item => {
      if (this.filtros.busquedaGeneral) {
        const term = this.filtros.busquedaGeneral.toLowerCase();
        const claseTransformada = this.clasePipe.transform(item.claseProceso).toLowerCase();
        const match = 
          item.procesoId?.toString().includes(term) ||
          item.demandadoNombre?.toLowerCase().includes(term) ||
          item.demandadoIdentificacion?.includes(term) ||
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
      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = { busquedaGeneral: '', claseProceso: '', radicado: '', idDemandado: '', nombreDemandado: '' };
    this.applyFilters();
  }

  // --- PAGINACIÓN Y DROPDOWNS ---
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
  selectOption(value: string) { this.filtros.claseProceso = value; this.activeDropdown = null; this.applyFilters(); }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) this.activeDropdown = null;
  }

  // --- MODAL Y EXPORTACIÓN ---
  openExportModal() { this.showExportModal = true; }
  closeExportModal() { this.showExportModal = false; }
  toggleColumn(key: string) { const col = this.exportColumns.find(c => c.key === key); if (col) col.selected = !col.selected; }
  selectAllColumns(select: boolean) { this.exportColumns.forEach(c => c.selected = select); }

  // ------------------------------------------------------------------------------------------------
  // --- EXPORTAR EXCEL (DISEÑO AFFI - Grid Uniforme + Cajas Resumen) ---
  // ------------------------------------------------------------------------------------------------
  async exportToExcel() {

    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      console.log('Generando Excel Mis Procesos...');
      const activeColumns = this.exportColumns.filter(c => c.selected);
      if (activeColumns.length === 0) { alert('Selecciona columnas'); return; }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mis Procesos');

      // --- 0. CALCULAR CONTADORES AUTOMÁTICAMENTE ---
      const contarEtapa = (termino: string, exacto: boolean = false) => {
        return this.filteredData.filter(item => {
          const etapa = item.etapaProcesal ? item.etapaProcesal.toUpperCase() : '';
          const busqueda = termino.toUpperCase();
          return exacto ? etapa === busqueda : etapa.includes(busqueda);
        }).length;
      };

      const counts = {
        demanda: contarEtapa('DEMANDA', true),
        admision: contarEtapa('ADMISION DEMANDA'),
        notificacion: contarEtapa('NOTIFICACION'),
        sentencia: contarEtapa('SENTENCIA'),
        lanzamiento: contarEtapa('LANZAMIENTO'),
        excepciones: contarEtapa('EXCEPCIONES'),
        terminacion: contarEtapa('TERMINACION'),
        archivo: contarEtapa('ARCHIVO'),
        liquidacion: contarEtapa('LIQUIDACION'),
        acuerdo: contarEtapa('ACUERDO'),
        embargo: contarEtapa('EMBARGO'),
        secuestro: contarEtapa('SECUESTRO')
      };

      // --- 1. CONFIGURACIÓN ESTRUCTURAL ---
      // Definimos qué campos ocupan 2 celdas para mantener el grid alineado
      const colSpans: { [key: string]: number } = {
        'numeroRadicacion': 2,
        'demandadoNombre': 2,
        'despacho': 2,
        'sentencia': 1 // A veces es largo, pero dejémoslo en 1 por ahora o cámbialo a 2 si ves necesario
      };
      
      const UNIFORM_WIDTH = 22; 
      
      // Ancho uniforme para todas las columnas
      for (let i = 1; i <= 50; i++) { sheet.getColumn(i).width = UNIFORM_WIDTH; }

      // Calculamos columnas físicas totales para centrar títulos
      let totalPhysicalColumns = 0;
      activeColumns.forEach(col => { totalPhysicalColumns += (colSpans[col.key] || 1); });

      // --- 2. ESTILOS Y COLORES ---
      const colors = {
        yellow: 'FFFFC000', pink: 'FFDA9694', orange: 'FFFCD5B4',
        green: 'FF92D050', blue: 'FFB7DEE8', gray: 'FFBFBFBF',
        headerBlue: 'FF1F4E78', textDark: 'FF333333'
      };

      // --- 3. LOGO Y ENCABEZADOS ---
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

      // --- 4. CAJAS DE RESUMEN (GRID) ---
      const datosFila1 = [
        { title: 'Demanda', desc: 'Iniciado proceso restitución', count: counts.demanda, color: colors.yellow },
        { title: 'Admisión Demanda', desc: 'Juez acepta demanda', count: counts.admision, color: colors.pink },
        { title: 'Notificación', desc: 'Notificación al arrendatario', count: counts.notificacion, color: colors.orange },
        { title: 'Sentencia', desc: 'Decisión sobre la demanda', count: counts.sentencia, color: colors.green },
        { title: 'Lanzamiento', desc: 'Gestionando desalojo', count: counts.lanzamiento, color: colors.blue },
        { title: 'Excepciones', desc: 'Objeciones presentadas', count: counts.excepciones, color: colors.gray },
      ];

      const datosFila2 = [
        { title: 'Terminación', desc: 'Terminado por pago/acuerdo', count: counts.terminacion, color: colors.blue }, 
        { title: 'Archivo', desc: 'Archivado / Desistimiento', count: counts.archivo, color: colors.gray },
        { title: 'Liquidación', desc: 'Etapa liquidación crédito', count: counts.liquidacion, color: colors.yellow },
        { title: 'Acuerdo Pago', desc: 'Acuerdo logrado', count: counts.acuerdo, color: colors.green },
        { title: 'Embargo', desc: 'Medidas cautelares', count: counts.embargo, color: colors.pink },
        { title: 'Secuestro', desc: 'Diligencia secuestro', count: counts.secuestro, color: colors.orange },
      ];

      const drawBoxRow = (startRow: number, datos: any[]) => {
        let currentBoxCol = 4; // Columna D
        datos.forEach(box => {
          // Título
          const cellTitle = sheet.getCell(startRow, currentBoxCol);
          cellTitle.value = box.title;
          cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellTitle.font = { bold: true, size: 8, name: 'Calibri' };
          cellTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellTitle.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          // Descripción
          sheet.mergeCells(startRow + 1, currentBoxCol, startRow + 2, currentBoxCol);
          const cellDesc = sheet.getCell(startRow + 1, currentBoxCol);
          cellDesc.value = box.desc;
          cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellDesc.font = { size: 7, name: 'Calibri' };
          cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellDesc.border = { left: {style:'thin'}, right: {style:'thin'} };

          // Contador
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

      // --- 5. TABLA DE DATOS ---
      const tableStartRow = 16;
      const headerRow = sheet.getRow(tableStartRow);
      let currentPhysicalCol = 1;

      // Encabezados
      activeColumns.forEach((col) => {
        const span = colSpans[col.key] || 1;
        if (span > 1) { sheet.mergeCells(tableStartRow, currentPhysicalCol, tableStartRow, currentPhysicalCol + span - 1); }

        const cell = sheet.getCell(tableStartRow, currentPhysicalCol);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlue } };
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

      // Filas
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
          cell.font = { size: 8, name: 'Calibri', color: { argb: colors.textDark } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle;

          // PINTAR CELDA ETAPA
          if (col.key === 'etapaProcesal') {
             const etapaVal = val ? String(val).toUpperCase() : '';
             let cellArgb = null;
             
             if (etapaVal === 'DEMANDA') cellArgb = colors.yellow;
             else if (etapaVal.includes('ADMISION DEMANDA')) cellArgb = colors.pink;
             else if (etapaVal.includes('NOTIFICACION')) cellArgb = colors.orange;
             else if (etapaVal.includes('SENTENCIA')) cellArgb = colors.green;
             else if (etapaVal.includes('LANZAMIENTO')) cellArgb = colors.blue;
             else if (etapaVal.includes('EXCEPCIONES')) cellArgb = colors.gray;
             
             else if (etapaVal.includes('TERMINACION')) cellArgb = colors.blue;
             else if (etapaVal.includes('ARCHIVO') || etapaVal.includes('DESISTIMIENTO')) cellArgb = colors.gray;
             else if (etapaVal.includes('LIQUIDACION')) cellArgb = colors.yellow;
             else if (etapaVal.includes('ACUERDO')) cellArgb = colors.green;
             else if (etapaVal.includes('EMBARGO')) cellArgb = colors.pink;
             else if (etapaVal.includes('SECUESTRO')) cellArgb = colors.orange;

             if (cellArgb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellArgb } };
          }
          rowPhysicalCol += span;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

    } catch (error) {
      console.error('Error Excel:', error);
      // Usamos alert o AffiAlert según prefieras (tu código usaba alert)
      alert('Error al generar Excel: ' + error); 
    } finally {
      this.exportState = 'idle'; // Resetear siempre
    }
  }

  // ------------------------------------------------------------------------------------------------
  // --- EXPORTAR PDF (DISEÑO AFFI - Fit To Page + Cajas Centradas) ---
  // ------------------------------------------------------------------------------------------------
  async exportToPdf() {

    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log('Exportando PDF Mis Procesos...');
      
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const etapaColIndex = activeColumns.findIndex(c => c.key === 'etapaProcesal');

      const contarEtapa = (termino: string, exacto: boolean = false) => {
        return this.filteredData.filter(item => {
          const etapa = item.etapaProcesal ? item.etapaProcesal.toUpperCase() : '';
          const busqueda = termino.toUpperCase();
          return exacto ? etapa === busqueda : etapa.includes(busqueda);
        }).length;
      };

      const counts = {
        demanda: contarEtapa('DEMANDA', true),
        admision: contarEtapa('ADMISION DEMANDA'),
        notificacion: contarEtapa('NOTIFICACION'),
        sentencia: contarEtapa('SENTENCIA'),
        lanzamiento: contarEtapa('LANZAMIENTO'),
        excepciones: contarEtapa('EXCEPCIONES'),
        terminacion: contarEtapa('TERMINACION'),
        archivo: contarEtapa('ARCHIVO'),
        liquidacion: contarEtapa('LIQUIDACION'),
        acuerdo: contarEtapa('ACUERDO'),
        embargo: contarEtapa('EMBARGO'),
        secuestro: contarEtapa('SECUESTRO')
      };

      const colorsRGB: { [key: string]: [number, number, number] } = {
        yellow: [255, 192, 0], pink: [218, 150, 148], orange: [255, 213, 180],
        green: [146, 208, 80], blue: [183, 222, 232], gray: [191, 191, 191]
      };

      // Configuración Página
      const doc = new jsPDF('landscape', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.width;
      const margin = 5; 
      const usableWidth = pageWidth - (margin * 2);

      // --- CÁLCULO PROPORCIONAL DE ANCHOS ---
      // Columnas "dobles" para datos largos
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

      // 3. ENCABEZADO
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 5, 20, 20);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('REPORTE MIS PROCESOS JURÍDICOS', pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 15, { align: 'center' });

      // Info
      const infoY = 28;
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text(`NIT Asociado: ${this.identificacionUsuario}`, margin, infoY);
      doc.text(`Inmobiliaria: ${this.nombreInmobiliaria || 'N/A'}`, margin, infoY + 4);
      doc.text(`Total Procesos: ${this.filteredData.length}`, margin, infoY + 8);

      // --- 4. CAJAS DE RESUMEN (CENTRADO) ---
      const numBoxes = 6;
      const boxGap = 4; 
      const boxWidth = 42; 
      const boxHeight = 14; 
      const startBoxY = 42; 

      const totalBlockWidth = (numBoxes * boxWidth) + ((numBoxes - 1) * boxGap);
      const startX = margin + (usableWidth - totalBlockWidth) / 2;

      const boxesRow1 = [
        { title: 'Demanda', desc: 'Iniciado proceso restitución', count: counts.demanda, color: colorsRGB['yellow'] },
        { title: 'Admisión', desc: 'Juez acepta demanda', count: counts.admision, color: colorsRGB['pink'] },
        { title: 'Notificación', desc: 'Notificación al arrendatario', count: counts.notificacion, color: colorsRGB['orange'] },
        { title: 'Sentencia', desc: 'Decisión sobre la demanda', count: counts.sentencia, color: colorsRGB['green'] },
        { title: 'Lanzamiento', desc: 'Gestionando desalojo', count: counts.lanzamiento, color: colorsRGB['blue'] },
        { title: 'Excepciones', desc: 'Objeciones presentadas', count: counts.excepciones, color: colorsRGB['gray'] },
      ];

      const boxesRow2 = [
        { title: 'Terminación', desc: 'Terminado por pago/acuerdo', count: counts.terminacion, color: colorsRGB['blue'] },
        { title: 'Archivo', desc: 'Archivado / Desistimiento', count: counts.archivo, color: colorsRGB['gray'] },
        { title: 'Liquidación', desc: 'Etapa liquidación crédito', count: counts.liquidacion, color: colorsRGB['yellow'] },
        { title: 'Acuerdo Pago', desc: 'Acuerdo logrado', count: counts.acuerdo, color: colorsRGB['green'] },
        { title: 'Embargo', desc: 'Medidas cautelares', count: counts.embargo, color: colorsRGB['pink'] },
        { title: 'Secuestro', desc: 'Diligencia secuestro', count: counts.secuestro, color: colorsRGB['orange'] },
      ];

      const drawPDFBoxRow = (y: number, items: any[]) => {
        items.forEach((item, i) => {
          const x = startX + (i * (boxWidth + boxGap)); 
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
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

      // 5. TABLA DE DATOS
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
            const etapa = cellValue ? String(cellValue).toUpperCase() : '';
            let colorRGB: [number, number, number] | null = null;
            
            if (etapa === 'DEMANDA') colorRGB = colorsRGB['yellow'];
            else if (etapa.includes('ADMISION DEMANDA')) colorRGB = colorsRGB['pink'];
            else if (etapa.includes('NOTIFICACION')) colorRGB = colorsRGB['orange'];
            else if (etapa.includes('SENTENCIA')) colorRGB = colorsRGB['green'];
            else if (etapa.includes('LANZAMIENTO')) colorRGB = colorsRGB['blue'];
            else if (etapa.includes('EXCEPCIONES')) colorRGB = colorsRGB['gray'];
            else if (etapa.includes('TERMINACION')) colorRGB = colorsRGB['blue'];
            else if (etapa.includes('ARCHIVO') || etapa.includes('DESISTIMIENTO')) colorRGB = colorsRGB['gray'];
            else if (etapa.includes('LIQUIDACION')) colorRGB = colorsRGB['yellow'];
            else if (etapa.includes('ACUERDO')) colorRGB = colorsRGB['green'];
            else if (etapa.includes('EMBARGO')) colorRGB = colorsRGB['pink'];
            else if (etapa.includes('SECUESTRO')) colorRGB = colorsRGB['orange'];

            if (colorRGB) data.cell.styles.fillColor = colorRGB;
          }
        }
      });

      doc.save(`Mis_Procesos_${new Date().getTime()}.pdf`);
      this.closeExportModal();

    } catch (error) {
      console.error('Error PDF:', error);
      alert('Error al generar PDF: ' + error);
    } finally {
      this.exportState = 'idle'; // Resetear siempre
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