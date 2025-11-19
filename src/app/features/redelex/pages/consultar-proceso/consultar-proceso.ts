import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedelexService, ProcesoDetalleDto } from '../../services/redelex.service';
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
}

@Component({
  selector: 'app-consultar-proceso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultar-proceso.html',
  styleUrl: './consultar-proceso.scss'
})

export class ConsultarProcesoComponent {
  procesoId!: number;
  proceso: ProcesoDetalleDto | null = null;

  identificacion: string = '';
  procesosPorCedula: ProcesoPorCedula[] = [];
  procesosFiltrados: ProcesoPorCedula[] = [];
  filtroProcesoId: string = '';

  loading = false;

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;

  // Secciones colapsables
  sectionOpen = {
    proceso: true,
    demandante: true,
    demandado: true,
    medidas: true,
    abogados: true,
  };

  constructor(private redelexService: RedelexService) {}

  // Abrir / cerrar sección
  toggleSection(section: keyof typeof this.sectionOpen) {
    this.sectionOpen[section] = !this.sectionOpen[section];
  }

  // ========================
  //   CONSULTAS
  // ========================

  consultarPorId() {
    if (!this.procesoId) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Dato requerido',
        text: 'Ingresa el ID del proceso para consultar.'
      });
      return;
    }

    this.loading = true;

    this.redelexService.getProceso(this.procesoId).subscribe({
      next: (res) => {
        this.loading = false;

        if (!res || !res.success || !res.data) {
          this.proceso = null;
          AffiAlert.fire({
            icon: 'warning',
            title: 'Proceso no encontrado',
            text: 'No se encontró información para el ID de proceso ingresado.'
          });
          return;
        }

        this.proceso = res.data;

        AffiAlert.fire({
          icon: 'success',
          title: 'Proceso cargado',
          text: `Se cargó la información del proceso ${this.procesoId}.`,
          timer: 1400,
          showConfirmButton: false
        });
      },
      error: () => {
        this.loading = false;
        this.proceso = null;

        AffiAlert.fire({
          icon: 'error',
          title: 'Error al consultar',
          text: 'No se encontró el proceso'
        });
      }
    });
  }

  buscarPorCedula() {
    const cedula = this.identificacion.trim();

    if (!cedula) {
      AffiAlert.fire({
        icon: 'info',
        title: 'Dato requerido',
        text: 'Ingresa una cédula o NIT para buscar procesos.'
      });
      return;
    }

    this.loading = true;
    this.procesosPorCedula = [];
    this.procesosFiltrados = [];
    this.proceso = null;
    this.filtroProcesoId = '';
    this.currentPage = 1;

    this.redelexService.getProcesosByIdentificacion(cedula).subscribe({
      next: (res) => {
        this.loading = false;

        if (!res || !res.success) {
          this.procesosPorCedula = [];
          this.procesosFiltrados = [];
          AffiAlert.fire({
            icon: 'error',
            title: 'Error al consultar',
            text: 'No se pudieron obtener los procesos para esa identificación.'
          });
          return;
        }

        // ✅ Ahora los datos vienen completos del backend
        this.procesosPorCedula = res.procesos || [];
        this.procesosFiltrados = [...this.procesosPorCedula];

        if (!this.procesosPorCedula.length) {
          AffiAlert.fire({
            icon: 'info',
            title: 'Sin procesos',
            text: 'No se encontraron procesos para esa identificación.'
          });
        } else {
          AffiAlert.fire({
            icon: 'success',
            title: 'Procesos encontrados',
            text: `Se encontraron ${this.procesosPorCedula.length} proceso(s) para la identificación ${cedula}.`,
            timer: 1500,
            showConfirmButton: false
          });
        }
      },
      error: () => {
        this.loading = false;
        this.procesosPorCedula = [];
        this.procesosFiltrados = [];

        AffiAlert.fire({
          icon: 'error',
          title: 'Error al consultar',
          text: 'No se pudieron obtener los procesos para esa identificación.'
        });
      }
    });
  }

  filtrarProcesos() {
    const f = this.filtroProcesoId.trim().toLowerCase();

    if (!f) {
      // reset
      this.procesosFiltrados = [...this.procesosPorCedula];
    } else {
      this.procesosFiltrados = this.procesosPorCedula.filter((p) => {
        const idProceso = p.procesoId?.toString() ?? '';
        const demandadoNombre = p.demandadoNombre?.toLowerCase() ?? '';
        const demandadoId = p.demandadoIdentificacion?.toLowerCase() ?? '';
        const demandanteNombre = p.demandanteNombre?.toLowerCase() ?? '';
        const demandanteId = p.demandanteIdentificacion?.toLowerCase() ?? '';

        return (
          idProceso.includes(f) ||
          demandadoNombre.includes(f) ||
          demandadoId.includes(f) ||
          demandanteNombre.includes(f) ||
          demandanteId.includes(f)
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

  // ========================
  //   ARMAR DATOS EXPORT
  // ========================

  private buildExportRows() {
    if (!this.proceso) return [];
    const p = this.proceso;

    const rows: { Seccion: string; Campo: string; Valor: string | number }[] =
      [];

    // --- Datos del proceso ---
    rows.push(
      { Seccion: 'Datos del proceso', Campo: 'ID Proceso', Valor: p.idProceso ?? '' },
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
        Valor: [
          p.ultimaActuacionTipo || '',
          p.ultimaActuacionFecha || '',
          p.ultimaActuacionObservacion || '',
        ]
          .filter(Boolean)
          .join(' | '),
      }
    );

    // --- Demandante ---
    rows.push(
      {
        Seccion: 'Datos del demandante',
        Campo: 'Nombre (Inmobiliaria)',
        Valor: p.demandanteNombre || '',
      },
      {
        Seccion: 'Datos del demandado',
        Campo: 'Identificación',
        Valor: p.demandanteIdentificacion || '',
      },
    );

    // --- Demandado ---
    rows.push(
      {
        Seccion: 'Datos del demandado',
        Campo: 'Nombre (Inquilino)',
        Valor: p.demandadoNombre || '',
      },
      {
        Seccion: 'Datos del demandado',
        Campo: 'Identificación',
        Valor: p.demandadoIdentificacion || '',
      },
      {
        Seccion: 'Datos del demandado',
        Campo: 'Despacho actual',
        Valor: p.despacho || '',
      },
      {
        Seccion: 'Datos del demandado',
        Campo: 'Despacho de origen',
        Valor: p.despachoOrigen || '',
      }
    );

    // --- Medidas cautelares ---
    if (p.medidasCautelares) {
      const m = p.medidasCautelares;
      rows.push(
        { Seccion: 'Medidas cautelares', Campo: 'Id medida', Valor: m.id ?? '' },
        { Seccion: 'Medidas cautelares', Campo: 'Fecha', Valor: m.fecha || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Tipo medida', Valor: m.tipoMedida || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Estado medida', Valor: m.medidaEfectiva || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Sujeto', Valor: m.sujetoNombre || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Tipo bien', Valor: m.tipoBien || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Dirección / detalle', Valor: m.direccion || '' },
        { Seccion: 'Medidas cautelares', Campo: 'Área', Valor: m.area ?? '' },
        { Seccion: 'Medidas cautelares', Campo: 'Avalúo judicial', Valor: m.avaluoJudicial ?? '' },
        { Seccion: 'Medidas cautelares', Campo: 'Observaciones', Valor: m.observaciones || '' },
      );
    }

    // --- Abogados ---
    rows.push({
      Seccion: 'Abogados',
      Campo: 'Abogado principal',
      Valor: p.abogadoPrincipal || 'Sin asignar',
    });

    if (p.abogadosInternos && p.abogadosInternos.length) {
      const internos = p.abogadosInternos
        .map((ab: any) => ab.Nombre || ab.name || 'Abogado interno')
        .join(', ');

      rows.push({
        Seccion: 'Abogados',
        Campo: 'Abogados internos',
        Valor: internos,
      });
    }

    return rows;
  }

  // ========================
  //   EXPORTAR EXCEL
  // ========================

  async exportarExcel() {
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

    // Encabezados columnas
    sheet.columns = [
      { header: 'Sección', key: 'seccion', width: 25 },
      { header: 'Campo', key: 'campo', width: 35 },
      { header: 'Valor', key: 'valor', width: 80 },
    ];

    // Estilo encabezado
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, name: 'Arial', size: 11 };
    headerRow.alignment = { horizontal: 'center' };

    // Datos
    rows.forEach((r) => {
      sheet.addRow({
        seccion: r.Seccion,
        campo: r.Campo,
        valor: r.Valor,
      });
    });

    // Bordes y wrap
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
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const fileName = `proceso-${this.proceso.idProceso || 'detalle'}.xlsx`;
    saveAs(blob, fileName);
  }

  // ========================
  //   EXPORTAR PDF
  // ========================

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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });

    // Título centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo en la esquina superior izquierda
    if (AFFI_LOGO_BASE64 && AFFI_LOGO_BASE64.startsWith('data:image')) {
      try {
        doc.addImage(AFFI_LOGO_BASE64, 'PNG', 40, 20, 80, 60);
      } catch {
        // si por algún motivo el base64 está malo, simplemente no dibujamos el logo
      }
    }

    // Título centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);

    const title = `PROCESO ID ${p.idProceso ?? ''}`;
    const subtitle = (p.demandadoNombre || '').toString().toUpperCase();

    const marginTop = 40;

    doc.text(title, pageWidth / 2, marginTop, { align: 'center' });
    doc.text(subtitle, pageWidth / 2, marginTop + 20, { align: 'center' });

    let currentY = marginTop + 40;

    // Tabla resumen demandado/demandante
    autoTable(doc, {
      startY: currentY,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [0, 0, 0],
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
      },
      head: [
        [
          'Demandado',
          p.demandadoNombre || '',
          'Identificación',
          p.demandadoIdentificacion || '',
          'Número de radicación',
          p.numeroRadicacion || '',
        ],
      ],
      body: [
        [
          'Demandante',
          p.demandanteNombre || '',
          'Identificación',
          p.demandanteIdentificacion || '',
          'Código alterno (Cuenta Quasar)',
          p.codigoAlterno || '',
        ],
      ],
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
    if (p.medidasCautelares) {
      const m = p.medidasCautelares;
      autoTable(doc, {
        startY: currentY,
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Medidas cautelares', 'Valor']],
        body: [
          ['Id medida', m.id ?? ''],
          ['Fecha', m.fecha || ''],
          ['Tipo medida', m.tipoMedida || ''],
          ['Estado medida', m.medidaEfectiva || ''],
          ['Sujeto', m.sujetoNombre || ''],
          ['Tipo bien', m.tipoBien || ''],
          ['Dirección / detalle', m.direccion || ''],
          ['Área', m.area ?? ''],
          ['Avalúo judicial', m.avaluoJudicial ?? ''],
          ['Observaciones', m.observaciones || ''],
        ],
      });

      currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Abogados
    const internos = (p.abogadosInternos || [])
      .map((ab: any) => ab.Nombre || ab.name || 'Abogado interno')
      .join(', ');

    autoTable(doc, {
      startY: currentY,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
      head: [['Abogados', 'Valor']],
      body: [
        ['Abogado principal', p.abogadoPrincipal || 'Sin asignar'],
        ['Abogados internos', internos || '-'],
      ],
    });

    const fileName = `proceso-${p.idProceso || 'detalle'}.pdf`;
    doc.save(fileName);
  }
}
