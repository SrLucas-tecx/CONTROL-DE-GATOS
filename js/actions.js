// Mapa de acciones (data-action) y eventos globales de clic.
import { $, privacidad, fijarOculto } from './utils.js';
import { actualizarResumen } from './views/dashboard.js';
import { render } from './router.js';
import { formCuenta } from './forms/cuenta.js';
import { formApartado } from './forms/apartado.js';
import { formDeuda, formAbono } from './forms/deuda.js';
import { formMeta, formAporte } from './forms/meta.js';
import { formAjusteRapido } from './forms/ajusteRapido.js';
import { formPresupuesto } from './forms/presupuesto.js';
import { formGasto, eliminarGasto } from './forms/gasto.js';
import { exportarGastosExcel } from './services/exportGastos.js';
import { formRecurrente } from './forms/recurrente.js';
import { formMSI } from './forms/msi.js';
import { cancelarMSI } from './services/msi.js';
import { persistir } from './store.js';
import { formBanco } from './forms/banco.js';
import { formPrestamo, formAbonoPrestamo } from './forms/prestamo.js';
import { formMovimiento, eliminarMovimiento } from './forms/movimiento.js';
import { exportarDatos, exportarParcial, importarDatos, borrarTodo, restablecer } from './services/backup.js';
import { generarReporteExcel, generarReportePDF } from './services/reporteMensual.js';
import { hoyISO } from './utils.js';

const ACCIONES = {
    'cuenta-nueva':  () => formCuenta(),
    'cuenta-editar': id => formCuenta(id),
    'cuenta-apartado': id => formApartado(id),
    'deuda-nueva':   () => formDeuda(),
    'deuda-nueva-tarjeta': () => formDeuda(undefined, 'tarjeta'),
    'deuda-editar':  id => formDeuda(id),
    'deuda-abonar':  id => formAbono(id),
    'meta-nueva':    () => formMeta(),
    'meta-editar':   id => formMeta(id),
    'meta-aportar':  id => formAporte(id),
    'exportar':      () => exportarDatos(),
    'exportar-parcial': () => exportarParcial(),
    'importar':      () => $('#input-importar').click(),
    'borrar-todo':   () => borrarTodo(),
    'restablecer':   () => restablecer(),
    'reporte-excel': () => generarReporteExcel(document.getElementById('rep-mes')?.value || hoyISO().slice(0, 7)),
    'reporte-pdf':   () => generarReportePDF(document.getElementById('rep-mes')?.value || hoyISO().slice(0, 7)),
    'banco-nuevo':   () => formBanco(),
    'banco-editar':  id => formBanco(id),
    'cuenta-nueva-banco': id => formCuenta(undefined, id),
    'gasto-nuevo':   () => formGasto(),
    'gasto-editar':  id => formGasto(id),
    'presupuesto-editar': () => formPresupuesto(),
    'gasto-eliminar': id => eliminarGasto(id),
    'gastos-exportar': () => exportarGastosExcel(),
    'msi-nuevo':     () => formMSI(),
    'msi-cancelar':  id => { if (cancelarMSI(id)) { persistir(); } },
    'rec-nuevo':     () => formRecurrente(),
    'rec-editar':    id => formRecurrente(id),
    'prestamo-nuevo-recibido':  () => formPrestamo(undefined, 'recibido'),
    'prestamo-nuevo-otorgado':  () => formPrestamo(undefined, 'otorgado'),
    'prestamo-editar': id => formPrestamo(id),
    'prestamo-abonar': id => formAbonoPrestamo(id),
    'mov-nuevo':     () => formMovimiento(),
    'mov-editar':    id => formMovimiento(id),
    'mov-eliminar':  id => eliminarMovimiento(id)
};

export function initAcciones() {
    document.addEventListener('click', e => {
        const nav = e.target.closest('[data-view]');
        if (nav) { e.preventDefault(); return render(nav.dataset.view); }
        const el = e.target.closest('[data-action]');
        if (el && ACCIONES[el.dataset.action]) ACCIONES[el.dataset.action](el.dataset.id);
    });

    // Ojo: oculta / muestra todos los montos
    const ojo = $('#btn-ojo');
    const pintarOjo = () => {
        ojo.setAttribute('aria-pressed', String(privacidad.oculto));
        ojo.setAttribute('aria-label', privacidad.oculto ? 'Mostrar montos' : 'Ocultar montos');
        ojo.title = privacidad.oculto ? 'Mostrar montos' : 'Ocultar montos';
        ojo.innerHTML = `<i class="fa-solid ${privacidad.oculto ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    };
    ojo.addEventListener('click', () => { fijarOculto(!privacidad.oculto); pintarOjo(); actualizarResumen(); render(); });
    pintarOjo();

    // Menús ⋯ (encabezado y filas de tablas) y selector de tipo de gráfica
    const cerrarMenus = () => document.querySelectorAll('.menu-wrap .menu:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
        m.parentElement.querySelector('[aria-haspopup]')?.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('click', e => {
        const gear = e.target.closest('[data-chartgear]');
        if (gear) { gear.nextElementSibling.classList.toggle('hidden'); return; }
        const t = e.target.closest('[data-rowmenu], #btn-menu');
        if (!t) return cerrarMenus();
        const menu = t.parentElement.querySelector('.menu');
        const abrir = menu.classList.contains('hidden');
        cerrarMenus();
        if (!abrir) return;
        menu.classList.remove('hidden');
        t.setAttribute('aria-expanded', 'true');
        if (t.hasAttribute('data-rowmenu')) { // fijo en pantalla para que la tabla no lo recorte
            const r = t.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.left = `${Math.max(8, r.right - menu.offsetWidth)}px`;
            menu.style.top = `${r.bottom + menu.offsetHeight + 8 > innerHeight ? r.top - menu.offsetHeight - 4 : r.bottom + 4}px`;
        }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenus(); });
    window.addEventListener('scroll', cerrarMenus, true);
    window.addEventListener('resize', cerrarMenus);
    document.addEventListener('change', e => { if (e.target.matches('.chart-type')) e.target.classList.add('hidden'); });

    // Barra inferior (móvil): el botón "Más" abre una hoja con las secciones restantes
    const masBtn = $('#bn-mas'), hoja = $('#bn-sheet');
    const cerrarHoja = () => { hoja.classList.add('hidden'); masBtn.setAttribute('aria-expanded', 'false'); };
    masBtn.addEventListener('click', () => {
        const abrir = hoja.classList.contains('hidden');
        hoja.classList.toggle('hidden', !abrir);
        masBtn.setAttribute('aria-expanded', String(abrir));
    });
    document.addEventListener('click', e => { if (!e.target.closest('#bn-mas')) cerrarHoja(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarHoja(); });

    $('#btn-ajuste-rapido').addEventListener('click', formAjusteRapido);
    $('#btn-nuevo-mov').addEventListener('click', formMovimiento);

    $('#input-importar').addEventListener('change', e => {
        importarDatos(e.target.files[0]);
        e.target.value = ''; // permite volver a elegir el mismo archivo
    });
}
