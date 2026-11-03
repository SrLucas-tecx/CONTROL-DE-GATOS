import { store, persistir } from '../store.js';
import { esc } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo } from '../ui/fields.js';
import { toast } from '../ui/toast.js';
import { parseLimites, textoLimites } from '../services/alertas.js';

export function formAlertasPatrimonio() {
    abrirModal('Límites del patrimonio neto',
        '<p class="modal-note">Te aviso en Inicio cuando tu patrimonio neto baje de cada monto. Puedes poner varios (por ejemplo uno de precaución y otro crítico).</p>' +
        campo('Avisarme cuando baje de (MXN)', 'limites',
            `inputmode="decimal" value="${esc(textoLimites(store.data.alertasPatrimonio))}" placeholder="Ej. 50000; 20000"`,
            'Separa los montos con punto y coma o espacio. Déjalo vacío para quitar los límites.'),
        fd => {
            store.data.alertasPatrimonio = parseLimites(fd.get('limites'));
            persistir();
            toast(store.data.alertasPatrimonio.length ? 'Límites guardados.' : 'Límites quitados.');
        }, { submitText: 'Guardar' });
}
