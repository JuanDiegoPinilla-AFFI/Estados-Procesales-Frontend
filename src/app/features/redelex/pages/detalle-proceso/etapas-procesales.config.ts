export interface EtapaProcesal {
  orden: number;
  nombreInterno: string[];
  color: string;
  nombreCliente: string;
  definicion: string;
}

export const ETAPAS_PROCESALES: EtapaProcesal[] = [
  {
    orden: 1,
    nombreInterno: [
      'ALISTAMIENTO MES',
      'ALISTAMIENTO MESES ANTERIORES',
      'DOCUMENTACION COMPLETA',
      'ASIGNACION'
    ],
    color: '#FFFF99',
    nombreCliente: 'RECOLECCION Y VALIDACION DOCUMENTAL',
    definicion: 'Se está completando y revisando la información necesaria para iniciar los procesos.'
  },
  {
    orden: 2,
    nombreInterno: ['DEMANDA'],
    color: '#F1A983',
    nombreCliente: 'DEMANDA',
    definicion: 'Hemos iniciado el proceso judicial.'
  },
  {
    orden: 3,
    nombreInterno: ['MANDAMIENTO DE PAGO'],
    color: '#FBE2D5',
    nombreCliente: 'MANDAMIENTO DE PAGO',
    definicion: 'El juez acepta tramitar la demanda'
  },
  {
    orden: 4,
    nombreInterno: ['ADMISION DEMANDA'],
    color: '#92D050',
    nombreCliente: 'ADMISION DEMANDA',
    definicion: 'El juez acepta tramitar la demanda'
  },
  {
    orden: 5,
    nombreInterno: ['NOTIFICACION'],
    color: '#B5E6A2',
    nombreCliente: 'NOTIFICACION',
    definicion: 'Etapa en la que se comunica la existencia del proceso.'
  },
  {
    orden: 6,
    nombreInterno: ['EXCEPCIONES'],
    color: '#00B0F0',
    nombreCliente: 'EXCEPCIONES',
    definicion: 'Demandado presentó objeciones a la demanda'
  },
  {
    orden: 7,
    nombreInterno: ['AUDIENCIA'],
    color: '#C0E6F5',
    nombreCliente: 'AUDIENCIA',
    definicion: 'Diligencia donde el juez escucha a las partes.'
  },
  {
    orden: 8,
    nombreInterno: ['SENTENCIA'],
    color: '#D86DCD',
    nombreCliente: 'SENTENCIA',
    definicion: 'El juez decidió sobre la demanda.'
  },
  {
    orden: 9,
    nombreInterno: [
      'LIQUIDACION',
      'AVALUO DE BIENES',
      'REMATE'
    ],
    color: '#E49EDD',
    nombreCliente: 'LIQUIDACION',
    definicion: 'Etapa en la que se cuantifica con exactitud las obligaciones.'
  },
  {
    orden: 10,
    nombreInterno: ['LANZAMIENTO'],
    color: '#FFC000',
    nombreCliente: 'LANZAMIENTO',
    definicion: 'Se está gestionando el desalojo de los inquilinos.'
  }
];

export function getEtapaConfig(nombreInterno: string | null | undefined): EtapaProcesal | null {
  if (!nombreInterno) return null;
  
  const nombreUpper = nombreInterno.toUpperCase().trim();
  
  return ETAPAS_PROCESALES.find(etapa => 
    etapa.nombreInterno.some(interno => 
      interno.toUpperCase() === nombreUpper
    )
  ) || null;
}

export function getEtapaIndex(nombreInterno: string | null | undefined): number {
  const config = getEtapaConfig(nombreInterno);
  return config ? config.orden - 1 : 0;
}

export function getEtapasParaStepper(): { nombre: string; color: string }[] {
  return ETAPAS_PROCESALES.map(etapa => ({
    nombre: etapa.nombreCliente,
    color: etapa.color
  }));
}