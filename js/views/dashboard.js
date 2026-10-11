// Inicio: una cifra principal, avisos que requieren atención, una sola gráfica con pestañas y los últimos movimientos.
import { TIPOS, KEY_RESPALDO, KEY_INICIO } from '../config.js';
import { abrirModal } from '../ui/modal.js';
import { alertasPrestamos, totalesPrestamos } from '../services/prestamos.js';
import { alertasRendimientos } from '../services/rendimientos.js';
import { store } from '../store.js';
import { esc, mxn, vacio, hoyISO, diasHasta, disponibleMXN, fechaUltimoCorte } from '../utils.js';
import { tablaMovs, ordenados } from './movimientos.js';
import { destruirGraficos, montar, selectorTipo, configCategorias, TIPOS_CATEGORIA, TIPOS_BALANCE } from '../ui/charts.js';

const MAX_AVISOS = 3;     // avisos visibles antes de "Ver más"
const MAX_MOVS = 3;       // últimos movimientos en Inicio
let tabGrafico = 'liquidez'; // 'liquidez' | 'balance' (se recuerda mientras dura la sesión)

// Secciones de Inicio que tú decides ver u ocultar (se guarda en el navegador)
const OPCIONES = {
    salud:       ['Salud financiera', 'Etiqueta junto al patrimonio'],
    tarjetas:    ['Tarjetas de resumen detalladas', 'Patrimonio, bolsa líquida, deudas y salud, como antes'],
    avisos:      ['Requiere atención', 'Vencimientos, cortes, presupuesto y respaldo'],
    grafica:     ['Gráficas', 'Liquidez e ingresos vs gastos'],
    dosGraficas: ['Mostrar las dos gráficas a la vez', 'En lugar de una sola con pestañas'],
    movimientos: ['Últimos movimientos', 'Los 3 más recientes']
};
const PREF_DEF = { salud: true, tarjetas: false, avisos: true, grafica: true, dosGraficas: false, movimientos: true };
const cargarPrefs = () => { try { return { ...PREF_DEF, ...JSON.parse(localStorage.getItem(KEY_INICIO) || '{}') }; } catch (e) { return { ...PREF_DEF }; } };
let prefs = cargarPrefs();
let contenedor = null;

function personalizar() {
    abrirModal('Personalizar Inicio',
        '<p class="modal-note">Elige qué quieres ver al abrir la app. El patrimonio neto siempre se muestra.</p>' +
        Object.entries(OPCIONES).map(([k, [t, d]]) =>
            `<label class="check"><input type="checkbox" name="${k}" ${prefs[k] ? 'checked' : ''}> <span>${t} <small>— ${d}</small></span></label>`).join(''),
        fd => {
            prefs = Object.fromEntries(Object.keys(OPCIONES).map(k => [k, !!fd.get(k)]));
            try { localStorage.setItem(KEY_INICIO, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ }
            destruirGraficos();
            vistaDashboard(contenedor);
        }, { submitText: 'Guardar' });
}

// Las tarjetas de resumen ya no son globales: viven solo en Inicio.
// Se conserva la función (main.js y actions.js la llaman) para no romper nada.
export function actualizarResumen() {}

// Números principales + salud financiera según deudas / liquidez
function resumen() {
    const { cuentas, deudas } = store.data;
    const liquidez = cuentas.reduce((a, c) => a + disponibleMXN(c), 0);
    const { debo, meDeben } = totalesPrestamos();
    const totalDeudas = deudas.reduce((a, d) => a + d.pendiente, 0) + debo; // incluye préstamos que te hicieron
    const ratio = liquidez > 0 ? totalDeudas / liquidez : (totalDeudas > 0 ? Infinity : 0);
    const [txt, cls, desc] = ratio < 0.3 ? ['Excelente', 'ok', 'Bajo nivel de endeudamiento.']
        : ratio < 0.6 ? ['Regular', 'warn', 'Tus deudas ya pesan en tu liquidez.']
        : ['En riesgo', 'bad', 'Tus deudas igualan o superan gran parte de tu liquidez.'];
    return { liquidez, totalDeudas, patrimonio: liquidez + meDeben - totalDeudas, porCobrar: meDeben, salud: { txt, cls, desc } };
}

export function vistaDashboard(c) {
    const { cuentas, movimientos, gastos } = store.data;
    const { liquidez, totalDeudas, patrimonio, porCobrar, salud } = resumen();
    const totales = Object.entries(TIPOS).map(([key, t]) => ({
        key, ...t, total: cuentas.filter(x => x.tipo === key).reduce((a, x) => a + disponibleMXN(x), 0)
    }));
    const suma = tipo => movimientos.filter(m => m.tipo === tipo && !m.informativo).reduce((a, m) => a + m.monto, 0);
    const dos = prefs.dosGraficas;
    const verLiquidez = dos || tabGrafico === 'liquidez';
    const verBalance = dos || tabGrafico === 'balance';
    contenedor = c;

    const tarjetas = `
        <section class="summary-cards">
            <div class="card glass-card"><h3>Patrimonio Neto</h3><p class="${patrimonio >= 0 ? 'text-success' : 'text-danger'}">${mxn(patrimonio)}</p><small>Liquidez + por cobrar − deudas</small></div>
            <div class="card glass-card"><h3>Bolsa General (Líquido)</h3><p class="text-success">${mxn(liquidez)}</p><small>Efectivo + débito + rendimiento</small></div>
            <div class="card glass-card"><h3>Deudas Pendientes</h3><p class="text-danger">${mxn(totalDeudas)}</p><small>Incluye préstamos recibidos</small></div>
            <div class="card glass-card"><h3>Salud Financiera</h3><p><span class="badge ${salud.cls}">${salud.txt}</span></p><small>${salud.desc}</small></div>
        </section>`;

    const panelLiq = `
        <div class="card glass-card panel">
            <div class="chart-head">${dos ? '<h3>Distribución de la liquidez</h3>' : tabsHTML()}${liquidez > 0 ? selectorTipo('tipo-liquidez', TIPOS_CATEGORIA) : ''}</div>
            <div class="chart-wrap">${liquidez > 0 ? '<canvas id="chart-liquidez"></canvas>' : vacio('fa-chart-pie', 'Agrega una cuenta para ver la distribución.')}</div>
        </div>`;
    const panelBal = `
        <div class="card glass-card panel">
            <div class="chart-head">${dos ? '<h3>Balance de movimientos</h3>' : tabsHTML()}${selectorTipo('tipo-balance', TIPOS_BALANCE)}</div>
            <div class="chart-wrap"><canvas id="chart-balance"></canvas></div>
        </div>`;
    const graficas = !prefs.grafica ? '' : dos ? `<div class="dash-grid">${panelLiq}${panelBal}</div>` : (tabGrafico === 'liquidez' ? panelLiq : panelBal);

    c.innerHTML = `
        <div class="inicio-bar"><button type="button" class="link link-btn" data-personalizar><i class="fa-solid fa-sliders"></i> Personalizar</button></div>
        <section class="card glass-card hero">
            <div class="hero-main">
                <span class="hero-label">Patrimonio neto</span>
                <p class="hero-amount ${patrimonio >= 0 ? 'text-success' : 'text-danger'}">${mxn(patrimonio)}</p>
                <div class="hero-sub">
                    <span>Liquidez <strong class="text-success">${mxn(liquidez)}</strong></span>
                    <span>Deudas <strong class="text-danger">${mxn(totalDeudas)}</strong></span>
                    ${porCobrar > 0 ? `<span>Por cobrar <strong class="text-success">${mxn(porCobrar)}</strong></span>` : ''}
                </div>
            </div>
            ${prefs.salud ? `<div class="hero-salud">
                <span class="hero-label">Salud financiera</span>
                <span class="badge ${salud.cls}">${salud.txt}</span>
                <small>${salud.desc}</small>
            </div>` : ''}
        </section>
        ${prefs.tarjetas ? tarjetas : ''}
        ${prefs.avisos ? atencionHTML() : ''}
        ${graficas}
        ${prefs.movimientos ? `<div class="card glass-card panel" style="margin-top:16px">
            <div class="module-head" style="margin-bottom:12px"><h3 style="margin:0">Últimos movimientos</h3>
                <a href="#" class="link" data-view="movimientos">Ver todos</a></div>
            ${tablaMovs(ordenados().slice(0, MAX_MOVS))}
        </div>` : ''}`;

    c.querySelector('[data-personalizar]').addEventListener('click', personalizar);

    // Pestañas de la gráfica: cambian cuál se muestra y repintan Inicio
    c.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
        tabGrafico = b.dataset.tab;
        destruirGraficos();
        vistaDashboard(c);
    }));

    // "Ver más" de los avisos
    const mas = c.querySelector('[data-mas-avisos]');
    if (mas) mas.addEventListener('click', () => {
        const extra = c.querySelector('.avisos-extra');
        const oculto = extra.classList.toggle('hidden');
        mas.textContent = oculto ? `Ver ${extra.children.length} más` : 'Ver menos';
    });

    if (typeof Chart === 'undefined' || !prefs.grafica) return;
    if (verLiquidez && liquidez > 0) {
        montar(c.querySelector('#tipo-liquidez'), c.querySelector('#chart-liquidez'), tipo => configCategorias(
            tipo, totales.map(t => t.label), totales.map(t => t.total), totales.map(t => t.color),
            x => ` ${x.label}: ${mxn(x.raw)} (${Math.round((x.raw / liquidez) * 100)}%)`));
    }
    if (verBalance) {
        montar(c.querySelector('#tipo-balance'), c.querySelector('#chart-balance'), tipo => configCategorias(
            tipo, ['Ingresos totales', 'Gastos totales'], [suma('INCOME'), suma('EXPENSE') + gastos.reduce((a, g) => a + g.monto, 0)], ['#10b981', '#f43f5e']));
    }
}

const tabsHTML = () => `<div class="tabs">
    <button type="button" class="tab ${tabGrafico === 'liquidez' ? 'active' : ''}" data-tab="liquidez">Distribución de la liquidez</button>
    <button type="button" class="tab ${tabGrafico === 'balance' ? 'active' : ''}" data-tab="balance">Ingresos y gastos</button></div>`;

// Avisos ordenados por urgencia (p: 0 urgente · 1 atención · 2 informativo · 3 recordatorio).
// Solo se muestran los primeros; el resto queda tras "Ver más".
function avisos() {
    const { deudas, cuentas, gastos, presupuestos = {} } = store.data;
    const liquidez = cuentas.reduce((a, c) => a + disponibleMXN(c), 0);
    const hoy = hoyISO();
    const av = [];
    deudas.filter(d => d.diaPago && d.pendiente > 0).forEach(d => {
        const dias = diasHasta(d.diaPago);
        if (dias > 7) return;
        const alcanza = liquidez >= d.pendiente;
        av.push({ p: alcanza ? 2 : 0, cls: alcanza ? 'ok' : 'bad', html: `<span>💳 <strong>${esc(d.nombre)}</strong> vence ${dias === 0 ? 'hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}: debes ${mxn(d.pendiente)} — ${alcanza ? 'tu liquidez alcanza para pagarla' : `te faltan ${mxn(d.pendiente - liquidez)}`}.</span>` });
    });
    deudas.filter(d => d.diaCorte).forEach(d => {
        const dias = diasHasta(d.diaCorte);
        if (dias > 5) return;
        const desde = fechaUltimoCorte(d.diaCorte);
        const gastado = gastos.filter(g => g.medio === 'tarjeta' && g.origen === d.id && g.fecha > desde && g.fecha <= hoy).reduce((a, g) => a + g.monto, 0);
        av.push({ p: 1, cls: '', html: `<span>📅 <strong>${esc(d.nombre)}</strong> corta ${dias === 0 ? 'hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}: llevas ${mxn(gastado)} gastados en este periodo.</span>` });
    });
    const mes = hoy.slice(0, 7);
    Object.entries(presupuestos).forEach(([k, lim]) => {
        const usado = gastos.filter(g => g.categoria === k && g.fecha.startsWith(mes)).reduce((a, g) => a + g.monto, 0);
        if (usado >= lim * 0.8) av.push({ p: usado >= lim ? 0 : 1, cls: usado >= lim ? 'bad' : '', html: `<span>🎯 <strong>${esc(k)}</strong>: ${mxn(usado)} de ${mxn(lim)} (${Math.round((usado / lim) * 100)}%) del presupuesto del mes.</span>` });
    });
    let resp = null;
    try { resp = localStorage.getItem(KEY_RESPALDO); } catch (e) { /* sin almacenamiento */ }
    const dResp = resp ? Math.round((new Date() - new Date(`${resp}T00:00:00`)) / 864e5) : null;
    if (dResp === null || dResp >= 7) {
        av.push({ p: 3, cls: '', html: `<span>💾 ${dResp === null ? 'Aún no has exportado un respaldo.' : `Hace ${dResp} días que no exportas un respaldo.`}</span><button class="btn-ghost" data-action="exportar">Exportar ahora</button>` });
    }
    av.push(...alertasPrestamos(), ...alertasRendimientos());
    return av.sort((a, b) => a.p - b.p); // sort es estable: se conserva el orden original dentro de cada nivel
}

function atencionHTML() {
    const av = avisos();
    if (!av.length) return ''; // sin avisos no se muestra nada
    const pinta = a => `<div class="aviso ${a.cls}">${a.html}</div>`;
    const visibles = av.slice(0, MAX_AVISOS), extra = av.slice(MAX_AVISOS);
    return `<section class="atencion">
        <div class="atencion-head"><h3>Requiere atención</h3>
            ${extra.length ? `<button type="button" class="link link-btn" data-mas-avisos>Ver ${extra.length} más</button>` : ''}</div>
        <div class="avisos">${visibles.map(pinta).join('')}
            ${extra.length ? `<div class="avisos-extra hidden">${extra.map(pinta).join('')}</div>` : ''}</div>
    </section>`;
}
