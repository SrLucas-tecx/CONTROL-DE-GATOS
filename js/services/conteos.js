// Conteo quincenal: cada quincena (1–15 y 16–fin de mes) comparas el saldo real de tus apps de banco
// contra lo que dice FinanzasPro, para saber si tus finanzas "cuadraron".
import { store } from '../store.js';
import { hoyISO } from '../utils.js';
import { aISO } from './recurrentes.js';

export const TOLERANCIA = 0.01; // diferencias menores a un centavo cuentan como "cuadra"
const pad = n => String(n).padStart(2, '0');
const dias = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

// A qué quincena pertenece una fecha ISO
export function quincenaDe(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const q = d <= 15 ? 1 : 2;
    const ultimo = new Date(y, m, 0).getDate();
    const mes = new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long' });
    return {
        clave: `${y}-${pad(m)}-Q${q}`,
        inicio: `${y}-${pad(m)}-${q === 1 ? '01' : '16'}`,
        fin: `${y}-${pad(m)}-${q === 1 ? '15' : pad(ultimo)}`,
        etiqueta: `${q === 1 ? '1ª' : '2ª'} quincena de ${mes} ${y}`
    };
}

export const cuadra = items => items.length > 0 && items.every(i => Math.abs(i.dif) < TOLERANCIA);

// Avisos para Inicio: recuerda el conteo en los últimos 2 días de la quincena
// y avisa si se te pasó el de la quincena anterior (solo si ya acostumbras hacerlos).
export function alertasConteo() {
    const conteos = store.data.conteos || [];
    const hoy = hoyISO(), q = quincenaDe(hoy);
    const hecho = clave => conteos.some(c => c.quincena === clave);
    const boton = '<button class="btn-ghost" data-action="conteo-nuevo">Hacer conteo</button>';
    const av = [];
    const dia0 = new Date(`${q.inicio}T00:00:00`); dia0.setDate(dia0.getDate() - 1);
    const previa = quincenaDe(aISO(dia0));
    if (conteos.length && !hecho(previa.clave)) {
        av.push({ p: 1, cls: '', html: `<span>🧮 Te faltó el conteo de la ${previa.etiqueta}.</span>${boton}` });
    }
    const faltan = dias(hoy, q.fin);
    if (faltan <= 2 && !hecho(q.clave)) {
        av.push({ p: 1, cls: '', html: `<span>🧮 Toca el conteo quincenal: la ${q.etiqueta} termina ${faltan === 0 ? 'hoy' : `en ${faltan} día${faltan === 1 ? '' : 's'}`}.</span>${boton}` });
    }
    return av;
}
