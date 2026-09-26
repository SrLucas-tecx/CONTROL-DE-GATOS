// Apartar / liberar dinero dentro de una cuenta: sigue en el banco pero no cuenta como disponible.
import { buscar, persistir } from '../store.js';
import { esc, mxn, num, uid, disponible } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export function formApartado(id) {
    const c = buscar('cuentas', id);
    if (!c) return;
    c.apartados ||= [];
    const disp = disponible(c);

    const filas = c.apartados.map(a => `
        <div class="apart-row">
            <span>${esc(a.motivo || 'Sin motivo')}</span>
            <strong>${mxn(a.monto)}</strong>
            <button type="button" class="icon-btn" data-liberar="${a.id}" aria-label="Liberar"><i class="fa-solid fa-lock-open"></i></button>
        </div>`).join('') || '<p class="hint" style="margin:0 0 14px">Sin dinero apartado todavía.</p>';

    abrirModal(`Apartar dinero — ${c.nombre}`,
        `<p class="modal-note">Saldo total: <strong>${mxn(c.saldo)}</strong> · Disponible para gastar: <strong>${mxn(disp)}</strong></p>
         <div class="apart-list">${filas}</div>
         <p class="field-group-title">Apartar más dinero</p>` +
        campo('Motivo', 'motivo', 'maxlength="40" placeholder="Ej. Renta de octubre, fondo de emergencia"') +
        campo('Monto a apartar (MXN)', 'monto', attrMoneda('', `min="0.01" max="${disp}"`)),
        fd => {
            const monto = num(fd.get('monto'));
            if (!monto || monto <= 0) return toastError('Escribe un monto válido.');
            if (monto > disponible(c)) return toastError('No puedes apartar más de tu disponible actual.');
            c.apartados.push({ id: uid(), monto, motivo: fd.get('motivo').trim() });
            persistir();
            toast('Dinero apartado. Ya no cuenta como disponible.');
        },
        {
            submitText: 'Apartar',
            onOpen: f => f.querySelectorAll('[data-liberar]').forEach(b => b.addEventListener('click', () => {
                c.apartados = c.apartados.filter(a => a.id !== b.dataset.liberar);
                persistir();
                formApartado(id); // refresca el modal con la lista actualizada
                toast('Dinero liberado.');
            }))
        }
    );
}
