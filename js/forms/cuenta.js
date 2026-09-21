import { TIPOS } from '../config.js';
import { store, buscar, persistir } from '../store.js';
import { esc, mxn, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

const BILLETES = [1000, 500, 200, 100, 50, 20];
const MONEDAS = [20, 10, 5, 2, 1, 0.5];
const totalDesglose = d => Object.entries(d || {}).reduce((a, [k, q]) => a + parseFloat(k.slice(2)) * q, 0);

// Bloque para contar billetes y monedas (solo cuentas de efectivo)
function conteoHTML(c) {
    // Solo se precarga el conteo si todavía coincide con el saldo actual
    const vigente = !!(c?.desglose && Math.abs(totalDesglose(c.desglose) - c.saldo) < 0.005);
    const fila = (p, v) => `<label class="den"><span>${p === 'b' ? 'Billete' : 'Moneda'} $${v}</span>
        <input class="input" type="number" min="0" step="1" inputmode="numeric" name="${p}_${v}" value="${vigente ? c.desglose[`${p}_${v}`] || '' : ''}"></label>`;
    return `<div id="efectivo-box">
        ${selectHTML('¿Cómo capturas el efectivo?', 'conteo', `<option value="manual">Escribir el monto directamente</option><option value="contar" ${vigente ? 'selected' : ''}>Contar billetes y monedas</option>`)}
        <div id="conteo-grid" class="hidden">
            <p class="field-group-title">Billetes (cuántos tienes de cada uno)</p><div class="den-grid">${BILLETES.map(v => fila('b', v)).join('')}</div>
            <p class="field-group-title">Monedas</p><div class="den-grid">${MONEDAS.map(v => fila('m', v)).join('')}</div>
            <div class="stat big"><span>Total contado</span><strong id="conteo-total">$0.00</strong></div>
        </div></div>`;
}

export function formCuenta(id, bancoInicial = '') {
    const c = id ? buscar('cuentas', id) : null;
    const tipos = Object.entries(TIPOS)
        .map(([k, t]) => `<option value="${k}" ${c?.tipo === k ? 'selected' : ''}>${t.label}</option>`).join('');

    abrirModal(
        c ? 'Editar cuenta' : 'Agregar cuenta',
        campo('Nombre', 'nombre', `required maxlength="40" value="${esc(c?.nombre || '')}" placeholder="Ej. Cuenta nómina"`) +
        selectHTML('Tipo de cuenta', 'tipo', tipos) +
        conteoHTML(c) +
        campo('Saldo actual (MXN)', 'saldo', attrMoneda(c ? c.saldo : '', 'required')) +
        selectHTML('Banco o institución', 'banco', `<option value="">Sin banco</option>` +
            store.data.bancos.map(b => `<option value="${b.id}" ${(c ? c.banco : bancoInicial) === b.id ? 'selected' : ''}>${esc(b.nombre)}</option>`).join('')) +
        selectHTML('¿Genera rendimiento?', 'rinde',
            `<option value="no" ${c?.tasa > 0 ? '' : 'selected'}>No, solo es saldo</option><option value="si" ${c?.tasa > 0 ? 'selected' : ''}>Sí, genera rendimiento</option>`) +
        campo('Rendimiento anual (%)', 'tasa', attrMoneda(c?.tasa || '', 'max="200"'), 'Se acredita solo cada día que abras la app.'),
        fd => {
            const nombre = fd.get('nombre').trim();
            const tipo = fd.get('tipo');
            let saldo = num(fd.get('saldo'));
            let desglose = null;
            if (tipo === 'efectivo' && fd.get('conteo') === 'contar') {
                desglose = {};
                for (const [k, v] of fd.entries()) { const q = parseInt(v, 10); if (/^[bm]_/.test(k) && q > 0) desglose[k] = q; }
                saldo = r2(totalDesglose(desglose));
            }
            if (!nombre || saldo === null || saldo < 0) return toastError('Escribe un nombre y un saldo válido.');
            const rinde = fd.get('rinde') === 'si';
            const tasa = rinde ? num(fd.get('tasa')) : 0;
            if (rinde && (!tasa || tasa <= 0)) return toastError('Indica el rendimiento anual (%).');
            const ultimoRendimiento = tasa > 0 ? (c?.tasa > 0 && c.ultimoRendimiento ? c.ultimoRendimiento : hoyISO()) : '';
            const datos = { nombre, tipo, saldo, banco: fd.get('banco'), tasa, ultimoRendimiento, desglose };
            if (c) Object.assign(c, datos); else store.data.cuentas.push({ id: uid(), ...datos });
            persistir();
            toast(c ? 'Cuenta actualizada.' : 'Cuenta agregada.');
        },
        {
            onDelete: c ? () => {
                if (!confirm(`¿Eliminar la cuenta «${c.nombre}»?`)) return;
                store.data.cuentas = store.data.cuentas.filter(x => x.id !== c.id);
                cerrarModal(); persistir(); toast('Cuenta eliminada.');
            } : null,
            onOpen: f => {
                const tipo = f.elements.tipo, modo = f.elements.conteo, saldo = f.elements.saldo;
                const dens = [...f.querySelectorAll('.den input')];
                const contando = () => tipo.value === 'efectivo' && modo.value === 'contar';
                const calcular = () => {
                    const t = dens.reduce((a, i) => a + (parseInt(i.value, 10) || 0) * parseFloat(i.name.slice(2)), 0);
                    f.querySelector('#conteo-total').textContent = mxn(t);
                    if (contando()) saldo.value = t.toFixed(2);
                };
                const sync = () => {
                    f.querySelector('#efectivo-box').classList.toggle('hidden', tipo.value !== 'efectivo');
                    f.querySelector('#conteo-grid').classList.toggle('hidden', !contando());
                    saldo.readOnly = contando();
                    calcular();
                };
                tipo.addEventListener('change', sync);
                modo.addEventListener('change', sync);
                dens.forEach(i => i.addEventListener('input', calcular));
                sync();
            }
        }
    );
}
