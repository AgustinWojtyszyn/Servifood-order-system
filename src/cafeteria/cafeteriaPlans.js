import flyerBasico from '../assets/flyer_desayuno_basico.png'
import flyerMedium from '../assets/flyer_desayuno_medium.png'
import flyerPremium from '../assets/flyer_desayuno_premium.png'

export const CAFETERIA_PLANS = [
  {
    id: 'basico',
    name: 'Desayuno Basico',
    image: flyerBasico,
    highlight: 'Incluye traslado y atencion de desayuno',
    includes: [
      'Incluye traslado',
      'Infusiones: 1 cafe instantaneo o termo de cafe listo para su consumo',
      'Infusiones: 2 te clasico/saborizado',
      'Consumiciones: 2 sandwich miga mixto chico',
      'Consumiciones: 2 criollitos',
      'Consumiciones: 1 medialuna',
      'Consumiciones: 1 frutos secos 50 grs',
      'Consumiciones: 1 fruta de estacion',
      'Servicio: servicio de traslado incluido',
      'Servicio: personal para atencion del desayuno',
      'Descartables: 1 vaso termico 240cc',
      'Descartables: 1 vaso cristal 240cc',
      'Descartables: 1 cucharita',
      'Descartables: 1 servilleta',
      'Sobres: 4 sobres de azucar',
      'Sobres: 2 sobres de edulcorante',
      'Sobres: 1 sobre de leche'
    ]
  },
  {
    id: 'medium',
    name: 'Desayuno Medium',
    image: flyerMedium,
    highlight: 'Mas variedad y energia para el equipo',
    includes: [
      'Incluye traslado',
      'Infusiones: cafe instantaneo o cafe de termo x 250cc',
      'Infusiones: 1 sobre de te clasico/saborizado (2 unidades)',
      'Infusiones: 1 gaseosa 500cc o jugo natural de naranja 300cc',
      'Consumiciones: 1 medialuna',
      'Consumiciones: 4 sandwiches de miga mixto chicos (jamon y queso)',
      'Consumiciones: 2 mini masitas',
      'Consumiciones: 1 barra de cereal',
      'Consumiciones: 1 frutos secos 50grs',
      'Consumiciones: 1 fruta de estacion personal',
      'Servicio: servicio de traslado incluido',
      'Servicio: personal para atencion del desayuno',
      'Descartables: 1 vaso termico 240cc',
      'Descartables: 1 vaso cristal 240cc',
      'Descartables: 1 cucharita',
      'Descartables: 1 servilleta',
      'Sobres: 4 sobres de azucar',
      'Sobres: 2 sobres de edulcorante',
      'Sobres: 1 sobre de leche'
    ]
  },
  {
    id: 'premium',
    name: 'Desayuno Premium',
    image: flyerPremium,
    highlight: 'Opciones gourmet y panificados premium',
    includes: [
      'Incluye traslado',
      'Infusiones: 1 cafe instantaneo o termo de cafe listo para su consumo',
      'Infusiones: 2 te clasico/saborizado',
      'Infusiones: 1 gaseosa 500cc o jugo natural de naranja 300cc',
      'Panificados/Solidos: 4 sandwich miga mixto chico',
      'Panificados/Solidos: 3 masas finas',
      'Panificados/Solidos: 1 medialuna',
      'Panificados/Solidos: 1 frutos secos 50 grs',
      'Panificados/Solidos: 1 ensalada de frutas personal',
      'Panificados/Solidos: 1 barra de cereal',
      'Servicio: servicio de traslado incluido',
      'Servicio: personal para atencion del desayuno',
      'Vajilla descartable: 1 vaso termico 240cc',
      'Vajilla descartable: 1 vaso cristal 240cc',
      'Vajilla descartable: 1 cucharita',
      'Vajilla descartable: 1 servilleta',
      'Sobres: 1 sobre de leche',
      'Sobres: 4 sobres de azucar',
      'Sobres: 2 sobres de edulcorante'
    ]
  }
]

export const getCafeteriaPlan = (planId) => CAFETERIA_PLANS.find((plan) => plan.id === planId) || null
