import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

@Component({
  selector: 'app-detalle-proceso',
  standalone: true,
  imports: [CommonModule, RouterLink, ClaseProcesoPipe],
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

  constructor(
    private route: ActivatedRoute,
    private redelexService: RedelexService,
    private titleService: Title
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

  cargarDetalle(id: number) {
    this.loading = true;
    this.redelexService.getProcesoDetalleById(id).subscribe({
      next: (res) => {
        this.detalle = res.data || res;
        this.titleService.setTitle(`Radicado ${this.detalle.numeroRadicacion || id}`);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No tienes permisos o el proceso no existe.';
        this.loading = false;
      }
    });
  }

  // --- MÉTODOS AUXILIARES ---
  getNombreSujeto(tipoBuscado: string): string {
    if (!this.detalle || !this.detalle.sujetos) return 'No registrado';
    const sujeto = this.detalle.sujetos.find((s: any) => s.Tipo?.toUpperCase().includes(tipoBuscado));
    return sujeto ? (sujeto.Nombre || sujeto.RazonSocial) : 'No registrado';
  }

  getIdSujeto(tipoBuscado: string): string {
    if (!this.detalle || !this.detalle.sujetos) return '';
    const sujeto = this.detalle.sujetos.find((s: any) => s.Tipo?.toUpperCase().includes(tipoBuscado));
    return sujeto ? (sujeto.Identificacion || sujeto.NumeroIdentificacion) : '';
  }

  haySolidarios(): boolean {
    if (!this.detalle || !this.detalle.sujetos) return false;
    return this.detalle.sujetos.some((s: any) => s.Tipo?.toUpperCase().includes('SOLIDARIO'));
  }

  getSolidarios(): any[] {
    if (!this.detalle || !this.detalle.sujetos) return [];
    return this.detalle.sujetos.filter((s: any) => s.Tipo?.toUpperCase().includes('SOLIDARIO'));
  }

  // ========================================================================
  // 1. EXPORTAR A EXCEL (ESTILO FORMATO OFICIAL / HOJA DE VIDA)
  // ========================================================================
  async exportToExcel() {

    this.exportState = 'excel';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (!this.detalle) return;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Ficha Técnica');

      // --- CONFIGURACIÓN VISUAL ---
      // Columnas: A (Etiqueta) y B (Valor). A más angosta, B más ancha.
      sheet.getColumn(1).width = 30; 
      sheet.getColumn(2).width = 70;

      // Colores Corporativos
      const colors = {
        headerBlue: 'FF1F4E78', // Azul Oscuro Affi
        bgGray: 'FFF2F2F2',     // Gris claro para etiquetas
        border: 'FFBFBFBF'      // Borde gris
      };

      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
      };

      // 1. LOGO
      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 100, height: 100 } });

      // 2. TÍTULO PRINCIPAL (Centrado sobre A y B)
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

      // --- HELPER PARA CREAR SECCIONES ---
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
        // Celda Etiqueta (Col A)
        const cellLabel = sheet.getCell(`A${currentRow}`);
        cellLabel.value = label;
        cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bgGray } };
        cellLabel.font = { bold: true, color: { argb: 'FF333333' }, name: 'Arial', size: 10 };
        cellLabel.border = borderStyle;
        cellLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        // Celda Valor (Col B)
        const cellValue = sheet.getCell(`B${currentRow}`);
        cellValue.value = value || '---';
        cellValue.font = { color: { argb: 'FF000000' }, name: 'Arial', size: 10 };
        cellValue.border = borderStyle;
        cellValue.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }; // Wrap para textos largos

        currentRow++;
      };

      // --- BLOQUE 1: INFORMACIÓN GENERAL ---
      addSectionHeader('Información General');
      addRowData('Número de Radicación', this.detalle.numeroRadicacion);
      addRowData('ID Interno del Proceso', `#${this.detalle.idProceso}`);
      addRowData('Código Alterno / Cuenta', this.detalle.codigoAlterno);
      addRowData('Clase de Proceso', this.clasePipe.transform(this.detalle.claseProceso));
      addRowData('Etapa Procesal Actual', this.detalle.etapaProcesal || 'EN TRÁMITE');
      
      currentRow++; // Espacio

      // --- BLOQUE 2: UBICACIÓN Y DESPACHO ---
      addSectionHeader('Ubicación y Competencia');
      addRowData('Despacho Judicial', this.detalle.despacho);
      addRowData('Ciudad / Municipio', this.detalle.ubicacionContrato || this.detalle.regional);
      
      currentRow++;

      // --- BLOQUE 3: PARTES PROCESALES ---
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

      // --- BLOQUE 4: ESTADO Y SENTENCIA ---
      addSectionHeader('Estado Judicial y Sentencia');
      const fechaPres = this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || 'N/A';
      addRowData('Fecha Presentación Demanda', fechaPres);
      
      addRowData('Fallo Primera Instancia', this.detalle.sentenciaPrimeraInstanciaResultado || 'Pendiente');
      
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
         const fechaSent = this.datePipe.transform(this.detalle.sentenciaPrimeraInstanciaFecha, 'dd/MM/yyyy');
         addRowData('Fecha de Sentencia', fechaSent || '');
      }

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx', `Ficha_${this.detalle.numeroRadicacion || 'Proceso'}`);
    } catch (e) {
      console.error(e);
      alert('Error exportando Excel: ' + e); 
    } finally {
      this.exportState = 'idle';
    }
  }

// ========================================================================
  // 2. EXPORTAR A PDF (VERTICAL - ESTILO EXPEDIENTE CORREGIDO)
  // ========================================================================
  async exportToPdf() {

    this.exportState = 'pdf';
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (!this.detalle) return;
      // Usamos Portrait (Vertical) porque es una ficha técnica
      const doc = new jsPDF('p', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;

      // 1. LOGO Y ENCABEZADO
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', margin, 10, 25, 25);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 78, 120); // Azul Affi
      doc.text('FICHA TÉCNICA DEL PROCESO', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100); // Gris
      const fechaHoy = this.datePipe.transform(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", undefined, 'es-CO') || '';
      doc.text(fechaHoy, pageWidth / 2, 26, { align: 'center' });

      // Separador visual
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, 40, pageWidth - margin, 40);

      // --- CONSTRUCCIÓN DE LA TABLA VERTICAL ---
      
      // Definimos el tipo explícito para las filas de autotable para evitar líos
      const bodyData: any[] = [];

      // Helper para agregar filas
      const pushRow = (label: string, value: string) => {
        bodyData.push([label, value || '---']);
      };

      // SECCIÓN 1: Info General
      // CORRECCIÓN AQUÍ: Castear los valores literales (as 'bold', as 'left')
      bodyData.push([{ 
        content: 'INFORMACIÓN GENERAL', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold', // <--- CORRECCIÓN TIPO
          halign: 'left' as 'left'     // <--- CORRECCIÓN TIPO
        } 
      }]);
      
      pushRow('Número de Radicación', this.detalle.numeroRadicacion);
      pushRow('ID Interno', `#${this.detalle.idProceso}`);
      pushRow('Código Alterno / Cuenta', this.detalle.codigoAlterno);
      pushRow('Clase de Proceso', this.clasePipe.transform(this.detalle.claseProceso));
      pushRow('Etapa Procesal', this.detalle.etapaProcesal || 'EN TRÁMITE');

      // SECCIÓN 2: Ubicación
      bodyData.push([{ 
        content: 'UBICACIÓN Y COMPETENCIA', 
        colSpan: 2, 
        styles: { 
          fillColor: [31, 78, 120], 
          textColor: 255, 
          fontStyle: 'bold' as 'bold', 
          halign: 'left' as 'left' 
        } 
      }]);
      pushRow('Despacho Judicial', this.detalle.despacho);
      pushRow('Ciudad / Municipio', this.detalle.ubicacionContrato || this.detalle.regional);

      // SECCIÓN 3: Partes
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
        const solidarios = this.getSolidarios().map(s => `• ${s.Nombre || s.RazonSocial} (ID: ${s.Identificacion || 'S/N'})`).join('\n');
        pushRow('Deudores Solidarios', solidarios);
      }

      // SECCIÓN 4: Judicial
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
      
      // CORRECCIÓN AQUÍ: Agregar || '' para evitar el error de 'null' is not assignable to 'string'
      pushRow('Fecha Presentación Demanda', this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || '');
      
      pushRow('Fallo Sentencia', this.detalle.sentenciaPrimeraInstanciaResultado || 'Pendiente');
      
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
        // CORRECCIÓN AQUÍ: Agregar || ''
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
        doc.text(`Estados Procesales - Sistema de Gestión Procesal`, margin, doc.internal.pageSize.height - 10);
      }

      doc.save(`Ficha_${this.detalle.numeroRadicacion || 'Proceso'}.pdf`);

    } catch (e) {
      console.error(e);
      alert('Error exportando PDF: ' + e);
    } finally {
      this.exportState = 'idle'; // Resetear siempre
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