// Punto de entrada: conecta store, vistas y eventos.
import { guardar, alCambiar, persistir } from './store.js';
import { actualizarResumen } from './views/dashboard.js';
import { render } from './router.js';
import { initAcciones } from './actions.js';
import { aplicarRendimientos } from './services/rendimientos.js';
import { aplicarRecurrentes } from './services/recurrentes.js';
import { aplicarMSI } from './services/msi.js';
import { iniciarSync, consultar } from './services/sync.js';
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
    const cuotas = aplicarMSI();
    const mensajes = [];
    if (pagos) mensajes.push(`${pagos} pago(s) mensual(es)`);
    if (cuotas) mensajes.push(`${cuotas} cuota(s) de MSI`);
    if (mensajes.length) toast(`Registrado automáticamente: ${mensajes.join(' y ')}.`);
    return rend || pagos > 0 || cuotas > 0;
}

async function initApp() {
    initAcciones();
    render('dashboard');             // se ve al instante con lo guardado en el navegador
    await iniciarSync();             // trae lo último de la nube si Google Sheets está conectado
    if (automatizar()) persistir();  // lo automático también se sube a la nube
    else guardar();
    // Si la pestaña queda abierta varios días, se pone al corriente al volver a ella
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) return;
        await consultar();
        if (automatizar()) persistir();
    });
}

initApp();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); // modo instalable / sin conexión
