import { Component, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { FormsModule } from '@angular/forms';
import { RedelexService, InformeInmobiliaria } from '../../services/redelex.service';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

registerLocaleData(localeEsCo, 'es-CO');

// Interfaz auxiliar para el selector de Demandantes
interface DemandanteOption {
  nombre: string;
  identificacion: string;
}

@Component({
  selector: 'app-informe-inmobiliaria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './informe-inmobiliaria.component.html',
  styleUrls: ['./informe-inmobiliaria.component.scss']
})
export class InformeInmobiliariaComponent implements OnInit {
  private redelexService = inject(RedelexService);
  private elementRef = inject(ElementRef);
  private datePipe = inject(DatePipe);
  
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
    { key: 'demandadoIdentificacion', label: 'Identificación Demandado', selected: true },
    { key: 'demandadoNombre', label: 'Nombre Demandado', selected: true },
    { key: 'codigoAlterno', label: 'Cuenta No', selected: true },
    { key: 'etapaProcesal', label: 'Etapa Procesal', selected: true },
    { key: 'fechaRecepcionProceso', label: 'Fecha Presentación Demanda', selected: true },
    { key: 'sentenciaPrimeraInstancia', label: 'Fallo Sentencia', selected: true },
    { key: 'despacho', label: 'Despacho', selected: true },
    { key: 'numeroRadicacion', label: 'Número Radicación', selected: true },
    { key: 'ciudadInmueble', label: 'Ciudad', selected: true },
  ];

  // Listas para filtros
  listaEtapas: string[] = [];
  listaClaseProceso: string[] = [];
  listaDespachos: string[] = [];
  listaDemandantes: DemandanteOption[] = [];

  // Modelo de Filtros
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

  // Getters filtrados
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

  ngOnInit(): void {
    this.loadInforme();
  }

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
        this.rawData = response.data;
        this.filteredData = response.data;
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
      if (item.claseProceso) clasesSet.add(item.claseProceso);

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
        const generalMatch = 
          item.demandadoNombre?.toLowerCase().includes(term) ||
          item.demandanteNombre?.toLowerCase().includes(term) ||
          item.demandadoIdentificacion?.includes(term) ||
          item.demandanteIdentificacion?.includes(term) ||
          item.numeroRadicacion?.includes(term) ||
          item.despacho?.toLowerCase().includes(term) ||
          item.ciudadInmueble?.toLowerCase().includes(term) ||
          item.etapaProcesal?.toLowerCase().includes(term) ||
          item.claseProceso?.toLowerCase().includes(term);
        if (!generalMatch) return false;
      }

      if (this.filtros.identificacion && !item.demandadoIdentificacion?.includes(this.filtros.identificacion.trim())) return false;
      if (this.filtros.nombre && !item.demandadoNombre?.toLowerCase().includes(this.filtros.nombre.toLowerCase().trim())) return false;
      
      if (this.filtros.etapa && item.etapaProcesal !== this.filtros.etapa) return false;
      if (this.filtros.despacho && item.despacho !== this.filtros.despacho) return false;
      if (this.filtros.claseProceso && item.claseProceso !== this.filtros.claseProceso) return false;

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
      demanda: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('DEMANDA')).length,
      notificacion: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('NOTIFICACION')).length,
      sentencia: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('SENTENCIA') || i.etapaProcesal?.toUpperCase().includes('FALLO')).length,
      lanzamiento: this.filteredData.filter(i => i.etapaProcesal?.toUpperCase().includes('LANZAMIENTO') || i.etapaProcesal?.toUpperCase().includes('ENTREGA')).length
    };
  }

  // --- DATOS DINÁMICOS PARA REPORTES (CORREGIDO) ---
  
  // Ahora retorna el string completo del título basándose en la CLASE
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

      try {
        const logoResponse = await fetch('Affi_logo.png'); 
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.arrayBuffer();
          const imageId = workbook.addImage({ buffer: logoBlob, extension: 'png' });
          sheet.addImage(imageId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 100, height: 50 } });
        }
      } catch (e) { console.warn('Logo no cargado:', e); }

      // TÍTULO DINÁMICO (USANDO CLASE PROCESO)
      sheet.mergeCells('C2:G2');
      const titleCell = sheet.getCell('C2');
      titleCell.value = this.getReportFullTitle(); // <-- Uso de la nueva función
      titleCell.font = { bold: true, size: 14, name: 'Arial' };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('C3:G3');
      const dateCell = sheet.getCell('C3');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO');
      dateCell.value = fechaHoy;
      dateCell.font = { bold: true, size: 11, name: 'Arial' };
      dateCell.alignment = { horizontal: 'center' };

      // INFO DINÁMICA
      const infoStartRow = 6;
      sheet.getCell(`A${infoStartRow}`).value = `Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`;
      sheet.getCell(`A${infoStartRow}`).font = { bold: true };
      
      sheet.getCell(`A${infoStartRow + 2}`).value = `NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`;
      sheet.getCell(`A${infoStartRow + 2}`).font = { bold: true };

      sheet.getCell(`A${infoStartRow + 4}`).value = `Cantidad de procesos: ${this.filteredData.length}`;
      sheet.getCell(`A${infoStartRow + 4}`).font = { bold: true };

      // RESUMEN
      const summary = this.getSummaryCounts();
      const sumStartCol = 4; 
      const sumStartRow = 6;
      const headersSum = ['Demanda', 'Notificación', 'Sentencia', 'Lanzamiento'];
      const colorsSum = ['FFFFC000', 'FFFFE699', 'FF92D050', 'FFB4C6E7'];
      const descSum = [
        'Hemos iniciado el proceso judicial de restitución.',
        'Etapa en la que se notifica al arrendatario.',
        'El juez decidió sobre la demanda.',
        'Se está gestionando el desalojo de los inquilinos.'
      ];
      const valuesSum = [summary.demanda, summary.notificacion, summary.sentencia, summary.lanzamiento];

      headersSum.forEach((header, i) => {
        const col = sheet.getColumn(sumStartCol + i);
        col.width = 20;
        const cellTitle = sheet.getCell(sumStartRow, sumStartCol + i);
        cellTitle.value = header;
        cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellTitle.font = { bold: true, size: 10 };
        cellTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        cellTitle.border = { top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

        sheet.mergeCells(sumStartRow + 1, sumStartCol + i, sumStartRow + 2, sumStartCol + i);
        const cellDesc = sheet.getCell(sumStartRow + 1, sumStartCol + i);
        cellDesc.value = descSum[i];
        cellDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellDesc.font = { size: 8 };
        cellDesc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cellDesc.border = { left: {style:'thin'}, right: {style:'thin'} };

        const cellVal = sheet.getCell(sumStartRow + 3, sumStartCol + i);
        cellVal.value = valuesSum[i];
        cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorsSum[i] } };
        cellVal.font = { bold: true, size: 12 };
        cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellVal.border = { bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      });

      // TABLA DATOS
      const tableStartRow = 12;
      const headerRow = sheet.getRow(tableStartRow);
      activeColumns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.label;
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
        sheet.getColumn(idx + 1).width = col.key === 'demandadoNombre' ? 30 : 20;
      });

      this.filteredData.forEach((item, index) => {
        const currentRow = sheet.getRow(tableStartRow + 1 + index);
        activeColumns.forEach((col, colIndex) => {
          const cell = currentRow.getCell(colIndex + 1);
          let val = item[col.key as keyof InformeInmobiliaria];
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          cell.value = val || '';
          cell.font = { size: 9, name: 'Arial' };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
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

      // HEADER DINÁMICO (USANDO CLASE PROCESO)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(this.getReportFullTitle(), pageWidth / 2, 20, { align: 'center' }); // <-- Uso de la nueva función
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 26, { align: 'center' });

      // INFO DINÁMICA
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nombre Inmobiliaria: ${this.getReportInmobiliariaName()}`, margin, 40);
      doc.text(`NIT Inmobiliaria: ${this.getReportInmobiliariaNit()}`, margin, 46);
      doc.text(`Cantidad de procesos: ${this.filteredData.length}`, margin, 52);

      // RESUMEN
      const summary = this.getSummaryCounts();
      const startX = pageWidth - 150;
      const startY = 35;
      const boxWidth = 30;
      const boxHeight = 25;
      const dataSum = [
        { title: 'Demanda', color: [255, 192, 0], count: summary.demanda },
        { title: 'Notificación', color: [255, 230, 153], count: summary.notificacion },
        { title: 'Sentencia', color: [146, 208, 80], count: summary.sentencia },
        { title: 'Lanzamiento', color: [180, 198, 231], count: summary.lanzamiento }
      ];

      dataSum.forEach((item, i) => {
        const x = startX + (i * boxWidth);
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(x, startY, boxWidth, boxHeight, 'F');
        doc.setDrawColor(0);
        doc.rect(x, startY, boxWidth, boxHeight, 'S');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(item.title, x + (boxWidth/2), startY + 5, { align: 'center' });
        doc.setFontSize(10);
        doc.text(item.count.toString(), x + (boxWidth/2), startY + 20, { align: 'center' });
      });

      // TABLA
      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key as keyof InformeInmobiliaria];
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          return val || '';
        });
      });

      autoTable(doc, {
        startY: 70,
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: { 1: { cellWidth: 35 } }
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