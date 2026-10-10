import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid, hoyISO, disponible } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { aplicarMSI } from '../services/msi.js';

export const CATEGORIAS = ['Comida', 'Café y snacks', 'Transporte', 'Suscripciones', 'Entretenimiento', 'Servicios', 'Salud', 'Compras', 'Otro'];

// Deshace el efecto de un gasto en su cuenta o tarjeta
function revertir(g) {
    if (g.medio === 'cuenta') { const c = buscar('cuentas', g.origen); if (c) c.saldo = r2(c.saldo + g.monto); }
    else { const d = buscar('deudas', g.origen); if (d) d.pendiente = Math.max(0, r2(d.pendiente - g.monto)); }
}
// Aplica un gasto de un solo cargo; devuelve un mensaje de error o null
function aplicar(medio, id, monto) {
    if (medio === 'cuenta') {
        const c = buscar('cuentas', id);
        if (!c) return 'La cuenta ya no existe.';
        if (monto > disponible(c)) return 'La cuenta no tiene disponible suficiente (revisa si tiene dinero apartado).';
        c.saldo = r2(c.saldo - monto);
    } else {
        const d = buscar('deudas', id);
        if (!d) return 'La tarjeta ya no existe.';
        if (d.limite > 0 && monto > d.limite - d.pendiente) return `Excede tu crédito disponible (${mxn(Math.max(0, d.limite - d.pendiente))}).`;
        d.pendiente = r2(d.pendiente + monto); // se carga a la tarjeta: se paga al final del mes
    }
    return null;
}

export function formGasto(id) {
    const g = id ? buscar('gastos', id) : null;
    const { cuentas, deudas } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Agrega una cuenta o una tarjeta primero.', 'error');
    const actual = g ? `${g.medio}:${g.origen}` : '';
    const opt = (v, txt) => `<option value="${v}" ${actual === v ? 'selected' : ''}>${txt}</option>`;
    const medios = cuentas.map(c => opt(`cuenta:${c.id}`, `${esc(c.nombre)} — ${mxn(c.saldo)}`)).join('')
        + deudas.map(d => opt(`tarjeta:${d.id}`, `💳 ${esc(d.nombre)} (debes ${mxn(d.pendiente)})`)).join('');
    const cats = g && !CATEGORIAS.includes(g.categoria) ? [...CATEGORIAS, g.categoria] : CATEGORIAS;

    abrirModal(g ? 'Editar gasto' : 'Agregar gasto',
        '<p class="modal-note">Un <strong>gasto hormiga</strong> es pequeño y frecuente (café, snacks, propinas…). Márcalo para ver cuánto suman al mes.</p>' +
        campo('Monto (MXN)', 'monto', attrMoneda(g ? g.monto : '', 'min="0.01" required')) +
        campo('¿En qué gastaste?', 'detalle', `maxlength="60" value="${esc(g?.detalle || '')}" placeholder="Ej. Café con el equipo"`) +
        selectHTML('Categoría', 'categoria', cats.map(c => `<option ${g?.categoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')) +
        selectHTML('Tipo de gasto', 'tipo', `<option value="normal">Normal</option><option value="hormiga" ${g?.hormiga ? 'selected' : ''}>Hormiga</option>`) +
        campo('Fecha', 'fecha', `type="date" required value="${g ? g.fecha : hoyISO()}"`) +
        selectHTML('Pagar con', 'medio', medios) +
        (g ? '' : `<div data-tarjeta class="hidden">
            ${selectHTML('¿Es a meses sin intereses?', 'esMsi', '<option value="no">No, un solo cargo</option><option value="si">Sí, meses sin intereses</option>')}
            <div data-msi class="hidden">${campo('Número de meses', 'mesesMsi', 'type="number" min="2" max="60" step="1" value="12"')}</div>
        </div>`),
        fd => {
            const monto = num(fd.get('monto'));
            const fecha = fd.get('fecha');
            if (!monto || monto <= 0 || !fecha) return toastError('Escribe un monto y una fecha válidos.');
            const [medio, origen] = fd.get('medio').split(':');
            const detalle = fd.get('detalle').trim();
            const categoria = fd.get('categoria');

            // Compra nueva a meses sin intereses: no se carga de golpe, se reparte en cuotas mensuales
            if (!g && medio === 'tarjeta' && fd.get('esMsi') === 'si') {
                const d = buscar('deudas', origen);
                if (!d) return toastError('La tarjeta ya no existe.');
                const meses = parseInt(fd.get('mesesMsi'), 10);
                if (!(meses >= 2 && meses <= 60)) return toastError('El plazo debe ser de 2 a 60 meses.');
                if (d.limite > 0 && monto > d.limite - d.pendiente) return toastError(`Excede tu crédito disponible (${mxn(Math.max(0, d.limite - d.pendiente))}).`);
                const cuota = r2(monto / meses);
                store.data.msi.push({ id: uid(), deuda: d.id, nombre: detalle || categoria, montoTotal: monto, meses, cuota, inicio: fecha, cobrados: [] });
                aplicarMSI(); // por si la primera cuota ya es hoy
                persistir();
                return toast(`Compra a ${meses} meses sin intereses registrada (cuota ${mxn(cuota)}/mes).`);
            }

            if (g) revertir(g);
            const error = aplicar(medio, origen, monto);
            if (error) { if (g) aplicar(g.medio, g.origen, g.monto); return toastError(error); } // deja todo como estaba
            const datos = { fecha, monto, categoria, detalle, hormiga: fd.get('tipo') === 'hormiga', medio, origen };
            if (g) Object.assign(g, datos); else store.data.gastos.push({ id: uid(), ...datos });
            persistir();
            toast(g ? 'Gasto actualizado.' : medio === 'tarjeta' ? 'Gasto cargado a la tarjeta.' : 'Gasto descontado de la cuenta.');
        },
        {
            submitText: g ? 'Guardar cambios' : 'Agregar gasto',
            onOpen: f => {
                if (g || !f.querySelector('[data-tarjeta]')) return; // el bloque MSI solo existe al crear
                const medio = f.elements.medio, esMsi = f.elements.esMsi;
                const sync = () => {
                    const esTarjeta = medio.value.startsWith('tarjeta');
                    f.querySelector('[data-tarjeta]').classList.toggle('hidden', !esTarjeta);
                    f.querySelector('[data-msi]').classList.toggle('hidden', !(esTarjeta && esMsi.value === 'si'));
                };
                medio.addEventListener('change', sync);
                esMsi.addEventListener('change', sync);
                sync();
            }
        }
    );
}

export function eliminarGasto(id) {
    const g = buscar('gastos', id);
    if (!g || !confirm('¿Eliminar este gasto? Se devolverá el monto a la cuenta o tarjeta.')) return;
    revertir(g);
    store.data.gastos = store.data.gastos.filter(x => x.id !== id);
    persistir();
    toast('Gasto eliminado.');
}
