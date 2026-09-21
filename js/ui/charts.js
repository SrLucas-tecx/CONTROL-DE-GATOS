// Gráficos: registro, selector de tipo y configuraciones reutilizables (Chart.js).
import { mxn } from '../utils.js';

let activos = [];
const pref = {}; // recuerda el tipo elegido por gráfico mientras dura la sesión
const mxnCorto = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 }).format(v);
const GRID = 'rgba(255,255,255,.06)';

export const TIPOS_CATEGORIA = { doughnut: 'Dona', pie: 'Pastel', polarArea: 'Polar', bar: 'Barras' };
export const TIPOS_BALANCE   = { bar: 'Barras', doughnut: 'Dona', pie: 'Pastel', polarArea: 'Polar' };
export const TIPOS_SERIE     = { line: 'Línea', area: 'Área', bar: 'Barras', stacked: 'Barras apiladas' };

export const registrar = g => { activos.push(g); return g; };
export function destruirGraficos() { activos.forEach(g => g.destroy()); activos = []; }

export const selectorTipo = (id, tipos) =>
    `<select id="${id}" class="input chart-type" aria-label="Tipo de gráfico">${Object.entries(tipos)
        .map(([k, l]) => `<option value="${k}" ${pref[id] === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

// Dibuja el gráfico y lo redibuja cuando cambia el selector. Devuelve { repintar }.
export function montar(select, canvas, construir) {
    if (typeof Chart === 'undefined' || !select || !canvas) return { repintar() {} };
    Chart.defaults.color = '#94a3b8';
    let g = null;
    const repintar = () => {
        if (g) { g.destroy(); activos = activos.filter(x => x !== g); }
        g = new Chart(canvas, construir(select.value));
        activos.push(g);
    };
    select.addEventListener('change', () => { pref[select.id] = select.value; repintar(); });
    repintar();
    return { repintar };
}

// Datos por categoría: dona, pastel, polar o barras
export function configCategorias(tipo, labels, data, colores, etiqueta = x => ` ${x.label}: ${mxn(x.raw)}`) {
    const circular = tipo !== 'bar';
    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: circular, position: 'bottom', labels: { color: '#cbd5e1', padding: 16 } }, tooltip: { callbacks: { label: etiqueta } } }
    };
    if (tipo === 'doughnut') options.cutout = '65%';
    if (tipo === 'bar') options.scales = { y: { beginAtZero: true, grid: { color: GRID }, ticks: { callback: mxnCorto } }, x: { grid: { display: false } } };
    if (tipo === 'polarArea') options.scales = { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,.1)' } } };
    return {
        type: tipo,
        data: { labels, datasets: [{ data, backgroundColor: colores, borderColor: circular ? '#1e293b' : 'transparent', borderWidth: circular ? 3 : 0, borderRadius: circular ? 0 : 8 }] },
        options
    };
}

// Series en el tiempo: línea, área, barras o barras apiladas (aportado + intereses)
export function configSerie(tipo, labels, saldo, aportado) {
    const barra = tipo === 'bar' || tipo === 'stacked';
    const datasets = tipo === 'stacked'
        ? [{ label: 'Total aportado', data: aportado, backgroundColor: '#8b5cf6' },
           { label: 'Intereses ganados', data: saldo.map((s, i) => Math.max(0, s - aportado[i])), backgroundColor: '#34d399' }]
        : [{ label: 'Saldo proyectado', data: saldo, borderColor: '#34d399', backgroundColor: barra ? '#34d399' : 'rgba(52,211,153,.18)', fill: tipo === 'area', tension: 0.3, pointRadius: labels.length > 60 ? 0 : 2, borderRadius: 4 },
           { label: 'Total aportado', data: aportado, borderColor: '#8b5cf6', backgroundColor: barra ? '#8b5cf6' : 'rgba(139,92,246,.12)', fill: tipo === 'area', borderDash: barra ? [] : [6, 4], tension: 0.3, pointRadius: 0, borderRadius: 4 }];
    return {
        type: barra ? 'bar' : 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } }, tooltip: { callbacks: { label: x => ` ${x.dataset.label}: ${mxn(x.parsed.y)}` } } },
            scales: { x: { stacked: tipo === 'stacked', grid: { display: false }, ticks: { maxTicksLimit: 12 } },
                      y: { stacked: tipo === 'stacked', grid: { color: GRID }, ticks: { callback: mxnCorto } } }
        }
    };
}
