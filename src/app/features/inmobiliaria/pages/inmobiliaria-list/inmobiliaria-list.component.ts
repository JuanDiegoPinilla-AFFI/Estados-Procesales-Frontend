import { Component, OnInit, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Agregado DatePipe
import { FormsModule } from '@angular/forms';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { FeatherModule } from 'angular-feather';
import { Title } from '@angular/platform-browser';

// --- LIBRERÍAS DE EXPORTACIÓN ---
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64'; // Ajusta la ruta si es necesario

import { InmobiliariaService, Inmobiliaria, ImportResult } from '../../services/inmobiliaria.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-inmobiliaria-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherModule],
  providers: [DatePipe], // Proveedor necesario para formatear fechas en el TS
  templateUrl: './inmobiliaria-list.component.html',
  styleUrls: ['./inmobiliaria-list.component.scss']
})
export class InmobiliariaListComponent implements OnInit {
  inmobiliarias: Inmobiliaria[] = [];
  loading = true;

  // Estados de Modales
  showEditModal = false;
  showImportModal = false;
  showExportModal = false; // Nuevo estado
  selectedInmo: Partial<Inmobiliaria> = {};

  // Estados de Importación
  currentFile: File | null = null;
  uploadProgress = 0;
  isUploading = false;
  importResult: ImportResult | null = null;
  dragOver = false;

  // Estados de Exportación
  exportState: 'idle' | 'excel' | 'pdf' = 'idle';
  exportColumns = [
    { key: 'nit', label: 'NIT', selected: true },
    { key: 'codigo', label: 'Código', selected: true },
    { key: 'nombreInmobiliaria', label: 'Nombre Inmobiliaria', selected: true },
    { key: 'departamento', label: 'Departamento', selected: true },
    { key: 'ciudad', label: 'Ciudad', selected: true },
    { key: 'telefono', label: 'Teléfono', selected: true },
    { key: 'emailContacto', label: 'Email Contacto', selected: true },
    { key: 'emailRegistrado', label: 'Usuario Asignado', selected: true },
    { key: 'fechaInicioFianza', label: 'Inicio Fianza', selected: true },
    { key: 'isActive', label: 'Estado', selected: true },
  ];

  // --- PAGINACIÓN ---
  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50];

  // --- FILTROS AVANZADOS ---
  filtros = {
    busquedaGeneral: '',
    nit: '',
    codigo: '',
    nombreInmobiliaria: '',
    departamento: '',
    ciudad: '',
    estado: '',
    tieneUsuario: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  stats = {
    total: 0,
    conUsuario: 0,
    pctConUsuario: 0,
    sinUsuario: 0,
    pctSinUsuario: 0,
    activos: 0,
    pctActivos: 0,
    inactivos: 0,
    pctInactivos: 0
  };

  private titleService = inject(Title);
  private datePipe = inject(DatePipe); // Inyección para uso en exportación

  // Listas para los dropdowns
  listaEstados = ['Activo', 'Inactivo'];
  listaTieneUsuario = ['Con Usuario', 'Sin Usuario'];
  listaDepartamentos: string[] = [];
  listaCiudades: string[] = [];
  activeDropdown: string | null = null;

  constructor(
    private inmoService: InmobiliariaService,
    public authService: AuthService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Inmobiliarias');
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.inmoService.getAll().subscribe({
      next: (data) => {
        this.inmobiliarias = data;
        this.extractUniqueLocations();
        this.calculateStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las inmobiliarias.' });
      }
    });
  }

  calculateStats() {
    const total = this.inmobiliarias.length;
    if (total === 0) return;

    const conUsuario = this.inmobiliarias.filter(i => i.emailRegistrado).length;
    const activos = this.inmobiliarias.filter(i => i.isActive).length;

    this.stats = {
      total,
      conUsuario,
      pctConUsuario: Math.round((conUsuario / total) * 100),
      sinUsuario: total - conUsuario,
      pctSinUsuario: Math.round(((total - conUsuario) / total) * 100),
      activos,
      pctActivos: Math.round((activos / total) * 100),
      inactivos: total - activos,
      pctInactivos: Math.round(((total - activos) / total) * 100)
    };
  }

  private extractUniqueLocations() {
    const deptos = new Set<string>();
    const ciudades = new Set<string>();
    this.inmobiliarias.forEach(inmo => {
      if (inmo.departamento) deptos.add(inmo.departamento);
      if (inmo.ciudad) ciudades.add(inmo.ciudad);
    });
    this.listaDepartamentos = Array.from(deptos).sort();
    this.listaCiudades = Array.from(ciudades).sort();
  }

  get filteredInmobiliarias() {
    return this.inmobiliarias.filter(inmo => {
      if (this.filtros.busquedaGeneral) {
        const term = this.filtros.busquedaGeneral.toLowerCase();
        const match = 
          inmo.nombreInmobiliaria.toLowerCase().includes(term) ||
          inmo.nit.includes(term) ||
          inmo.codigo.toLowerCase().includes(term) ||
          (inmo.ciudad && inmo.ciudad.toLowerCase().includes(term)) ||
          inmo.emailRegistrado?.toLowerCase().includes(term);
        if (!match) return false;
      }

      if (this.filtros.nit && !inmo.nit.includes(this.filtros.nit)) return false;
      if (this.filtros.codigo && !inmo.codigo.toLowerCase().includes(this.filtros.codigo.toLowerCase())) return false;
      if (this.filtros.nombreInmobiliaria && !inmo.nombreInmobiliaria.toLowerCase().includes(this.filtros.nombreInmobiliaria.toLowerCase())) return false;
      if (this.filtros.departamento && inmo.departamento !== this.filtros.departamento) return false;
      if (this.filtros.ciudad && inmo.ciudad !== this.filtros.ciudad) return false;

      if (this.filtros.fechaDesde || this.filtros.fechaHasta) {
        if (!inmo.fechaInicioFianza) return false;
        const fechaInmo = new Date(inmo.fechaInicioFianza).getTime();
        if (this.filtros.fechaDesde) {
          const desde = new Date(this.filtros.fechaDesde + 'T00:00:00').getTime();
          if (fechaInmo < desde) return false;
        }
        if (this.filtros.fechaHasta) {
          const hasta = new Date(this.filtros.fechaHasta + 'T23:59:59').getTime();
          if (fechaInmo > hasta) return false;
        }
      }

      if (this.filtros.estado) {
        const estadoInmo = inmo.isActive ? 'Activo' : 'Inactivo';
        if (estadoInmo !== this.filtros.estado) return false;
      }

      if (this.filtros.tieneUsuario) {
        const tieneUsuario = inmo.emailRegistrado ? 'Con Usuario' : 'Sin Usuario';
        if (tieneUsuario !== this.filtros.tieneUsuario) return false;
      }

      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = {
      busquedaGeneral: '',
      nit: '',
      codigo: '',
      nombreInmobiliaria: '',
      departamento: '',
      ciudad: '',
      fechaDesde: '',
      fechaHasta: '',
      estado: '',
      tieneUsuario: ''
    };
    this.currentPage = 1;
  }

  get paginatedInmobiliarias() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredInmobiliarias.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredInmobiliarias.length / this.itemsPerPage);
  }

  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }

  selectPageSize(size: number) {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.activeDropdown = null;
  }

  toggleDropdown(name: string, event: Event) {
    event.stopPropagation();
    this.activeDropdown = this.activeDropdown === name ? null : name;
  }

  selectFilterOption(filterKey: keyof typeof this.filtros, value: string) {
    // @ts-ignore
    this.filtros[filterKey] = value;
    this.activeDropdown = null;
    this.currentPage = 1;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.activeDropdown = null;
    }
  }

  // --- IMPORTACIÓN Y CRUD ---
  openImportModal() {
    this.showImportModal = true;
    this.resetImportState();
  }

  resetImportState() {
    this.currentFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.importResult = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.validateAndSetFile(file);
  }

  onDragOver(e: Event) { e.preventDefault(); e.stopPropagation(); this.dragOver = true; }
  onDragLeave(e: Event) { e.preventDefault(); e.stopPropagation(); this.dragOver = false; }
  onDrop(e: any) {
    e.preventDefault(); e.stopPropagation();
    this.dragOver = false;
    const file = e.dataTransfer.files[0];
    if (file) this.validateAndSetFile(file);
  }

  validateAndSetFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      AffiAlert.fire({ icon: 'warning', title: 'Archivo inválido', text: 'Solo se permiten archivos Excel (.xlsx, .xls)' });
      return;
    }
    this.currentFile = file;
  }

  uploadFile() {
    if (!this.currentFile) return;
    this.isUploading = true;
    this.uploadProgress = 0;

    this.inmoService.importInmobiliarias(this.currentFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          this.isUploading = false;
          this.importResult = event.body as ImportResult;
          this.loadData();
          AffiAlert.fire({ 
            icon: 'success', 
            title: 'Importación Exitosa', 
            text: 'La base de datos ha sido sincronizada.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        const msg = err.error?.message || 'Error al procesar el archivo.';
        AffiAlert.fire({ icon: 'error', title: 'Error de Importación', text: msg });
      }
    });
  }

  openEditModal(inmo: Inmobiliaria) {
    this.selectedInmo = { ...inmo };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.selectedInmo._id) return;
    const payload = {
      nombreInmobiliaria: this.selectedInmo.nombreInmobiliaria,
      nit: this.selectedInmo.nit,
      codigo: this.selectedInmo.codigo,
      departamento: this.selectedInmo.departamento,
      ciudad: this.selectedInmo.ciudad,
      telefono: this.selectedInmo.telefono,
      emailContacto: this.selectedInmo.emailContacto,
      fechaInicioFianza: this.selectedInmo.fechaInicioFianza,
      isActive: this.selectedInmo.isActive
    };

    this.inmoService.update(this.selectedInmo._id, payload).subscribe({
      next: (updated) => {
        const index = this.inmobiliarias.findIndex(i => i._id === updated._id);
        if (index !== -1) this.inmobiliarias[index] = updated;
        this.extractUniqueLocations(); 
        this.showEditModal = false;
        AffiAlert.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        const msg = err.error?.message || 'No se pudo guardar la información.';
        const textoError = Array.isArray(msg) ? msg.join(', ') : msg;
        AffiAlert.fire({ icon: 'error', title: 'Error al guardar', text: textoError });
      }
    });
  }

  toggleStatus(inmo: Inmobiliaria) {
    const accion = inmo.isActive ? 'desactivar' : 'activar';
    const consecuencia = inmo.isActive 
      ? 'Esto también BLOQUEARÁ el acceso al usuario asignado.' 
      : 'Esto reactivará también al usuario asignado.';

    AffiAlert.fire({
      title: '¿Estás seguro?',
      text: `Vas a ${accion} la inmobiliaria ${inmo.nombreInmobiliaria}. ${consecuencia}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        this.inmoService.toggleStatus(inmo._id).subscribe({
          next: () => {
            inmo.isActive = !inmo.isActive;
            AffiAlert.fire({ icon: 'success', title: 'Estado actualizado', timer: 1500, showConfirmButton: false });
          },
          error: () => AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Fallo al cambiar estado.' })
        });
      }
    });
  }

  closeModals() {
    this.showEditModal = false;
    this.showImportModal = false;
    this.showExportModal = false;
    this.resetImportState();
  }

  // =========================================================
  // LOGICA DE EXPORTACIÓN (EXCEL & PDF)
  // =========================================================

  openExportModal() { this.showExportModal = true; }
  closeExportModal() { this.showExportModal = false; }
  
  toggleColumn(colKey: string) {
    const col = this.exportColumns.find(c => c.key === colKey);
    if (col) col.selected = !col.selected;
  }
  
  selectAllColumns(select: boolean) { 
    this.exportColumns.forEach(c => c.selected = select); 
  }

  get hasSelectedColumns(): boolean {
    return this.exportColumns.some(col => col.selected);
  }

  async exportToExcel() {
    if (!this.hasSelectedColumns) {
      AffiAlert.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona al menos una columna para exportar.' });
      return;
    }

    this.exportState = 'excel';
    await new Promise(r => setTimeout(r, 100)); // UI Refresh

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inmobiliarias');
      const activeColumns = this.exportColumns.filter(c => c.selected);

      // Estilos Generales
      sheet.columns = activeColumns.map(() => ({ width: 25 }));
      
      // Logo
      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 90, height: 90 } });

      // Título
      const titleRow = sheet.getRow(2);
      titleRow.getCell(3).value = 'LISTADO DE INMOBILIARIAS';
      titleRow.getCell(3).font = { bold: true, size: 14, name: 'Calibri' };
      
      // Info Extra
      const subTitleRow = sheet.getRow(3);
      subTitleRow.getCell(3).value = `Fecha de generación: ${this.datePipe.transform(new Date(), "d 'de' MMMM 'de' yyyy")}`;
      
      sheet.getRow(5).getCell(1).value = `Total Registros Exportados: ${this.filteredInmobiliarias.length}`;
      sheet.getRow(5).getCell(1).font = { bold: true };

      // Encabezados de Tabla
      const headerRowIndex = 8;
      const headerRow = sheet.getRow(headerRowIndex);
      
      activeColumns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      // Datos
      this.filteredInmobiliarias.forEach((inmo, idx) => {
        const rowIndex = headerRowIndex + 1 + idx;
        const row = sheet.getRow(rowIndex);

        activeColumns.forEach((col, colIndex) => {
          let val: any = inmo[col.key as keyof Inmobiliaria];

          // Formateo según tipo
          if (col.key === 'isActive') val = val ? 'ACTIVO' : 'INACTIVO';
          if (col.key === 'fechaInicioFianza') val = this.datePipe.transform(val, 'yyyy-MM-dd') || '';
          if (col.key === 'emailRegistrado') val = val || 'SIN USUARIO';

          const cell = row.getCell(colIndex + 1);
          cell.value = val;
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = { top: {style:'thin', color: {argb:'FFCCCCCC'}}, left: {style:'thin', color: {argb:'FFCCCCCC'}}, bottom: {style:'thin', color: {argb:'FFCCCCCC'}}, right: {style:'thin', color: {argb:'FFCCCCCC'}} };
          
          if (col.key === 'isActive') {
            cell.font = { color: { argb: val === 'ACTIVO' ? 'FF166534' : 'FF991B1B' }, bold: true };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

      AffiAlert.fire({ icon: 'success', title: 'Excel Generado', timer: 2000, showConfirmButton: false });

    } catch (error) {
      console.error(error);
      AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el archivo Excel.' });
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportToPdf() {
    if (!this.hasSelectedColumns) {
       AffiAlert.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona al menos una columna.' });
       return;
    }

    this.exportState = 'pdf';
    await new Promise(r => setTimeout(r, 100));

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const activeColumns = this.exportColumns.filter(c => c.selected);
      
      // Encabezado
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', 10, 5, 20, 20);
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('LISTADO DE INMOBILIARIAS', 105, 15, { align: 'center' });
      
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(`Generado el: ${this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 20, { align: 'center' });
      doc.text(`Registros: ${this.filteredInmobiliarias.length}`, 14, 30);

      const bodyData = this.filteredInmobiliarias.map(inmo => {
        return activeColumns.map(col => {
          let val: any = inmo[col.key as keyof Inmobiliaria];
          if (col.key === 'isActive') return val ? 'ACTIVO' : 'INACTIVO';
          if (col.key === 'fechaInicioFianza') return this.datePipe.transform(val, 'yyyy-MM-dd') || '';
          if (col.key === 'emailRegistrado') return val || '-';
          return val || '';
        });
      });

      autoTable(doc, {
        startY: 35,
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [31, 78, 120], textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 'auto' } } // Ajuste automático básico
      });

      doc.save(`Listado_Inmobiliarias_${new Date().getTime()}.pdf`);
      this.closeExportModal();
      AffiAlert.fire({ icon: 'success', title: 'PDF Generado', timer: 2000, showConfirmButton: false });

    } catch (error) {
      console.error(error);
      AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF.' });
    } finally {
      this.exportState = 'idle';
    }
  }

  private saveFile(buffer: any, extension: string) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inmobiliarias_Affi_${new Date().getTime()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }
}