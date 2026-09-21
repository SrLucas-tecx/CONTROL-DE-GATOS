// Acredita el rendimiento bancario de las cuentas con tasa, día a día (capitalización diaria).
// Como la app vive en el navegador, se pone al corriente al abrirla: suma todos los días transcurridos.
import { store } from '../store.js';
import { hoyISO, r2, uid } from '../utils.js';

const dias = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

// Devuelve true si modificó datos
export function aplicarRendimientos() {
    const hoy = hoyISO();
    let cambio = false;
    store.data.cuentas.forEach(c => {
        if (!(c.tasa > 0)) { if (c.ultimoRendimiento) { c.ultimoRendimiento = ''; cambio = true; } return; }
        if (!c.ultimoRendimiento) { c.ultimoRendimiento = hoy; cambio = true; return; }
        const n = Math.min(3650, dias(c.ultimoRendimiento, hoy));
        if (n <= 0) return;
        const ganancia = r2(c.saldo * ((1 + c.tasa / 100 / 365) ** n - 1));
        if (ganancia < 0.01) return; // se acumula hasta llegar al centavo
        c.saldo = r2(c.saldo + ganancia);
        c.ultimoRendimiento = hoy;
        store.data.movimientos.push({
            id: uid(), tipo: 'INCOME', monto: ganancia, cuenta: c.id, destino: null,
            detalle: `Rendimiento bancario (${n} ${n === 1 ? 'día' : 'días'})`, fecha: hoy, automatico: true
        });
        cambio = true;
    });
    return cambio;
}
