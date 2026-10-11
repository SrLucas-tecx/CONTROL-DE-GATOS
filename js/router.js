// Navegación entre vistas. Solo conoce a las vistas (nunca a los formularios).
import { $ } from './utils.js';
import { vistaDashboard } from './views/dashboard.js';
import { destruirGraficos } from './ui/charts.js';
import { vistaCuentas } from './views/cuentas.js';
import { vistaMovimientos } from './views/movimientos.js';
import { vistaMetas } from './views/metas.js';
import { vistaDeudas } from './views/deudas.js';
import { vistaPrestamos } from './views/prestamos.js';
import { vistaAjustes } from './views/ajustes.js';

const VISTAS = {
    dashboard:   { titulo: 'Inicio',                 sub: 'Resumen de tu situación financiera.', fn: vistaDashboard },
    cuentas:     { titulo: 'Cuentas',                sub: 'Tu dinero por cuenta y banco, con rendimientos y proyecciones.', fn: vistaCuentas },
    movimientos: { titulo: 'Movimientos',            sub: 'Entradas, gastos y traspasos, con el control de gastos.', fn: vistaMovimientos },
    deudas:      { titulo: 'Deudas',                 sub: 'Tarjetas, meses sin intereses y pagos recurrentes.', fn: vistaDeudas },
    prestamos:   { titulo: 'Préstamos',              sub: 'Lo que te prestaron y lo que prestaste, con sus fechas.', fn: vistaPrestamos },
    metas:       { titulo: 'Metas de Ahorro',        sub: 'Planifica objetivos de ahorro y calcula tu esfuerzo mensual.', fn: vistaMetas },
    ajustes:     { titulo: 'Ajustes & Portabilidad', sub: 'Exporta tus datos en JSON para respaldarlos o traspasarlos.', fn: vistaAjustes }
};

let vistaActual = 'dashboard';

export function render(vista = vistaActual) {
    if (!VISTAS[vista]) vista = 'dashboard';
    vistaActual = vista;
    destruirGraficos();
    $('#page-title').textContent = VISTAS[vista].titulo;
    $('#page-sub').textContent = VISTAS[vista].sub;
    document.querySelectorAll('.sidebar nav li').forEach(li => {
        li.classList.toggle('active', li.querySelector('a').dataset.view === vista);
    });
    document.querySelectorAll('.bottom-nav [data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === vista));
    $('#bn-mas').classList.toggle('active', ['prestamos', 'metas', 'ajustes'].includes(vista));
    VISTAS[vista].fn($('#module-container'));
}
