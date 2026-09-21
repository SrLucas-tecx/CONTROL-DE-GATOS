import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export const CATEGORIAS = ['Comida', 'Café y snacks', 'Transporte', 'Suscripciones', 'Entretenimiento', 'Servicios', 'Salud', 'Compras', 'Otro'];

export function formGasto() {
    const { cuentas, deudas } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Agrega una cuenta o una tarjeta primero.', 'error');
    const medios = cuentas.map(c => `<option value="cuenta:${c.id}">${esc(c.nombre)} — ${mxn(c.saldo)}</option>`).join('')
        + deudas.map(d => `<option value="tarjeta:${d.id}">💳 ${esc(d.nombre)} (debes ${mxn(d.pendiente)})</option>`).join('');

    abrirModal('Agregar gasto',
        '<p class="modal-note">Un <strong>gasto hormiga</strong> es pequeño y frecuente (café, snacks, propinas…). Márcalo para ver cuánto suman al mes.</p>' +
        campo('Monto (MXN)', 'monto', attrMoneda('', 'min="0.01" required')) +
        campo('¿En qué gastaste?', 'detalle', 'maxlength="60" placeholder="Ej. Café con el equipo"') +
        selectHTML('Categoría', 'categoria', CATEGORIAS.map(c => `<option>${c}</option>`).join('')) +
        selectHTML('Tipo de gasto', 'tipo', '<option value="normal">Normal</option><option value="hormiga">Hormiga</option>') +
        campo('Fecha', 'fecha', `type="date" required value="${hoyISO()}"`) +
        selectHTML('Pagar con', 'medio', medios),
        fd => {
            const monto = num(fd.get('monto'));
            const fecha = fd.get('fecha');
            if (!monto || monto <= 0 || !fecha) return toastError('Escribe un monto y una fecha válidos.');
            const [medio, id] = fd.get('medio').split(':');
            if (medio === 'cuenta') {
                const c = buscar('cuentas', id);
                if (!c) return toastError('La cuenta ya no existe.');
                if (monto > c.saldo) return toastError('La cuenta no tiene saldo suficiente.');
                c.saldo = r2(c.saldo - monto);
            } else {
                const d = buscar('deudas', id);
                if (!d) return toastError('La tarjeta ya no existe.');
                d.pendiente = r2(d.pendiente + monto); // se carga a la tarjeta: se paga al final del mes
            }
            store.data.gastos.push({ id: uid(), fecha, monto, categoria: fd.get('categoria'), detalle: fd.get('detalle').trim(), hormiga: fd.get('tipo') === 'hormiga', medio, origen: id });
            persistir();
            toast(medio === 'tarjeta' ? 'Gasto cargado a la tarjeta.' : 'Gasto descontado de la cuenta.');
        },
        { submitText: 'Agregar gasto' }
    );
}

export function eliminarGasto(id) {
    const g = buscar('gastos', id);
    if (!g || !confirm('¿Eliminar este gasto? Se devolverá el monto a la cuenta o tarjeta.')) return;
    if (g.medio === 'cuenta') { const c = buscar('cuentas', g.origen); if (c) c.saldo = r2(c.saldo + g.monto); }
    else { const d = buscar('deudas', g.origen); if (d) d.pendiente = Math.max(0, r2(d.pendiente - g.monto)); }
    store.data.gastos = store.data.gastos.filter(x => x.id !== id);
    persistir();
    toast('Gasto eliminado.');
}
