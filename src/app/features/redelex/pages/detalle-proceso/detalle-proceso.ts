import { Component, OnInit, inject } from '@angular/core'; // Agregar inject
import { CommonModule, DatePipe } from '@angular/common'; // Importar DatePipe
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';
import { ClaseProcesoPipe } from '../../../../shared/pipes/clase-proceso.pipe';
// IMPORTACIONES PARA EXPORTAR
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AFFI_LOGO_BASE64 } from '../../../../shared/assets/affi-logo-base64';

@Component({
  selector: 'app-detalle-proceso',
  standalone: true,
  imports: [CommonModule, RouterLink, ClaseProcesoPipe],
  // AGREGAR DatePipe y ClaseProcesoPipe A LOS PROVIDERS
  providers: [DatePipe, ClaseProcesoPipe], 
  templateUrl: './detalle-proceso.html',
  styleUrls: ['./detalle-proceso.scss']
})
export class DetalleProcesoComponent implements OnInit {
  // Inyecciones nuevas para usar en exportación
  private datePipe = inject(DatePipe);
  private clasePipe = inject(ClaseProcesoPipe);

  procesoId: number | null = null;
  detalle: any = null;
  loading = true;
  error = '';

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

  // --- MÉTODOS AUXILIARES (Ya los tenías) ---
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
  // 1. EXPORTAR A EXCEL (FICHA TÉCNICA)
  // ========================================================================
  async exportToExcel() {
    try {
      if (!this.detalle) return;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Ficha Proceso');

      // LOGO
      const imageId = workbook.addImage({ base64: AFFI_LOGO_BASE64, extension: 'png' });
      sheet.addImage(imageId, { tl: { col: 0.2, row: 0.1 }, ext: { width: 100, height: 100 } });

      // TÍTULO
      sheet.mergeCells('C2:F2');
      const titleCell = sheet.getCell('C2');
      titleCell.value = 'FICHA TÉCNICA DEL PROCESO';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('C3:F3');
      const dateCell = sheet.getCell('C3');
      dateCell.value = this.datePipe.transform(new Date(), 'longDate');
      dateCell.alignment = { horizontal: 'center' };

      // --- SECCIÓN 1: DATOS GENERALES ---
      let currentRow = 6;
      this.addSectionTitle(sheet, currentRow, 'INFORMACIÓN GENERAL');
      currentRow += 2;

      this.addKeyValue(sheet, currentRow, 'Radicado:', this.detalle.numeroRadicacion || 'Sin Radicado');
      this.addKeyValue(sheet, currentRow, 'ID Interno:', `#${this.detalle.idProceso}`, 3); // Columna C
      currentRow++;

      this.addKeyValue(sheet, currentRow, 'Clase Proceso:', this.clasePipe.transform(this.detalle.claseProceso));
      this.addKeyValue(sheet, currentRow, 'Etapa Procesal:', this.detalle.etapaProcesal || 'EN TRÁMITE', 3);
      currentRow++;

      this.addKeyValue(sheet, currentRow, 'Despacho:', this.detalle.despacho);
      currentRow++;
      this.addKeyValue(sheet, currentRow, 'Ciudad:', this.detalle.ubicacionContrato || this.detalle.regional);
      currentRow += 2;

      // --- SECCIÓN 2: ESTADO JUDICIAL ---
      this.addSectionTitle(sheet, currentRow, 'ESTADO JUDICIAL');
      currentRow += 2;

      this.addKeyValue(sheet, currentRow, 'Sentencia:', this.detalle.sentencia || 'Pendiente');
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
         this.addKeyValue(sheet, currentRow, 'Fecha Sentencia:', this.datePipe.transform(this.detalle.sentenciaPrimeraInstanciaFecha, 'dd/MM/yyyy') || '', 3);
      }
      currentRow++;
      
      this.addKeyValue(sheet, currentRow, 'Fecha Presentación:', this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || 'N/A');
      currentRow += 2;

      // --- SECCIÓN 3: PARTES ---
      this.addSectionTitle(sheet, currentRow, 'PARTES PROCESALES');
      currentRow += 2;

      this.addKeyValue(sheet, currentRow, 'DEMANDANTE:', this.getNombreSujeto('DEMANDANTE'));
      this.addKeyValue(sheet, currentRow, 'Identificación:', this.getIdSujeto('DEMANDANTE'), 3);
      currentRow++;

      this.addKeyValue(sheet, currentRow, 'DEMANDADO:', this.getNombreSujeto('DEMANDADO'));
      this.addKeyValue(sheet, currentRow, 'Identificación:', this.getIdSujeto('DEMANDADO'), 3);
      currentRow += 2;

      if (this.haySolidarios()) {
        const solidarios = this.getSolidarios().map(s => s.Nombre || s.RazonSocial).join(', ');
        this.addKeyValue(sheet, currentRow, 'Solidarios:', solidarios);
        currentRow += 2;
      }

      // AJUSTAR ANCHOS
      sheet.getColumn(1).width = 20; // Etiqueta A
      sheet.getColumn(2).width = 40; // Valor B
      sheet.getColumn(3).width = 20; // Etiqueta C
      sheet.getColumn(4).width = 40; // Valor D

      const buffer = await workbook.xlsx.writeBuffer();
      this.saveFile(buffer, 'xlsx', `Ficha_${this.detalle.numeroRadicacion}`);
    } catch (e) { console.error(e); alert('Error exportando Excel'); }
  }

  // Helpers Excel
  private addSectionTitle(sheet: any, row: number, title: string) {
    const cell = sheet.getCell(`A${row}`);
    cell.value = title;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    sheet.mergeCells(`A${row}:D${row}`);
  }

  private addKeyValue(sheet: any, row: number, key: string, value: string, colOffset = 1) {
    const keyCell = sheet.getCell(row, colOffset);
    keyCell.value = key;
    keyCell.font = { bold: true, color: { argb: 'FF555555' } };
    
    const valCell = sheet.getCell(row, colOffset + 1);
    valCell.value = value;
  }


  // ========================================================================
  // 2. EXPORTAR A PDF (FICHA TÉCNICA)
  // ========================================================================
  exportToPdf() {
    try {
      if (!this.detalle) return;
      const doc = new jsPDF(); // Portrait por defecto
      const pageWidth = doc.internal.pageSize.width;
      
      // LOGO
      doc.addImage(AFFI_LOGO_BASE64, 'PNG', 14, 10, 25, 25);

      // TÍTULOS
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FICHA TÉCNICA DEL PROCESO', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${this.datePipe.transform(new Date(), 'longDate')}`, pageWidth / 2, 26, { align: 'center' });

      // --- TABLA DE DATOS ---
      // Usamos autoTable para maquetar la ficha clave-valor
      const bodyData = [
        [{ content: 'INFORMACIÓN GENERAL', colSpan: 2, styles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' } }],
        ['Radicado:', this.detalle.numeroRadicacion || 'Sin Radicado'],
        ['ID Interno:', `#${this.detalle.idProceso}`],
        ['Código Alterno:', this.detalle.codigoAlterno || 'N/A'],
        ['Clase Proceso:', this.clasePipe.transform(this.detalle.claseProceso)],
        ['Etapa Procesal:', this.detalle.etapaProcesal || 'EN TRÁMITE'],
        
        [{ content: 'UBICACIÓN', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
        ['Despacho:', this.detalle.despacho || 'No asignado'],
        ['Ciudad:', this.detalle.ubicacionContrato || this.detalle.regional || 'N/A'],
        
        [{ content: 'PARTES PROCESALES', colSpan: 2, styles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' } }],
        ['DEMANDANTE:', `${this.getNombreSujeto('DEMANDANTE')} (${this.getIdSujeto('DEMANDANTE')})`],
        ['DEMANDADO:', `${this.getNombreSujeto('DEMANDADO')} (${this.getIdSujeto('DEMANDADO')})`],
      ];

      // Agregar deudores si hay
      if (this.haySolidarios()) {
        const solidarios = this.getSolidarios().map(s => s.Nombre || s.RazonSocial).join('\n');
        bodyData.push(['Deudores Solidarios:', solidarios]);
      }

      // Agregar Sentencia
      bodyData.push([{ content: 'ESTADO JUDICIAL', colSpan: 2, styles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' } }]);
      bodyData.push(['Sentencia 1ra Instancia:', this.detalle.sentenciaPrimeraInstanciaResultado || 'Pendiente']);
      if (this.detalle.sentenciaPrimeraInstanciaFecha) {
         bodyData.push(['Fecha Sentencia:', this.datePipe.transform(this.detalle.sentenciaPrimeraInstanciaFecha, 'dd/MM/yyyy') || '']);
      }
      bodyData.push(['Fecha Presentación:', this.datePipe.transform(this.detalle.fechaRecepcionProceso, 'dd/MM/yyyy') || 'N/A']);

      autoTable(doc, {
        startY: 40,
        body: bodyData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 50 }, // Columna Clave
          1: { cellWidth: 'auto' } // Columna Valor
        }
      });

      doc.save(`Ficha_${this.detalle.numeroRadicacion}.pdf`);

    } catch (e) { console.error(e); alert('Error exportando PDF'); }
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