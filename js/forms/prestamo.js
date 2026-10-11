// Formularios de préstamos: registrar / editar, y abonar o registrar un cobro.
import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid, hoyISO, disponible } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda, opcionesCuentas } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { ETIQ_DIRECCION, ETIQ_CONTRAPARTE, FREC_PRESTAMO, calendario } from '../services/prestamos.js';

const opciones = (obj, sel) => Object.entries(obj).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${l}</option>`).join('');

export function formPrestamo(id, direccionInicial = 'recibido') {
    const p = id ? buscar('prestamos', id) : null;
    const g = p?.programa;
    abrirModal(p ? 'Editar préstamo' : 'Registrar préstamo',
        (p ? `<p class="modal-note">Tipo: <strong>${ETIQ_DIRECCION[p.direccion]}</strong></p>`
           : selectHTML('Tipo de préstamo', 'direccion',
               `<option value="recibido" ${direccionInicial === 'recibido' ? 'selected' : ''}>Me prestaron dinero (yo debo)</option>
                <option value="otorgado" ${direccionInicial === 'otorgado' ? 'selected' : ''}>Yo presté dinero (me deben)</option>`)) +
        selectHTML('¿Con quién?', 'contraparteTipo', opciones(ETIQ_CONTRAPARTE, p?.contraparteTipo || 'persona')) +
        campo('Nombre del banco o persona', 'contraparte', `required maxlength="40" value="${esc(p?.contraparte || '')}" placeholder="Ej. BBVA, Mamá, Juan"`) +
        campo('Monto del préstamo (MXN)', 'monto', attrMoneda(p ? p.monto : '', 'min="0.01" required')) +
        (p ? campo('Saldo pendiente (MXN)', 'pendiente', attrMoneda(p.pendiente, 'required')) : '') +
        campo('Tasa de interés anual (%) — opcional', 'tasa', attrMoneda(p?.tasa || '0', 'max="1000"'), 'Solo informativa: no cambia el saldo por sí sola.') +
        campo('Fecha del préstamo', 'fecha', `type="date" required value="${p?.fecha || hoyISO()}"`) +
        (p ? '' : selectHTML('<span id="lbl-cuenta-p">Cuenta</span>', 'cuenta', `<option value="">No mover dinero de ninguna cuenta</option>${opcionesCuentas()}`)) +
        '<p class="field-group-title">Fechas (opcionales)</p>' +
        selectHTML('¿Tiene pagos programados?', 'programado', `<option value="no">No</option><option value="si" ${g ? 'selected' : ''}>Sí, con calendario</option>`) +
        `<div data-prog class="hidden">` +
            campo('Fecha del primer pago', 'pInicio', `type="date" value="${g?.inicio || ''}"`) +
            selectHTML('Frecuencia', 'pFrec', opciones(FREC_PRESTAMO, g?.frecuencia || 'mensual')) +
            campo('Número de pagos', 'pN', `type="number" min="1" max="360" step="1" value="${g?.n || 12}"`) +
            campo('Monto por pago (MXN) — opcional', 'pCuota', attrMoneda(g?.cuota || ''), 'Si lo dejas vacío, se divide el monto entre los pagos.') +
            '<p class="hint" id="p-prev" style="margin:0 0 12px"></p>' +
        `</div>` +
        campo('Fecha de liquidación', 'fechaLiq', `type="date" value="${p?.fechaLiquidacion || ''}"`, 'Día en que el préstamo debe quedar saldado. Puedes dejarla vacía.') +
        `<label class="check"><input type="checkbox" name="obligatoria" ${p?.obligatoria ? 'checked' : ''}> <span>Fecha de liquidación obligatoria <small>— hay que capturarla y se avisa al acercarse o vencer</small></span></label>` +
        campo('Nota — opcional', 'nota', `maxlength="80" value="${esc(p?.nota || '')}"`),
        fd => {
            const direccion = p ? p.direccion : fd.get('direccion');
            const contraparte = fd.get('contraparte').trim();
            const monto = num(fd.get('monto'));
            const pendiente = p ? num(fd.get('pendiente')) : monto;
            const tasa = num(fd.get('tasa')) ?? 0;
            const fecha = fd.get('fecha');
            const obligatoria = !!fd.get('obligatoria');
            const fechaLiquidacion = fd.get('fechaLiq') || '';
            if (!contraparte || !monto || monto <= 0 || pendiente === null || pendiente < 0 || !fecha) return toastError('Escribe con quién es, un monto y la fecha del préstamo.');
            if (tasa < 0) return toastError('La tasa no puede ser negativa.');
            if (obligatoria && !fechaLiquidacion) return toastError('Indica la fecha de liquidación obligatoria.');
            if (fechaLiquidacion && fechaLiquidacion < fecha) return toastError('La liquidación no puede ser antes de la fecha del préstamo.');

            let programa = null;
            if (fd.get('programado') === 'si') {
                const inicio = fd.get('pInicio'), n = parseInt(fd.get('pN'), 10);
                if (!inicio || !(n >= 1 && n <= 360)) return toastError('Indica la fecha del primer pago y el número de pagos (1 a 360).');
                const cuota = num(fd.get('pCuota')) || r2(monto / n);
                programa = { inicio, frecuencia: fd.get('pFrec'), n, cuota };
            }

            // Mover dinero solo al crear, y solo si elegiste una cuenta (se valida antes de tocar nada)
            const cuenta = !p && fd.get('cuenta') ? buscar('cuentas', fd.get('cuenta')) : null;
            if (!p && fd.get('cuenta') && !cuenta) return toastError('La cuenta seleccionada ya no existe.');
            if (cuenta && direccion === 'otorgado' && monto > disponible(cuenta)) return toastError('La cuenta no tiene disponible suficiente (revisa si tiene dinero apartado).');
            if (cuenta) {
                const recibido = direccion === 'recibido';
                cuenta.saldo = r2(cuenta.saldo + (recibido ? monto : -monto));
                store.data.movimientos.push({ id: uid(), tipo: recibido ? 'INCOME' : 'EXPENSE', monto, cuenta: cuenta.id, destino: null,
                    detalle: recibido ? `Préstamo de ${contraparte}` : `Préstamo a ${contraparte}`, fecha, externo: true, contraparte, informativo: true });
            }

            const datos = { direccion, contraparteTipo: fd.get('contraparteTipo'), contraparte, monto, pendiente, tasa, fecha, programa, fechaLiquidacion, obligatoria, nota: fd.get('nota').trim() };
            if (p) Object.assign(p, datos); else store.data.prestamos.push({ id: uid(), ...datos, abonos: [] });
            persistir();
            toast(p ? 'Préstamo actualizado.' : 'Préstamo registrado.');
        },
        {
            submitText: p ? 'Guardar cambios' : 'Registrar',
            onDelete: p ? () => {
                if (!confirm(`¿Eliminar el préstamo con «${p.contraparte}»? Los movimientos ya registrados se conservan.`)) return;
                store.data.prestamos = store.data.prestamos.filter(x => x.id !== p.id);
                cerrarModal(); persistir(); toast('Préstamo eliminado.');
            } : null,
            onOpen: f => {
                const el = f.elements;
                const sync = () => {
                    const prog = el.programado.value === 'si';
                    f.querySelector('[data-prog]').classList.toggle('hidden', !prog);
                    el.pInicio.required = prog; el.pN.required = prog;
                    el.fechaLiq.required = el.obligatoria.checked;
                    const dir = el.direccion ? el.direccion.value : p.direccion;
                    const lbl = f.querySelector('#lbl-cuenta-p');
                    if (lbl) lbl.textContent = dir === 'recibido' ? 'El dinero se depositó en' : 'El dinero salió de';
                    const inicio = el.pInicio.value, n = parseInt(el.pN.value, 10) || 0, monto = parseFloat(el.monto.value) || 0;
                    const prev = f.querySelector('#p-prev');
                    if (prog && inicio && n >= 1 && n <= 360) {
                        const cal = calendario({ programa: { inicio, frecuencia: el.pFrec.value, n } });
                        const cuota = parseFloat(el.pCuota.value) || (monto > 0 ? r2(monto / n) : 0);
                        prev.textContent = `${n} pago${n === 1 ? '' : 's'}${cuota ? ` de ${mxn(cuota)}` : ''} · del ${cal[0]} al ${cal.at(-1)}`;
                    } else prev.textContent = '';
                };
                ['direccion', 'programado', 'pInicio', 'pFrec', 'pN', 'pCuota', 'monto', 'obligatoria'].forEach(n => {
                    if (el[n]) { el[n].addEventListener('input', sync); el[n].addEventListener('change', sync); }
                });
                sync();
            }
        }
    );
}

export function formAbonoPrestamo(id) {
    const p = buscar('prestamos', id);
    if (!p) return;
    const debo = p.direccion === 'recibido';
    abrirModal(debo ? `Abonar a ${p.contraparte}` : `Registrar cobro de ${p.contraparte}`,
        `<p class="modal-note">Saldo pendiente: <strong>${mxn(p.pendiente)}</strong></p>` +
        selectHTML(debo ? 'Pagar desde' : 'Depositar en', 'cuenta',
            `<option value="">${debo ? 'No descontar de ninguna cuenta' : 'No ingresar a ninguna cuenta'}</option>${opcionesCuentas()}`) +
        campo('Monto (MXN)', 'monto', attrMoneda('', `min="0.01" max="${p.pendiente}" required`)) +
        campo('Fecha', 'fecha', `type="date" required value="${hoyISO()}"`),
        fd => {
            const monto = num(fd.get('monto')), fecha = fd.get('fecha');
            if (monto === null || monto <= 0 || !fecha) return toastError('Escribe un monto y una fecha válidos.');
            if (monto > p.pendiente) return toastError('El monto supera el saldo pendiente.');
            const cuenta = fd.get('cuenta') ? buscar('cuentas', fd.get('cuenta')) : null;
            if (fd.get('cuenta') && !cuenta) return toastError('La cuenta seleccionada ya no existe.');
            if (cuenta && debo && monto > disponible(cuenta)) return toastError('La cuenta no tiene disponible suficiente (revisa si tiene dinero apartado).');
            if (cuenta) {
                cuenta.saldo = r2(cuenta.saldo + (debo ? -monto : monto));
                store.data.movimientos.push({ id: uid(), tipo: debo ? 'EXPENSE' : 'INCOME', monto, cuenta: cuenta.id, destino: null,
                    detalle: debo ? `Abono a préstamo de ${p.contraparte}` : `Cobro de préstamo a ${p.contraparte}`, fecha, externo: true, contraparte: p.contraparte, informativo: true });
            }
            p.pendiente = r2(p.pendiente - monto);
            (p.abonos ||= []).push({ id: uid(), fecha, monto, cuenta: cuenta?.id || '' });
            persistir();
            toast(p.pendiente === 0 ? '¡Préstamo liquidado!' : `${debo ? 'Abono' : 'Cobro'} de ${mxn(monto)} registrado.`);
        },
        { submitText: debo ? 'Abonar' : 'Registrar cobro' }
    );
}
