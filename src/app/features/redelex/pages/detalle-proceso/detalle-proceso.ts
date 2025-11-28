import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RedelexService } from '../../services/redelex.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-detalle-proceso',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detalle-proceso.html',
  styleUrls: ['./detalle-proceso.scss']
})
export class DetalleProcesoComponent implements OnInit {
  procesoId: number | null = null;
  detalle: any = null;
  loading = true;
  error = '';

  // Grupos de sujetos
  sujetoDemandante: any[] = [];
  sujetoDemandado: any[] = [];
  sujetosSolidarios: any[] = [];
  otrosSujetos: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private redelexService: RedelexService,
    private titleService: Title
  ) {}

  ngOnInit() {
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
    this.redelexService.getProcesoDetalleById(id).subscribe({
      next: (res) => {
        this.detalle = res.data || res;
        this.procesarSujetos();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        if (err.status === 403) {
          this.error = 'No tienes permisos para ver este proceso.';
        } else {
          this.error = 'No se pudo cargar la información del proceso.';
        }
        this.loading = false;
      }
    });
  }

procesarSujetos() {
    if (!this.detalle || !this.detalle.sujetos) return;

    const sujetos = this.detalle.sujetos;

    // CORRECCIÓN: Usamos 'Tipo' en lugar de 'TipoSujeto'
    this.sujetoDemandante = sujetos.filter((s: any) => 
      s.Tipo?.toUpperCase().includes('DEMANDANTE')
    );
    
    this.sujetoDemandado = sujetos.filter((s: any) => 
      s.Tipo?.toUpperCase().includes('DEMANDADO')
    );
    
    this.sujetosSolidarios = sujetos.filter((s: any) => 
      s.Tipo?.toUpperCase().includes('SOLIDARIO')
    );
    
    this.otrosSujetos = sujetos.filter((s: any) => {
      const tipo = s.Tipo?.toUpperCase() ?? '';
      return !tipo.includes('DEMANDANTE') && 
             !tipo.includes('DEMANDADO') && 
             !tipo.includes('SOLIDARIO');
    });
  }
}