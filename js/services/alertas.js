// Límites de saldo mínimo: varios por cuenta y varios para el patrimonio neto.
import { store } from '../store.js';
import { esc, fmtMoneda, mxn, disponible } from '../utils.js';

// "5,000; 2000 1000" → [5000, 2000, 1000] (únicos, de mayor a menor). La coma se toma como separador de miles.
export function parseLimites(txt) {
    const nums = String(txt || '').split(/[;\s]+/).map(s => Number(s.replace(/,/g, ''))).filter(n => Number.isFinite(n) && n > 0);
    return [...new Set(nums)].sort((a, b) => b - a);
}
export const textoLimites = l => (l || []).join('; ');

// Qué límites ya se cruzaron con este valor. `todos` = cruzó incluso el más bajo (nivel crítico).
export function nivel(valor, limites) {
    const ls = limites || [];
    const cruzados = ls.filter(l => valor < l);
    return { cruzados, minimo: cruzados.length ? Math.min(...cruzados) : null, todos: cruzados.length > 0 && cruzados.length === ls.length };
}

// Avisos para Inicio (formato de avisos() del dashboard)
export function alertasSaldos(patrimonio) {
    const av = [];
    store.data.cuentas.forEach(c => {
        const disp = disponible(c), n = nivel(disp, c.alertas);
        if (!n.cruzados.length) return;
        av.push({ p: n.todos ? 0 : 1, cls: n.todos ? 'bad' : '',
            html: `<span>⚠️ <strong>${esc(c.nombre)}</strong> bajó de ${fmtMoneda(n.minimo, c.moneda)}: te quedan ${fmtMoneda(disp, c.moneda)} disponibles.</span>` });
    });
    const np = nivel(patrimonio, store.data.alertasPatrimonio);
    if (np.cruzados.length) {
        av.push({ p: np.todos ? 0 : 1, cls: np.todos ? 'bad' : '',
            html: `<span>📉 Tu patrimonio neto bajó de ${mxn(np.minimo)}: hoy es ${mxn(patrimonio)}.</span>` });
    }
    return av;
}
