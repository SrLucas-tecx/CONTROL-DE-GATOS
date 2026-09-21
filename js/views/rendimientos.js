// Cuentas por banco (con o sin rendimiento) + calculadora con gráfica de proyección.
import { store, buscar } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { montar, selectorTipo, configCategorias, configSerie, TIPOS_CATEGORIA, TIPOS_SERIE } from '../ui/charts.js';

const PALETA = ['#8b5cf6', '#34d399', '#22d3ee', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6'];
const UNIDAD = { dias: 'Día', meses: 'Mes', anios: 'Año' };
const MESES_POR = { dias: 12 / 365, meses: 1, anios: 12 }; // cuántos meses dura una unidad
const opcionesUnidad = sel => [['dias', 'Días'], ['meses', 'Meses'], ['anios', 'Años']]
    .map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('');

export function vistaRendimientos(c) {
    const { cuentas, bancos } = store.data;
    const grupos = bancos.map(b => ({ id: b.id, nombre: b.nombre, cuentas: cuentas.filter(x => x.banco === b.id) }));
    const sueltas = cuentas.filter(x => !x.banco || !buscar('bancos', x.banco));
    if (sueltas.length) grupos.push({ id: '', nombre: 'Sin banco', cuentas: sueltas });
    grupos.forEach(g => { g.total = g.cuentas.reduce((a, x) => a + x.saldo, 0); });

    const conRend = cuentas.filter(x => x.tasa > 0);
    const baseRend = conRend.reduce((a, x) => a + x.saldo, 0);
    const anual = conRend.reduce((a, x) => a + x.saldo * x.tasa / 100, 0);
    const tasaProm = baseRend > 0 ? (anual / baseRend) * 100 : 0;
    const hayDatos = grupos.some(g => g.total > 0);

    const filaCuenta = x => `
        <div class="acc-row">
            <div><strong>${esc(x.nombre)}</strong><br><small class="meta">${x.tasa > 0
                ? `<span class="badge ok">${x.tasa}% anual</span> ≈ ${mxn(x.saldo * x.tasa / 1200)}/mes`
                : '<span class="badge">Solo saldo</span>'}</small></div>
            <div class="acc-amt"><strong>${mxn(x.saldo)}</strong>
                <button class="icon-btn" data-action="cuenta-editar" data-id="${x.id}" aria-label="Editar cuenta"><i class="fa-solid fa-pen"></i></button></div>
        </div>`;

    const tarjetas = grupos.map(g => `
        <div class="card glass-card item-card">
            <h4><i class="fa-solid fa-building-columns ico-brand"></i> ${esc(g.nombre)}
                ${g.id ? `<button class="icon-btn" data-action="banco-editar" data-id="${g.id}" aria-label="Editar banco"><i class="fa-solid fa-pen"></i></button>` : ''}</h4>
            <p class="amount">${mxn(g.total)}</p>
            <div class="acc-list">${g.cuentas.map(filaCuenta).join('') || '<span class="meta">Sin cuentas todavía.</span>'}</div>
            <div class="actions"><button class="btn-ghost" data-action="cuenta-nueva-banco" data-id="${g.id}"><i class="fa-solid fa-plus"></i> Agregar cuenta</button></div>
        </div>`).join('');

    c.innerHTML = `
        <div class="module-head"><h2>Mis cuentas por banco</h2>
            <div class="header-actions">
                <button class="btn-primary" data-action="banco-nuevo"><i class="fa-solid fa-plus"></i> Agregar banco</button>
                <button class="btn-outline" data-action="cuenta-nueva"><i class="fa-solid fa-plus"></i> Agregar cuenta</button></div></div>
        ${grupos.length ? `
        <div class="dash-grid" style="margin-bottom:16px">
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Saldo por banco</h3>${hayDatos ? selectorTipo('tipo-bancos', TIPOS_CATEGORIA) : ''}</div>
                <div class="chart-wrap">${hayDatos ? '<canvas id="chart-bancos"></canvas>' : vacio('fa-chart-pie', 'Aún no hay saldo para graficar.')}</div></div>
            <div class="card glass-card panel"><h3>Rendimiento de tus cuentas</h3>
                <div class="stat"><span>Saldo que genera rendimiento</span><strong>${mxn(baseRend)}</strong></div>
                <div class="stat"><span>Tasa promedio ponderada</span><strong>${tasaProm.toFixed(2)}%</strong></div>
                <div class="stat"><span>Ganancia estimada al mes</span><strong class="text-success">${mxn(anual / 12)}</strong></div>
                <div class="stat"><span>Ganancia estimada al año</span><strong class="text-success">${mxn(anual)}</strong></div></div>
        </div>
        <div class="grid-cards">${tarjetas}</div>`
        : vacio('fa-building-columns', 'Agrega tu primer banco (Nu, Mercado Pago…) y después sus cuentas.')}

        <h2 class="section-title">Calculadora de proyección</h2>
        <div class="dash-grid">
            <div class="card glass-card panel"><h3>Parámetros</h3><form id="calc" class="calc-form" autocomplete="off">
                ${campo('Capital inicial (MXN)', 'capital', attrMoneda('10000'))}
                ${campo('Aportación mensual (MXN)', 'aporte', attrMoneda('1000'))}
                ${campo('Tasa anual (%)', 'tasa', attrMoneda('10', 'max="200"'))}
                ${campo('Plazo', 'plazo', 'type="number" min="1" step="1" value="5"')}
                ${selectHTML('Unidad del plazo', 'unidad', opcionesUnidad('anios'))}
                ${selectHTML('Ver la gráfica por', 'ver', opcionesUnidad('anios'))}
                <button type="button" id="usar-cuentas" class="btn-ghost" ${baseRend > 0 ? '' : 'disabled'}><i class="fa-solid fa-wand-magic-sparkles"></i> Usar mis cuentas con rendimiento</button>
            </form></div>
            <div class="card glass-card panel">
                <div class="chart-head"><h3>Proyección</h3>${selectorTipo('tipo-proy', TIPOS_SERIE)}</div>
                <div class="chart-wrap" style="height:240px"><canvas id="chart-proy"></canvas></div>
                <div id="calc-res"></div>
                <p class="hint">Capitalización mensual. Los puntos por día o entre meses son una aproximación.</p></div>
        </div>`;

    if (typeof Chart === 'undefined') return;

    if (hayDatos) {
        montar(c.querySelector('#tipo-bancos'), c.querySelector('#chart-bancos'), tipo => configCategorias(
            tipo, grupos.map(g => g.nombre), grupos.map(g => Math.max(0, g.total)), grupos.map((_, i) => PALETA[i % PALETA.length])));
    }

    const form = c.querySelector('#calc');
    let datos = { labels: [], saldo: [], aportado: [] };
    const grafico = montar(c.querySelector('#tipo-proy'), c.querySelector('#chart-proy'),
        tipo => configSerie(tipo, datos.labels, datos.saldo, datos.aportado));

    const calcular = () => {
        const v = n => Math.max(0, parseFloat(form.elements[n].value) || 0);
        const P = v('capital'), A = v('aporte'), r = v('tasa') / 100 / 12;
        const ver = form.elements.ver.value;
        const T = Math.min(600, Math.max(v('plazo') * MESES_POR[form.elements.unidad.value], MESES_POR.dias)); // meses
        const paso = MESES_POR[ver];
        const n = Math.floor(T / paso + 1e-9);
        const salto = Math.max(1, Math.ceil(n / 400)); // limita a ~400 puntos
        const ts = [];
        for (let i = 0; i <= n; i += salto) ts.push(i * paso);
        if (ts[ts.length - 1] < T - 1e-9) ts.push(T);

        const fv = t => r === 0 ? P + A * t : P * (1 + r) ** t + A * (((1 + r) ** t - 1) / r);
        datos = {
            labels: ts.map(t => { const x = ver === 'dias' ? Math.round(t / paso) : t / paso; return `${UNIDAD[ver]} ${Number.isInteger(x) ? x : x.toFixed(1)}`; }),
            saldo: ts.map(t => Math.round(fv(t) * 100) / 100),
            aportado: ts.map(t => P + A * t)
        };
        grafico.repintar();

        const final = datos.saldo.at(-1), aportado = datos.aportado.at(-1);
        c.querySelector('#calc-res').innerHTML = `
            <div class="stat big"><span>Saldo final</span><strong>${mxn(final)}</strong></div>
            <div class="stat"><span>Total aportado</span><strong>${mxn(aportado)}</strong></div>
            <div class="stat"><span>Intereses ganados</span><strong class="text-success">${mxn(final - aportado)}</strong></div>`;
    };

    form.addEventListener('input', calcular);
    form.elements.unidad.addEventListener('change', () => { form.elements.ver.value = form.elements.unidad.value; calcular(); });
    c.querySelector('#usar-cuentas').addEventListener('click', () => {
        form.elements.capital.value = baseRend.toFixed(2);
        form.elements.tasa.value = tasaProm.toFixed(2);
        calcular();
    });
    calcular();
}
