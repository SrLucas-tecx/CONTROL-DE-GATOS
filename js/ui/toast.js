import { $ } from '../utils.js';

export function toast(msg, tipo = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'error' ? ' error' : '');
    el.textContent = msg;
    $('#toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// Muestra un error y devuelve false (útil como "return toastError(...)" en validaciones)
export const toastError = msg => { toast(msg, 'error'); return false; };
