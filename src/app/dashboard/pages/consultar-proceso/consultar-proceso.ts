import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedelexService } from '../../services/redelex';
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
  proceso: any = null;

  identificacion: string = '';
  procesosPorCedula: number[] = [];

  loading = false;

  constructor(private redelexService: RedelexService) {}

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
        this.proceso = res.proceso;
        this.loading = false;

        if (!this.proceso) {
          AffiAlert.fire({
            icon: 'warning',
            title: 'Proceso no encontrado',
            text: 'No se encontró información para el ID de proceso ingresado.'
          });
        } else {
          AffiAlert.fire({
            icon: 'success',
            title: 'Proceso cargado',
            text: `Se cargó la información del proceso ${this.procesoId}.`,
            timer: 1400,
            showConfirmButton: false
          });
        }
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
    this.proceso = null;

    this.redelexService.getProcesosByIdentificacion(cedula).subscribe({
      next: (res) => {
        this.loading = false;
        this.procesosPorCedula = res.procesos || [];

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

        AffiAlert.fire({
          icon: 'error',
          title: 'Error al consultar',
          text: 'No se pudieron obtener los procesos para esa identificación.'
        });
      }
    });
  }

  seleccionarProceso(id: number) {
    this.procesoId = id;
    this.consultarPorId();
  }
}
