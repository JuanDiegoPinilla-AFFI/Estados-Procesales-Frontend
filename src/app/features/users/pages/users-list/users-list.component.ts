import { InmobiliariaService, InmobiliariaEstadisticasUsuarios } from '../../../inmobiliaria/services/inmobiliaria.service';
import { HostListener, ElementRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, User } from '../../services/users.service';
import { InmobiliariaLookupService, InmobiliariaLookup } from '../../services/inmobiliaria-lockup.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { FeatherModule } from 'angular-feather';
import { RegisterPayload } from '../../../auth/services/auth.service';
import { Title } from '@angular/platform-browser';

import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatherModule],
  providers: [DatePipe],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})

export class UsersListComponent implements OnInit {
  private titleService = inject(Title);
  private datePipe = inject(DatePipe);

  users: User[] = [];
  filteredUsers: User[] = [];
  inmobiliarias: InmobiliariaLookup[] = [];
  loading = true;

  stats = {
    total: 0,
    staff: 0,
    pctStaff: 0,
    clients: 0,
    pctClients: 0,
    active: 0,
    pctActive: 0,
    inactive: 0,
    pctInactive: 0
  };

estadisticasInmoUsuarios: InmobiliariaEstadisticasUsuarios | null = null;
loadingEstadisticasInmoUsuarios = false;

  showEditModal = false;
  showPermissionsModal = false;
  showExportModal = false;

  selectedUser: Partial<User> = {};
  userPassword = '';
  isCreating = false;
  selectedInmoId: string = '';

  exportState: 'idle' | 'excel' | 'pdf' = 'idle';
  exportColumns = [
    { key: 'name', label: 'Nombre', selected: true },
    { key: 'email', label: 'Correo', selected: true },
    { key: 'role', label: 'Rol', selected: true },
    { key: 'nombreInmobiliaria', label: 'Empresa', selected: true },
    { key: 'nit', label: 'NIT', selected: true },
    { key: 'isActive', label: 'Estado', selected: true },
  ];

  currentPage = 1;
  itemsPerPage = 10;
  pageSizeOptions = [5, 10, 20, 50];

  readonly DEFAULT_PERMISSIONS: Record<string, string[]> = {
    'admin': [],
    'affi': ['reports:view', 'utils:export', 'procesos:view_all'],
    'inmobiliaria': ['procesos:view_own', 'utils:export']
  };

  filtros = {
    busquedaGeneral: '',
    rol: '',
    estado: '',
    nit: '',
    nombreInmobiliaria: ''
  };

  listaRoles: string[] = [];
  listaEstados = ['Activo', 'Inactivo'];
  activeDropdown: string | null = null;

  availableRoles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'affi', label: 'Colaborador Affi' },
    { value: 'gerente_comercial', label: 'Gerente Comercial' },
    { value: 'director_comercial', label: 'Director Comercial' },
    { value: 'gerente_cuenta', label: 'Gerente de Cuenta' },
    { value: 'inmobiliaria', label: 'Inmobiliaria' }
  ];

  availablePermissions = [
    { key: 'users:view', label: 'Ver Usuarios' },
    { key: 'users:create', label: 'Crear Usuarios' },
    { key: 'users:edit', label: 'Editar Usuarios' },
    { key: 'users:activate', label: 'Activar/Desactivar Usuarios' },
    { key: 'inmo:view', label: 'Ver Inmobiliarias' },
    { key: 'inmo:create', label: 'Crear Inmobiliarias' },
    { key: 'inmo:edit', label: 'Editar Inmobiliarias' },
    { key: 'inmo:activate', label: 'Activar/Desactivar Inmobiliarias' },
    { key: 'inmo:import', label: 'Importar Inmobiliarias' },
    { key: 'procesos:view_all', label: 'Ver TODOS los Procesos (Global)' },
    { key: 'procesos:view_own', label: 'Ver Mis Procesos (Propio)' },
    { key: 'reports:view', label: 'Ver Reportes' },
    { key: 'utils:export', label: 'Exportar Datos' },
    { key: 'call:create', label: 'Crear Llamadas' }
  ];

  tempPermissions: string[] = [];
  isDropdownOpen = false;
  inmoSearchTerm = '';

constructor(
  private usersService: UsersService,
  private inmoLookupService: InmobiliariaLookupService,
  private elementRef: ElementRef,
  private inmobiliariaService: InmobiliariaService  
) {}

ngOnInit() {
  this.titleService.setTitle('Estados Procesales - Usuarios');
  this.loadUsers();
  this.loadInmobiliarias();
  this.loadEstadisticasInmoUsuarios();
}
  loadUsers() {
    this.loading = true;
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.extraerListasUnicas();
        this.applyFilters();
        this.calculateStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Error cargando usuarios.' });
      }
    });
  }

  calculateStats() {
    const total = this.users.length;
    if (total === 0) return;

    const staff = this.users.filter(u => u.role === 'admin' || u.role === 'affi').length;
    const clients = this.users.filter(u => u.role === 'inmobiliaria').length;
    const active = this.users.filter(u => u.isActive).length;

    this.stats = {
      total,
      staff,
      pctStaff: Math.round((staff / total) * 100),
      clients,
      pctClients: Math.round((clients / total) * 100),
      active,
      pctActive: Math.round((active / total) * 100),
      inactive: total - active,
      pctInactive: Math.round(((total - active) / total) * 100)
    };
  }

  /**
 * Carga estadísticas de inmobiliarias con procesos según estado de usuario
 * Muestra cuántas inmobiliarias con procesos tienen usuario activo vs inactivo
 */
loadEstadisticasInmoUsuarios() {
  console.log('[UsersList] Iniciando carga de estadísticas de inmobiliarias con usuarios');
  this.loadingEstadisticasInmoUsuarios = true;
  this.inmobiliariaService.getEstadisticasUsuariosConProcesos().subscribe({
    next: (data) => {
      console.log('[UsersList] Estadísticas cargadas:', data);
      this.estadisticasInmoUsuarios = data;
      this.loadingEstadisticasInmoUsuarios = false;
    },
    error: (err) => {
      console.error('[UsersList] Error cargando estadísticas:', err);
      this.estadisticasInmoUsuarios = null;
      this.loadingEstadisticasInmoUsuarios = false;
    }
  });
}

  loadInmobiliarias() {
    this.inmoLookupService.getAll().subscribe({
      next: (data) => this.inmobiliarias = data,
      error: () => console.error('Error cargando inmobiliarias')
    });
  }

  extraerListasUnicas() {
    const rolesSet = new Set<string>();
    this.users.forEach(user => {
      if (user.role) {
        const roleLabel = this.availableRoles.find(r => r.value === user.role)?.label || user.role;
        rolesSet.add(roleLabel);
      }
    });
    this.listaRoles = Array.from(rolesSet).sort();
  }

  hasCustomPermissions(user: User): boolean {
    if (!user.role) return false;
    const defaults = this.DEFAULT_PERMISSIONS[user.role] || [];
    const current = user.permissions || [];
    if (current.length !== defaults.length) return true;
    
    const sortedDefaults = [...defaults].sort();
    const sortedCurrent = [...current].sort();
    
    return JSON.stringify(sortedDefaults) !== JSON.stringify(sortedCurrent);
  }

  applyFilters() {
    let data = this.users;

    if (this.filtros.busquedaGeneral) {
      const term = this.filtros.busquedaGeneral.toLowerCase();
      data = data.filter(user =>
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.nit?.includes(term) ||
        user.nombreInmobiliaria?.toLowerCase().includes(term)
      );
    }

    if (this.filtros.rol) {
      const roleLabel = (u: User) => this.availableRoles.find(r => r.value === u.role)?.label || u.role;
      data = data.filter(user => roleLabel(user) === this.filtros.rol);
    }

    if (this.filtros.estado) {
      const estadoUsuario = (u: User) => u.isActive ? 'Activo' : 'Inactivo';
      data = data.filter(user => estadoUsuario(user) === this.filtros.estado);
    }

    if (this.filtros.nit) {
      data = data.filter(user => user.nit?.includes(this.filtros.nit));
    }

    if (this.filtros.nombreInmobiliaria) {
      const termInmo = this.filtros.nombreInmobiliaria.toLowerCase();
      data = data.filter(user => user.nombreInmobiliaria?.toLowerCase().includes(termInmo));
    }

    this.filteredUsers = data;
    this.currentPage = 1;
  }

  limpiarFiltros() {
    this.filtros = {
      busquedaGeneral: '',
      rol: '',
      estado: '',
      nit: '',
      nombreInmobiliaria: ''
    };
    this.applyFilters();
  }

  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() { return Math.ceil(this.filteredUsers.length / this.itemsPerPage) || 1; }

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

  selectFilterOption(filterKey: 'rol' | 'estado', value: string) {
    this.filtros[filterKey] = value;
    this.activeDropdown = null;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.activeDropdown = null;
      this.isDropdownOpen = false;
    }
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
      AffiAlert.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona al menos una columna.' });
      return;
    }

    this.exportState = 'excel';
    await new Promise(r => setTimeout(r, 100));

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Usuarios');
      const activeColumns = this.exportColumns.filter(c => c.selected);

      sheet.columns = activeColumns.map(() => ({ width: 25 }));

      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 90, height: 90 } });

      sheet.getRow(2).getCell(3).value = 'REPORTE DE USUARIOS DEL SISTEMA';
      sheet.getRow(3).getCell(3).value = `Generado el: ${this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm')}`;

      const headerRow = sheet.getRow(8);
      activeColumns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      this.filteredUsers.forEach((user, idx) => {
        const row = sheet.getRow(9 + idx);
        activeColumns.forEach((col, colIndex) => {
          let val: any = user[col.key as keyof User];

          if (col.key === 'role') val = this.availableRoles.find(r => r.value === val)?.label || val;
          if (col.key === 'isActive') val = val ? 'ACTIVO' : 'INACTIVO';

          row.getCell(colIndex + 1).value = val || '';
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

    } catch (error) {
      AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Error generando Excel.' });
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportToPdf() {
    if (!this.hasSelectedColumns) {
      AffiAlert.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona al menos una columna.' });
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const activeColumns = this.exportColumns.filter(c => c.selected);

      doc.addImage(AFFI_LOGO_BASE64, 'PNG', 10, 5, 20, 20);
      doc.text('REPORTE DE USUARIOS', 105, 15, { align: 'center' });

      const bodyData = this.filteredUsers.map(user => {
        return activeColumns.map(col => {
          let val: any = user[col.key as keyof User];
          if (col.key === 'role') return this.availableRoles.find(r => r.value === val)?.label || val;
          if (col.key === 'isActive') return val ? 'ACTIVO' : 'INACTIVO';
          return val || '';
        });
      });

      autoTable(doc, { startY: 30, head: [activeColumns.map(c => c.label)], body: bodyData });
      doc.save('Usuarios_Affi.pdf');
      this.closeExportModal();

    } catch (error) {
      AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Error generando PDF.' });
    } finally {
      this.exportState = 'idle';
    }
  }

  private saveFile(buffer: any, extension: string) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Usuarios_Affi_${new Date().getTime()}.${extension}`;
    link.click();
  }

  toggleDropdownInmo() {
    if (this.selectedUser.role === 'inmobiliaria' || this.isCreating) {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
    if (this.isDropdownOpen) this.inmoSearchTerm = '';
  }

  get filteredInmobiliarias() {
    if (this.selectedUser.role !== 'inmobiliaria') return [];
    return this.inmobiliarias.filter(inmo => {
      if (!inmo.emailRegistrado) return true;
      if (!this.isCreating && inmo.nit === this.selectedUser.nit) return true;
      return false;
    });
  }

  get searchableInmobiliarias() {
    const term = this.inmoSearchTerm.toLowerCase();
    return this.filteredInmobiliarias.filter(inmo =>
      inmo.nombreInmobiliaria.toLowerCase().includes(term) || inmo.nit.includes(term)
    );
  }

  selectInmobiliaria(inmo: InmobiliariaLookup) {
    this.selectedInmoId = inmo._id;
    this.selectedUser.nombreInmobiliaria = inmo.nombreInmobiliaria;
    this.selectedUser.nit = inmo.nit;
    this.selectedUser.codigoInmobiliaria = inmo.codigo;
    this.isDropdownOpen = false;
  }

  openEditModal(user: User | null) {
    this.selectedInmoId = '';
    if (user) {
      this.isCreating = false;
      this.selectedUser = { ...user };
      this.userPassword = '';
      if (this.selectedUser.role === 'inmobiliaria') {
        const found = this.inmobiliarias.find(i => i.nit === this.selectedUser.nit);
        if (found) this.selectedInmoId = found._id;
      }
    } else {
      this.isCreating = true;
      this.selectedUser = { role: 'inmobiliaria', isActive: true, name: '', email: '', nit: '', codigoInmobiliaria: '', nombreInmobiliaria: '' };
      this.userPassword = '';
    }
    this.showEditModal = true;
  }

  onRoleChange(newRole: string) {
    this.selectedUser.role = newRole;
    this.selectedInmoId = '';
    if (newRole === 'admin' || newRole === 'affi') {
      this.selectedUser.nit = '900053370';
      this.selectedUser.codigoInmobiliaria = 'AFFI';
      this.selectedUser.nombreInmobiliaria = 'AFFI';
    } else {
      this.selectedUser.nit = '';
      this.selectedUser.codigoInmobiliaria = '';
      this.selectedUser.nombreInmobiliaria = '';
    }
  }

  saveEditUser() {
    if (this.isCreating) this.createUser(); else this.updateUser();
  }

  createUser() {
    if (!this.selectedUser.email || !this.userPassword || !this.selectedUser.name) {
      AffiAlert.fire({ icon: 'warning', title: 'Faltan datos', text: 'Campos obligatorios vacíos.' });
      return;
    }
    const payload: RegisterPayload = {
      name: this.selectedUser.name!,
      email: this.selectedUser.email!,
      password: this.userPassword,
      role: this.selectedUser.role,
      nit: this.selectedUser.nit,
      codigoInmobiliaria: this.selectedUser.codigoInmobiliaria
    };
    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.showEditModal = false;
        const inmo = this.inmobiliarias.find(i => i.nit === payload.nit);
        if (inmo) inmo.emailRegistrado = payload.email;
        AffiAlert.fire({ icon: 'success', title: 'Usuario creado', text: 'Se ha enviado el correo de activación.', timer: 2000 });
        this.loadUsers();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al crear usuario.';
        AffiAlert.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  updateUser() {
    if (!this.selectedUser._id) return;
    const cleanPayload = {
      name: this.selectedUser.name,
      nombreInmobiliaria: this.selectedUser.nombreInmobiliaria,
      nit: this.selectedUser.nit,
      codigoInmobiliaria: this.selectedUser.codigoInmobiliaria,
    };
    this.usersService.updateUser(this.selectedUser._id, cleanPayload).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u._id === updatedUser._id);
        if (index !== -1) {
          Object.assign(this.users[index], updatedUser);
        }
        this.applyFilters();
        this.showEditModal = false;
        AffiAlert.fire({ icon: 'success', title: 'Actualizado', timer: 1500, showConfirmButton: false });
      },
      error: () => AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar.' })
    });
  }

  changeRole(user: User, newRole: string) {
    if (user.role === newRole) return;
    const roleLabel = this.availableRoles.find(r => r.value === newRole)?.label || newRole;
    
    AffiAlert.fire({
      title: '¿Cambiar rol de usuario?',
      text: `Estás a punto de cambiar el rol de ${user.name} a ${roleLabel}. Esto reiniciará sus permisos personalizados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usersService.changeRole(user._id, newRole).subscribe({
          next: (updated) => {
            const index = this.users.findIndex(u => u._id === updated._id);
            if (index !== -1) {
              Object.assign(this.users[index], updated);
            }
            this.applyFilters();
            AffiAlert.fire({ icon: 'success', title: 'Rol actualizado', text: 'Permisos reiniciados.', timer: 2000, showConfirmButton: false });
          },
          error: () => {
            AffiAlert.fire({ icon: 'error', title: 'Error', text: 'No se pudo cambiar el rol.' });
            this.loadUsers();
          }
        });
      } else {
        this.applyFilters();
      }
    });
  }

  toggleStatus(user: User) {
    const accion = user.isActive ? 'desactivar' : 'activar';
    AffiAlert.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de ${accion} el acceso de ${user.name}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: user.isActive ? '#d33' : '#10b981',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usersService.toggleStatus(user._id).subscribe({
          next: () => {
            user.isActive = !user.isActive;
            this.applyFilters();
            AffiAlert.fire({ icon: 'success', title: 'Estado actualizado', timer: 1500, showConfirmButton: false });
          },
          error: () => AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Fallo al cambiar estado.' })
        });
      }
    });
  }

  openPermissionsModal(user: User) {
    this.selectedUser = { ...user } as User;
    this.tempPermissions = [...(user.permissions || [])];
    this.showPermissionsModal = true;
  }

  togglePermission(permKey: string) {
    if (this.tempPermissions.includes(permKey)) {
      this.tempPermissions = this.tempPermissions.filter(p => p !== permKey);
    } else {
      this.tempPermissions.push(permKey);
    }
  }

  hasPermission(permKey: string): boolean {
    return this.tempPermissions.includes(permKey);
  }

  savePermissions() {
    if (!this.selectedUser._id) return;
    this.usersService.updatePermissions(this.selectedUser._id, this.tempPermissions).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u._id === updatedUser._id);
        if (index !== -1) this.users[index] = updatedUser;
        this.showPermissionsModal = false;
        AffiAlert.fire({ icon: 'success', title: 'Permisos actualizados', timer: 1500, showConfirmButton: false });
      },
      error: () => AffiAlert.fire({ icon: 'error', title: 'Error', text: 'Error guardando permisos.' })
    });
  }

  closeModals() {
    this.showEditModal = false;
    this.showPermissionsModal = false;
    this.showExportModal = false;
    this.selectedUser = {};
    this.userPassword = '';
  }
}