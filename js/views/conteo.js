// Historial del conteo quincenal: ¿cuadraron tus saldos con tus apps de banco?
import { store } from '../store.js';
import { esc, fmtMoneda, vacio } from '../utils.js';
import { TOLERANCIA } from '../services/conteos.js';

const ordenados = () => (store.data.conteos || []).map((x, i) => [x, i])
    .sort((a, b) => b[0].fecha.localeCompare(a[0].fecha) || b[1] - a[1]).map(x => x[0]);

const resultado = (v, moneda) => Math.abs(v) < TOLERANCIA
    ? '<span class="text-success">✔ Cuadra</span>'
    : `<span class="text-danger">${v > 0 ? '+' : '−'} ${fmtMoneda(Math.abs(v), moneda)}</span>`;

function tarjeta(x) {
    const malas = x.items.filter(i => Math.abs(i.dif) >= TOLERANCIA).length;
    return `
        <div class="card glass-card item-card ${x.cuadro ? '' : 'deuda'}">
            <h4><i class="fa-solid fa-scale-balanced ico-brand"></i> ${esc(x.etiqueta)}
                <span class="badge ${x.cuadro ? 'ok' : 'bad'}">${x.cuadro ? 'Cuadró' : `No cuadró (${malas})`}</span></h4>
            <span class="meta">Conteo del ${esc(x.fecha)} · ${x.items.length} cuenta(s) revisada(s)${x.ajustado ? ' · saldos ajustados' : ''}</span>
            <div class="table-wrap"><table>
                <thead><tr><th>Cuenta</th><th class="num">En la app</th><th class="num">Real</th><th class="num">Diferencia</th></tr></thead>
                <tbody>${x.items.map(i => `<tr>
                    <td>${esc(i.nombre)}${i.tipo === 'd' ? ' <small class="meta">(deuda)</small>' : ''}</td>
                    <td class="num">${fmtMoneda(i.esperado, i.moneda)}</td>
                    <td class="num">${fmtMoneda(i.real, i.moneda)}</td>
                    <td class="num">${resultado(i.dif, i.moneda)}</td></tr>`).join('')}</tbody></table></div>
            <div class="actions"><button class="btn-danger" data-action="conteo-eliminar" data-id="${x.id}"><i class="fa-solid fa-trash"></i> Eliminar</button></div>
        </div>`;
}

export function vistaConteo(c) {
    const lista = ordenados();
    // Por quincena cuenta el conteo más reciente
    const porQuincena = new Map();
    lista.forEach(x => { if (!porQuincena.has(x.quincena)) porQuincena.set(x.quincena, x); });
    const ok = [...porQuincena.values()].filter(x => x.cuadro).length;
    const ult = lista[0];
    const difUlt = ult ? ult.items.reduce((a, i) => a + Math.abs(i.dif), 0) : 0;

    c.innerHTML = `
        <div class="module-head"><h2>Conteo quincenal</h2>
            <button class="btn-primary" data-action="conteo-nuevo"><i class="fa-solid fa-plus"></i> Nuevo conteo</button></div>
        <p class="hint" style="margin:-8px 0 16px">Cada quincena (1–15 y 16–fin de mes) escribe el saldo real de tus apps de banco y comprueba si coincide con FinanzasPro.</p>
        ${ult ? `<section class="summary-cards">
            <div class="card glass-card"><h3>Último conteo</h3><p><span class="badge ${ult.cuadro ? 'ok' : 'bad'}">${ult.cuadro ? 'Cuadró' : 'No cuadró'}</span></p><small>${esc(ult.etiqueta)}</small></div>
            <div class="card glass-card"><h3>Quincenas que cuadraron</h3><p>${ok} de ${porQuincena.size}</p><small>Según el conteo más reciente de cada quincena</small></div>
            <div class="card glass-card"><h3>Diferencia del último</h3><p class="${difUlt < TOLERANCIA ? 'text-success' : 'text-danger'}">${fmtMoneda(difUlt)}</p><small>Suma de diferencias, sin importar el signo</small></div>
        </section>` : ''}
        ${lista.length ? `<div style="display:flex;flex-direction:column;gap:16px">${lista.map(tarjeta).join('')}</div>`
            : vacio('fa-scale-balanced', 'Aún no haces ningún conteo. Pulsa «Nuevo conteo» y captura lo que ves hoy en tus apps de banco.')}`;
}
