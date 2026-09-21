// Mapa de acciones (data-action) y eventos globales de clic.
import { $ } from './utils.js';
import { render } from './router.js';
import { formCuenta } from './forms/cuenta.js';
import { formDeuda, formAbono } from './forms/deuda.js';
import { formMeta, formAporte } from './forms/meta.js';
import { formAjusteRapido } from './forms/ajusteRapido.js';
import { formGasto, eliminarGasto } from './forms/gasto.js';
import { exportarGastosExcel } from './services/exportGastos.js';
import { formRecurrente } from './forms/recurrente.js';
import { formBanco } from './forms/banco.js';
import { formMovimiento, eliminarMovimiento } from './forms/movimiento.js';
import { exportarDatos, importarDatos, borrarTodo, restablecer } from './services/backup.js';

const ACCIONES = {
    'cuenta-nueva':  () => formCuenta(),
    'cuenta-editar': id => formCuenta(id),
    'deuda-nueva':   () => formDeuda(),
    'deuda-editar':  id => formDeuda(id),
    'deuda-abonar':  id => formAbono(id),
    'meta-nueva':    () => formMeta(),
    'meta-editar':   id => formMeta(id),
    'meta-aportar':  id => formAporte(id),
    'exportar':      () => exportarDatos(),
    'importar':      () => $('#input-importar').click(),
    'borrar-todo':   () => borrarTodo(),
    'restablecer':   () => restablecer(),
    'banco-nuevo':   () => formBanco(),
    'banco-editar':  id => formBanco(id),
    'cuenta-nueva-banco': id => formCuenta(undefined, id),
    'gasto-nuevo':   () => formGasto(),
    'gasto-eliminar': id => eliminarGasto(id),
    'gastos-exportar': () => exportarGastosExcel(),
    'rec-nuevo':     () => formRecurrente(),
    'rec-editar':    id => formRecurrente(id),
    'mov-nuevo':     () => formMovimiento(),
    'mov-eliminar':  id => eliminarMovimiento(id)
};

export function initAcciones() {
    document.addEventListener('click', e => {
        const nav = e.target.closest('[data-view]');
        if (nav) { e.preventDefault(); return render(nav.dataset.view); }
        const el = e.target.closest('[data-action]');
        if (el && ACCIONES[el.dataset.action]) ACCIONES[el.dataset.action](el.dataset.id);
    });

    $('#btn-ajuste-rapido').addEventListener('click', formAjusteRapido);
    $('#btn-nuevo-mov').addEventListener('click', formMovimiento);

    $('#input-importar').addEventListener('change', e => {
        importarDatos(e.target.files[0]);
        e.target.value = ''; // permite volver a elegir el mismo archivo
    });
}
