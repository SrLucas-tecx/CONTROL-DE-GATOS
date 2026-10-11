// Rendimiento bancario de las cuentas con tasa. Dos modos:
//  · diario: rinde todos los días, sin fecha de término (capitalización diaria).
//  · plazo:  rinde solo durante N meses a partir de una fecha de inicio; al vencer deja de rendir.
// Como la app vive en el navegador, se pone al corriente al abrirla: suma todos los días transcurridos.
import { store } from '../store.js';
import { hoyISO, r2, uid, esc, fmtMoneda } from '../utils.js';
import { fechaCuota } from './msi.js';

const dias = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);
const esPlazo = c => c.rendTipo === 'plazo' && !!c.inicioRend && c.plazoMeses > 0;

// Fecha en que termina el plazo (null si la cuenta rinde todos los días)
export const fechaFinPlazo = c => esPlazo(c) ? fechaCuota(c.inicioRend, c.plazoMeses) : null;

// ¿Sigue generando rendimiento hoy? (un plazo vencido ya no)
export const rindeAhora = c => {
    const fin = fechaFinPlazo(c);
    return c.tasa > 0 && !(fin && hoyISO() >= fin);
};

// Devuelve true si modificó datos
export function aplicarRendimientos() {
    const hoy = hoyISO();
    let cambio = false;
    store.data.cuentas.forEach(c => {
        if (!(c.tasa > 0)) { if (c.ultimoRendimiento) { c.ultimoRendimiento = ''; cambio = true; } return; }
        const fin = fechaFinPlazo(c);
        const tope = fin && fin < hoy ? fin : hoy; // a plazo: no rinde después de vencer
        if (!c.ultimoRendimiento) { c.ultimoRendimiento = fin && c.inicioRend > hoy ? c.inicioRend : hoy; cambio = true; return; }
        const desde = fin && c.ultimoRendimiento < c.inicioRend ? c.inicioRend : c.ultimoRendimiento; // no rinde antes de empezar
        const n = Math.min(3650, dias(desde, tope));
        if (n <= 0) return;
        const ganancia = r2(c.saldo * ((1 + c.tasa / 100 / 365) ** n - 1));
        if (ganancia < 0.01) return; // se acumula hasta llegar al centavo
        c.saldo = r2(c.saldo + ganancia);
        c.ultimoRendimiento = tope;
        store.data.movimientos.push({
            id: uid(), tipo: 'INCOME', monto: ganancia, cuenta: c.id, destino: null,
            detalle: `Rendimiento bancario (${n} ${n === 1 ? 'día' : 'días'}${fin ? ', a plazo' : ''})`, fecha: hoy, automatico: true
        });
        cambio = true;
    });
    return cambio;
}

// Cálculos para mostrar: cuánto rinde por día/mes, o en un plazo cuánto llevas, cuánto falta y cuánto ganarás
export function infoRendimiento(c) {
    if (!(c.tasa > 0)) return null;
    const td = c.tasa / 100 / 365; // tasa diaria
    const f = n => (1 + td) ** n - 1;
    if (!esPlazo(c)) return { tipo: 'diario', porDia: r2(c.saldo * td), porMes: r2(c.saldo * c.tasa / 1200) };
    const hoy = hoyISO(), inicio = c.inicioRend, fin = fechaFinPlazo(c);
    const total = Math.max(1, dias(inicio, fin));
    const pasados = Math.min(total, Math.max(0, dias(inicio, hoy)));
    const restantes = Math.max(0, dias(hoy < inicio ? inicio : hoy, fin));
    const capital = c.capitalInicio > 0 ? c.capitalInicio : c.saldo;
    return {
        tipo: 'plazo', inicio, fin, total, pasados, restantes, pct: Math.round((pasados / total) * 100),
        vencido: hoy >= fin, porEmpezar: hoy < inicio, capital,
        gananciaPlazo: r2(capital * f(total)),          // lo que deja todo el plazo, calculado desde el capital inicial
        ganadoHoy: r2(capital * f(pasados)),            // lo ganado hasta hoy
        gananciaRestante: r2(c.saldo * f(restantes)),   // lo que falta por ganar con tu saldo actual
        saldoFinal: r2(c.saldo + c.saldo * f(restantes))
    };
}

// Plazo más cercano a vencer (o null)
export function proximoVencimiento() {
    const hoy = hoyISO();
    const lista = store.data.cuentas.filter(c => c.tasa > 0 && esPlazo(c))
        .map(c => ({ cuenta: c.nombre, fin: fechaFinPlazo(c) })).filter(x => x.fin > hoy).sort((a, b) => a.fin.localeCompare(b.fin));
    return lista[0] ? { ...lista[0], dias: dias(hoy, lista[0].fin) } : null;
}

// Avisos para Inicio: plazos que vencen en 7 días o que terminaron hace menos de una semana
export function alertasRendimientos() {
    const av = [], hoy = hoyISO();
    store.data.cuentas.forEach(c => {
        const i = infoRendimiento(c);
        if (!i || i.tipo !== 'plazo' || i.porEmpezar) return;
        const d = dias(hoy, i.fin);
        if (d >= 0 && d <= 7) {
            av.push({ p: 1, cls: '', html: `<span>🏦 El plazo de <strong>${esc(c.nombre)}</strong> vence ${d === 0 ? 'hoy' : `en ${d} día${d === 1 ? '' : 's'}`}: ganarás ≈ ${fmtMoneda(i.gananciaRestante, c.moneda)} más (saldo final ≈ ${fmtMoneda(i.saldoFinal, c.moneda)}).</span>` });
        } else if (d < 0 && d >= -7) {
            av.push({ p: 2, cls: 'ok', html: `<span>🏦 Terminó el plazo de <strong>${esc(c.nombre)}</strong> (${i.fin}): ya no genera rendimiento. Considera moverlo o renovarlo.</span>` });
        }
    });
    return av;
}
