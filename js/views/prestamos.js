// Préstamos: lo que te prestaron (debes) y lo que tú prestaste (te deben).
import { store } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';
import { ETIQ_CONTRAPARTE, proximoPago, diasPara, textoDias, totalesPrestamos } from '../services/prestamos.js';

let tab = 'recibido'; // 'recibido' | 'otorgado'

function tarjeta(p) {
    const debo = p.direccion === 'recibido';
    const pct = p.monto > 0 ? Math.min(100, Math.max(0, Math.round(((p.monto - p.pendiente) / p.monto) * 100))) : 0;
    const dL = diasPara(p.fechaLiquidacion), prox = proximoPago(p), dP = diasPara(prox);
    const liquidado = p.pendiente <= 0;
    return `
        <div class="card glass-card item-card ${debo ? 'deuda' : 'cobro'}">
            <h4><i class="fa-solid ${p.contraparteTipo === 'banco' ? 'fa-building-columns' : 'fa-user'} ${debo ? 'ico-rose' : 'ico-emerald'}"></i> ${esc(p.contraparte)}
                ${liquidado ? '<span class="badge ok">Liquidado</span>' : ''}</h4>
            <span><span class="badge">${ETIQ_CONTRAPARTE[p.contraparteTipo] || 'Persona'}</span>${p.tasa > 0 ? ` <span class="badge">${p.tasa}% anual</span>` : ''}</span>
            <p class="amount ${debo ? 'text-danger' : 'text-success'}">${mxn(p.pendiente)} <small class="meta">de ${mxn(p.monto)}</small></p>
            <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
            <span class="meta">${pct}% ${debo ? 'pagado' : 'cobrado'} · Prestado el ${esc(p.fecha || '—')}${p.nota ? ` · ${esc(p.nota)}` : ''}</span>
            ${prox ? `<div class="cuota"><span>Próximo ${debo ? 'pago' : 'cobro'}: ${esc(prox)} (${textoDias(dP)})</span><strong>${mxn(Math.min(p.programa.cuota, p.pendiente))}</strong></div>` : ''}
            ${p.fechaLiquidacion ? `<span class="meta">Liquidación: <strong class="${!liquidado && dL < 0 ? 'text-danger' : ''}">${esc(p.fechaLiquidacion)}</strong>${liquidado ? '' : ` (${textoDias(dL)})`}
                ${p.obligatoria ? '<span class="badge warn">Obligatoria</span>' : ''}</span>` : ''}
            <div class="actions">
                <button class="btn-success" data-action="prestamo-abonar" data-id="${p.id}" ${liquidado ? 'disabled' : ''}><i class="fa-solid fa-dollar-sign"></i> ${debo ? 'Abonar' : 'Registrar cobro'}</button>
                <button class="btn-ghost" data-action="prestamo-editar" data-id="${p.id}"><i class="fa-solid fa-pen"></i> Editar</button>
            </div>
        </div>`;
}

export function vistaPrestamos(c) {
    const { prestamos } = store.data;
    const { debo, meDeben } = totalesPrestamos();
    const activos = dir => prestamos.filter(p => p.direccion === dir && p.pendiente > 0).length;
    // Sin liquidar primero; dentro de eso, la liquidación más cercana arriba (los que no tienen fecha, al final)
    const lista = prestamos.filter(p => p.direccion === tab)
        .sort((a, b) => (a.pendiente <= 0) - (b.pendiente <= 0) || (a.fechaLiquidacion || '9999').localeCompare(b.fechaLiquidacion || '9999'));

    c.innerHTML = `
        <div class="module-head"><h2>Préstamos</h2>
            <button class="btn-primary" data-action="prestamo-nuevo-${tab}"><i class="fa-solid fa-plus"></i> Registrar préstamo</button></div>
        <section class="summary-cards">
            <div class="card glass-card"><h3>Debo por préstamos</h3><p class="text-danger">${mxn(debo)}</p><small>${activos('recibido')} activo(s)</small></div>
            <div class="card glass-card"><h3>Me deben</h3><p class="text-success">${mxn(meDeben)}</p><small>${activos('otorgado')} activo(s)</small></div>
        </section>
        <div class="tabs tabs-page" role="tablist">
            <button type="button" class="tab ${tab === 'recibido' ? 'active' : ''}" role="tab" data-ptab="recibido">Me prestaron (${activos('recibido')})</button>
            <button type="button" class="tab ${tab === 'otorgado' ? 'active' : ''}" role="tab" data-ptab="otorgado">Yo presté (${activos('otorgado')})</button>
        </div>
        ${lista.length ? `<div class="grid-cards">${lista.map(tarjeta).join('')}</div>`
            : vacio('fa-handshake', tab === 'recibido' ? 'No tienes préstamos recibidos. Registra el que te hizo un banco o una persona.' : 'No has prestado dinero. Registra lo que te deben para no perderlo de vista.')}`;

    c.querySelectorAll('[data-ptab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.ptab; vistaPrestamos(c); }));
}
