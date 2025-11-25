import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-mis-procesos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-procesos.html',
  styleUrls: ['./mis-procesos.scss'] // Reusa estilos o crea nuevos
})
export class MisProcesosComponent implements OnInit {
  procesos: any[] = [];
  loading = true;
  error = '';
  identificacionUsuario = '';

  constructor(
    private redelexService: RedelexService,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Affi - Mis Procesos');
    this.cargarMisProcesos();
  }

  cargarMisProcesos() {
    this.loading = true;
    this.redelexService.getMisProcesos().subscribe({
      next: (res) => {
        // El backend devuelve { success: true, identificacion: '...', procesos: [...] }
        this.procesos = res.procesos || [];
        this.identificacionUsuario = res.identificacion; // El NIT que usó el sistema
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los procesos. Intente más tarde.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}