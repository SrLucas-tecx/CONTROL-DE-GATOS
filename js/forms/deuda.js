import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda, opcionesCuentas } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export function formDeuda(id) {
    const d = id ? buscar('deudas', id) : null;
    abrirModal(
        d ? 'Editar deuda' : 'Registrar deuda',
        campo('Nombre', 'nombre', `required maxlength="40" value="${esc(d?.nombre || '')}" placeholder="Ej. Tarjeta de crédito"`) +
        campo('Saldo pendiente (MXN)', 'pendiente', attrMoneda(d ? d.pendiente : '', 'required')) +
        campo('Pago mínimo (MXN) — opcional', 'pagoMinimo', attrMoneda(d ? d.pagoMinimo : '0'), 'Déjalo en 0 si pagas el total cada mes y nunca el mínimo.') +
        campo('Día de corte — opcional', 'diaCorte', `type="number" min="0" max="31" step="1" value="${d?.diaCorte || ''}"`) +
        campo('Día límite de pago — opcional', 'diaPago', `type="number" min="0" max="31" step="1" value="${d?.diaPago || ''}"`) +
        campo('Tasa de interés anual (%) — opcional', 'tasa', attrMoneda(d ? d.tasa : '0', 'max="1000"'), 'Déjala en 0 para compras a meses sin intereses.'),
        fd => {
            const nombre = fd.get('nombre').trim();
            const pendiente = num(fd.get('pendiente'));
            const pagoMinimo = num(fd.get('pagoMinimo')) ?? 0;
            const tasa = num(fd.get('tasa')) ?? 0;
            const dia = k => { const n = parseInt(fd.get(k), 10); return n >= 1 && n <= 31 ? n : 0; };
            const diaCorte = dia('diaCorte'), diaPago = dia('diaPago');
            if (!nombre || pendiente === null || pendiente < 0) return toastError('Escribe un nombre y un saldo pendiente válido.');
            if (pagoMinimo < 0 || tasa < 0) return toastError('El pago mínimo y la tasa no pueden ser negativos.');
            if (d) Object.assign(d, { nombre, pendiente, pagoMinimo, tasa, diaCorte, diaPago });
            else store.data.deudas.push({ id: uid(), nombre, pendiente, pagoMinimo, tasa, diaCorte, diaPago });
            persistir();
            toast(d ? 'Deuda actualizada.' : 'Deuda registrada.');
        },
        {
            onDelete: d ? () => {
                if (!confirm(`¿Eliminar la deuda «${d.nombre}»?`)) return;
                store.data.deudas = store.data.deudas.filter(x => x.id !== d.id);
                cerrarModal(); persistir(); toast('Deuda eliminada.');
            } : null
        }
    );
}

export function formAbono(id) {
    const d = buscar('deudas', id);
    if (!d) return;
    if (!store.data.cuentas.length) return toast('Primero agrega una cuenta de origen.', 'error');

    abrirModal(
        `Abonar a ${d.nombre}`,
        `<p class="modal-note">Saldo pendiente: <strong>${mxn(d.pendiente)}</strong></p>` +
        selectHTML('Cuenta de origen', 'cuenta', opcionesCuentas()) +
        campo('Monto a abonar (MXN)', 'monto', attrMoneda('', `min="0.01" max="${d.pendiente}" required`)),
        fd => {
            const cuenta = buscar('cuentas', fd.get('cuenta'));
            const monto = num(fd.get('monto'));
            if (!cuenta || monto === null || monto <= 0) return toastError('Escribe un monto válido.');
            if (monto > cuenta.saldo) return toastError('La cuenta de origen no tiene saldo suficiente.');
            if (monto > d.pendiente) return toastError('El abono supera el saldo pendiente de la deuda.');
            cuenta.saldo = r2(cuenta.saldo - monto);
            d.pendiente = r2(d.pendiente - monto);
            persistir();
            toast(d.pendiente === 0 ? '¡Deuda liquidada!' : `Abono de ${mxn(monto)} registrado.`);
        },
        { submitText: 'Abonar' }
    );
}
