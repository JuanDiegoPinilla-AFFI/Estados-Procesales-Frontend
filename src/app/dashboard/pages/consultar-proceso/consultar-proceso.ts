import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedelexService, ProcesoDetalleDto } from '../../services/redelex';
import { AffiAlert } from '../../../shared/affi-alert';

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
  procesosPorCedula: number[] = [];
  procesosFiltrados: number[] = [];
  filtroProcesoId: string = '';

  loading = false;

  // Paginación
  currentPage = 1;
  itemsPerPage = 20;

  // 👇 Estado de secciones desplegables
  sectionOpen = {
    proceso: true,
    demandante: true,
    demandado: true,
    medidas: true,
    abogados: true,
  };

  constructor(private redelexService: RedelexService) {}

  private resetSections() {
    this.sectionOpen = {
      proceso: true,
      demandante: true,
      demandado: true,
      medidas: true,
      abogados: true,
    };
  }

  toggleSection(section: 'proceso' | 'demandante' | 'demandado' | 'medidas' | 'abogados') {
    this.sectionOpen[section] = !this.sectionOpen[section];
  }

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
        this.resetSections(); // 👈 cada vez que cargas proceso, abre todas las secciones

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
    const filtro = this.filtroProcesoId.trim();

    if (!filtro) {
      this.procesosFiltrados = [...this.procesosPorCedula];
    } else {
      this.procesosFiltrados = this.procesosPorCedula.filter((id) =>
        id.toString().includes(filtro)
      );
    }

    this.currentPage = 1;
  }

  get procesosPaginados(): number[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.procesosFiltrados.slice(start, end);
  }

  get totalPages(): number {
    if (!this.procesosFiltrados.length) return 0;
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
}
