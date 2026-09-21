// Navegación entre vistas. Solo conoce a las vistas (nunca a los formularios).
import { $ } from './utils.js';
import { vistaDashboard } from './views/dashboard.js';
import { destruirGraficos } from './ui/charts.js';
import { vistaCuentas } from './views/cuentas.js';
import { vistaMovimientos } from './views/movimientos.js';
import { vistaGastos } from './views/gastos.js';
import { vistaRendimientos } from './views/rendimientos.js';
import { vistaMetas } from './views/metas.js';
import { vistaDeudas } from './views/deudas.js';
import { vistaAjustes } from './views/ajustes.js';

const VISTAS = {
    dashboard:    { titulo: 'Panel Principal',         sub: 'Resumen consolidado de tu salud financiera actual.', fn: vistaDashboard },
    cuentas:      { titulo: 'Bóveda de Cuentas',       sub: 'Organiza tu dinero por efectivo, bancos y rendimientos.', fn: vistaCuentas },
    movimientos:  { titulo: 'Movimientos',             sub: 'Historial de entradas, gastos y traspasos.', fn: vistaMovimientos },
    gastos:       { titulo: 'Control de Gastos',   sub: 'Registra tus gastos y detecta los gastos hormiga.', fn: vistaGastos },
    rendimientos: { titulo: 'Rendimientos',            sub: 'Proyecta el crecimiento de tu inversión.', fn: vistaRendimientos },
    metas:        { titulo: 'Metas a Futuro',          sub: 'Planifica objetivos de ahorro y calcula tu esfuerzo mensual.', fn: vistaMetas },
    deudas:       { titulo: 'Deudas',                  sub: 'Prioriza la liquidación de tus pasivos.', fn: vistaDeudas },
    ajustes:      { titulo: 'Ajustes & Portabilidad',  sub: 'Exporta tus datos en JSON para respaldarlos o traspasarlos.', fn: vistaAjustes }
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
    VISTAS[vista].fn($('#module-container'));
}
