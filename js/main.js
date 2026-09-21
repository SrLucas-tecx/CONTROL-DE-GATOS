// Punto de entrada: conecta store, vistas y eventos.
import { guardar, alCambiar, persistir } from './store.js';
import { actualizarResumen } from './views/dashboard.js';
import { render } from './router.js';
import { initAcciones } from './actions.js';
import { aplicarRendimientos } from './services/rendimientos.js';
import { aplicarRecurrentes } from './services/recurrentes.js';
import { toast } from './ui/toast.js';
import './ui/modal.js';

// Cada vez que cambian los datos: recalcular tarjetas y repintar la vista activa
alCambiar(() => {
    actualizarResumen();
    render();
});

// Rendimientos diarios y pagos mensuales que ya tocaban. Devuelve true si algo cambió.
function automatizar() {
    const rend = aplicarRendimientos();
    const pagos = aplicarRecurrentes();
    if (pagos) toast(`${pagos} pago(s) mensual(es) registrado(s) automáticamente.`);
    return rend || pagos > 0;
}

function initApp() {
    automatizar();
    guardar();
    actualizarResumen();
    initAcciones();
    render('dashboard');
    // Si la pestaña queda abierta varios días, se pone al corriente al volver a ella
    document.addEventListener('visibilitychange', () => { if (!document.hidden && automatizar()) persistir(); });
}

initApp();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); // modo instalable / sin conexión
