// Compras a meses sin intereses (MSI): cada mes se carga una sola cuota a la tarjeta,
// no el total de la compra. Así el "para no generar intereses" del usuario refleja lo real.
import { store, buscar } from '../store.js';
import { hoyISO, r2, uid } from '../utils.js';
import { aISO } from './recurrentes.js';

// Fecha de la cuota n (0 = primera) a partir de la fecha de inicio
export function fechaCuota(inicioISO, n) {
    const [y, m, d] = inicioISO.split('-').map(Number);
    const objetivo = new Date(y, m - 1 + n, 1);
    const dia = Math.min(d, new Date(objetivo.getFullYear(), objetivo.getMonth() + 1, 0).getDate());
    objetivo.setDate(dia);
    return aISO(objetivo);
}

export const restantes = m => m.meses - m.cobrados.length;
export const montoRestante = m => r2(m.cuota * restantes(m));
export const proximaCuota = m => restantes(m) > 0 ? fechaCuota(m.inicio, m.cobrados.length) : null;

// Registra las cuotas cuya fecha ya llegó. Devuelve cuántas se cobraron.
export function aplicarMSI() {
    const hoy = hoyISO();
    let total = 0;
    store.data.msi.forEach(m => {
        while (m.cobrados.length < m.meses) {
            const fecha = fechaCuota(m.inicio, m.cobrados.length);
            if (fecha > hoy) break;
            const d = buscar('deudas', m.deuda);
            if (d) d.pendiente = r2(d.pendiente + m.cuota);
            store.data.gastos.push({
                id: uid(), fecha, monto: m.cuota, categoria: 'MSI',
                detalle: `${m.nombre} (cuota ${m.cobrados.length + 1}/${m.meses})`, hormiga: false, medio: 'tarjeta', origen: m.deuda, msi: true
            });
            m.cobrados.push(fecha);
            total++;
        }
    });
    return total;
}

export function cancelarMSI(id) {
    const m = buscar('msi', id);
    if (!m) return false;
    if (m.cobrados.length === 0) {
        if (!confirm(`¿Eliminar la compra «${m.nombre}»? Aún no se ha cobrado ninguna cuota.`)) return false;
        store.data.msi = store.data.msi.filter(x => x.id !== id);
    } else {
        if (!confirm(`Se dejarán de cobrar las ${restantes(m)} cuotas restantes de «${m.nombre}». Las ya cobradas se conservan. ¿Continuar?`)) return false;
        m.meses = m.cobrados.length;
    }
    return true;
}
