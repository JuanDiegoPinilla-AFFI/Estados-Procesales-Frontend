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
    this.titleService.setTitle('Estados Procesales - Informe Inmobiliaria');
    this.loadInforme();
  }

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
    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      console.log('Generando Excel con Contadores Automáticos...');
      const activeColumns = this.exportColumns.filter(c => c.selected);
      if (activeColumns.length === 0) { alert('Selecciona columnas'); return; }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Informe Estado Procesal');

      // --- 0. CALCULAR CONTADORES AUTOMÁTICAMENTE ---
      // Función auxiliar para contar ocurrencias en la etapa procesal (ignorando mayúsculas/minúsculas)
      const contarEtapa = (termino: string, exacto: boolean = false) => {
        return this.filteredData.filter(item => {
          const etapa = item.etapaProcesal ? item.etapaProcesal.toUpperCase() : '';
          const busqueda = termino.toUpperCase();
          return exacto ? etapa === busqueda : etapa.includes(busqueda);
        }).length;
      };

      // Calculamos los valores reales para usarlos abajo
      const counts = {
        // Fila 1
        demanda: contarEtapa('DEMANDA', true), // Exacto, según tu lógica original
        admision: contarEtapa('ADMISION DEMANDA'),
        notificacion: contarEtapa('NOTIFICACION'),
        sentencia: contarEtapa('SENTENCIA'),
        lanzamiento: contarEtapa('LANZAMIENTO'),
        excepciones: contarEtapa('EXCEPCIONES'),
        
        // Fila 2 (Nuevos contadores basados en el nombre de la etapa)
        // terminacion: contarEtapa('TERMINACION'),
        // archivo: contarEtapa('ARCHIVO'), // O 'DESISTIMIENTO' si prefieres
        // liquidacion: contarEtapa('LIQUIDACION'),
        // acuerdo: contarEtapa('ACUERDO'),
        // embargo: contarEtapa('EMBARGO'),
        // secuestro: contarEtapa('SECUESTRO')
      };

      // --- 1. CONFIGURACIÓN ESTRUCTURAL ---
      const colSpans: { [key: string]: number } = {
        'numeroRadicacion': 2, 'demandadoNombre': 2, 'despacho': 2, 
      };
      const UNIFORM_WIDTH = 22; 
      
      let totalPhysicalColumns = 0;
      activeColumns.forEach(col => { totalPhysicalColumns += (colSpans[col.key] || 1); });

      for (let i = 1; i <= 50; i++) { sheet.getColumn(i).width = UNIFORM_WIDTH; }

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


      // --- 4. CAJAS DE RESUMEN (CON CONTADORES REALES) ---

      // DATOS FILA 1 (Usando counts.variable)
      const datosFila1 = [
        { title: 'Demanda', desc: 'Hemos iniciado el proceso judicial de restitución', count: counts.demanda, color: colors.yellow },
        { title: 'Admisión Demanda', desc: 'El juez acepta tramitar la demanda', count: counts.admision, color: colors.pink },
        { title: 'Notificación', desc: 'Etapa en la que se notifica al arrendatario', count: counts.notificacion, color: colors.orange },
        { title: 'Sentencia', desc: 'El juez decidió sobre la demanda', count: counts.sentencia, color: colors.green },
        { title: 'Lanzamiento', desc: 'Se está gestionando el desalojo de los inquilinos', count: counts.lanzamiento, color: colors.blue },
        { title: 'Excepciones', desc: 'Demandado presentó objeciones a la demanda', count: counts.excepciones, color: colors.gray },
      ];

      // DATOS FILA 2 (Usando counts.variable)
      // const datosFila2 = [
      //   { title: 'Terminación', desc: 'Procesos terminados por pago o acuerdo', count: counts.terminacion, color: colors.blue }, 
      //   { title: 'Archivo', desc: 'Procesos archivados por desistimiento', count: counts.archivo, color: colors.gray },
      //   { title: 'Liquidación', desc: 'Etapa de liquidación del crédito', count: counts.liquidacion, color: colors.yellow },
      //   { title: 'Acuerdo Pago', desc: 'Se ha llegado a un acuerdo de pago', count: counts.acuerdo, color: colors.green },
      //   { title: 'Embargo', desc: 'Medidas cautelares aplicadas', count: counts.embargo, color: colors.pink },
      //   { title: 'Secuestro', desc: 'Diligencia de secuestro programada', count: counts.secuestro, color: colors.orange },
      // ];

      const drawBoxRow = (startRow: number, datos: any[]) => {
        let currentBoxCol = 4;
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
          cellCount.value = box.count; // ¡AQUÍ SE PONE EL VALOR CALCULADO!
          cellCount.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: box.color } };
          cellCount.font = { bold: true, size: 11, name: 'Calibri' };
          cellCount.alignment = { horizontal: 'center', vertical: 'middle' };
          cellCount.border = { bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

          currentBoxCol++;
        });
      };

      drawBoxRow(6, datosFila1);
      // drawBoxRow(11, datosFila2);

      // --- 5. TABLA DE DATOS (Igual que antes) ---
      const tableStartRow = 16;
      const headerRow = sheet.getRow(tableStartRow);
      let currentPhysicalCol = 1;

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
          cell.font = { size: 8, name: 'Calibri', color: { argb: colors.textDark } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = borderStyle;

          // PINTAR CELDA ETAPA
          if (col.key === 'etapaProcesal') {
             const etapaVal = val ? String(val).toUpperCase() : '';
             let cellArgb = null;
             
             // Revisamos coincidencias para pintar la celda (Fila 1)
             if (etapaVal === 'DEMANDA') cellArgb = colors.yellow;
             else if (etapaVal.includes('ADMISION DEMANDA')) cellArgb = colors.pink;
             else if (etapaVal.includes('NOTIFICACION')) cellArgb = colors.orange;
             else if (etapaVal.includes('SENTENCIA')) cellArgb = colors.green;
             else if (etapaVal.includes('LANZAMIENTO')) cellArgb = colors.blue;
             else if (etapaVal.includes('EXCEPCIONES')) cellArgb = colors.gray;
             
             // Revisamos coincidencias para pintar la celda (Fila 2 - Nuevos colores)
            //  else if (etapaVal.includes('TERMINACION')) cellArgb = colors.blue;
            //  else if (etapaVal.includes('ARCHIVO') || etapaVal.includes('DESISTIMIENTO')) cellArgb = colors.gray;
            //  else if (etapaVal.includes('LIQUIDACION')) cellArgb = colors.yellow;
            //  else if (etapaVal.includes('ACUERDO')) cellArgb = colors.green;
            //  else if (etapaVal.includes('EMBARGO')) cellArgb = colors.pink;
            //  else if (etapaVal.includes('SECUESTRO')) cellArgb = colors.orange;

             if (cellArgb) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellArgb } };
             }
          }
          rowPhysicalCol += span;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx');
      this.closeExportModal();

    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error: ' + error);
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportToPdf() { 
    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      console.log('Exportando PDF con cajas de resumen centradas y con margen...');
      
      // 1. PREPARACIÓN DE DATOS (Contadores)
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
        // terminacion: contarEtapa('TERMINACION'),
        // archivo: contarEtapa('ARCHIVO'),
        // liquidacion: contarEtapa('LIQUIDACION'),
        // acuerdo: contarEtapa('ACUERDO'),
        // embargo: contarEtapa('EMBARGO'),
        // secuestro: contarEtapa('SECUESTRO')
      };

      const colorsRGB: { [key: string]: [number, number, number] } = {
        yellow: [255, 192, 0], pink: [218, 150, 148], orange: [255, 213, 180],
        green: [146, 208, 80], blue: [183, 222, 232], gray: [191, 191, 191]
      };

      // 2. CONFIGURACIÓN DE PÁGINA
      const doc = new jsPDF('landscape', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.width; // ~297mm
      const margin = 5; 
      const usableWidth = pageWidth - (margin * 2);

      // --- CÁLCULO PROPORCIONAL DE ANCHOS TABLA (1x vs 2x) ---
      const doubleColumns = ['numeroRadicacion', 'demandadoNombre', 'despacho'];
      let totalUnits = 0;
      activeColumns.forEach(c => { totalUnits += doubleColumns.includes(c.key) ? 2 : 1; });
      const unitWidth = usableWidth / totalUnits;

      const dynamicColumnStyles: { [key: number]: any } = {};
      activeColumns.forEach((col, index) => {
        const weight = doubleColumns.includes(col.key) ? 2 : 1;
        dynamicColumnStyles[index] = { cellWidth: unitWidth * weight, overflow: 'linebreak' };
      });

      // 3. ENCABEZADO
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

      // --- 4. CAJAS DE RESUMEN (NUEVO DISEÑO: CENTRADO CON MARGEN) ---
      const numBoxes = 6;
      const boxGap = 4; // Espacio entre cajas (mm)
      const boxWidth = 42; // Ancho fijo estético para cada caja
      const boxHeight = 14; 
      const startBoxY = 42; 

      // Cálculo para centrar el bloque total de cajas en la página
      const totalBlockWidth = (numBoxes * boxWidth) + ((numBoxes - 1) * boxGap);
      // El punto X donde empieza la primera caja para que todo el bloque quede centrado
      const startX = margin + (usableWidth - totalBlockWidth) / 2;

      // Datos Filas
      const boxesRow1 = [
        { title: 'Demanda', desc: 'Iniciado proceso restitución', count: counts.demanda, color: colorsRGB['yellow'] },
        { title: 'Admisión', desc: 'Juez acepta demanda', count: counts.admision, color: colorsRGB['pink'] },
        { title: 'Notificación', desc: 'Notificación al arrendatario', count: counts.notificacion, color: colorsRGB['orange'] },
        { title: 'Sentencia', desc: 'Decisión sobre la demanda', count: counts.sentencia, color: colorsRGB['green'] },
        { title: 'Lanzamiento', desc: 'Gestionando desalojo', count: counts.lanzamiento, color: colorsRGB['blue'] },
        { title: 'Excepciones', desc: 'Objeciones presentadas', count: counts.excepciones, color: colorsRGB['gray'] },
      ];

      // const boxesRow2 = [
      //   { title: 'Terminación', desc: 'Terminado por pago/acuerdo', count: counts.terminacion, color: colorsRGB['blue'] },
      //   { title: 'Archivo', desc: 'Archivado / Desistimiento', count: counts.archivo, color: colorsRGB['gray'] },
      //   { title: 'Liquidación', desc: 'Etapa liquidación crédito', count: counts.liquidacion, color: colorsRGB['yellow'] },
      //   { title: 'Acuerdo Pago', desc: 'Acuerdo logrado', count: counts.acuerdo, color: colorsRGB['green'] },
      //   { title: 'Embargo', desc: 'Medidas cautelares', count: counts.embargo, color: colorsRGB['pink'] },
      //   { title: 'Secuestro', desc: 'Diligencia secuestro', count: counts.secuestro, color: colorsRGB['orange'] },
      // ];

      const drawPDFBoxRow = (y: number, items: any[]) => {
        items.forEach((item, i) => {
          // Cálculo de la posición X de cada caja usando el inicio centrado y el gap
          const x = startX + (i * (boxWidth + boxGap)); 
          
          // Rectángulo relleno y borde
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
          doc.rect(x, y, boxWidth, boxHeight, 'F');
          doc.setDrawColor(100); doc.setLineWidth(0.1);
          doc.rect(x, y, boxWidth, boxHeight, 'S');

          // Textos
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
      // drawPDFBoxRow(startBoxY + boxHeight + boxGap, boxesRow2); // Añadimos gap vertical también

      // 5. TABLA DE DATOS
      const bodyData = this.filteredData.map(item => {
        return activeColumns.map(col => {
          let val = item[col.key as keyof InformeInmobiliaria];
          if (col.key.includes('Fecha')) val = this.datePipe.transform(val as string, 'yyyy-MM-dd') || val;
          if (col.key === 'claseProceso') val = this.clasePipe.transform(val as string);
          return val || '';
        });
      });

      autoTable(doc, {
        startY: startBoxY + (boxHeight * 2) + (boxGap * 2) + 2, // Posición debajo de las cajas
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
            // else if (etapa.includes('TERMINACION')) colorRGB = colorsRGB['blue'];
            // else if (etapa.includes('ARCHIVO') || etapa.includes('DESISTIMIENTO')) colorRGB = colorsRGB['gray'];
            // else if (etapa.includes('LIQUIDACION')) colorRGB = colorsRGB['yellow'];
            // else if (etapa.includes('ACUERDO')) colorRGB = colorsRGB['green'];
            // else if (etapa.includes('EMBARGO')) colorRGB = colorsRGB['pink'];
            // else if (etapa.includes('SECUESTRO')) colorRGB = colorsRGB['orange'];

            if (colorRGB) data.cell.styles.fillColor = colorRGB;
          }
        }
      });

    doc.save(`Informe_Inmobiliaria_${new Date().getTime()}.pdf`);
    this.closeExportModal();

    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      alert('Error al generar PDF: ' + error);
    } finally {
      this.exportState = 'idle';
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