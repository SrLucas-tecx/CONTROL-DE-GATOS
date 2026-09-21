// Registra automáticamente los pagos mensuales cuyo día ya llegó (incluye meses que no abriste la app).
import { store, buscar } from '../store.js';
import { hoyISO, r2, uid } from '../utils.js';

function cobrar(r, fecha) {
    const [medio, id] = r.medio.split(':');
    if (medio === 'cuenta') {
        const c = buscar('cuentas', id);
        if (!c) return;
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
        let [y, m] = (r.ultimoMes || r.desde.slice(0, 7)).split('-').map(Number);
        if (r.ultimoMes && ++m > 12) { m = 1; y++; }
        for (let i = 0; i < 36; i++) {
            const dia = Math.min(r.dia, new Date(y, m, 0).getDate());
            const fecha = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            if (fecha > hoy) break;
            if (fecha >= r.desde) { cobrar(r, fecha); total++; }
            r.ultimoMes = `${y}-${String(m).padStart(2, '0')}`;
            if (++m > 12) { m = 1; y++; }
        }
    });
    return total;
}
