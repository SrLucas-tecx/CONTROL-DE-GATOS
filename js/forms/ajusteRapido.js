import { store, buscar, persistir } from '../store.js';
import { esc, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

export function formAjusteRapido() {
    const { cuentas, deudas } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Aún no hay cuentas ni deudas que ajustar.', 'error');

    const bloqueCuentas = cuentas.length
        ? `<p class="field-group-title">Cuentas</p>` +
          cuentas.map(c => campo(esc(c.nombre), `c:${c.id}`, attrMoneda(c.saldo, 'required'))).join('')
        : '';
    const bloqueDeudas = deudas.length
        ? `<p class="field-group-title">Deudas (saldo pendiente)</p>` +
          deudas.map(d => campo(esc(d.nombre), `d:${d.id}`, attrMoneda(d.pendiente, 'required'))).join('')
        : '';

    abrirModal('Conciliar saldos', '<p class="modal-note">Escribe el saldo real que ves en tu banco o estado de cuenta. La diferencia queda registrada como «Ajuste» en Movimientos.</p>' + bloqueCuentas + bloqueDeudas, fd => {
        const cambios = [];
        for (const [clave, valor] of fd.entries()) {
            const n = num(valor);
            if (n === null || n < 0) return toastError('Revisa los montos: deben ser números válidos.');
            cambios.push({ tipo: clave[0], id: clave.slice(2), n });
        }
        cambios.forEach(({ tipo, id, n }) => {
            if (tipo === 'c') {
                const c = buscar('cuentas', id);
                if (!c) return;
                const dif = r2(n - c.saldo);
                if (dif) store.data.movimientos.push({ id: uid(), tipo: 'AJUSTE', monto: dif, cuenta: c.id, destino: null, detalle: 'Ajuste de conciliación', fecha: hoyISO() });
                c.saldo = n;
            } else { const d = buscar('deudas', id); if (d) d.pendiente = n; }
        });
        persistir();
        toast('Saldos conciliados.');
    });
}
