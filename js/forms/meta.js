import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda, opcionesCuentas } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export function formMeta(id) {
    const m = id ? buscar('metas', id) : null;
    abrirModal(
        m ? 'Editar meta' : 'Nueva meta de ahorro',
        campo('Nombre de la meta', 'nombre', `required maxlength="40" value="${esc(m?.nombre || '')}" placeholder="Ej. Fondo de emergencia"`) +
        campo('Monto objetivo (MXN)', 'objetivo', attrMoneda(m ? m.objetivo : '', 'min="0.01" required')) +
        campo('Ahorrado hasta hoy (MXN)', 'actual', attrMoneda(m ? m.actual : '0')) +
        campo('Plazo (meses)', 'meses', `type="number" min="1" max="600" step="1" value="${m?.meses ?? 12}" required`),
        fd => {
            const nombre = fd.get('nombre').trim();
            const objetivo = num(fd.get('objetivo'));
            const actual = num(fd.get('actual')) ?? 0;
            const meses = parseInt(fd.get('meses'), 10) || 12;
            if (!nombre || objetivo === null || objetivo <= 0) return toastError('Escribe un nombre y un objetivo mayor a 0.');
            if (actual < 0) return toastError('Lo ahorrado no puede ser negativo.');
            if (m) Object.assign(m, { nombre, objetivo, actual, meses });
            else store.data.metas.push({ id: uid(), nombre, objetivo, actual, meses });
            persistir();
            toast(m ? 'Meta actualizada.' : 'Meta creada.');
        },
        {
            onDelete: m ? () => {
                if (!confirm(`¿Eliminar la meta «${m.nombre}»?`)) return;
                store.data.metas = store.data.metas.filter(x => x.id !== m.id);
                cerrarModal(); persistir(); toast('Meta eliminada.');
            } : null
        }
    );
}

export function formAporte(id) {
    const m = buscar('metas', id);
    if (!m) return;
    abrirModal(
        `Agregar saldo a ${m.nombre}`,
        `<p class="modal-note">Llevas <strong>${mxn(m.actual)}</strong> de ${mxn(m.objetivo)}.</p>` +
        selectHTML('Descontar de', 'cuenta', `<option value="">No descontar de ninguna cuenta</option>${opcionesCuentas()}`) +
        campo('Monto a agregar (MXN)', 'monto', attrMoneda('', 'min="0.01" required')),
        fd => {
            const monto = num(fd.get('monto'));
            if (monto === null || monto <= 0) return toastError('Escribe un monto válido.');
            const idCuenta = fd.get('cuenta');
            if (idCuenta) {
                const cuenta = buscar('cuentas', idCuenta);
                if (!cuenta) return toastError('La cuenta seleccionada ya no existe.');
                if (monto > cuenta.saldo) return toastError('La cuenta no tiene saldo suficiente.');
                cuenta.saldo = r2(cuenta.saldo - monto);
            }
            m.actual = r2(m.actual + monto);
            persistir();
            toast(m.actual >= m.objetivo ? '¡Meta lograda! 🎉' : `Se agregaron ${mxn(monto)} a la meta.`);
        },
        { submitText: 'Agregar saldo' }
    );
}
