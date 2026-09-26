import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { aplicarMSI, fechaCuota } from '../services/msi.js';

export function formMSI() {
    const { deudas } = store.data;
    if (!deudas.length) return toast('Primero registra una tarjeta en Deudas.', 'error');

    abrirModal('Nueva compra a meses sin intereses',
        '<p class="modal-note">Cada mes se carga una sola cuota a la tarjeta (no el total de la compra), así refleja lo que en realidad pagas para no generar intereses.</p>' +
        campo('¿Qué compraste?', 'nombre', 'required maxlength="40" placeholder="Ej. Refrigerador, laptop"') +
        selectHTML('Tarjeta', 'deuda', deudas.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('')) +
        campo('Monto total de la compra (MXN)', 'montoTotal', attrMoneda('', 'min="0.01" required')) +
        campo('Número de meses', 'meses', 'type="number" min="2" max="60" step="1" value="12" required') +
        campo('Fecha de la primera cuota', 'inicio', `type="date" required value="${hoyISO()}"`) +
        '<p class="hint" id="msi-prev" style="margin:0 0 12px"></p>',
        fd => {
            const nombre = fd.get('nombre').trim();
            const montoTotal = num(fd.get('montoTotal'));
            const meses = parseInt(fd.get('meses'), 10);
            const inicio = fd.get('inicio');
            const deuda = buscar('deudas', fd.get('deuda'));
            if (!nombre || !montoTotal || montoTotal <= 0 || !deuda || !inicio) return toastError('Completa todos los campos con valores válidos.');
            if (!(meses >= 2 && meses <= 60)) return toastError('El plazo debe ser de 2 a 60 meses.');
            const cuota = r2(montoTotal / meses);
            store.data.msi.push({ id: uid(), deuda: deuda.id, nombre, montoTotal, meses, cuota, inicio, cobrados: [] });
            aplicarMSI(); // por si la primera cuota es hoy
            persistir();
            toast('Compra a MSI registrada.');
        },
        {
            submitText: 'Registrar compra',
            onOpen: f => {
                const actualizar = () => {
                    const montoTotal = parseFloat(f.elements.montoTotal.value) || 0;
                    const meses = parseInt(f.elements.meses.value, 10) || 0;
                    const inicio = f.elements.inicio.value;
                    if (montoTotal > 0 && meses >= 2 && inicio) {
                        const cuota = r2(montoTotal / meses);
                        f.querySelector('#msi-prev').textContent = `Cuota mensual: ${mxn(cuota)} · Primera cuota: ${fechaCuota(inicio, 0)} · Última: ${fechaCuota(inicio, meses - 1)}`;
                    } else f.querySelector('#msi-prev').textContent = '';
                };
                ['montoTotal', 'meses', 'inicio'].forEach(n => f.elements[n].addEventListener('input', actualizar));
                actualizar();
            }
        }
    );
}
