import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, uid, hoyISO } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { aplicarRecurrentes, proximas, fechaConDia, aISO, FRECUENCIAS } from '../services/recurrentes.js';

const fmt = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
const sugerido = d => d === 15 ? 31 : d < 15 ? d + 15 : d - 15; // 15 → fin de mes; 1 → 16…

export function formRecurrente(id) {
    const r = id ? buscar('recurrentes', id) : null;
    const { cuentas, deudas } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Agrega una cuenta o una tarjeta primero.', 'error');
    const opt = (v, txt) => `<option value="${v}" ${r?.medio === v ? 'selected' : ''}>${txt}</option>`;
    const medios = cuentas.map(c => opt(`cuenta:${c.id}`, `${esc(c.nombre)} — ${mxn(c.saldo)}`)).join('')
        + deudas.map(d => opt(`tarjeta:${d.id}`, `💳 ${esc(d.nombre)}`)).join('');
    const inicioPrev = r ? (r.inicio || fechaConDia(r.desde, r.dia)) : hoyISO();
    const frec = r?.frecuencia || 'mensual';

    abrirModal(r ? 'Editar pago o ingreso' : 'Nuevo pago o ingreso',
        '<p class="modal-note">Se registra solo en cada fecha del calendario: se resta de la cuenta (o se carga a la tarjeta), o se deposita si es un ingreso.</p>' +
        selectHTML('Tipo', 'tipo', `<option value="gasto" ${r?.tipo === 'ingreso' ? '' : 'selected'}>Pago (sale dinero)</option><option value="ingreso" ${r?.tipo === 'ingreso' ? 'selected' : ''}>Ingreso (entra dinero, ej. sueldo)</option>`) +
        campo('Nombre', 'nombre', `required maxlength="40" value="${esc(r?.nombre || '')}" placeholder="Ej. Internet, renta, sueldo"`) +
        campo('Lugar de pago (referencia)', 'lugar', `maxlength="60" value="${esc(r?.lugar || '')}" placeholder="Ej. Oxxo, banca en línea, portal de la empresa"`) +
        campo('Monto por cobro (MXN)', 'monto', attrMoneda(r ? r.monto : '', 'min="0.01" required')) +
        selectHTML('¿Cuántas veces se cobra?', 'frecuencia', Object.entries(FRECUENCIAS).map(([k, l]) => `<option value="${k}" ${k === frec ? 'selected' : ''}>${l}</option>`).join('')) +
        campo('Fecha del primer cobro', 'inicio', `type="date" required value="${inicioPrev}"`, 'Elígela en el calendario: de ahí salen el día del mes o los días de la semana.') +
        `<div data-solo>${campo('Segundo día del mes', 'dia2', `type="number" min="1" max="31" step="1" value="${r?.dia2 || ''}"`, 'Usa 31 para «último día del mes».')}</div>` +
        selectHTML('Se cobra de / se deposita en', 'medio', medios) +
        '<p class="hint" id="prox" style="margin:0 0 12px"></p>',
        fd => {
            const nombre = fd.get('nombre').trim();
            const monto = num(fd.get('monto'));
            const inicio = fd.get('inicio');
            const frecuencia = fd.get('frecuencia');
            const dia2 = parseInt(fd.get('dia2'), 10) || 0;
            if (!nombre || !monto || monto <= 0 || !inicio) return toastError('Completa nombre, monto y la fecha del primer cobro.');
            if (frecuencia === 'quincenal' && !(dia2 >= 1 && dia2 <= 31)) return toastError('Indica el segundo día del mes (1 a 31).');
            const tipo = fd.get('tipo');
            if (tipo === 'ingreso' && fd.get('medio').startsWith('tarjeta')) return toastError('Un ingreso debe depositarse en una cuenta, no en una tarjeta.');
            const datos = { nombre, tipo, lugar: fd.get('lugar').trim(), monto, frecuencia, inicio, dia: Number(inicio.split('-')[2]), dia2: frecuencia === 'quincenal' ? dia2 : 0, medio: fd.get('medio') };
            if (r) Object.assign(r, datos);
            else {
                const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
                store.data.recurrentes.push({ id: uid(), ...datos, desde: hoyISO(), ultimoMes: '', ultimaFecha: aISO(ayer) }); // no cobra fechas pasadas
            }
            aplicarRecurrentes(); // por si la fecha es hoy
            persistir();
            toast(r ? 'Actualizado.' : 'Programado.');
        },
        {
            onDelete: r ? () => {
                if (!confirm(`¿Eliminar «${r.nombre}»? Los cobros ya registrados se conservan.`)) return;
                store.data.recurrentes = store.data.recurrentes.filter(x => x.id !== r.id);
                cerrarModal(); persistir(); toast('Eliminado.');
            } : null,
            onOpen: f => {
                const el = f.elements;
                let tocado = !!r?.dia2; // si el usuario ya eligió el segundo día, no se sobrescribe
                const sync = () => {
                    const quincenal = el.frecuencia.value === 'quincenal';
                    f.querySelector('[data-solo]').classList.toggle('hidden', !quincenal);
                    el.dia2.required = quincenal;
                    const dia = Number((el.inicio.value || '').split('-')[2]) || 0;
                    if (quincenal && !tocado && dia) el.dia2.value = sugerido(dia);
                    const prox = el.inicio.value ? proximas({ frecuencia: el.frecuencia.value, inicio: el.inicio.value, dia, dia2: parseInt(el.dia2.value, 10) || dia }, 4) : [];
                    f.querySelector('#prox').textContent = prox.length ? `Próximos cobros: ${prox.map(fmt).join(' · ')}` : 'Elige una fecha para ver los próximos cobros.';
                };
                el.dia2.addEventListener('input', () => { tocado = true; });
                ['frecuencia', 'inicio', 'dia2'].forEach(n => el[n].addEventListener('input', sync));
                sync();
            }
        }
    );
}
