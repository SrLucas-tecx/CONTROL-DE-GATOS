// Modal genérico reutilizado por todos los formularios.
import { $ } from '../utils.js';

const overlay = $('#modal-overlay');
const form = $('#modal-form');
let onDeleteActual = null;
let confirmacionId = 0;

export function confirmar(mensaje, {
    titulo = 'Confirmar acción',
    aceptarTexto = 'Confirmar',
    cancelarTexto = 'Cancelar',
    permitirCerrar = true,
    peligro = true,
    cancelarPeligro = false
} = {}) {
    return new Promise(resolve => {
        const anterior = document.activeElement;
        const id = ++confirmacionId;
        const pantalla = document.createElement('div');
        pantalla.className = 'modal-overlay confirm-overlay';

        const dialogo = document.createElement('div');
        dialogo.className = 'modal confirm-modal';
        dialogo.setAttribute('role', 'alertdialog');
        dialogo.setAttribute('aria-modal', 'true');
        dialogo.tabIndex = -1;
        dialogo.setAttribute('aria-labelledby', `confirm-title-${id}`);
        dialogo.setAttribute('aria-describedby', `confirm-message-${id}`);

        const encabezado = document.createElement('h3');
        encabezado.id = `confirm-title-${id}`;
        encabezado.textContent = titulo;
        const detalle = document.createElement('p');
        detalle.id = `confirm-message-${id}`;
        detalle.className = 'modal-note';
        detalle.textContent = mensaje;

        const acciones = document.createElement('div');
        acciones.className = 'modal-actions';
        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = cancelarPeligro ? 'btn-danger' : 'btn-ghost';
        cancelar.textContent = cancelarTexto;
        cancelar.dataset.choice = 'cancel';
        const aceptar = document.createElement('button');
        aceptar.type = 'button';
        aceptar.className = peligro ? 'btn-danger' : 'btn-primary';
        aceptar.textContent = aceptarTexto;
        aceptar.dataset.choice = 'accept';
        acciones.append(cancelar, aceptar);
        dialogo.append(encabezado, detalle, acciones);
        pantalla.append(dialogo);

        let terminada = false;
        const finalizar = resultado => {
            if (terminada) return;
            terminada = true;
            pantalla.remove();
            if (anterior instanceof HTMLElement && anterior.isConnected) {
                const menuOculto = anterior.closest('.menu.hidden');
                const destino = menuOculto
                    ? menuOculto.parentElement.querySelector('[aria-haspopup]')
                    : anterior.matches(':disabled')
                        ? anterior.form?.querySelector('[data-close]') || anterior.form?.querySelector('button:not(:disabled)')
                        : anterior;
                if (destino?.isConnected && !destino.matches(':disabled')) destino.focus();
            }
            resolve(resultado);
        };
        pantalla.addEventListener('click', e => {
            const boton = e.target.closest('[data-choice]');
            if (boton) return finalizar(boton.dataset.choice === 'accept');
            if (e.target === pantalla && permitirCerrar) finalizar(null);
        });
        pantalla.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (permitirCerrar) finalizar(null);
                return;
            }
            if (e.key !== 'Tab') return;
            const botones = [...acciones.querySelectorAll('button')];
            const primero = botones[0], ultimo = botones[botones.length - 1];
            if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            }
        });
        document.body.append(pantalla);
        if (permitirCerrar) cancelar.focus();
        else dialogo.focus();
    });
}

export function abrirModal(titulo, contenido, onSubmit, { onDelete = null, submitText = 'Guardar', onOpen = null } = {}) {
    $('#modal-title').textContent = titulo;
    onDeleteActual = onDelete;
    form.innerHTML = `
        ${contenido}
        <div class="modal-actions">
            ${onDelete ? '<button type="button" class="btn-danger" data-delete>Eliminar</button>' : ''}
            <button type="button" class="btn-ghost" data-close>Cancelar</button>
            <button type="submit" class="btn-primary">${submitText}</button>
        </div>`;
    form.onsubmit = async e => {
        e.preventDefault();
        const boton = form.querySelector('[type="submit"]');
        if (boton?.disabled) return;
        if (boton) boton.disabled = true;
        try {
            if (await onSubmit(new FormData(form)) !== false) cerrarModal();
        } finally {
            if (boton?.isConnected) boton.disabled = false;
        }
    };
    overlay.classList.remove('hidden');
    form.querySelector('input, select')?.focus();
    if (onOpen) onOpen(form);
}

export function cerrarModal() {
    overlay.classList.add('hidden');
    form.innerHTML = '';
    onDeleteActual = null;
}

overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-close]')) return cerrarModal();
    if (e.target.closest('[data-delete]') && onDeleteActual) onDeleteActual();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) cerrarModal();
});
