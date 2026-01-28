/*
  Cambios (30-12-2025) - Santiago Obando:
  - Al crear tickets desde el detalle de proceso ahora se envía `ticketData.email` al backend.
  - Motivo: permitir que el email ingresado en el modal detalle se utilice como reply-to.
*/
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { SupportService } from '../../../../core/services/support.service';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';
import { getEtapaConfig, getEtapasParaStepper, EtapaProcesal } from './etapas-procesales.config';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';

type SubjectOption = { label: string; value: string };

@Component({
  selector: 'app-detalle-proceso',
  standalone: true,
  imports: [CommonModule, RouterLink, ClaseProcesoPipe, FormsModule],
  providers: [DatePipe, ClaseProcesoPipe], 
  templateUrl: './detalle-proceso.html',
  styleUrls: ['./detalle-proceso.scss']
})

export class DetalleProcesoComponent implements OnInit {
  private datePipe = inject(DatePipe);
  private clasePipe = inject(ClaseProcesoPipe);

  procesoId: number | null = null;
  detalle: any = null;
  loading = true;
  error = '';
  exportState: 'idle' | 'excel' | 'pdf' = 'idle';

  selectOpen = false

  etapaActualConfig: EtapaProcesal | null = null;
  etapaActualIndex: number = -1;
  etapasStepper: { nombre: string; color: string; id: number }[] = [];

  showSupportModal = false;
  isSendingTicket = false;

  subjectOptions: SubjectOption[] = [
    { label: 'Dudas sobre avance procesal', value: 'Dudas sobre avance procesal' },
    { label: 'Recuperación del Inmueble', value: 'Recuperación del Inmueble' },
    { label: 'Valores en Recuperación', value: 'Valores en Recuperación' },
  ];

  ticketData = {
    email: '',
    subject: '',
    subjectLabel: '',
    content: ''
  };

  constructor(
    private route: ActivatedRoute,
    private redelexService: RedelexService,
    private titleService: Title,
    private supportService: SupportService,
    private authService: AuthService  
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.procesoId = +idParam;
      this.cargarDetalle(this.procesoId);
    } else {
      this.error = 'ID de proceso no válido';
      this.loading = false;
    }
  }
  
  onSelectChange(event: Event) {
    this.selectOpen = false;
    
    const selected = this.subjectOptions.find(opt => opt.value === this.ticketData.subject);
    if(selected) {
      this.ticketData.subjectLabel = selected.label;
    }

    (event.target as HTMLSelectElement).blur();
  }

  cargarDetalle(id: number) {
    this.loading = true;
    this.redelexService.getProcesoDetalleById(id).subscribe({
      next: (res) => {
        this.detalle = res.data || res;
        const nombreDemandado = this.getNombreSujeto('DEMANDADO');
        this.titleService.setTitle(`Estados Procesales - Demandado ${nombreDemandado}`);
        this.etapaActualConfig = getEtapaConfig(this.detalle.etapaProcesal);
        const clase = this.detalle.claseProceso || '';
        this.etapasStepper = getEtapasParaStepper(clase);
        this.calcularIndiceVisual();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No tienes permisos o el proceso no existe.';
        this.loading = false;
      }
    });
  }

  calcularIndiceVisual() {
    if (!this.etapaActualConfig || this.etapasStepper.length === 0) {
      this.etapaActualIndex = 0;
      return;
    }

    const visualIndex = this.etapasStepper.findIndex(step => step.id === this.etapaActualConfig?.id);

    if (visualIndex !== -1) {
      this.etapaActualIndex = visualIndex;
    } else {
      const currentId = this.etapaActualConfig.id;
      const prevSteps = this.etapasStepper.filter(step => step.id < currentId);
      if (prevSteps.length > 0) {
        const lastVisibleStep = prevSteps[prevSteps.length - 1];
        this.etapaActualIndex = this.etapasStepper.indexOf(lastVisibleStep);
      } else {
        this.etapaActualIndex = 0;
      }
    }
  }

  openSupportModal() {
    const user = this.authService.getUserData();
    this.ticketData = {
      email: user?.email || '',
      subject: '', 
      subjectLabel: '',
      content: ''
    };
    this.showSupportModal = true;
  }

  closeSupportModal() {
    this.showSupportModal = false;
  }

  sendTicket() {
    // Validar email
    if (!this.ticketData.email) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Correo requerido', 
        text: 'Por favor ingresa tu correo electrónico.' 
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.ticketData.email)) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Email inválido', 
        text: 'Por favor ingresa un correo electrónico válido.' 
      });
      return;
    }

    // Validar asunto
    if (!this.ticketData.subject || this.ticketData.subject === '') {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Campos incompletos', 
        text: 'Por favor selecciona una opción válida en el asunto.' 
      });
      return;
    }

    // Validar mensaje
    if (!this.ticketData.content) {
      AffiAlert.fire({ 
        icon: 'warning', 
        title: 'Campos vacíos', 
        text: 'Por favor escribe un mensaje.' 
      });
      return;
    }

    this.isSendingTicket = true;

    const metadata = {
      procesoId: this.procesoId!,
      radicado: this.detalle?.numeroRadicacion,
      cuenta: this.detalle?.codigoAlterno || 'N/A', 
      etapa: this.detalle?.etapaProcesal,
      clase: this.detalle?.claseProceso || 'N/A'    
    };

    this.supportService.createTicket(
      this.ticketData.subject, 
      this.ticketData.content, 
      { ...metadata }, 
      this.ticketData.email
    ).subscribe({
      next: () => {
        this.isSendingTicket = false;
        this.closeSupportModal();
        AffiAlert.fire({ 
          icon: 'success', 
          title: 'Solicitud Recibida', 
          html: `
            <p><strong>El equipo jurídico ha recibido los datos del proceso.</strong></p>
            <p>📧 Te responderemos a: <strong>${this.ticketData.email}</strong></p>
            <p style="margin-top: 12px; color: #666;">Revisa tu bandeja de entrada en los próximos minutos.</p>
          `
        });
      },
      error: () => {
        this.isSendingTicket = false;
        AffiAlert.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: 'No pudimos crear el ticket. Intenta nuevamente.' 
        });
      }
    });
  }

  getNombreSujeto(tipoBuscado: string): string {
    if (!this.detalle || !this.detalle.sujetos) return 'No registrado';
    const sujetos = this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes(tipoBuscado));
    if (sujetos.length === 0) return 'No registrado';
    return sujetos.map((s: any) => s.Nombre || s.RazonSocial).join(' - ');
  }

  getIdSujeto(tipoBuscado: string): string {
    if (!this.detalle || !this.detalle.sujetos) return '';
    const sujetos = this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes(tipoBuscado));
    if (sujetos.length === 0) return '';
    return sujetos.map((s: any) => s.Identificacion || s.NumeroIdentificacion).join(' - ');
  }
  
  getDemandantes(): any[] {
    if (!this.detalle || !this.detalle.sujetos) return [];
    return this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes('DEMANDANTE'));
  }

  getDemandados(): any[] {
    if (!this.detalle || !this.detalle.sujetos) return [];
    return this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes('DEMANDADO'));
  }

  haySolidarios(): boolean {
    if (!this.detalle || !this.detalle.sujetos) return false;
    return this.detalle.sujetos.some((s: any) => s.Tipo?.toUpperCase().includes('SOLIDARIO'));
  }

  getSolidarios(): any[] {
    if (!this.detalle || !this.detalle.sujetos) return [];
    return this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes('SOLIDARIO'));
  }

  async exportToExcel() {
    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (!this.detalle) {
        AffiAlert.fire({
          icon: 'warning',
          title: 'Sin datos',
          text: 'No hay información del proceso para exportar.',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Ficha Técnica');

      sheet.getColumn(1).width = 30; 
      sheet.getColumn(2).width = 70;

      const colors = {
        headerBlue: 'FF1F4E78',
        bgGray: 'FFF2F2F2',
        border: 'FFBFBFBF'
      };

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
      };

      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 100, height: 100 } });

      sheet.mergeCells('A2:B2');
      const titleCell = sheet.getCell('A2');
      titleCell.value = 'FICHA TÉCNICA DEL PROCESO JURÍDICO';
      titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: colors.headerBlue } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells('A3:B3');
      const dateCell = sheet.getCell('A3');
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO');
      dateCell.value = `Generado: ${fechaHoy}`;
      dateCell.font = { size: 10, color: { argb: 'FF555555' }, name: 'Arial' };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      let currentRow = 6;

      const addSectionHeader = (title: string) => {
        sheet.mergeCells(`A${currentRow}:B${currentRow}`);
        const cell = sheet.getCell(`A${currentRow}`);
        cell.value = title.toUpperCase();
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBlue } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
        cell.alignment = { horizontal: 'left', indent: 1, vertical: 'middle' };
        cell.border = borderStyle;
        currentRow++;
      };

      const addRowData = (label: string, value: string) => {
        const cellLabel = sheet.getCell(`A${currentRow}`);
        cellLabel.value = label;
        cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };
        cellLabel.font = { bold: true, color: { argb: 'FF333333' }, name: 'Arial', size: 10 };
        cellLabel.border = borderStyle;
        cellLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        const cellValue = sheet.getCell(`B${currentRow}`);
        cellValue.value = value || '---';
        cellValue.font = { color: { argb: 'FF000000' }, name: 'Arial', size: 10 };
        cellValue.border = borderStyle;
        cellValue.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

        currentRow++;
      };

      addSectionHeader('Partes Procesales');
      
      const demNombre = this.getNombreSujeto('DEMANDANTE');
      const demId = this.getIdSujeto('DEMANDANTE');
      addRowData('Demandante', `${demNombre}  (NIT/CC: ${demId})`);

      const ddoNombre = this.getNombreSujeto('DEMANDADO');
      const ddoId = this.getIdSujeto('DEMANDADO');
      addRowData('Demandado', `${ddoNombre}  (NIT/CC: ${ddoId})`);

      if (this.haySolidarios()) {
        const solidarios = this.getSolidarios().map(s => `${s.Nombre || s.RazonSocial} (${s.Identificacion || 'S/N'})`).join('\n');
        addRowData('Deudores Solidarios', solidarios);
      }

      currentRow++;

      addSectionHeader('Información General');
      addRowData('Número de Radicación', this.detalle.numeroRadicacion);
      addRowData('Cuenta', this.detalle.codigoAlterno);
      addRowData('Clase de Proceso', this.clasePipe.transform(this.detalle.claseProceso));
      
      const etapaParaCliente = this.etapaActualConfig?.nombreCliente || this.detalle.etapaProcesal || 'EN TRÁMITE';
      addRowData('Etapa Procesal Actual', etapaParaCliente);
      
      if (this.etapaActualConfig) {
        addRowData('Descripción de Etapa', this.etapaActualConfig.definicion);
      }
      
      currentRow++;

      addSectionHeader('Despacho y Ubicación');
      addRowData('Despacho Judicial', this.detalle.despacho);
      addRowData('Ubicación del Contrato', this.detalle.ubicacionContrato || this.detalle.regional);
      
      currentRow++;

      addSectionHeader('Estado Judicial y Sentencia');
      const fechaPres = this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || 'N/A';
      addRowData('Fecha Presentación Demanda', fechaPres);
      
      addRowData('Fallo Primera Instancia', this.detalle.sentenciaPrimeraInstanciaResultado || 'Pendiente');
      
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
         const fechaSent = this.datePipe.transform(this.detalle.sentenciaPrimeraInstanciaFecha, 'dd/MM/yyyy');
         addRowData('Fecha de Sentencia', fechaSent || '');
      }

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx', `FICHA ${ddoNombre}`);

      AffiAlert.fire({
        icon: 'success',
        title: 'Excel generado',
        text: 'La ficha técnica se ha descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (e) {
      console.error('Error exportando Excel:', e);
      
      AffiAlert.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo Excel. Intenta nuevamente.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.exportState = 'idle';
    }
  }

  async exportToPdf() {
    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (!this.detalle) {
        AffiAlert.fire({
          icon: 'warning',
          title: 'Sin datos',
          text: 'No hay información del proceso para exportar.',
          confirmButtonText: 'Entendido'
        });
        return;
      }
      const doc = new jsPDF('p', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;

      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 10, 25, 25);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 78, 120);
      doc.text('FICHA TÉCNICA DEL PROCESO', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 26, { align: 'center' });

      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, 40, pageWidth - margin, 40);

      const bodyData: any[] = [];

      const pushRow = (label: string, value: string) => {
        bodyData.push([label, value || '---']);
      };

      bodyData.push([{ 
        content: 'PARTES PROCESALES', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold', 
          halign: 'left' as 'left' 
        } 
      }]);

      const demNombre = this.getNombreSujeto('DEMANDANTE');
      const demId = this.getIdSujeto('DEMANDANTE');
      pushRow('Demandante', `${demNombre}\nID: ${demId}`);

      const ddoNombre = this.getNombreSujeto('DEMANDADO');
      const ddoId = this.getIdSujeto('DEMANDADO');
      pushRow('Demandado', `${ddoNombre}\nID: ${ddoId}`);

      if (this.haySolidarios()) {
        const solidarios = this.getSolidarios().map(s => `• ${s.Nombre || s.RazonSocial} (ID: ${s.NumeroIdentificacion || 'S/N'})`).join('\n');
        pushRow('Deudores Solidarios', solidarios);
      }

      bodyData.push([{ 
        content: 'INFORMACIÓN GENERAL', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold',
          halign: 'left' as 'left'
        } 
      }]);
      
      pushRow('Número de Radicación', this.detalle.numeroRadicacion);
      pushRow('Cuenta', this.detalle.codigoAlterno);
      pushRow('Clase de Proceso', this.clasePipe.transform(this.detalle.claseProceso));
      
      const etapaParaCliente = this.etapaActualConfig?.nombreCliente || this.detalle.etapaProcesal || 'EN TRÁMITE';
      pushRow('Etapa Procesal', etapaParaCliente);
      
      if (this.etapaActualConfig) {
        pushRow('Descripción de Etapa', this.etapaActualConfig.definicion);
      }

      bodyData.push([{ 
        content: 'DESPACHO Y UBICACIÓN', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold', 
          halign: 'left' as 'left' 
        } 
      }]);
      pushRow('Despacho Judicial', this.detalle.despacho);
      pushRow('Ubicación del Contrato', this.detalle.ubicacionContrato || this.detalle.regional);

      bodyData.push([{ 
        content: 'ESTADO JUDICIAL', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold', 
          halign: 'left' as 'left' 
        } 
      }]);
      
      pushRow('Fecha Presentación Demanda', this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || '');
      pushRow('Fallo Sentencia', this.detalle.sentenciaPrimeraInstanciaResultado || 'Pendiente');
      
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
        pushRow('Fecha de Sentencia', this.datePipe.transform(this.detalle.sentenciaPrimeraInstanciaFecha, 'dd/MM/yyyy') || '');
      }

      autoTable(doc, {
        startY: 45,
        body: bodyData,
        theme: 'grid',
        
        columnStyles: {
          0: { 
            cellWidth: 60,
            fillColor: [245, 245, 245],
            fontStyle: 'bold',
            textColor: [50, 50, 50]
          },
          1: { 
            cellWidth: 'auto',
            textColor: [0, 0, 0]
          }
        },

        styles: {
          fontSize: 10,
          cellPadding: 4,
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          overflow: 'linebreak'
        },
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text(`Estados Procesales - Affi`, margin, doc.internal.pageSize.height - 10);
      }

      doc.save(`FICHA ${ddoNombre}.pdf`);

      AffiAlert.fire({
        icon: 'success',
        title: 'PDF generado',
        text: 'La ficha técnica se ha descargado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (e) {
      console.error('Error exportando PDF:', e);
      
      AffiAlert.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'No se pudo generar el archivo PDF. Intenta nuevamente.',
        confirmButtonText: 'Cerrar'
      });
    } finally {
      this.exportState = 'idle';
    }
  }

  private saveFile(buffer: any, extension: string, name: string) {
    const blob = new Blob([buffer], { type: extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.${extension}`;
    link.click();
  }
}