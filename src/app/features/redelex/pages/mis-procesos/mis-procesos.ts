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

registerLocaleData(localeEsCo, 'es-CO');

@Component({
  selector: 'app-mis-procesos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  providers: [DatePipe],
  templateUrl: './mis-procesos.html',
  styleUrls: ['./mis-procesos.scss']
})
export class MisProcesosComponent implements OnInit {
  private redelexService = inject(RedelexService);
  private titleService = inject(Title);
  private datePipe = inject(DatePipe);
  private elementRef = inject(ElementRef);

  rawData: any[] = [];
  filteredData: any[] = [];
  loading = true;
  error = '';
  identificacionUsuario = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50];

  // Filtros
  filtros = {
    busquedaGeneral: '',
    claseProceso: ''
  };
  listaClaseProceso: string[] = [];
  activeDropdown: string | null = null;
  searchClase = '';

  // Exportación
  showExportModal = false;
  exportColumns = [
    { key: 'procesoId', label: 'ID Proceso', selected: true },
    { key: 'claseProceso', label: 'Clase', selected: true },
    { key: 'demandadoNombre', label: 'Nombre Demandado', selected: true },
    { key: 'demandadoIdentificacion', label: 'ID Demandado', selected: true },
    { key: 'demandanteNombre', label: 'Nombre Demandante', selected: true },
    { key: 'demandanteIdentificacion', label: 'ID Demandante', selected: true }
  ];

  ngOnInit() {
    this.titleService.setTitle('Affi - Mis Procesos');
    this.cargarMisProcesos();
  }
// --- CARGA DE DATOS ---
  cargarMisProcesos() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        const rawProcesos = res.procesos || [];
        this.identificacionUsuario = res.identificacion;

        // --- INICIO CORRECCIÓN DE LIMPIEZA ---
        const datosLimpios = rawProcesos.map((item: any) => {
          // Copiamos el objeto para no mutar referencias
          const newItem = { ...item };

          // 1. Limpiar Nombre Demandado (Tomar solo el primero antes de la coma)
          if (newItem.demandadoNombre && newItem.demandadoNombre.includes(',')) {
            newItem.demandadoNombre = newItem.demandadoNombre.split(',')[0].trim();
          }

          // 2. Limpiar Identificación Demandado
          if (newItem.demandadoIdentificacion && newItem.demandadoIdentificacion.includes(',')) {
            newItem.demandadoIdentificacion = newItem.demandadoIdentificacion.split(',')[0].trim();
          }

          // 3. Limpiar Nombre Demandante (Opcional)
          if (newItem.demandanteNombre && newItem.demandanteNombre.includes(',')) {
            newItem.demandanteNombre = newItem.demandanteNombre.split(',')[0].trim();
          }

          return newItem;
        });
        
        this.rawData = datosLimpios;
        // -------------------------------------

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
      if (item.claseProceso) clasesSet.add(item.claseProceso);
    });
    this.listaClaseProceso = Array.from(clasesSet).sort();
  }

  // --- FILTROS Y PAGINACIÓN ---
  applyFilters() {
    this.currentPage = 1;
    this.filteredData = this.rawData.filter(item => {
      // Filtro General
      if (this.filtros.busquedaGeneral) {
        const term = this.filtros.busquedaGeneral.toLowerCase();
        const match = 
          item.procesoId?.toString().includes(term) ||
          item.demandadoNombre?.toLowerCase().includes(term) ||
          item.demandadoIdentificacion?.includes(term) ||
          item.demandanteNombre?.toLowerCase().includes(term);
        if (!match) return false;
      }
      // Filtro Clase
      if (this.filtros.claseProceso && item.claseProceso !== this.filtros.claseProceso) return false;

      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = { busquedaGeneral: '', claseProceso: '' };
    this.applyFilters();
  }

  get paginatedData() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredData.slice(startIndex, startIndex + this.itemsPerPage);
  }
  get totalPages() { return Math.ceil(this.filteredData.length / this.itemsPerPage); }
  
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  
  selectPageSize(size: number) {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.activeDropdown = null;
  }

  // --- MANEJO DE DROPDOWNS ---
  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  selectOption(value: string) {
    this.filtros.claseProceso = value;
    this.activeDropdown = null;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.activeDropdown = null;
    }
  }

  // --- EXPORTACIÓN ---
  openExportModal() { this.showExportModal = true; }
  closeExportModal() { this.showExportModal = false; }
  toggleColumn(key: string) {
    const col = this.exportColumns.find(c => c.key === key);
    if (col) col.selected = !col.selected;
  }
  selectAllColumns(select: boolean) { this.exportColumns.forEach(c => c.selected = select); }

  async exportToExcel() {
    const activeCols = this.exportColumns.filter(c => c.selected);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Mis Procesos');

    // Encabezado
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = `REPORTE DE PROCESOS - NIT: ${this.identificacionUsuario}`;
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `Generado el: ${this.datePipe.transform(new Date(), 'medium')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Tabla Headers
    const headerRow = sheet.getRow(4);
    activeCols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      sheet.getColumn(idx + 1).width = 25;
    });

    // Datos
    this.filteredData.forEach((item, idx) => {
      const row = sheet.getRow(5 + idx);
      activeCols.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = item[col.key] || '';
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    this.saveFile(buffer, 'xlsx');
    this.closeExportModal();
  }

  exportToPdf() {
    const doc = new jsPDF();
    const activeCols = this.exportColumns.filter(c => c.selected);
    
    doc.setFontSize(14);
    doc.text('Mis Procesos Jurídicos', 14, 20);
    doc.setFontSize(10);
    doc.text(`NIT Asociado: ${this.identificacionUsuario}`, 14, 26);
    doc.text(`Fecha: ${this.datePipe.transform(new Date(), 'medium')}`, 14, 32);

    const bodyData = this.filteredData.map(item => activeCols.map(col => item[col.key] || ''));

    autoTable(doc, {
      startY: 40,
      head: [activeCols.map(c => c.label)],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] } // Color primario
    });

    doc.save(`Mis_Procesos_${new Date().getTime()}.pdf`);
    this.closeExportModal();
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