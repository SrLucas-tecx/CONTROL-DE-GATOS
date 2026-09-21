// Tarjetas de resumen + Panel principal (2 gráficos + últimos movimientos).
import { TIPOS } from '../config.js';
import { store } from '../store.js';
import { $, mxn, vacio } from '../utils.js';
import { tablaMovs, ordenados } from './movimientos.js';
import { montar, selectorTipo, configCategorias, TIPOS_CATEGORIA, TIPOS_BALANCE } from '../ui/charts.js';

export function actualizarResumen() {
    const { cuentas, deudas } = store.data;
    const liquidez = cuentas.reduce((a, c) => a + c.saldo, 0);
    const totalDeudas = deudas.reduce((a, d) => a + d.pendiente, 0);
    const patrimonio = liquidez - totalDeudas;

    $('#liquidez-total').textContent = mxn(liquidez);
    $('#deudas-total').textContent = mxn(totalDeudas);
    const pat = $('#patrimonio-total');
    pat.textContent = mxn(patrimonio);
    pat.className = patrimonio >= 0 ? 'text-success' : 'text-danger';

    // Salud financiera según deudas / liquidez
    const ratio = liquidez > 0 ? totalDeudas / liquidez : (totalDeudas > 0 ? Infinity : 0);
    const [txt, cls, desc] = ratio < 0.3 ? ['Excelente', 'ok', 'Bajo nivel de endeudamiento.']
        : ratio < 0.6 ? ['Regular', 'warn', 'Tus deudas ya pesan en tu liquidez.']
        : ['En riesgo', 'bad', 'Tus deudas igualan o superan gran parte de tu liquidez.'];
    $('#salud-badge').textContent = txt;
    $('#salud-badge').className = `badge ${cls}`;
    $('#salud-texto').textContent = desc;
}


export function vistaDashboard(c) {
    const { cuentas, movimientos, gastos } = store.data;
    const totales = Object.entries(TIPOS).map(([key, t]) => ({
        key, ...t, total: cuentas.filter(x => x.tipo === key).reduce((a, x) => a + Math.max(0, x.saldo), 0)
    }));
    const liquidez = totales.reduce((a, t) => a + t.total, 0);
    const suma = tipo => movimientos.filter(m => m.tipo === tipo).reduce((a, m) => a + m.monto, 0);

    c.innerHTML = `
        <div class="dash-grid">
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Distribución de la liquidez</h3>${liquidez > 0 ? selectorTipo('tipo-liquidez', TIPOS_CATEGORIA) : ''}</div>
                <div class="chart-wrap">${liquidez > 0 ? '<canvas id="chart-liquidez"></canvas>' : vacio('fa-chart-pie', 'Agrega una cuenta para ver la distribución.')}</div>
            </div>
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Balance de movimientos</h3>${selectorTipo('tipo-balance', TIPOS_BALANCE)}</div>
                <div class="chart-wrap"><canvas id="chart-balance"></canvas></div>
            </div>
        </div>
        <div class="card glass-card panel" style="margin-top:16px">
            <div class="module-head" style="margin-bottom:12px"><h3 style="margin:0">Últimos movimientos</h3>
                <a href="#" class="link" data-view="movimientos">Ver todos</a></div>
            ${tablaMovs(ordenados().slice(0, 5))}
        </div>`;

    if (typeof Chart === 'undefined') return;
    if (liquidez > 0) {
        montar($('#tipo-liquidez'), $('#chart-liquidez'), tipo => configCategorias(
            tipo, totales.map(t => t.label), totales.map(t => t.total), totales.map(t => t.color),
            x => ` ${x.label}: ${mxn(x.raw)} (${Math.round((x.raw / liquidez) * 100)}%)`));
    }
    montar($('#tipo-balance'), $('#chart-balance'), tipo => configCategorias(
        tipo, ['Ingresos totales', 'Gastos totales'], [suma('INCOME'), suma('EXPENSE') + gastos.reduce((a, g) => a + g.monto, 0)], ['#10b981', '#f43f5e']));
}
