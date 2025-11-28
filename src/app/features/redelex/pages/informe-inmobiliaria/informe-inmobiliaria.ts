import { Component, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { FormsModule } from '@angular/forms';
import { RedelexService, InformeInmobiliaria } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe'; // Asegura ruta
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

registerLocaleData(localeEsCo, 'es-CO');

interface DemandanteOption {
  nombre: string;
  identificacion: string;
}

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
  private clasePipe = inject(ClaseProcesoPipe); // Inyección

  ngOnInit(): void {
    this.titleService.setTitle('Affi - Informe Inmobiliaria');
    this.loadInforme();
  }
  
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
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar la información.';
        this.loading = false;
      }
    });
  }

  extraerListasUnicas() {
    const etapasSet = new Set<string>();
    const despachosSet = new Set<string>();
    const clasesSet = new Set<string>();
    const demandantesMap = new Map<string, DemandanteOption>();

    this.rawData.forEach(item => {
      if (item.etapaProcesal) etapasSet.add(item.etapaProcesal);
      if (item.despacho) despachosSet.add(item.despacho);
      
      // CORRECCIÓN: Guardar nombre transformado
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
        // Incluimos clase transformada en búsqueda general
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
      
      // Filtro Clase (CORRECCIÓN CRÍTICA)
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

  getSummaryCounts() {
    return {
      demanda: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase() === 'DEMANDA').length,
      admisionDemanda: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('ADMISION DEMANDA')).length,
      notificacion: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('NOTIFICACION')).length,
      sentencia: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('SENTENCIA')).length,
      lanzamiento: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('LANZAMIENTO')).length,
      excepciones: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('EXCEPCIONES')).length
    };
  }

  private getReportFullTitle(): string {
    const clase = this.filtros.claseProceso ? this.filtros.claseProceso.toUpperCase() : 'TODOS LOS PROCESOS';
    return `INFORME ESTADO PROCESAL - ${clase}`;
  }

  private getReportInmobiliariaName(): string {
    return this.filtros.demandante ? this.filtros.demandante.nombre : 'TODAS LAS INMOBILIARIAS';
  }

  private getReportInmobiliariaNit(): string {
    return this.filtros.demandante ? this.filtros.demandante.identificacion : 'N/A';
  }

  async exportToExcel() {
    try {
      console.log('Iniciando exportación a Excel...');
      const activeColumns = this.exportColumns.filter(c => c.selected);
      if (activeColumns.length === 0) { alert('Selecciona columnas'); return; }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Informe Estado Procesal');

      // 1. AGREGAR LOGO (Usando la constante Base64)
      // Nota: ExcelJS requiere el base64 sin el prefijo 'data:image/png;base64,' a veces, 
      // pero generalmente lo maneja bien. Si falla, haz un split.
      const imageId = workbook.addImage({
        base64: AFFI_LOGO_BASE64,
        extension: 'png',
      });

      // Ajustamos el logo para que ocupe aprox las celdas A1:B4 manteniendo proporción cuadrada
      sheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.1 },
        ext: { width: 115, height: 115 } 
      });

      // 2. TÍTULOS E INFORMACIÓN
      sheet.mergeCells('C2:H2');
      const titleCell = sheet.getCell('C2');
      titleCell.value = this.getReportFullTitle();
      titleCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('C3:H3');
      const dateCell = sheet.getCell('C3');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO');
      dateCell.value = fechaHoy;
      dateCell.font = { bold: false, size: 11, name: 'Arial', color: { argb: 'FF555555' } };
      dateCell.alignment = { horizontal: 'center' };

      const infoStartRow = 6;
      sheet.getCell(`A${infoStartRow}`).value = `Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`;
      sheet.getCell(`A${infoStartRow}`).font = { bold: true, size: 10 };
      
      sheet.getCell(`A${infoStartRow + 2}`).value = `NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`;
      sheet.getCell(`A${infoStartRow + 2}`).font = { bold: true, size: 10 };

      sheet.getCell(`A${infoStartRow + 4}`).value = `Cantidad de procesos: ${this.filteredData.length}`;
      sheet.getCell(`A${infoStartRow + 4}`).font = { bold: true, size: 10 };

      // 3. CAJAS DE RESUMEN
      const summary = this.getSummaryCounts();
      const sumStartCol = 4; // Columna D
      const sumStartRow = 6;
      
      const headersSum = ['Demanda', 'Admisión Demanda', 'Notificación', 'Sentencia', 'Lanzamiento', 'Excepciones'];
      // Colores ARGB (Alpha, Red, Green, Blue) - Quitamos el # y agregamos FF al inicio
      const colorsSum = ['FFFFC000', 'FFDA9694', 'FFFCD5B4', 'FF92D050', 'FFB7DEE8', 'FFBFBFBF'];
      const descSum = [
        'Hemos iniciado el proceso judicial de restitución', 
        'El juez acepta tramitar la demanda', 
        'Etapa en la que se notifica al arrendatario', 
        'El juez decidió sobre la demanda', 
        'Se está gestionando el desalojo de los inquilinos', 
        'Demandado presentó objeciones a la demanda'
      ];
      const valuesSum = [summary.demanda, summary.admisionDemanda, summary.notificacion, summary.sentencia, summary.lanzamiento, summary.excepciones];

      // Borde suave para las cajas
      const boxBorder = { top: {style:'thin', color: {argb:'FF999999'}}, left: {style:'thin', color: {argb:'FF999999'}}, bottom: {style:'thin', color: {argb:'FF999999'}}, right: {style:'thin', color: {argb:'FF999999'}} };

      headersSum.forEach((header, i) => {
        const colIndex = sumStartCol + i;
        const col = sheet.getColumn(colIndex); 
        col.width = 22; // Un poco más ancho

        // Título Caja
        const cellTitle = sheet.getCell(sumStartRow, colIndex);
        cellTitle.value = header;
        cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellTitle.font = { bold: true, size: 10 };
        cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        cellTitle.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

        // Descripción Caja
        sheet.mergeCells(sumStartRow + 1, colIndex, sumStartRow + 2, colIndex);
        const cellDesc = sheet.getCell(sumStartRow + 1, colIndex);
        cellDesc.value = descSum[i];
        cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellDesc.font = { size: 8 };
        cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cellDesc.border = { left: {style:'thin'}, right: {style:'thin'} };

        // Valor Caja
        const cellVal = sheet.getCell(sumStartRow + 3, colIndex);
        cellVal.value = valuesSum[i];
        cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellVal.font = { bold: true, size: 12 };
        cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellVal.border = { bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      });

      // 4. TABLA DE DATOS (ESTILO PROFESIONAL)
      const tableStartRow = 12;
      const headerRow = sheet.getRow(tableStartRow);
      
      // Estilo de borde sutil para toda la tabla
      const tableBorderStr = 'thin';
      const tableBorderColor = { argb: 'FFD3D3D3' }; // Gris suave

      activeColumns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.label;
        
        // ESTILO ENCABEZADO: Fondo oscuro, texto blanco
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } }; // Gris Pizarra
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { 
          top: { style: tableBorderStr, color: tableBorderColor }, 
          left: { style: tableBorderStr, color: tableBorderColor }, 
          bottom: { style: tableBorderStr, color: tableBorderColor }, 
          right: { style: tableBorderStr, color: tableBorderColor } 
        };
        
        // Ajuste de anchos
        sheet.getColumn(idx + 1).width = col.key === 'demandadoNombre' ? 35 : 22;
      });

      // RENDERIZADO DE FILAS
      this.filteredData.forEach((item, index) => {
        const currentRowIndex = tableStartRow + 1 + index;
        const currentRow = sheet.getRow(currentRowIndex);
        
        // Color de fondo para filas alternadas (Zebra Striping)
        // FFF8F8F8 es un gris casi blanco, muy sutil
        const rowFill = index % 2 !== 0 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } } : null;

        activeColumns.forEach((col, colIndex) => {
          const cell = currentRow.getCell(colIndex + 1);
          let val = item[col.key as keyof InformeInmobiliaria];
          
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val as string);

          cell.value = val || '';
          
          // ESTILO CUERPO: Texto negro, bordes suaves
          cell.font = { size: 9, name: 'Arial', color: { argb: 'FF000000' } }; // Negro
          cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
          
          // Bordes grises
          cell.border = { 
            top: { style: tableBorderStr, color: tableBorderColor }, 
            left: { style: tableBorderStr, color: tableBorderColor }, 
            bottom: { style: tableBorderStr, color: tableBorderColor }, 
            right: { style: tableBorderStr, color: tableBorderColor } 
          };

          // Aplicar fondo alternado si corresponde
          if (rowFill) {
             // TypeScript trick para ExcelJS fill type
             cell.fill = rowFill as ExcelJS.Fill; 
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Hubo un error al generar el Excel: ' + error);
    }
  }

  exportToPdf() { 
    try {
      console.log('Iniciando exportación a PDF...');
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;

      // 1. AGREGAR LOGO (Mantiene proporción cuadrada 30x30)
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 3, 30, 30);

      // 2. ENCABEZADO GENERAL
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(this.getReportFullTitle(), pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 22, { align: 'center' });

      // 3. DATOS INMOBILIARIA
      const infoStartY = 35;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`, margin, infoStartY);
      doc.text(`NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`, margin, infoStartY + 5);
      doc.text(`Cantidad de procesos: ${this.filteredData.length}`, margin, infoStartY + 10);

      // 4. CAJAS DE RESUMEN
      const summary = this.getSummaryCounts();
      const descSum = [
        'Hemos iniciado el proceso judicial de restitución',
        'El juez acepta tramitar la demanda',
        'Etapa en la que se notifica al arrendatario',
        'El juez decidió sobre la demanda',
        'Se está gestionando el desalojo de los inquilinos',
        'Demandado presentó objeciones a la demanda'
      ];

      const boxWidth = 32; 
      const boxHeight = 24; 
      const gap = 3; 
      const totalBoxesWidth = (boxWidth * 6) + (gap * 5);
      const startX = (pageWidth - totalBoxesWidth) / 2; 
      const startY = 55;

      const dataSum = [ 
        { title: 'Demanda', color: [255, 192, 0], count: summary.demanda }, 
        { title: 'Admisión Demanda', color: [218, 150, 148], count: summary.admisionDemanda }, 
        { title: 'Notificación', color: [255, 213, 180], count: summary.notificacion }, 
        { title: 'Sentencia', color: [146, 208, 80], count: summary.sentencia }, 
        { title: 'Lanzamiento', color: [183, 222, 232], count: summary.lanzamiento }, 
        { title: 'Excepciones', color: [191, 191, 191], count: summary.excepciones } 
      ];

      dataSum.forEach((item, i) => {
        const x = startX + (i * (boxWidth + gap));
        
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(x, startY, boxWidth, boxHeight, 'F');
        doc.setDrawColor(200); // Borde gris suave para las cajas también
        doc.rect(x, startY, boxWidth, boxHeight, 'S');
        
        doc.setFontSize(8); 
        doc.setFont('helvetica', 'bold');
        doc.text(item.title, x + (boxWidth/2), startY + 4, { align: 'center', maxWidth: boxWidth - 1 });
        
        doc.setFontSize(6); 
        doc.setFont('helvetica', 'normal');
        doc.text(descSum[i], x + (boxWidth/2), startY + 9, { align: 'center', maxWidth: boxWidth - 2 });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(item.count.toString(), x + (boxWidth/2), startY + 21, { align: 'center' });
      });

      // 5. TABLA DE DATOS (ESTILO PROFESIONAL)
      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key as keyof InformeInmobiliaria];
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val as string);
          return val || '';
        });
      });

      autoTable(doc, {
        startY: startY + boxHeight + 8,
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid', // Mantenemos la grilla pero la estilizamos
        
        // Estilo del Encabezado (Fondo oscuro, texto blanco)
        headStyles: { 
          fillColor: [52, 73, 94], // Gris azulado oscuro profesional (Dark Slate)
          textColor: [255, 255, 255], // Texto Blanco
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [200, 200, 200] // Líneas divisorias grises
        },

        // Estilo del Cuerpo (Texto negro, bordes suaves)
        styles: { 
          textColor: [0, 0, 0], // Texto NEGRO garantizado
          fontSize: 7, 
          cellPadding: 3, // Más espacio interno para que se vea limpio
          valign: 'middle',
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [200, 200, 200] // Bordes grises suaves, no negros fuertes
        },

        // Filas alternadas (Efecto cebra sutil)
        alternateRowStyles: {
          fillColor: [248, 248, 248] // Un gris muy pálido para diferenciar filas
        },

        columnStyles: { 1: { cellWidth: 35 } },
        margin: { top: 20 } 
      });

      doc.save(`Informe_Inmobiliaria_${new Date().getTime()}.pdf`);
      this.closeExportModal();

    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      alert('Hubo un error al generar el PDF: ' + error);
    }
  }

  private saveFile(buffer: any, extension: string) {
    const blob = new Blob([buffer], { type: extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Informe_Inmobiliaria_${new Date().getTime()}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}