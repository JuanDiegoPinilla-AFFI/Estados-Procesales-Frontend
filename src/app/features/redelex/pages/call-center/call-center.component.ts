import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AffiAlert } from '../../../../shared/services/affi-alert';
import { AuthService } from '../../../auth/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of, filter } from 'rxjs';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-call-center',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FeatherModule],
  templateUrl: './call-center.component.html',
  styleUrls: ['./call-center.component.scss']
})
export class CallCenterComponent {
  currentStep = 1;
  form: FormGroup;
  loading = false;
  
  hubspotInfo: any = { companyFound: false, contactFound: false };
  procesosEncontrados: any[] = [];
  selectedProceso: any = null;
  selectedOwnerId: string | null = null;
  filterText: string = '';

  currentPage = 1;
  itemsPerPage = 5;
  filterProcesosTerm: string = '';
  
  asesorName = '';

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private titleService = inject(Title);
  private apiUrl = `${environment.apiUrl}api`;

  constructor() {
    this.asesorName = this.authService.getUserData()?.name || 'Asesor';
    
    this.form = this.fb.group({
      // Step 1
      callType: ['Entrante', Validators.required],
      transferArea: [''],

      // Step 2 (Cliente)
      companyNit: ['', Validators.required],
      companyName: ['', Validators.required],
      zona: [''],
      montoAfianzado: [''],
      contratos: [''],
      gerenteCuenta: [''],
      directorComercial: [''],
      cluster: [''],
      representanteLegal: [''],
      gerenteComercial: [''],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactName: ['', Validators.required],
      contactPhone: [''],
      contactAffi: [''],

      // Step 3 (Consulta)
      query: ['', Validators.required],

      // Step 4 (Proceso)
      inquilinoIdentificacion: [''],
      inquilinoNombre: [''],
      cuenta: [''],
      procesoId: [''],
      response: ['', Validators.required]
    });

    this.setupAutocomplete();
  }

ngOnInit() {
    this.titleService.setTitle('Estados Procesales - Centro de Llamadas');
  }

  private resetCompanyFields() {
    this.hubspotInfo.companyFound = false;
    this.selectedOwnerId = null;
    this.form.patchValue({ 
      companyName: '', 
      zona: '',
      montoAfianzado: '',
      contratos: '',
      gerenteCuenta: '',
      directorComercial: '',
      cluster: '',
      representanteLegal: ''
    }, { emitEvent: false });
  }

  private resetContactFields() {
    this.hubspotInfo.contactFound = false;
    this.form.patchValue({
      contactName: '',
      contactPhone: '',
      contactAffi: ''
    }, { emitEvent: false });
  }

  private formatMoney(value: string | number): string {
    if (!value) return '';
    const numberValue = Number(value);
    return '$ ' + numberValue.toLocaleString('es-CO');
  }

  setupAutocomplete() {
    this.form.get('companyNit')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(nit => {
        if (nit && nit.length > 5) {
          const cleanNit = nit.replace(/\D/g, '');
          return this.http.get<any>(`${this.apiUrl}/support/hubspot/search-company?nit=${cleanNit}`).pipe(
            catchError(() => of({ found: false }))
          );
        }
        return of({ found: false });
      })
    ).subscribe(res => {
      if (res && res.found) {
        this.hubspotInfo.companyFound = true;
        this.selectedOwnerId = res.hubspotOwnerId || res.ownerId;

        this.form.patchValue({ 
          companyName: res.nombreInmobiliaria, 
          zona: res.zonaAffi || '',
          montoAfianzado: this.formatMoney(res.montoAfianzado),
          contratos: res.cantidadContratos || '',
          gerenteCuenta: res.equipoComercial?.gerenteNombre || '',
          directorComercial: res.equipoComercial?.directorName || '',
          cluster: res.cluster || '',
          representanteLegal: res.nombreRepresentante || ''
        }, { emitEvent: false });  
        
        AffiAlert.fire({
          icon: 'success',
          title: 'Empresa Encontrada',
          text: `Se cargaron los datos de ${res.nombreInmobiliaria}`,
          timer: 2000,
          toast: true,
          position: 'top-end'
        });

      } else {
        this.resetCompanyFields();
      }
    });

    this.form.get('contactEmail')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(email => {
        const isValid = email && email.includes('@') && email.length > 5;
        
        if (isValid) {
          return this.http.get<any>(`${this.apiUrl}/support/hubspot/search-contact?email=${email}`).pipe(
            catchError(() => of({ found: false }))
          );
        }
        return of({ found: false });
      })
    ).subscribe(res => {
      if (res && res.found) {
        this.hubspotInfo.contactFound = true;
        this.form.patchValue({ 
          contactName: res.name,
          contactPhone: res.phone,
          contactAffi: res.cargo
        }, { emitEvent: false });

        AffiAlert.fire({
          icon: 'success',
          title: 'Contacto Encontrado',
          text: `Datos cargados para ${res.name}`,
          timer: 2000,
          toast: true,
          position: 'top-end'
        });
      } else {
        this.resetContactFields();
      }
    });
  }

  buscarProcesos() {
    const id = this.form.get('inquilinoIdentificacion')?.value;
    if (!id) return;

    this.loading = true;
    this.currentPage = 1; 
    this.filterProcesosTerm = '';

    this.http.get<any>(`${this.apiUrl}/redelex/procesos-por-identificacion/${id}`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.procesos.length > 0) {
          this.procesosEncontrados = res.procesos.map((p: any) => {
            let clase = p.claseProceso ? p.claseProceso.toUpperCase() : '';
            if (clase.includes('EJECUTIVO')) {
              clase = 'EJECUTIVO';
            } else if (clase.includes('VERBAL') || clase.includes('RESTITUCION')) {
              clase = 'RESTITUCIÓN';
            }

            let etapaOriginal = p.etapaProcesal ? p.etapaProcesal.toUpperCase() : '';
            let etapaTransformada = etapaOriginal;

            if (!etapaOriginal) {
              etapaTransformada = 'RECOLECCION Y VALIDACION DOCUMENTAL'; 
            }

            if (['ALISTAMIENTO', 'DOCUMENTACION', 'ASIGNACION'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'RECOLECCION Y VALIDACION DOCUMENTAL';
            } else if (etapaOriginal.includes('MANDAMIENTO')) {
              etapaTransformada = 'MANDAMIENTO DE PAGO';
            } else if (etapaOriginal.includes('ADMISION')) {
              etapaTransformada = 'ADMISION DEMANDA';
            } else if (['NOTIFICACION', 'EMPLAZAMIENTO'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'NOTIFICACION';
            } else if (['EXCEPCIONES', 'CONTESTACION'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'EXCEPCIONES';
            } else if (['LIQUIDACION', 'AVALUO', 'REMATE'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'LIQUIDACION';
            } else if (['LANZAMIENTO', 'ENTREGA'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'LANZAMIENTO';
            } else if (['TERMINACION', 'TERMINADO', 'DESISTIMIENTO'].some(e => etapaOriginal.includes(e))) {
              etapaTransformada = 'TERMINACION';
            }

            return { 
              ...p, 
              claseProceso: clase, 
              etapaProcesal: etapaTransformada 
            };
          });
        } else {
          this.procesosEncontrados = [];
          AffiAlert.fire({
            icon: 'warning',
            title: 'Sin resultados',
            text: 'No se encontraron procesos asociados a esa identificación.',
            timer: 3000
          });
        }
      },
      error: () => {
        this.loading = false;
        AffiAlert.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo consultar la base de datos de procesos.'
        });
      }
    });
  }

  get filteredProcesos() {
    if (!this.filterProcesosTerm) {
      return this.procesosEncontrados;
    }
    const term = this.filterProcesosTerm.toLowerCase();
    return this.procesosEncontrados.filter(p => 
      (p.procesoId?.toString().includes(term)) ||
      (p.numeroRadicacion?.toLowerCase().includes(term)) ||
      (p.demandadoIdentificacion?.toLowerCase().includes(term)) ||
      (p.demandadoNombre?.toLowerCase().includes(term)) ||
      (p.codigoAlterno?.toLowerCase().includes(term)) ||
      (p.claseProceso?.toLowerCase().includes(term))
    );
  }

  get paginatedProcesos() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProcesos.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredProcesos.length / this.itemsPerPage);
  }

  changePage(delta: number) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  seleccionarProceso(proc: any) {
    this.selectedProceso = proc;
    
    this.form.patchValue({
      procesoId: proc.procesoId,
      cuenta: proc.codigoAlterno,
      inquilinoNombre: proc.demandadoNombre,
      inquilinoIdentificacion: proc.demandadoIdentificacion
    });

    AffiAlert.fire({
      icon: 'success',
      title: 'Proceso Seleccionado',
      text: `Se ha asociado el proceso ${proc.procesoId} al ticket.`,
      timer: 1500,
      toast: true,
      position: 'top-end'
    });
  }

  nextStep() {
    if (this.currentStep === 1) {
      const tipoLlamada = this.form.get('callType')?.value;

      if (!tipoLlamada) {
        AffiAlert.fire({
          icon: 'warning',
          title: 'Selección requerida',
          text: 'Debe seleccionar un tipo de llamada.',
          timer: 2000
        });
        return;
      }

      if (tipoLlamada === 'Llamada Transferida' && !this.form.get('transferArea')?.value) {
        AffiAlert.fire({
          icon: 'warning',
          title: 'Área requerida',
          text: 'Por favor seleccione el área a la cual transfirió la llamada.',
          timer: 2500
        });
        return;
      }
    }

    if (this.currentStep === 2) {
      if (!this.form.get('companyNit')?.value || !this.form.get('contactEmail')?.value) {
         AffiAlert.fire({
          icon: 'warning',
          title: 'Datos incompletos',
          text: 'Debe completar el NIT de la empresa y el correo del contacto.',
          timer: 2500
        });
        return;
      }
    }
    
    if (this.currentStep === 3 && this.form.get('query')?.invalid) {
      AffiAlert.fire({
        icon: 'warning',
        title: 'Falta información',
        text: 'Debe ingresar la descripción de la consulta.',
        timer: 2500
      });
      return;
    }
    
    this.currentStep++;
  }

  prevStep() {
    this.currentStep--;
  }

  submit() {
    if (this.currentStep === 4 && this.form.get('response')?.invalid) {
      AffiAlert.fire({
        icon: 'warning',
        title: 'Falta información',
        text: 'Debe ingresar la respuesta a la consulta.',
        timer: 2500
      });
      return;
    }

    if (this.form.invalid) {
      AffiAlert.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Revise que todos los campos obligatorios estén llenos.'
      });
      return;
    }
    
    this.loading = true;

    const payload = {
      callType: this.form.get('callType')?.value,
      transferArea: this.form.get('transferArea')?.value,
      contactEmail: this.form.get('contactEmail')?.value,
      contactName: this.form.get('contactName')?.value,
      contactPhone: this.form.get('contactPhone')?.value,
      companyNit: this.form.get('companyNit')?.value,
      companyName: this.form.get('companyName')?.value,
      gerenteComercial: this.form.get('gerenteComercial')?.value,
      claseProceso: this.selectedProceso?.claseProceso, 
      etapaProcesal: this.selectedProceso?.etapaProcesal,
      query: this.form.get('query')?.value,
      response: this.form.get('response')?.value,
      procesoId: this.form.get('procesoId')?.value,
      cuenta: this.form.get('cuenta')?.value,
      inquilinoIdentificacion: this.form.get('inquilinoIdentificacion')?.value,
      inquilinoNombre: this.form.get('inquilinoNombre')?.value
    };

    this.http.post(`${this.apiUrl}/support/call-ticket`, payload).subscribe({
      next: () => {
        this.loading = false;
        AffiAlert.fire({
          icon: 'success',
          title: 'Llamada Registrada',
          text: 'El ticket se ha creado en HubSpot correctamente.',
          showConfirmButton: true,
          confirmButtonText: 'Nueva Llamada'
        }).then(() => {
          window.location.reload();
        });
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        const errorMsg = err.error?.message ? 
          (Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message) 
          : 'No se pudo guardar el ticket en HubSpot.';
          
        AffiAlert.fire({ 
          icon: 'error', 
          title: 'Error de creación', 
          text: errorMsg 
        });
      }
    });
  }

  get isEntrante() { 
    return this.form.get('callType')?.value === 'Entrante' || this.form.get('callType')?.value === 'Llamada Transferida'; 
  }
}