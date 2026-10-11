// Préstamos entre tú y bancos o personas: "me prestaron" (yo debo) y "yo presté" (me deben).
// Fechas opcionales: calendario de pagos. Fecha de liquidación: opcional u obligatoria, según tú decidas.
import { store } from '../store.js';
import { esc, hoyISO, r2, mxn } from '../utils.js';
import { fechaCuota } from './msi.js';
import { aISO } from './recurrentes.js';

export const ETIQ_DIRECCION = { recibido: 'Me prestaron', otorgado: 'Yo presté' };
export const ETIQ_CONTRAPARTE = { banco: 'Banco', persona: 'Persona' };
export const FREC_PRESTAMO = { mensual: 'Cada mes', catorcenal: 'Cada 14 días', semanal: 'Cada 7 días' };

export const abonado = p => r2((p.abonos || []).reduce((a, x) => a + x.monto, 0));

const sumarDias = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return aISO(d); };
export const diasPara = iso => iso ? Math.round((new Date(`${iso}T00:00:00`) - new Date(`${hoyISO()}T00:00:00`)) / 864e5) : null;
export const textoDias = n => n < 0 ? `venció hace ${-n} d` : n === 0 ? 'hoy' : `en ${n} d`;

// Fechas del calendario de pagos (si lo definiste)
export function calendario(p) {
    const g = p.programa;
    if (!g || !g.inicio || !(g.n > 0)) return [];
    return Array.from({ length: g.n }, (_, i) =>
        g.frecuencia === 'mensual' ? fechaCuota(g.inicio, i) : sumarDias(g.inicio, i * (g.frecuencia === 'semanal' ? 7 : 14)));
}

// Próximo pago programado: las cuotas ya cubiertas se calculan con lo abonado / cuota
export function proximoPago(p) {
    const cal = calendario(p);
    if (!cal.length || p.pendiente <= 0) return null;
    const cubiertas = Math.floor(abonado(p) / (p.programa.cuota || 1) + 1e-9);
    return cal[Math.min(cubiertas, cal.length - 1)];
}

export function totalesPrestamos() {
    const suma = dir => r2(store.data.prestamos.filter(p => p.direccion === dir).reduce((a, p) => a + p.pendiente, 0));
    return { debo: suma('recibido'), meDeben: suma('otorgado') };
}

// Avisos para Inicio: liquidaciones y pagos que vencen en 7 días o ya vencieron
export function alertasPrestamos() {
    const av = [];
    store.data.prestamos.filter(p => p.pendiente > 0).forEach(p => {
        const debo = p.direccion === 'recibido';
        const quien = `<strong>${esc(p.contraparte)}</strong>`;
        const dL = diasPara(p.fechaLiquidacion);
        if (dL !== null && dL <= 7) {
            av.push({ p: dL < 0 || p.obligatoria ? 0 : 1, cls: dL < 0 ? 'bad' : '',
                html: `<span>🤝 ${debo ? `Debes liquidar a ${quien}` : `${quien} debe liquidarte`} ${textoDias(dL)}${p.obligatoria ? ' (fecha obligatoria)' : ''}: ${mxn(p.pendiente)} pendientes.</span>` });
        }
        const prox = proximoPago(p), dP = diasPara(prox);
        if (dP !== null && dP <= 7) {
            av.push({ p: dP < 0 ? 0 : 1, cls: dP < 0 ? 'bad' : '',
                html: `<span>🗓️ ${debo ? `Pago a ${quien}` : `Cobro a ${quien}`} ${textoDias(dP)}: ${mxn(Math.min(p.programa.cuota, p.pendiente))}.</span>` });
        }
    });
    return av;
}
