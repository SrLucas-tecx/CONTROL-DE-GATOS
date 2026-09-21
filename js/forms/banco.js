import { store, buscar, persistir } from '../store.js';
import { esc, uid } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export function formBanco(id) {
    const b = id ? buscar('bancos', id) : null;
    abrirModal(
        b ? 'Editar banco' : 'Agregar banco',
        campo('Nombre del banco o app', 'nombre', `required maxlength="40" value="${esc(b?.nombre || '')}" placeholder="Ej. Nu, Mercado Pago, BBVA"`),
        fd => {
            const nombre = fd.get('nombre').trim();
            if (!nombre) return toastError('Escribe el nombre del banco.');
            if (store.data.bancos.some(x => x.id !== b?.id && x.nombre.toLowerCase() === nombre.toLowerCase())) return toastError('Ese banco ya existe.');
            if (b) b.nombre = nombre; else store.data.bancos.push({ id: uid(), nombre });
            persistir();
            toast(b ? 'Banco actualizado.' : 'Banco agregado.');
        },
        {
            onDelete: b ? () => {
                if (!confirm(`¿Eliminar «${b.nombre}»? Sus cuentas se conservarán como «Sin banco».`)) return;
                store.data.cuentas.forEach(c => { if (c.banco === b.id) c.banco = ''; });
                store.data.bancos = store.data.bancos.filter(x => x.id !== b.id);
                cerrarModal(); persistir(); toast('Banco eliminado.');
            } : null
        }
    );
}
