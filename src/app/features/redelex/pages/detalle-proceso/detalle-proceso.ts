import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router'; // Importamos RouterLink para el botón volver
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-detalle-proceso',
  standalone: true,
  imports: [CommonModule, RouterLink], // Importante para poder usar routerLink en el HTML
  templateUrl: './detalle-proceso.html', // Usaremos archivo HTML separado para orden
  styleUrls: ['./detalle-proceso.scss']
})
export class DetalleProcesoComponent implements OnInit {
  procesoId: number | null = null;
  detalle: any = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private redelexService: RedelexService, // Usamos el servicio existente
    private titleService: Title
  ) {}

  ngOnInit() {
    // 1. Capturamos el ID de la URL (ej: /proceso/123 -> id = 123)
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      this.procesoId = +idParam;
      this.titleService.setTitle(`Affi - Proceso #${this.procesoId}`);
      this.cargarDetalle(this.procesoId);
    } else {
      this.error = 'ID de proceso no válido';
      this.loading = false;
    }
  }

  cargarDetalle(id: number) {
    this.loading = true;
    // 2. Llamamos al endpoint que ya existe en tu servicio (getProcesoDetalleById)
    // Este endpoint ya lo tenías creado de antes.
    this.redelexService.getProcesoDetalleById(id).subscribe({
      next: (res) => {
        // Tu backend devuelve { success: true, data: { ... } }
        this.detalle = res.data || res; 
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        // Si el backend responde 403 Forbidden, es porque la inmobiliaria no es dueña
        if (err.status === 403) {
          this.error = 'No tienes permisos para ver este proceso.';
        } else {
          this.error = 'No se pudo cargar la información del proceso.';
        }
        this.loading = false;
      }
    });
  }
}