export const STORAGE_KEY = 'finanzaspro_data_v1';

export const TIPOS = {
    efectivo:  { label: 'Efectivo',  color: '#34d399', icon: 'fa-money-bill-wave' },
    debito:    { label: 'Débito',    color: '#8b5cf6', icon: 'fa-credit-card' },
    inversion: { label: 'Rendimiento bancario', color: '#22d3ee', icon: 'fa-chart-line' }
};

export const KEY_RESPALDO = 'finanzaspro_ultimo_respaldo';

export const MONEDAS = ['MXN', 'USD', 'EUR', 'Otra'];
// Orden de aparición: rendimiento, débito, efectivo
export const ORDEN_TIPO_CUENTA = { inversion: 0, debito: 1, efectivo: 2 };
