import { Component, OnInit, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { FeatherModule } from 'angular-feather';
import { Title } from '@angular/platform-browser';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';
import { InmobiliariaService, Inmobiliaria, ImportResult, InmobiliariaEstadisticasProcesos } from '../../services/inmobiliaria.service';import { AffiAlert } from '../../../../shared/services/affi-alert';
import { AuthService } from '../../../auth/services/auth.service';
import type * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-inmobiliaria-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherModule],
  providers: [DatePipe],
  templateUrl: './inmobiliaria-list.component.html',
  styleUrls: ['./inmobiliaria-list.component.scss']
})
export class InmobiliariaListComponent implements OnInit {
  inmobiliarias: Inmobiliaria[] = [];
  loading = true;
  isSendingEmail = false;
  isProcessingServer = false;

  showEditModal = false;
  showImportModal = false;
  showExportModal = false;

  selectedInmo: Partial<Inmobiliaria> = {};
  currentFile: File | null = null;
  uploadProgress = 0;
  isUploading = false;
  importResult: ImportResult | null = null;
  dragOver = false;
  exportState: 'idle' | 'excel' | 'pdf' = 'idle';

  exportColumns = [
    { key: 'nit', label: 'NIT', selected: true },
    { key: 'codigo', label: 'Código', selected: true },
    { key: 'tieneProcesos', label: '¿Tiene Procesos?', selected: true },
    { key: 'nombreInmobiliaria', label: 'Nombre Inmobiliaria', selected: true },
    { key: 'departamento', label: 'Departamento', selected: true },
    { key: 'ciudad', label: 'Municipio', selected: true },
    { key: 'telefono', label: 'Teléfono', selected: true },
    { key: 'emailContacto', label: 'Correo de Contacto', selected: true },
    { key: 'emailRegistrado', label: 'Usuario Asignado', selected: true },
    { key: 'nombreRepresentante', label: 'Nombre Rep. Legal', selected: true },
    { key: 'emailRepresentante', label: 'Email Rep. Legal', selected: true },
    { key: 'fechaInicioFianza', label: 'Inicio Fianza', selected: true },
    { key: 'isActive', label: 'Estado', selected: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;

  pageSizeOptions = [5, 10, 20, 50];
  filtros = {
    busquedaGeneral: '',
    nit: '',
    codigo: '',
    nombreInmobiliaria: '',
    departamento: '',
    ciudad: '',
    estado: '',
    tieneUsuario: '',
    tieneProcesos: '',
    fechaDesde: '',
    fechaHasta: ''
  };
  showAdvancedFilters = false;

  listaTieneProcesos = ['Sí', 'No'];

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

  estadisticasProcesos: InmobiliariaEstadisticasProcesos | null = null;
  loadingEstadisticasProcesos = false;

  private titleService = inject(Title);
  private datePipe = inject(DatePipe);

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
    
    if (this.authService.hasPermission('inmo:view') || this.authService.isAdmin()) {
      this.loadEstadisticasProcesos();
    }
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
      pctConUsuario: Math.round((conUsuario / total) * 100 * 100) / 100,
      sinUsuario: total - conUsuario,
      pctSinUsuario: Math.round(((total - conUsuario) / total) * 100 * 100) / 100,
      activos,
      pctActivos: Math.round((activos / total) * 100 * 100) / 100,
      inactivos: total - activos,
      pctInactivos: Math.round(((total - activos) / total) * 100 * 100) / 100
    };
  }

  loadEstadisticasProcesos() {
    this.loadingEstadisticasProcesos = true;
    this.inmoService.getEstadisticasConProcesos().subscribe({
      next: (data) => {
        this.estadisticasProcesos = data;
        this.loadingEstadisticasProcesos = false;
      },
      error: (err) => {
        console.error('Error cargando estadísticas de procesos:', err);
        this.estadisticasProcesos = null;
        this.loadingEstadisticasProcesos = false;
      }
    });
  }

  onSendReminder() {
    AffiAlert.fire({
      title: '¿Enviar recordatorio?',
      text: 'Se enviará un correo electrónico a los encargados para recordarles realizar la importación.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, enviar correo',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
      this.isSendingEmail = true;

      this.inmoService.triggerImportReminder().subscribe({
        next: () => {
          this.isSendingEmail = false;
          AffiAlert.fire({
            icon: 'success',
            title: 'Enviado',
            text: 'El recordatorio de importación se ha enviado correctamente.',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (err: any) => { 
          this.isSendingEmail = false;
          console.error(err);
          AffiAlert.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo enviar el recordatorio.'
            });
          }
        });
      }
    });
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

      if (this.filtros.tieneProcesos) {
        const tiene = inmo.tieneProcesos ? 'Sí' : 'No';
        if (tiene !== this.filtros.tieneProcesos) return false;
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
      tieneProcesos: '',
      estado: '',
      tieneUsuario: ''
    };
    this.currentPage = 1;
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
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

  openImportModal() {
    this.showImportModal = true;
    this.resetImportState();
  }

  resetImportState() {
    this.currentFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.isProcessingServer = false;
    this.importResult = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.validateAndSetFile(file);
    }
    
    event.target.value = ''; 
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
    this.isProcessingServer = false;
    this.uploadProgress = 0;

    this.inmoService.importInmobiliarias(this.currentFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
          if (this.uploadProgress === 100) {
            this.isProcessingServer = true;
          }
        } else if (event instanceof HttpResponse) {
          this.isUploading = false;
          this.isProcessingServer = false;
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
      nombreRepresentante: this.selectedInmo.nombreRepresentante,
      emailRepresentante: this.selectedInmo.emailRepresentante,
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
    await new Promise(r => setTimeout(r, 100));

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inmobiliarias');
      const activeColumns = this.exportColumns.filter(c => c.selected);

      // ==========================================
      // 1. LOGO Y TÍTULO
      // ==========================================
      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 100 } });

      const totalCols = Math.max(activeColumns.length, 8);
      sheet.mergeCells(2, 3, 2, totalCols);
      const titleCell = sheet.getCell(2, 3);
      titleCell.value = 'LISTADO DE INMOBILIARIAS';
      titleCell.font = { bold: true, size: 16, name: 'Calibri' };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(3, 3, 3, totalCols);
      const dateCell = sheet.getCell(3, 3);
      dateCell.value = `Fecha de generación: ${this.datePipe.transform(new Date(), "d 'de' MMMM 'de' yyyy")}`;
      dateCell.font = { size: 11, name: 'Calibri' };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // ==========================================
      // 2. TARJETAS DE ESTADÍSTICAS (TEXTOS MEJORADOS)
      // ==========================================
      let currentRow = 6;
      const CORPORATE_COLOR = 'FF260086'; // Azul oscuro
      const cardsTotalCols = 8;

      let startCol = 1;
      if (activeColumns.length > cardsTotalCols) {
        startCol = Math.floor((activeColumns.length - cardsTotalCols) / 2) + 1;
      }

      const createStatBox = (colOffset: number, row: number, title: string, value: string) => {
        const startColBox = startCol + colOffset;
        const endColBox = startColBox + 1;

        const invisibleBorder: Partial<ExcelJS.Borders> = {
          top: { style: 'thin', color: { argb: CORPORATE_COLOR } },
          left: { style: 'thin', color: { argb: CORPORATE_COLOR } },
          bottom: { style: 'thin', color: { argb: CORPORATE_COLOR } },
          right: { style: 'thin', color: { argb: CORPORATE_COLOR } }
        };

        // Título
        sheet.mergeCells(row, startColBox, row, endColBox);
        const titleCell = sheet.getCell(row, startColBox);
        titleCell.value = title;
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORPORATE_COLOR } };
        titleCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.border = invisibleBorder;

        // Valor (Con salto de línea)
        const valRow = row + 1;
        sheet.mergeCells(valRow, startColBox, valRow, endColBox);
        const valueCell = sheet.getCell(valRow, startColBox);
        valueCell.value = value;
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORPORATE_COLOR } };
        // Reducimos un poco la fuente (size 12) para que quepan bien las dos líneas
        valueCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        valueCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        valueCell.border = invisibleBorder;

        sheet.getRow(row).height = 25;
        sheet.getRow(valRow).height = 35; // Aumentamos altura para que quepan 2 líneas
      };

      // --- PRIMERA FILA (TEXTOS INTUITIVOS) ---
      createStatBox(0, currentRow, 'TOTAL INMOBILIARIAS', `${this.stats.total}\nRegistros Totales`);
      createStatBox(2, currentRow, 'CON USUARIO', `${this.stats.conUsuario}\n(${this.stats.pctConUsuario}% Asignados)`);
      createStatBox(4, currentRow, 'SIN USUARIO', `${this.stats.sinUsuario}\n(${this.stats.pctSinUsuario}% Pendientes)`);
      createStatBox(6, currentRow, 'ESTADO OPERATIVO', `${this.stats.activos} Activas\n(${this.stats.pctActivos}% del total)`);

      currentRow += 3;

      // --- SEGUNDA FILA ---
      if (this.estadisticasProcesos) {
        createStatBox(0, currentRow, 'INMOBILIARIAS CON PROCESOS', `${this.estadisticasProcesos.totalInmobiliariasConProcesos}\nRegistros Totales`);
        createStatBox(2, currentRow, 'PROCESOS - ACTIVAS', `${this.estadisticasProcesos.activas.cantidad}\n(${this.estadisticasProcesos.activas.porcentaje}% Activas)`);
        createStatBox(4, currentRow, 'PROCESOS - INACTIVAS', `${this.estadisticasProcesos.inactivas.cantidad}\n(${this.estadisticasProcesos.inactivas.porcentaje}% Inactivas)`);
        createStatBox(6, currentRow, 'OTROS DEMANDANTES', `${this.estadisticasProcesos.otrosDemandantes.cantidad}\n(${this.estadisticasProcesos.otrosDemandantes.porcentaje}% Externos)`);
        currentRow += 3;
      }

      // "Total Registros" fijo a la IZQUIERDA
      sheet.mergeCells(currentRow, 1, currentRow, 4);
      const totalCell = sheet.getCell(currentRow, 1);
      totalCell.value = `Total Registros Exportados: ${this.filteredInmobiliarias.length}`;
      totalCell.font = { bold: true, size: 12 };
      totalCell.alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getRow(currentRow).height = 25;

      // ==========================================
      // 3. TABLA DE DATOS
      // ==========================================
      const headerRowIndex = currentRow + 2;
      const headerRow = sheet.getRow(headerRowIndex);

      activeColumns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORPORATE_COLOR } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      sheet.getRow(headerRowIndex).height = 25;

      this.filteredInmobiliarias.forEach((inmo, idx) => {
        const rowIndex = headerRowIndex + 1 + idx;
        const row = sheet.getRow(rowIndex);

        activeColumns.forEach((col, colIndex) => {
          let val: any = inmo[col.key as keyof Inmobiliaria];
          if (col.key === 'isActive') val = val ? 'ACTIVO' : 'INACTIVO';
          if (col.key === 'fechaInicioFianza') val = this.datePipe.transform(val, 'yyyy-MM-dd') || '';
          if (col.key === 'emailRegistrado') val = val || 'SIN USUARIO';
          if (col.key === 'tieneProcesos') val = val ? 'SÍ' : 'NO';

          const cell = row.getCell(colIndex + 1);
          cell.value = val;
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };

          if (col.key === 'isActive') {
            cell.font = { color: { argb: val === 'ACTIVO' ? 'FF166534' : 'FF991B1B' }, bold: true };
          }

          if (col.key === 'tieneProcesos' && val === 'NO') {
            cell.font = { color: { argb: 'FFFF0000' }, bold: true };
          }
        });
        // Sin row.height fijo para permitir auto-ajuste
      });

      // 4. AJUSTE DE ANCHO INTELIGENTE
      activeColumns.forEach((col, index) => {
        let maxLen = 12;
        if (col.label.length > maxLen) maxLen = col.label.length;

        this.filteredInmobiliarias.forEach(inmo => {
          let val: any = inmo[col.key as keyof Inmobiliaria];
          if (col.key === 'isActive') val = val ? 'ACTIVO' : 'INACTIVO';
          if (col.key === 'fechaInicioFianza') val = this.datePipe.transform(val, 'yyyy-MM-dd') || '';
          if (col.key === 'emailRegistrado') val = val || 'SIN USUARIO';

          const cellLength = String(val || '').length;
          if (cellLength > maxLen) maxLen = cellLength;
        });

        sheet.getColumn(index + 1).width = Math.min(maxLen + 2, 50);
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
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const activeColumns = this.exportColumns.filter(c => c.selected);

      // Configuración
      const pageWidth = 297;
      const marginX = 14;

      // Logo y Título
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', 10, 5, 20, 20);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTADO DE INMOBILIARIAS', pageWidth / 2, 12, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${this.datePipe.transform(new Date(), "d 'de' MMMM 'de' yyyy")}`, pageWidth / 2, 18, { align: 'center' });

      // ==========================================
      // TARJETAS (TEXTOS DESCRIPTIVOS)
      // ==========================================
      let yPosition = 28;
      const boxWidth = 60;
      const boxHeight = 15;
      const boxSpacing = 3;

      const totalRowWidth = (boxWidth * 4) + (boxSpacing * 3);
      let xPosition = (pageWidth - totalRowWidth) / 2;

      const CORPORATE_RGB = [38, 0, 134];
      const TEXT_WHITE = [255, 255, 255];

      const createStatBox = (x: number, y: number, title: string, valueLine1: string, valueLine2: string) => {
        doc.setFillColor(CORPORATE_RGB[0], CORPORATE_RGB[1], CORPORATE_RGB[2]);
        doc.rect(x, y, boxWidth, boxHeight, 'F');

        // Título pequeño arriba
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(TEXT_WHITE[0], TEXT_WHITE[1], TEXT_WHITE[2]);
        doc.text(title, x + boxWidth / 2, y + 4, { align: 'center' });

        // Valor Grande (Línea 1)
        doc.setFontSize(11);
        doc.text(valueLine1, x + boxWidth / 2, y + 9, { align: 'center' });

        // Descripción pequeña (Línea 2)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(valueLine2, x + boxWidth / 2, y + 12.5, { align: 'center' });
      };

      // --- FILA 1 ---
      createStatBox(xPosition, yPosition, 'TOTAL INMOBILIARIAS', this.stats.total.toString(), 'Registros Totales');
      xPosition += boxWidth + boxSpacing;

      createStatBox(xPosition, yPosition, 'CON USUARIO', this.stats.conUsuario.toString(), `${this.stats.pctConUsuario}% Asignados`);
      xPosition += boxWidth + boxSpacing;

      createStatBox(xPosition, yPosition, 'SIN USUARIO', this.stats.sinUsuario.toString(), `${this.stats.pctSinUsuario}% Pendientes`);
      xPosition += boxWidth + boxSpacing;

      createStatBox(xPosition, yPosition, 'ESTADO OPERATIVO', `${this.stats.activos} Activas`, `${this.stats.pctActivos}% del total`);

      // --- FILA 2 ---
      if (this.estadisticasProcesos) {
        yPosition += boxHeight + boxSpacing + 2;
        xPosition = (pageWidth - totalRowWidth) / 2;

        createStatBox(xPosition, yPosition, 'INMOBILIARIAS CON PROCESOS', this.estadisticasProcesos.totalInmobiliariasConProcesos.toString(), 'Registros Totales');
        xPosition += boxWidth + boxSpacing;

        createStatBox(xPosition, yPosition, 'PROCESOS - ACTIVAS', this.estadisticasProcesos.activas.cantidad.toString(), `${this.estadisticasProcesos.activas.porcentaje}% Activas`);
        xPosition += boxWidth + boxSpacing;

        createStatBox(xPosition, yPosition, 'PROCESOS - INACTIVAS', this.estadisticasProcesos.inactivas.cantidad.toString(), `${this.estadisticasProcesos.inactivas.porcentaje}% Inactivas`);
        xPosition += boxWidth + boxSpacing;

        createStatBox(xPosition, yPosition, 'OTROS DEMANDANTES', this.estadisticasProcesos.otrosDemandantes.cantidad.toString(), `${this.estadisticasProcesos.otrosDemandantes.porcentaje}% Externos`);
      }

      // Espacio antes de tabla
      yPosition += boxHeight + 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Registros Exportados: ${this.filteredInmobiliarias.length}`, marginX, yPosition);
      yPosition += 7;

      // TABLA
      const bodyData = this.filteredInmobiliarias.map(inmo => {
        return activeColumns.map(col => {
          let val: any = inmo[col.key as keyof Inmobiliaria];
          if (col.key === 'tieneProcesos') return val ? 'SÍ' : 'NO';
          if (col.key === 'isActive') return val ? 'ACTIVO' : 'INACTIVO';
          if (col.key === 'fechaInicioFianza') return this.datePipe.transform(val, 'yyyy-MM-dd') || '';
          if (col.key === 'emailRegistrado') return val || 'SIN USUARIO';
          return val || '';
        });
      });

      autoTable(doc, {
        startY: yPosition,
        head: [activeColumns.map(c => c.label)],
        body: bodyData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: CORPORATE_RGB as any, textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: marginX, right: marginX },
        columnStyles: { 0: { cellWidth: 'auto' } }
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