import { store, buscar, persistir } from '../store.js';
import { num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda, opcionesCuentas } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

const TIPOS_MOV = [
    ['EXPENSE', 'Gasto'],
    ['INCOME', 'Ingreso'],
    ['INCOME_EXT', 'Ingreso externo (de otra persona o cuenta)'],
    ['TRANSFER', 'Transferencia entre mis cuentas'],
    ['EXPENSE_EXT', 'Transferencia externa / pago a otra cuenta']
];
const ETIQ_CUENTA = { EXPENSE: 'Cuenta de la que sale', INCOME: 'Cuenta que recibe', INCOME_EXT: 'Cuenta que recibe', TRANSFER: 'Cuenta de origen', EXPENSE_EXT: 'Cuenta de la que sale' };

export function formMovimiento() {
    if (!store.data.cuentas.length) return toast('Primero agrega una cuenta.', 'error');

    abrirModal('Nuevo movimiento',
        selectHTML('Tipo', 'tipo', TIPOS_MOV.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')) +
        selectHTML('<span id="lbl-cuenta">Cuenta</span>', 'cuenta', opcionesCuentas()) +
        `<div data-solo="TRANSFER">${selectHTML('Cuenta destino', 'destino', opcionesCuentas())}</div>` +
        `<div data-solo="INCOME_EXT EXPENSE_EXT">${campo('<span id="lbl-contra"></span>', 'contraparte', 'maxlength="60" placeholder="Ej. Mamá, Juan, CFE, renta"')}</div>` +
        campo('Monto (MXN)', 'monto', attrMoneda('', 'min="0.01" required')) +
        campo('Categoría / detalle', 'detalle', 'required maxlength="60" placeholder="Ej. Supermercado"') +
        campo('Fecha', 'fecha', `type="date" required value="${hoyISO()}"`),
        fd => {
            const sel = fd.get('tipo');
            const ext = sel.endsWith('_EXT');
            const tipo = sel === 'TRANSFER' ? 'TRANSFER' : sel.startsWith('INCOME') ? 'INCOME' : 'EXPENSE';
            const monto = num(fd.get('monto'));
            const origen = buscar('cuentas', fd.get('cuenta'));
            const destino = buscar('cuentas', fd.get('destino'));
            const detalle = fd.get('detalle').trim();
            const fecha = fd.get('fecha');
            const contraparte = ext ? fd.get('contraparte').trim() : '';
            if (!origen || !monto || monto <= 0 || !detalle || !fecha) return toastError('Completa todos los campos con valores válidos.');
            if (ext && !contraparte) return toastError('Indica de quién viene o a quién va.');
            if (tipo !== 'INCOME' && monto > origen.saldo) return toastError('La cuenta no tiene saldo suficiente.');
            if (tipo === 'TRANSFER') {
                if (!destino || destino.id === origen.id) return toastError('Elige una cuenta destino distinta al origen.');
                destino.saldo = r2(destino.saldo + monto);
            }
            origen.saldo = r2(origen.saldo + (tipo === 'INCOME' ? monto : -monto));
            store.data.movimientos.push({
                id: uid(), tipo, monto, cuenta: origen.id, destino: tipo === 'TRANSFER' ? destino.id : null, detalle, fecha,
                ...(ext ? { externo: true, contraparte } : {})
            });
            persistir();
            toast('Movimiento registrado.');
        },
        {
            submitText: 'Registrar',
            onOpen: f => {
                const t = f.elements.tipo;
                const sync = () => {
                    f.querySelectorAll('[data-solo]').forEach(el => el.classList.toggle('hidden', !el.dataset.solo.split(' ').includes(t.value)));
                    f.elements.contraparte.required = t.value.endsWith('_EXT');
                    f.querySelector('#lbl-cuenta').textContent = ETIQ_CUENTA[t.value];
                    f.querySelector('#lbl-contra').textContent = t.value === 'INCOME_EXT' ? '¿De quién o de dónde viene?' : '¿A quién o a dónde va? (pago)';
                };
                t.addEventListener('change', sync);
                sync();
            }
        }
    );
}

export function eliminarMovimiento(id) {
    const m = buscar('movimientos', id);
    if (m?.informativo) { // abonos y aportes: solo se quita el registro, no toca saldos
        if (!confirm('Este registro es informativo: quitarlo no cambia saldos ni deudas. ¿Quitarlo?')) return;
        store.data.movimientos = store.data.movimientos.filter(x => x.id !== id);
        persistir();
        return toast('Registro eliminado.');
    }
    if (!m || !confirm('¿Eliminar este movimiento? Se revertirá su efecto en las cuentas.')) return;
    const origen = buscar('cuentas', m.cuenta);
    const destino = m.destino && buscar('cuentas', m.destino);
    if (origen) origen.saldo = r2(origen.saldo + (m.tipo === 'INCOME' || m.tipo === 'AJUSTE' ? -m.monto : m.monto));
    if (destino) destino.saldo = r2(destino.saldo - m.monto);
    store.data.movimientos = store.data.movimientos.filter(x => x.id !== id);
    persistir();
    toast('Movimiento eliminado.');
}
