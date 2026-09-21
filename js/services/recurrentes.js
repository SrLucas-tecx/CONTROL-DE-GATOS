// Pagos e ingresos recurrentes con calendario: mensual, quincenal, catorcenal o semanal.
// Registra automáticamente las fechas que ya llegaron (incluye las de días en que no abriste la app).
import { store, buscar } from '../store.js';
import { hoyISO, r2, uid } from '../utils.js';

export const FRECUENCIAS = {
    mensual: 'Una vez al mes',
    quincenal: 'Quincenal (2 veces al mes)',
    catorcenal: 'Catorcenal (cada 14 días)',
    semanal: 'Semanal (cada 7 días)'
};
const VECES_AL_MES = { mensual: 1, quincenal: 2, catorcenal: 26 / 12, semanal: 52 / 12 };
export const vecesAlMes = r => VECES_AL_MES[r.frecuencia || 'mensual'];

const pad = n => String(n).padStart(2, '0');
export const aISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Fecha del día `dia` en el mes m (0-11); si el mes es más corto, usa su último día
const diaMes = (y, m, dia) => aISO(new Date(y, m, Math.min(dia, new Date(y, m + 1, 0).getDate())));
export const fechaConDia = (iso, dia) => { const [y, m] = iso.split('-').map(Number); return diaMes(y, m - 1, dia); };

// Fechas (ISO) del calendario del pago dentro de (despuesDe, hasta]
export function ocurrencias(r, despuesDe, hasta) {
    const inicio = r.inicio || r.desde;
    const f = r.frecuencia || 'mensual';
    const fechas = [];
    if (f === 'semanal' || f === 'catorcenal') {
        const d = new Date(`${inicio}T00:00:00`);
        for (let i = 0; i < 2000 && aISO(d) <= hasta; i++) { fechas.push(aISO(d)); d.setDate(d.getDate() + (f === 'semanal' ? 7 : 14)); }
    } else {
        const dias = f === 'quincenal' ? [r.dia, r.dia2 || r.dia] : [r.dia];
        const [y1, m1] = hasta.split('-').map(Number);
        let [y, m] = inicio.split('-').map(Number); m--;
        while (y < y1 || (y === y1 && m <= m1 - 1)) {
            dias.forEach(d => fechas.push(diaMes(y, m, d)));
            if (++m > 11) { m = 0; y++; }
        }
    }
    return [...new Set(fechas)].filter(x => x >= inicio && x > despuesDe && x <= hasta).sort();
}

// Próximas fechas de cobro a partir de hoy
export function proximas(r, n = 4) {
    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + 400);
    const despues = [aISO(ayer), r.ultimaFecha || ''].sort().at(-1);
    return ocurrencias(r, despues, aISO(limite)).slice(0, n);
}

function cobrar(r, fecha) {
    const [medio, id] = r.medio.split(':');
    if (medio === 'cuenta') {
        const c = buscar('cuentas', id);
        if (!c) return;
        if (r.tipo === 'ingreso') {
            c.saldo = r2(c.saldo + r.monto);
            store.data.movimientos.push({ id: uid(), tipo: 'INCOME', monto: r.monto, cuenta: c.id, destino: null, detalle: r.lugar ? `${r.nombre} — ${r.lugar}` : r.nombre, fecha, automatico: true });
            return;
        }
        c.saldo = r2(c.saldo - r.monto);
    } else {
        const d = buscar('deudas', id);
        if (!d) return;
        d.pendiente = r2(d.pendiente + r.monto); // cargo a la tarjeta
    }
    store.data.gastos.push({
        id: uid(), fecha, monto: r.monto, categoria: 'Pagos recurrentes',
        detalle: r.lugar ? `${r.nombre} — ${r.lugar}` : r.nombre, hormiga: false, medio, origen: id, recurrente: true
    });
}

// Devuelve cuántos cobros se registraron
export function aplicarRecurrentes() {
    const hoy = hoyISO();
    let total = 0;
    store.data.recurrentes.forEach(r => {
        const ultima = r.ultimaFecha ?? (r.ultimoMes ? `${r.ultimoMes}-31` : ''); // migra pagos creados antes del calendario
        const fechas = ocurrencias(r, ultima, hoy);
        fechas.forEach(f => cobrar(r, f));
        total += fechas.length;
        r.ultimaFecha = fechas.at(-1) ?? ultima;
    });
    return total;
}
