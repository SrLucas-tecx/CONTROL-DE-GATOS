import { store, buscar } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';

let estrategia = 'nieve'; // 'nieve' = menor monto primero · 'avalancha' = mayor tasa primero

export function vistaDeudas(c) {
    const lista = [...store.data.deudas].sort(estrategia === 'nieve'
        ? (a, b) => a.pendiente - b.pendiente
        : (a, b) => b.tasa - a.tasa);

    const filas = lista.map((d, i) => `
        <div class="card glass-card debt-row">
            <span class="rank">#${i + 1}</span>
            <div class="debt-info"><strong>${esc(d.nombre)}</strong> ${d.pendiente <= 0 ? '<span class="badge ok">Liquidada</span>' : ''}<br>
                ${d.pagoMinimo > 0 ? '' : '<span class="badge ok">Pago total mensual</span> '}<small>Tasa de interés: ${d.tasa > 0 ? `${d.tasa}% anual` : '0% (sin intereses)'}</small></div>
            <div class="debt-nums">
                ${d.pagoMinimo > 0 ? `<div><small>Pago mínimo</small><strong>${mxn(d.pagoMinimo)}</strong></div>` : ''}
                ${d.diaPago ? `<div><small>Límite de pago</small><strong>${proximoPago(d.diaPago)}</strong></div>` : ''}
                <div><small>Saldo total</small><strong class="text-danger">${mxn(d.pendiente)}</strong></div>
            </div>
            <div class="actions">
                <button class="btn-success" data-action="deuda-abonar" data-id="${d.id}" ${d.pendiente <= 0 ? 'disabled' : ''}><i class="fa-solid fa-dollar-sign"></i> Abonar</button>
                <button class="btn-ghost" data-action="deuda-editar" data-id="${d.id}"><i class="fa-solid fa-pen"></i> Editar</button>
            </div>
        </div>`).join('');

    c.innerHTML = `
        <div class="module-head"><h2>Estrategias de liberación de deuda</h2>
            <button class="btn-primary" data-action="deuda-nueva"><i class="fa-solid fa-plus"></i> Registrar Deuda</button></div>
        <div class="card glass-card strat"><strong>Estrategia de ordenamiento:</strong>
            <div class="tabs">
                <button class="tab ${estrategia === 'nieve' ? 'active' : ''}" data-estr="nieve"><i class="fa-regular fa-snowflake"></i> Bola de Nieve (menor monto primero)</button>
                <button class="tab ${estrategia === 'avalancha' ? 'active' : ''}" data-estr="avalancha"><i class="fa-solid fa-mountain"></i> Avalancha (mayor tasa primero)</button>
            </div></div>
        ${filas || vacio('fa-face-smile', 'Sin deudas registradas. ¡Buen trabajo!')}
        ${seccionRecurrentes()}`;

    c.querySelectorAll('[data-estr]').forEach(b => b.addEventListener('click', () => { estrategia = b.dataset.estr; vistaDeudas(c); }));
}

// Próxima fecha límite de pago a partir del día del mes
function proximoPago(dia) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fecha = (y, m) => new Date(y, m, Math.min(dia, new Date(y, m + 1, 0).getDate()));
    let f = fecha(hoy.getFullYear(), hoy.getMonth());
    if (f < hoy) f = fecha(hoy.getFullYear(), hoy.getMonth() + 1);
    const dias = Math.round((f - hoy) / 864e5);
    return `${dias === 0 ? 'Hoy' : `en ${dias} d`} (${f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})`;
}

// Pagos que se cobran cada mes (suscripciones, rentas, mensualidades…)
function seccionRecurrentes() {
    const lista = store.data.recurrentes;
    const total = lista.reduce((a, r) => a + r.monto, 0);
    const medio = r => { const [t, id] = r.medio.split(':'); const x = buscar(t === 'cuenta' ? 'cuentas' : 'deudas', id); return x ? esc(x.nombre) : '<em>Eliminado</em>'; };
    const cards = lista.map(r => `
        <div class="card glass-card item-card">
            <h4><i class="fa-solid fa-calendar-check ico-amber"></i> ${esc(r.nombre)}</h4>
            ${r.lugar ? `<span class="meta">Lugar de pago: ${esc(r.lugar)}</span>` : ''}
            <p class="amount text-danger">- ${mxn(r.monto)}</p>
            <span class="meta">Se resta de <strong>${medio(r)}</strong> el día ${r.dia} de cada mes<br>Próximo cobro: ${proximoPago(r.dia)}</span>
            <div class="actions"><button class="btn-ghost" data-action="rec-editar" data-id="${r.id}"><i class="fa-solid fa-pen"></i> Editar</button></div>
        </div>`).join('');
    return `
        <div class="module-head" style="margin-top:32px"><h2>Pagos mensuales recurrentes</h2>
            <button class="btn-primary" data-action="rec-nuevo"><i class="fa-solid fa-plus"></i> Pago mensual</button></div>
        ${lista.length ? `<p class="hint" style="margin:-8px 0 14px">Total comprometido al mes: <strong>${mxn(total)}</strong></p><div class="grid-cards">${cards}</div>`
            : vacio('fa-calendar-check', 'Sin pagos mensuales. Agrega suscripciones, rentas o mensualidades para que se registren solos.')}`;
}
