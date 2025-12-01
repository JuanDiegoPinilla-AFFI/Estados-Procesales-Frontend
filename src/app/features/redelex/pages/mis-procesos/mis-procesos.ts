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
    radicado: '',       // <--- NUEVO
    idDemandado: '',    // <--- NUEVO
    nombreDemandado: '' // <--- NUEVO
  };
  
  listaClaseProceso: string[] = [];
  activeDropdown: string | null = null;
  showExportModal = false;

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
    this.titleService.setTitle('Affi - Mis Procesos');
    this.cargarMisProcesos();
  }

  cargarMisProcesos() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        // Mapeo de respuesta del Backend actualizada
        this.identificacionUsuario = res.identificacion;
        this.nombreInmobiliaria = res.nombreInmobiliaria || '';

        const rawProcesos = res.procesos || [];

        // Limpieza de datos
        const datosLimpios = rawProcesos.map((item: any) => {
          const newItem = { ...item };
          if (newItem.demandadoNombre?.includes(',')) newItem.demandadoNombre = newItem.demandadoNombre.split(',')[0].trim();
          if (newItem.demandadoIdentificacion?.includes(',')) newItem.demandadoIdentificacion = newItem.demandadoIdentificacion.split(',')[0].trim();
          if (newItem.demandanteNombre?.includes(',')) newItem.demandanteNombre = newItem.demandanteNombre.split(',')[0].trim();
          
          // Asegurar que campos vacíos no rompan la tabla
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
      
      // 1. Búsqueda General (busca en todo)
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

      // 2. Filtro Radicado
      if (this.filtros.radicado) {
        if (!item.numeroRadicacion?.toLowerCase().includes(this.filtros.radicado.toLowerCase())) return false;
      }

      // 3. Filtro ID Demandado
      if (this.filtros.idDemandado) {
        if (!item.demandadoIdentificacion?.includes(this.filtros.idDemandado)) return false;
      }

      // 4. Filtro Nombre Demandado
      if (this.filtros.nombreDemandado) {
        if (!item.demandadoNombre?.toLowerCase().includes(this.filtros.nombreDemandado.toLowerCase())) return false;
      }

      // 5. Filtro Clase
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
  // --- EXPORTAR EXCEL (ESTILO PROFESIONAL) ---
  async exportToExcel() {
    try {
      const activeColumns = this.exportColumns.filter(c => c.selected);
      if (activeColumns.length === 0) { alert('Selecciona columnas'); return; }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mis Procesos');

      // 1. LOGO
      const imageId = workbook.addImage({
        base64: AFFI_LOGO_BASE64,
        extension: 'png',
      });
      sheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.1 },
        ext: { width: 115, height: 115 } 
      });

      // 2. TÍTULOS
      sheet.mergeCells('C2:H2');
      const titleCell = sheet.getCell('C2');
      titleCell.value = 'REPORTE MIS PROCESOS JURÍDICOS';
      titleCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('C3:H3');
      const dateCell = sheet.getCell('C3');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO');
      dateCell.value = fechaHoy;
      dateCell.font = { bold: false, size: 11, name: 'Arial', color: { argb: 'FF555555' } };
      dateCell.alignment = { horizontal: 'center' };

      // Información Cliente
      const infoStartRow = 6;
      sheet.getCell(`A${infoStartRow}`).value = `NIT Asociado: ${this.identificacionUsuario}`;
      sheet.getCell(`A${infoStartRow}`).font = { bold: true, size: 10 };
      sheet.getCell(`A${infoStartRow + 2}`).value = `Total Procesos: ${this.filteredData.length}`;
      sheet.getCell(`A${infoStartRow + 2}`).font = { bold: true, size: 10 };

      // 3. TABLA
      const tableStartRow = 10;
      const headerRow = sheet.getRow(tableStartRow);
      
      const tableBorderStr = 'thin';
      const tableBorderColor = { argb: 'FFD3D3D3' };

      activeColumns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } }; // Header oscuro
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: tableBorderStr, color: tableBorderColor }, left: { style: tableBorderStr, color: tableBorderColor }, bottom: { style: tableBorderStr, color: tableBorderColor }, right: { style: tableBorderStr, color: tableBorderColor } };
        
        sheet.getColumn(idx + 1).width = (col.key === 'demandadoNombre' || col.key === 'despacho') ? 35 : 22;
      });

      this.filteredData.forEach((item, index) => {
        const currentRowIndex = tableStartRow + 1 + index;
        const currentRow = sheet.getRow(currentRowIndex);
        const rowFill = index % 2 !== 0 ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } } : null;

        activeColumns.forEach((col, colIndex) => {
          const cell = currentRow.getCell(colIndex + 1);
          let val = item[col.key];
          
          if (col.key.includes('fecha') || col.key.includes('Fecha')) val = this.datePipe.transform(val, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val);

          cell.value = val || '';
          cell.font = { size: 9, name: 'Arial', color: { argb: 'FF000000' } };
          cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
          cell.border = { top: { style: tableBorderStr, color: tableBorderColor }, left: { style: tableBorderStr, color: tableBorderColor }, bottom: { style: tableBorderStr, color: tableBorderColor }, right: { style: tableBorderStr, color: tableBorderColor } };
          if (rowFill) cell.fill = rowFill as ExcelJS.Fill;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

    } catch (error) {
      console.error('Error Excel:', error);
      alert('Error al generar Excel: ' + error);
    }
  }

  // --- EXPORTAR PDF (ESTILO PROFESIONAL) ---
  exportToPdf() {
    try {
      const activeColumns = this.exportColumns.filter(c => c.selected);
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;

      // Logo
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 3, 30, 30);

      // Encabezado
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE MIS PROCESOS JURÍDICOS', pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 22, { align: 'center' });

      // Info Cliente
      const infoStartY = 35;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`NIT Asociado: ${this.identificacionUsuario}`, margin, infoStartY);
      doc.text(`Total Procesos: ${this.filteredData.length}`, margin, infoStartY + 5);

      // Tabla
      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key];
          if (col.key.includes('fecha') || col.key.includes('Fecha')) val = this.datePipe.transform(val, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val);
          return val || '';
        });
      });

      autoTable(doc, {
        startY: infoStartY + 12,
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid',
        headStyles: { 
          fillColor: [52, 73, 94], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        styles: { 
          textColor: [0, 0, 0], 
          fontSize: 7, 
          cellPadding: 3,
          valign: 'middle',
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { top: 20 } 
      });

      doc.save(`Mis_Procesos_${new Date().getTime()}.pdf`);
      this.closeExportModal();

    } catch (error) {
      console.error('Error PDF:', error);
      alert('Error al generar PDF: ' + error);
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