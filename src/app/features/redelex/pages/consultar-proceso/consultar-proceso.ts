import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser'; // Importar Title
import {
  RedelexService,
  ProcesoDetalleDto,
  AbogadoDto,
  SujetosDto,
  MedidasDto,
} from '../../services/redelex.service';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

interface ProcesoPorCedula {
  procesoId: number;
  demandadoNombre: string;
  demandadoIdentificacion: string;
  demandanteNombre: string;
  demandanteIdentificacion: string;
  claseProceso?: string;
}

@Component({
  selector: 'app-consultar-proceso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultar-proceso.html',
  styleUrl: './consultar-proceso.scss',
})
export class ConsultarProcesoComponent implements OnInit {
  procesoId!: number | null; // Permitir null para limpieza
  proceso: ProcesoDetalleDto | null = null;

  abogadoPrincipal: AbogadoDto | null = null;
  abogadosInternos: AbogadoDto[] = [];
  otrosAbogados: AbogadoDto[] = [];

  sujetoDemandado: SujetosDto[] = [];
  sujetoDemandante: SujetosDto[] = [];
  sujetosSolidarios: SujetosDto[] = [];
  otrosSujetos: SujetosDto[] = [];

  identificacion: string = '';
  procesosPorCedula: ProcesoPorCedula[] = [];
  procesosFiltrados: ProcesoPorCedula[] = [];
  filtroProcesoId: string = '';
  
  // Punto 11: Controla si ya se ejecutó una búsqueda para mostrar mensajes
  hasSearched: boolean = false; 

  medidas: MedidasDto[] = [];

  loading = false;

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;

  // Secciones colapsables
  sectionOpen = {
    proceso: true,
    demandante: true,
    demandado: true,
    solidarios: true,
    otrosSujetos: true,
    medidas: true,
    abogados: true,
  };

  constructor(
    private redelexService: RedelexService,
    private titleService: Title // Inyectar servicio de Título
  ) {}

  ngOnInit(): void {
    // Punto 5: Nombre de la pestaña
    this.titleService.setTitle('Affi - Consulta de Procesos');
  }

  formatObservaciones(obs: string | null | undefined): string {
    if (!obs || !obs.trim()) {
      return '-';
    }
    return obs.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
  }

  toggleSection(section: keyof typeof this.sectionOpen) {
    this.sectionOpen[section] = !this.sectionOpen[section];
  }

  consultarPorId() {
    if (!this.procesoId) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Dato requerido',
        text: 'Ingresa el ID del proceso para consultar.',
      });
      return;
    }

    // Punto 15: Limpiar estado de búsqueda por cédula
    this.identificacion = '';
    this.procesosPorCedula = [];
    this.procesosFiltrados = [];
    this.hasSearched = false;

    this.loading = true;
    this.limpiarDatos();

    this.redelexService.getProceso(this.procesoId).subscribe({
      next: (res) => {
        this.loading = false;

        if (!res || !res.success || !res.data) {
          this.proceso = null;
          AffiAlert.fire({
            icon: 'warning',
            title: 'Proceso no encontrado',
            text: 'No se encontró información para el ID de proceso ingresado.',
          });
          return;
        }

        this.proceso = res.data;
        this.procesarDatosProceso();
        
        AffiAlert.fire({
          icon: 'success',
          title: 'Proceso cargado',
          text: `Se cargó la información del proceso ${this.procesoId}.`,
          timer: 1400,
          showConfirmButton: false,
        });
      },
      error: () => {
        this.loading = false;
        this.limpiarDatos();
        AffiAlert.fire({
          icon: 'error',
          title: 'Error al consultar',
          text: 'No se encontró el proceso',
        });
      },
    });
  }

  private limpiarDatos() {
    this.proceso = null;
    this.abogadoPrincipal = null;
    this.abogadosInternos = [];
    this.otrosAbogados = [];
    this.sujetoDemandante = [];
    this.sujetoDemandado = [];
    this.sujetosSolidarios = [];
    this.otrosSujetos = [];
    this.medidas = [];
  }

  private procesarDatosProceso() {
    if (!this.proceso) return;
    const raw = this.proceso as any;

    // PROCESAR ABOGADOS
    const abogados: AbogadoDto[] = (raw.abogados ?? []) as AbogadoDto[];
    this.abogadoPrincipal = abogados.find((a) => 
      a.ActuaComo?.toUpperCase().includes('PRINCIPAL')
    ) ?? null;

    this.abogadosInternos = abogados.filter((a) =>
      a.ActuaComo?.toUpperCase().includes('INTERNO')
    );

    this.otrosAbogados = abogados.filter((a) => {
      const actuaComo = a.ActuaComo?.toUpperCase() ?? '';
      return !actuaComo.includes('PRINCIPAL') && !actuaComo.includes('INTERNO');
    });

    // PROCESAR SUJETOS
    const sujetos: SujetosDto[] = (raw.sujetos ?? []) as SujetosDto[];
    this.sujetoDemandante = sujetos.filter((s) => 
      s.Tipo?.toUpperCase().includes('DEMANDANTE')
    );
    this.sujetoDemandado = sujetos.filter((s) => 
      s.Tipo?.toUpperCase().includes('DEMANDADO')
    );
    this.sujetosSolidarios = sujetos.filter((s) => 
      s.Tipo?.toUpperCase().includes('SOLIDARIO')
    );
    this.otrosSujetos = sujetos.filter((s) => {
      const tipo = s.Tipo?.toUpperCase() ?? '';
      return !tipo.includes('DEMANDANTE') && 
             !tipo.includes('DEMANDADO') && 
             !tipo.includes('SOLIDARIO');
    });

    // PROCESAR MEDIDAS
    const medidasRaw = raw.medidasCautelares;
    const medidasArray: any[] = Array.isArray(medidasRaw)
      ? medidasRaw
      : medidasRaw
      ? [medidasRaw]
      : [];

    this.medidas = medidasArray.map((m: any): MedidasDto => ({
      tipoBien: m.tipoBien ?? null,
      sujeto: m.sujeto ?? null,
      tipoMedida: m.tipoMedida ?? null,
      medidaEfectiva: m.medidaEfectiva ?? null,
      avaluoJudicial:
        typeof m.avaluoJudicial === 'number'
          ? m.avaluoJudicial
          : m.avaluoJudicial
          ? Number(m.avaluoJudicial)
          : null,
      observaciones: m.observaciones ?? null,
    }));

    (this.proceso as any).medidasCautelares = this.medidas;
  }

  buscarPorCedula() {
    const cedula = this.identificacion.trim();

    if (!cedula) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Dato requerido',
        text: 'Ingresa una cédula o NIT para buscar procesos.',
      });
      return;
    }

    // Punto 15: Limpiar búsqueda por ID manual
    this.procesoId = null; 
    this.limpiarDatos(); // Limpia el detalle del proceso visible
    
    this.loading = true;
    this.procesosPorCedula = [];
    this.procesosFiltrados = [];
    this.filtroProcesoId = '';
    this.currentPage = 1;
    this.hasSearched = false; // Reset flag

    this.redelexService.getProcesosByIdentificacion(cedula).subscribe({
      next: (res) => {
        this.loading = false;
        this.hasSearched = true; // Activar flag para mostrar resultados/mensajes

        if (!res || !res.success) {
          return;
        }

        const rawProcesos = res.procesos || [];

        this.procesosPorCedula = rawProcesos.map((proc: any) => {
          let nombreLimpio = proc.demandadoNombre || '';
          let idLimpio = proc.demandadoIdentificacion || '';

          if (nombreLimpio.includes(',')) {
            nombreLimpio = nombreLimpio.split(',')[0].trim();
          }

          if (idLimpio.includes(',')) {
            idLimpio = idLimpio.split(',')[0].trim();
          }

          return {
            ...proc,
            demandadoNombre: nombreLimpio,
            demandadoIdentificacion: idLimpio
          };
        });

        this.procesosFiltrados = [...this.procesosPorCedula];

        if (!this.procesosPorCedula.length) {
          AffiAlert.fire({
            icon: 'info',
            title: 'Sin procesos',
            text: 'No se encontraron procesos para esa identificación.',
          });
        } else {
          AffiAlert.fire({
            icon: 'success',
            title: 'Procesos encontrados',
            text: `Se encontraron ${this.procesosPorCedula.length} proceso(s).`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      },
      error: () => {
        this.loading = false;
        this.hasSearched = true;
        this.procesosPorCedula = [];
        this.procesosFiltrados = [];
        this.limpiarDatos();
        AffiAlert.fire({
          icon: 'error',
          title: 'Error al consultar',
          text: 'No se pudieron obtener los procesos.',
        });
      },
    });
  }

  filtrarProcesos() {
    const f = this.filtroProcesoId.trim().toLowerCase();

    if (!f) {
      this.procesosFiltrados = [...this.procesosPorCedula];
    } else {
      this.procesosFiltrados = this.procesosPorCedula.filter((p) => {
        const idProceso = p.procesoId?.toString() ?? '';
        const demandadoNombre = p.demandadoNombre?.toLowerCase() ?? '';
        const demandadoId = p.demandadoIdentificacion?.toLowerCase() ?? '';
        const demandanteNombre = p.demandanteNombre?.toLowerCase() ?? '';
        const demandanteId = p.demandanteIdentificacion?.toLowerCase() ?? '';
        const clase = p.claseProceso ? p.claseProceso.toLowerCase() : '';

        return (
          idProceso.includes(f) ||
          demandadoNombre.includes(f) ||
          demandadoId.includes(f) ||
          demandanteNombre.includes(f) ||
          demandanteId.includes(f) ||
          clase.includes(f)
        );
      });
    }
    this.currentPage = 1;
  }

  get procesosPaginados(): ProcesoPorCedula[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.procesosFiltrados.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.procesosFiltrados.length / this.itemsPerPage);
  }

  cambiarPagina(direccion: 'prev' | 'next') {
    if (direccion === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    } else if (direccion === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  seleccionarProceso(id: number) {
    this.procesoId = id;
    this.consultarPorId();
  }

  // ... (Mantener funciones de Exportación a Excel y PDF tal cual estaban) ...
  // NOTA: Asegúrate de no borrar los métodos buildExportRows, exportarExcel y exportarPdf
  // que ya tenías en el código original.
  
  private buildExportRows() {
      // ... (código original)
      if (!this.proceso) return [];
    const p = this.proceso;

    const rows: { Seccion: string; Campo: string; Valor: string | number }[] = [];

    // --- Datos del proceso ---
    rows.push(
      { Seccion: 'Datos del proceso', Campo: 'ID Proceso', Valor: p.idProceso ?? '' },
      { Seccion: 'Datos del Proceso', Campo: 'Despacho actual', Valor: p.despacho || '' },
      { Seccion: 'Datos del Proceso', Campo: 'Despacho de origen', Valor: p.despachoOrigen || '' },
      { Seccion: 'Datos del proceso', Campo: 'Número de radicación', Valor: p.numeroRadicacion || '' },
      { Seccion: 'Datos del proceso', Campo: 'Código alterno (Cuenta Quasar)', Valor: p.codigoAlterno || '' },
      { Seccion: 'Datos del proceso', Campo: 'Clase de proceso', Valor: p.claseProceso || '' },
      { Seccion: 'Datos del proceso', Campo: 'Etapa procesal', Valor: p.etapaProcesal || '' },
      { Seccion: 'Datos del proceso', Campo: 'Estado', Valor: p.estado || '' },
      { Seccion: 'Datos del proceso', Campo: 'Regional', Valor: p.regional || '' },
      { Seccion: 'Datos del proceso', Campo: 'Tema (estado del inmueble)', Valor: p.tema || '' },
      { Seccion: 'Datos del proceso', Campo: 'Fecha creación expediente', Valor: p.fechaCreacion || '' },
      { Seccion: 'Datos del proceso', Campo: 'Fecha entrega abogado', Valor: p.fechaEntregaAbogado || '' },
      { Seccion: 'Datos del proceso', Campo: 'Fecha admisión demanda', Valor: p.fechaAdmisionDemanda || '' },
      { Seccion: 'Datos del proceso', Campo: 'Fecha recepción proceso', Valor: p.fechaRecepcionProceso || '' },
      { Seccion: 'Datos del proceso', Campo: 'Ubicación contrato', Valor: p.ubicacionContrato || '' },
      { Seccion: 'Datos del proceso', Campo: 'Sentencia 1ra instancia', Valor: p.sentenciaPrimeraInstanciaResultado || '' },
      { Seccion: 'Datos del proceso', Campo: 'Fecha sentencia 1ra instancia', Valor: p.sentenciaPrimeraInstanciaFecha || '' },
      { Seccion: 'Datos del proceso', Campo: 'Calificación (recuperabilidad)', Valor: p.calificacion || '' },
      {
        Seccion: 'Datos del proceso',
        Campo: 'Última actuación',
        Valor: [p.ultimaActuacionTipo || '', p.ultimaActuacionFecha || '', p.ultimaActuacionObservacion || '']
          .filter(Boolean)
          .join(' | '),
      }
    );

    const joinOrDash = (values: (string | null | undefined)[]) =>
      values.length ? values.map(v => v || '-').join(', ') : '-';

    // --- Demandante ---
    if (this.sujetoDemandante.length) {
      const nombres = joinOrDash(this.sujetoDemandante.map(s => s.Nombre));
      const identificaciones = joinOrDash(this.sujetoDemandante.map(s => s.NumeroIdentificacion));
      rows.push(
        { Seccion: 'Datos del demandante', Campo: 'Nombres', Valor: nombres },
        { Seccion: 'Datos del demandante', Campo: 'Identificación', Valor: identificaciones },
      );
    }

    // --- Demandado ---
    if (this.sujetoDemandado.length) {
      const nombres = joinOrDash(this.sujetoDemandado.map(s => s.Nombre));
      const identificaciones = joinOrDash(this.sujetoDemandado.map(s => s.NumeroIdentificacion));
      rows.push(
        { Seccion: 'Datos del demandado', Campo: 'Nombres', Valor: nombres },
        { Seccion: 'Datos del demandado', Campo: 'Identificación', Valor: identificaciones },
      );
    }

    // --- Deudor solidario ---
    if (this.sujetosSolidarios.length) {
      const nombres = joinOrDash(this.sujetosSolidarios.map(s => s.Nombre));
      const identificaciones = joinOrDash(this.sujetosSolidarios.map(s => s.NumeroIdentificacion));
      rows.push(
        { Seccion: 'Datos deudor solidario', Campo: 'Nombres', Valor: nombres },
        { Seccion: 'Datos deudor solidario', Campo: 'Identificación', Valor: identificaciones },
      );
    }

    // --- Otros sujetos ---
    if (this.otrosSujetos.length) {
      this.otrosSujetos.forEach((s, idx) => {
        rows.push(
          { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Tipo', Valor: s.Tipo || '-' },
          { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Nombre', Valor: s.Nombre || '-' },
          { Seccion: `Otro sujeto ${idx + 1}`, Campo: 'Identificación', Valor: s.NumeroIdentificacion || '-' },
        );
      });
    }

    // --- Medidas cautelares ---
    if (this.medidas.length) {
      this.medidas.forEach((m, idx) => {
        rows.push(
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Tipo medida', Valor: m.tipoMedida || '' },
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Estado medida', Valor: m.medidaEfectiva || '' },
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Sujeto', Valor: m.sujeto|| '' },
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Tipo bien', Valor: m.tipoBien || '' },
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Avalúo judicial', Valor: m.avaluoJudicial ?? '' },
          { Seccion: `Medidas cautelares ${idx + 1}`, Campo: 'Observaciones', Valor: m.observaciones || '' }
        );
      });
    }

    // --- Abogados ---
    rows.push({
      Seccion: 'Abogados',
      Campo: 'Abogado principal',
      Valor: this.abogadoPrincipal?.Nombre || 'Sin asignar',
    });

    if (this.abogadosInternos.length) {
      const internos = this.abogadosInternos.map(ab => ab.Nombre || 'Abogado interno').join(', ');
      rows.push({ Seccion: 'Abogados', Campo: 'Abogados internos', Valor: internos });
    }

    if (this.otrosAbogados.length) {
      this.otrosAbogados.forEach((ab, idx) => {
        rows.push({
          Seccion: 'Abogados',
          Campo: `Otro abogado ${idx + 1} (${ab.ActuaComo || 'N/A'})`,
          Valor: ab.Nombre || '-',
        });
      });
    }

    return rows;
  }

  async exportarExcel() {
      // ... (código original)
      if (!this.proceso) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'Primero consulta un proceso para poder exportar.',
      });
      return;
    }

    const rows = this.buildExportRows();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Detalle proceso');

    sheet.columns = [
      { header: 'Sección', key: 'seccion', width: 25 },
      { header: 'Campo', key: 'campo', width: 35 },
      { header: 'Valor', key: 'valor', width: 80 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, name: 'Arial', size: 11 };
    headerRow.alignment = { horizontal: 'center' };

    rows.forEach((r) => {
      sheet.addRow({
        seccion: r.Seccion,
        campo: r.Campo,
        valor: r.Valor,
      });
    });

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const fileName = `proceso-${this.proceso.idProceso || 'detalle'}.xlsx`;
    saveAs(blob, fileName);
  }

  exportarPdf() {
      if (!this.proceso) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'Primero consulta un proceso para poder exportar.',
      });
      return;
    }

    const p = this.proceso;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'A4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    if (AFFI_LOGO_BASE64 && AFFI_LOGO_BASE64.startsWith('data:image')) {
      try {
        doc.addImage(AFFI_LOGO_BASE64, 'PNG', 40, 20, 80, 60);
      } catch {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    const demandadoNombres = this.sujetoDemandado.length
      ? this.sujetoDemandado.map(s => s.Nombre || '-').join(', ')
      : '-';

    const demandadoIdentificaciones = this.sujetoDemandado.length
      ? this.sujetoDemandado.map(s => s.NumeroIdentificacion || '-').join(', ')
      : '-';

    const subtitle = (demandadoNombres !== '-' ? demandadoNombres : demandadoIdentificaciones).toUpperCase();
    const marginTop = 40;

    doc.text(`PROCESO ID ${p.idProceso ?? ''}`, pageWidth / 2, marginTop, { align: 'center' });
    doc.text(subtitle, pageWidth / 2, marginTop + 20, { align: 'center' });

    let currentY = marginTop + 40;

    // Tabla resumen
    const demandanteNombres = this.sujetoDemandante.length
      ? this.sujetoDemandante.map(s => s.Nombre || '-').join(', ')
      : '-';

    const demandanteIdentificaciones = this.sujetoDemandante.length
      ? this.sujetoDemandante.map(s => s.NumeroIdentificacion || '-').join(', ')
      : '-';

    autoTable(doc, {
      startY: currentY,
      styles: { font: 'helvetica', fontSize: 9, textColor: [0, 0, 0], cellPadding: 4 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      head: [[
        'Demandado',
        demandadoNombres,
        'Identificación',
        demandadoIdentificaciones,
        'Número de radicación',
        p.numeroRadicacion || '-',
      ]],
      body: [[
        'Demandante',
        demandanteNombres,
        'Identificación',
        demandanteIdentificaciones,
        'Código alterno (Cuenta Quasar)',
        p.codigoAlterno || '-',
      ]],
      columnStyles: {
        0: { cellWidth: 90, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 170 },
        2: { cellWidth: 90, fontStyle: 'bold' },
        3: { cellWidth: 90 },
        4: { cellWidth: 130, fontStyle: 'bold' },
        5: { cellWidth: 130 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // Deudores solidarios
    if (this.sujetosSolidarios.length) {
      const solidarioNombres = this.sujetosSolidarios.map(s => s.Nombre || '-').join(', ');
      const solidarioIdentificaciones = this.sujetosSolidarios.map(s => s.NumeroIdentificacion || '-').join(', ');

      autoTable(doc, {
        startY: currentY,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Deudores solidarios', 'Valor']],
        body: [
          ['Nombres', solidarioNombres],
          ['Identificación', solidarioIdentificaciones],
        ],
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Otros sujetos
    if (this.otrosSujetos.length) {
      const otrosSujetosBody = this.otrosSujetos.flatMap(s => [
        ['Tipo', s.Tipo || '-'],
        ['Nombre', s.Nombre || '-'],
        ['Identificación', s.NumeroIdentificacion || '-'],
      ]);

      autoTable(doc, {
        startY: currentY,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Otros sujetos', 'Valor']],
        body: otrosSujetosBody,
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Datos del proceso
    autoTable(doc, {
      startY: currentY,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Datos del proceso', 'Valor']],
      body: [
        ['Clase de proceso', p.claseProceso || ''],
        ['Etapa procesal', p.etapaProcesal || ''],
        ['Estado', p.estado || ''],
        ['Regional', p.regional || ''],
        ['Tema', p.tema || ''],
        ['Fecha creación expediente', p.fechaCreacion || ''],
        ['Fecha entrega abogado', p.fechaEntregaAbogado || ''],
        ['Fecha admisión demanda', p.fechaAdmisionDemanda || ''],
        ['Fecha recepción proceso', p.fechaRecepcionProceso || ''],
        ['Calificación (recuperabilidad)', p.calificacion || ''],
        ['Sentencia 1ra instancia', p.sentenciaPrimeraInstanciaResultado || ''],
      ],
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // Medidas cautelares
    if (this.medidas.length) {
      this.medidas.forEach((m, idx) => {
        autoTable(doc, {
          startY: currentY,
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
          head: [[`Medidas cautelares ${idx + 1}`, 'Valor']],
          body: [
            ['Tipo medida', m.tipoMedida || ''],
            ['Estado medida', m.medidaEfectiva || ''],
            ['Sujeto', m.sujeto || ''],
            ['Tipo bien', m.tipoBien || ''],
            ['Avalúo judicial', m.avaluoJudicial ?? ''],
            ['Observaciones', m.observaciones || ''],
          ],
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
      });
    }

    // Abogados
    const abogadosBody: any[] = [
      ['Abogado principal', this.abogadoPrincipal?.Nombre || 'Sin asignar']
    ];

    if (this.abogadosInternos.length) {
      const internos = this.abogadosInternos.map(ab => ab.Nombre || 'Abogado interno').join(', ');
      abogadosBody.push(['Abogados internos', internos]);
    }

    if (this.otrosAbogados.length) {
      this.otrosAbogados.forEach(ab => {
        abogadosBody.push([`${ab.ActuaComo || 'Otro'}`, ab.Nombre || '-']);
      });
    }

    autoTable(doc, {
      startY: currentY,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Abogados', 'Valor']],
      body: abogadosBody,
    });

    const fileName = `proceso-${p.idProceso || 'detalle'}.pdf`;
    doc.save(fileName);
  }
}