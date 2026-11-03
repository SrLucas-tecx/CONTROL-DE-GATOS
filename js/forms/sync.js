import { abrirModal } from '../ui/modal.js';
import { campo } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { conectar } from '../services/sync.js';
import { render } from '../router.js';

export function formSync() {
    abrirModal('Conectar con Google Sheets',
        '<p class="modal-note">Pega la URL de tu aplicación web de Apps Script (termina en /exec) y el token que generaste. Se guardan solo en este navegador.</p>' +
        campo('URL de la aplicación web', 'url', 'type="url" required placeholder="https://script.google.com/macros/s/…/exec"') +
        campo('Token', 'token', 'type="password" required autocomplete="off"'),
        fd => {
            const url = fd.get('url').trim(), token = fd.get('token').trim();
            if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) return toastError('La URL debe ser la de «Aplicación web» y terminar en /exec.');
            conectar(url, token)
                .then(() => { toast('Conectado con Google Sheets.'); render(); })
                .catch(e => toastError(`No se pudo conectar: ${e.message}`));
        }, { submitText: 'Conectar' });
}
