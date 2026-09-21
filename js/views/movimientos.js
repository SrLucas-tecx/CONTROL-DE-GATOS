import { store, buscar } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';

const ETQ = { INCOME: ['ingreso', 'Ingreso'], EXPENSE: ['gasto', 'Gasto'], TRANSFER: ['transfer', 'Transferencia'], AJUSTE: ['transfer', 'Ajuste'] };
const nombre = id => { const c = id && buscar('cuentas', id); return c ? esc(c.nombre) : '<em>Cuenta eliminada</em>'; };
const monto = m => m.tipo === 'AJUSTE' ? (m.monto >= 0 ? `<span class="text-success">+ ${mxn(m.monto)}</span>` : `<span class="text-danger">- ${mxn(-m.monto)}</span>`)
    : m.tipo === 'INCOME' ? `<span class="text-success">+ ${mxn(m.monto)}</span>`
    : m.tipo === 'EXPENSE' ? `<span class="text-danger">- ${mxn(m.monto)}</span>`
    : `<span class="text-cyan">↔ ${mxn(m.monto)}</span>`;

export const ordenados = () => [...store.data.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));

// Tabla reutilizada por el dashboard (sin acciones) y por Movimientos (con borrar)
export function tablaMovs(lista, conAcciones = false) {
    if (!lista.length) return vacio('fa-list-check', 'Sin movimientos para mostrar.');
    return `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría / detalle</th><th>Cuenta(s)</th><th class="num">Monto</th>${conAcciones ? '<th></th>' : ''}</tr></thead>
        <tbody>${lista.map(m => `<tr>
            <td>${esc(m.fecha)}</td>
            <td><span class="tag ${ETQ[m.tipo][0]}">${ETQ[m.tipo][1]}</span></td>
            <td><strong>${esc(m.detalle || '')}</strong></td>
            <td>${nombre(m.cuenta)}${m.destino ? ` → ${nombre(m.destino)}` : ''}${m.externo ? `${m.tipo === 'INCOME' ? ' ←' : ' →'} ${esc(m.contraparte)} <span class="tag transfer">Externo</span>` : ''}</td>
            <td class="num">${monto(m)}</td>
            ${conAcciones ? `<td class="num"><button class="icon-btn" data-action="mov-eliminar" data-id="${m.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button></td>` : ''}
        </tr>`).join('')}</tbody></table></div>`;
}

export function vistaMovimientos(c) {
    c.innerHTML = `
        <div class="module-head"><h2>Registro de movimientos</h2>
            <button class="btn-primary" data-action="mov-nuevo"><i class="fa-solid fa-plus"></i> Nuevo Movimiento</button></div>
        <div class="card glass-card panel">
            <div class="filters">
                <input id="mov-q" class="input" placeholder="Buscar por descripción...">
                <select id="mov-tipo" class="input"><option value="">Todos los tipos</option>
                    <option value="INCOME">Ingresos</option><option value="EXPENSE">Gastos</option><option value="TRANSFER">Transferencias</option><option value="AJUSTE">Ajustes</option></select>
            </div>
            <div id="mov-tabla"></div>
        </div>`;
    const q = c.querySelector('#mov-q'), t = c.querySelector('#mov-tipo');
    const pintar = () => {
        const txt = q.value.trim().toLowerCase();
        c.querySelector('#mov-tabla').innerHTML = tablaMovs(
            ordenados().filter(m => (!t.value || m.tipo === t.value) && (m.detalle || '').toLowerCase().includes(txt)), true);
    };
    q.addEventListener('input', pintar);
    t.addEventListener('change', pintar);
    pintar();
}
