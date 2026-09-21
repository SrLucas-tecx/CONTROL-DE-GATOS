import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, uid, hoyISO } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { aplicarRecurrentes } from '../services/recurrentes.js';

export function formRecurrente(id) {
    const r = id ? buscar('recurrentes', id) : null;
    const { cuentas, deudas } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Agrega una cuenta o una tarjeta primero.', 'error');
    const opt = (v, txt) => `<option value="${v}" ${r?.medio === v ? 'selected' : ''}>${txt}</option>`;
    const medios = cuentas.map(c => opt(`cuenta:${c.id}`, `${esc(c.nombre)} — ${mxn(c.saldo)}`)).join('')
        + deudas.map(d => opt(`tarjeta:${d.id}`, `💳 ${esc(d.nombre)}`)).join('');

    abrirModal(r ? 'Editar pago mensual' : 'Nuevo pago mensual',
        '<p class="modal-note">Se registrará solo cada mes en el día indicado: se resta de la cuenta o se carga a la tarjeta, y aparece en Gastos.</p>' +
        campo('Nombre del pago', 'nombre', `required maxlength="40" value="${esc(r?.nombre || '')}" placeholder="Ej. Internet, renta, Netflix"`) +
        campo('Lugar de pago (referencia)', 'lugar', `maxlength="60" value="${esc(r?.lugar || '')}" placeholder="Ej. Oxxo, banca en línea, portal de la empresa"`) +
        campo('Monto mensual (MXN)', 'monto', attrMoneda(r ? r.monto : '', 'min="0.01" required')) +
        campo('Día del mes en que se cobra', 'dia', `type="number" min="1" max="31" step="1" required value="${r?.dia || ''}"`) +
        selectHTML('Se cobra de', 'medio', medios),
        fd => {
            const nombre = fd.get('nombre').trim();
            const monto = num(fd.get('monto'));
            const dia = parseInt(fd.get('dia'), 10);
            if (!nombre || !monto || monto <= 0 || !(dia >= 1 && dia <= 31)) return toastError('Completa nombre, monto y un día entre 1 y 31.');
            const datos = { nombre, lugar: fd.get('lugar').trim(), monto, dia, medio: fd.get('medio') };
            if (r) Object.assign(r, datos); else store.data.recurrentes.push({ id: uid(), ...datos, desde: hoyISO(), ultimoMes: '' });
            aplicarRecurrentes(); // por si el día de cobro es hoy
            persistir();
            toast(r ? 'Pago mensual actualizado.' : 'Pago mensual programado.');
        },
        {
            onDelete: r ? () => {
                if (!confirm(`¿Eliminar el pago «${r.nombre}»? Los cobros ya registrados se conservan.`)) return;
                store.data.recurrentes = store.data.recurrentes.filter(x => x.id !== r.id);
                cerrarModal(); persistir(); toast('Pago mensual eliminado.');
            } : null
        }
    );
}
