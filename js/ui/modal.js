// Modal genérico reutilizado por todos los formularios.
import { $ } from '../utils.js';

const overlay = $('#modal-overlay');
const form = $('#modal-form');
let onDeleteActual = null;

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
    form.onsubmit = e => {
        e.preventDefault();
        if (onSubmit(new FormData(form)) !== false) cerrarModal();
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
