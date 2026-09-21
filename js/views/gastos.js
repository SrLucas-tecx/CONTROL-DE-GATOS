// Control de gastos: resumen mensual, gastos hormiga, cargos a tarjeta y gráficas.
import { store, buscar } from '../store.js';
import { esc, mxn, vacio, hoyISO } from '../utils.js';
import { CATEGORIAS } from '../forms/gasto.js';
import { montar, selectorTipo, configCategorias, destruirGraficos, TIPOS_CATEGORIA, TIPOS_BALANCE } from '../ui/charts.js';

const PALETA = ['#8b5cf6', '#34d399', '#22d3ee', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#a3e635', '#94a3b8'];
let mes = hoyISO().slice(0, 7);

const suma = l => l.reduce((a, g) => a + g.monto, 0);
const etiquetaMes = k => { const [y, m] = k.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }); };
const origen = g => { const x = buscar(g.medio === 'tarjeta' ? 'deudas' : 'cuentas', g.origen); return x ? esc(x.nombre) : '<em>Eliminado</em>'; };

export function vistaGastos(c) {
    const { gastos, deudas } = store.data;
    const delMes = gastos.filter(g => g.fecha.startsWith(mes));
    const total = suma(delMes), hormiga = suma(delMes.filter(g => g.hormiga));
    const conTarjeta = suma(delMes.filter(g => g.medio === 'tarjeta'));

    const cats = [...new Set(delMes.map(g => g.categoria))].map(k => ({ k, t: suma(delMes.filter(g => g.categoria === k)) })).sort((a, b) => b.t - a.t);
    const [y0, m0] = mes.split('-').map(Number);
    const ultimos = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(y0, m0 - 1 - (5 - i), 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const porTarjeta = deudas.map(d => ({ n: d.nombre, t: suma(delMes.filter(g => g.medio === 'tarjeta' && g.origen === d.id)) })).filter(x => x.t > 0);
    const lista = [...delMes].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const tabla = lista.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Gasto</th><th>Tipo</th><th>Pagado con</th><th class="num">Monto</th><th></th></tr></thead>
        <tbody>${lista.map(g => `<tr>
            <td>${esc(g.fecha)}</td>
            <td><strong>${esc(g.detalle || g.categoria)}</strong><br><small class="meta">${esc(g.categoria)}</small></td>
            <td>${g.hormiga ? '<span class="tag hormiga">Hormiga</span>' : '<span class="tag transfer">Normal</span>'}</td>
            <td>${g.medio === 'tarjeta' ? '💳 ' : ''}${origen(g)}</td>
            <td class="num text-danger">- ${mxn(g.monto)}</td>
            <td class="num"><button class="icon-btn" data-action="gasto-editar" data-id="${g.id}" aria-label="Editar"><i class="fa-solid fa-pen"></i></button><button class="icon-btn" data-action="gasto-eliminar" data-id="${g.id}" aria-label="Eliminar"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`).join('')}</tbody></table></div>` : vacio('fa-receipt', 'No hay gastos en este mes. Usa «Agregar gasto».');

    c.innerHTML = `
        <div class="module-head"><h2>Control de gastos</h2>
            <div class="header-actions">
                <input type="month" id="g-mes" class="input" value="${mes}" aria-label="Mes a consultar">
                <button class="btn-outline" data-action="gastos-exportar"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
                <button class="btn-primary" data-action="gasto-nuevo"><i class="fa-solid fa-plus"></i> Agregar gasto</button></div></div>
        <section class="summary-cards">
            <div class="card glass-card"><h3>Gasto del mes</h3><p class="text-danger">${mxn(total)}</p><small>${delMes.length} gastos en ${etiquetaMes(mes)}</small></div>
            <div class="card glass-card"><h3>Gastos hormiga</h3><p style="color:var(--amber)">${mxn(hormiga)}</p><small>${total > 0 ? Math.round((hormiga / total) * 100) : 0}% del gasto del mes</small></div>
            <div class="card glass-card"><h3>Cargado a tarjetas</h3><p>${mxn(conTarjeta)}</p><small>Por pagar a fin de mes</small></div>
            <div class="card glass-card"><h3>Total registrado</h3><p>${mxn(suma(gastos))}</p><small>${gastos.length} gastos en total</small></div>
        </section>
        <div class="dash-grid">
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Por categoría</h3>${total > 0 ? selectorTipo('tipo-gcat', TIPOS_CATEGORIA) : ''}</div>
                <div class="chart-wrap">${total > 0 ? '<canvas id="chart-gcat"></canvas>' : vacio('fa-chart-pie', 'Sin gastos este mes.')}</div></div>
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Gasto por mes (últimos 6)</h3>${selectorTipo('tipo-gmes', TIPOS_BALANCE)}</div>
                <div class="chart-wrap"><canvas id="chart-gmes"></canvas></div></div>
        </div>
        <div class="card glass-card panel" style="margin-top:16px"><h3>Cargos a tarjeta en ${etiquetaMes(mes)}</h3>
            ${porTarjeta.map(x => `<div class="stat"><span>💳 ${esc(x.n)}</span><strong>${mxn(x.t)}</strong></div>`).join('') || '<p class="hint" style="margin:0">Sin cargos a tarjeta este mes.</p>'}
            <p class="hint">Pagando este total antes de la fecha límite no generas intereses.</p></div>
        ${presupuestoCard(delMes)}
        <div class="card glass-card panel" style="margin-top:16px"><h3>Detalle de ${etiquetaMes(mes)}</h3>${tabla}</div>`;

    c.querySelector('#g-mes').addEventListener('change', e => {
        if (!e.target.value) return;
        mes = e.target.value;
        destruirGraficos();
        vistaGastos(c);
    });

    if (typeof Chart === 'undefined') return;
    if (total > 0) {
        montar(c.querySelector('#tipo-gcat'), c.querySelector('#chart-gcat'), tipo => configCategorias(
            tipo, cats.map(x => x.k), cats.map(x => x.t), cats.map((_, i) => PALETA[i % PALETA.length]),
            x => ` ${x.label}: ${mxn(x.raw)} (${Math.round((x.raw / total) * 100)}%)`));
    }
    montar(c.querySelector('#tipo-gmes'), c.querySelector('#chart-gmes'), tipo => configCategorias(
        tipo, ultimos.map(etiquetaMes), ultimos.map(k => suma(gastos.filter(g => g.fecha.startsWith(k)))),
        ultimos.map((_, i) => PALETA[i % PALETA.length])));
}

function presupuestoCard(delMes) {
    const p = store.data.presupuestos || {};
    const filas = CATEGORIAS.filter(k => p[k] > 0).map(k => {
        const usado = suma(delMes.filter(g => g.categoria === k));
        const pct = Math.round((usado / p[k]) * 100);
        const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--amber)' : '';
        return `<div class="pres"><div class="pres-top"><span>${k}</span><span>${mxn(usado)} / ${mxn(p[k])} (${pct}%)</span></div>
            <div class="progress"><span style="width:${Math.min(100, pct)}%;${color ? `background:${color}` : ''}"></span></div></div>`;
    }).join('');
    return `<div class="card glass-card panel" style="margin-top:16px"><div class="chart-head"><h3>Presupuesto del mes</h3>
        <button class="btn-ghost" data-action="presupuesto-editar">Definir límites</button></div>
        ${filas || '<p class="hint" style="margin:0">Define un límite mensual por categoría (por ejemplo, Café y snacks) y aquí verás cuánto llevas.</p>'}</div>`;
}
