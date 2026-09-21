import { store } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';

export function vistaMetas(contenedor) {
    const cards = store.data.metas.map(m => {
        const pct = m.objetivo > 0 ? Math.min(100, Math.round((m.actual / m.objetivo) * 100)) : 0;
        const falta = Math.max(0, m.objetivo - m.actual);
        const cuota = m.meses > 0 ? falta / m.meses : 0;
        return `
            <div class="card glass-card item-card meta-card">
                <h4>${esc(m.nombre)} ${pct >= 100 ? '<span class="badge ok">Lograda</span>' : ''}</h4>
                <p class="amount">${mxn(m.actual)} <small class="meta">de ${mxn(m.objetivo)}</small></p>
                <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
                <span class="meta">${pct}% completado${falta > 0 ? ` · faltan ${mxn(falta)}` : ''}</span>
                ${falta > 0 ? `<div class="cuota"><span>Cuota mensual requerida (${m.meses} meses)</span><strong>${mxn(cuota)}/mes</strong></div>` : ''}
                <div class="actions">
                    <button class="btn-success" data-action="meta-aportar" data-id="${m.id}"><i class="fa-solid fa-plus"></i> Agregar saldo</button>
                    <button class="btn-ghost" data-action="meta-editar" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                </div>
            </div>`;
    }).join('');

    contenedor.innerHTML = `
        <div class="module-head">
            <h2>Metas de Ahorro</h2>
            <button class="btn-primary" data-action="meta-nueva"><i class="fa-solid fa-plus"></i> Nueva Meta</button>
        </div>
        ${cards ? `<div class="grid-cards">${cards}</div>` : vacio('fa-bullseye', 'Aún no tienes metas. Crea una para empezar a ahorrar con propósito.')}`;
}
