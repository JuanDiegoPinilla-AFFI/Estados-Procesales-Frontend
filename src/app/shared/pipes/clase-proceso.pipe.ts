import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'claseProceso',
  standalone: true // Importante para usarlo sin módulos
})
export class ClaseProcesoPipe implements PipeTransform {

  transform(value: string | null | undefined): string {
    if (!value) return '-';

    const clase = value.trim().toUpperCase();

    // LÓGICA DE REEMPLAZO SOLICITADA
    if (clase.includes('EJECUTIVO SINGULAR')) {
      return 'EJECUTIVO';
    }
    
    if (clase.includes('VERBAL SUMARIO')) {
      return 'RESTITUCIÓN';
    }

    // Si no coincide con ninguno, devolvemos el valor original (quizás en TitleCase)
    return value;
  }
}