import { TIPOS, MONEDAS } from '../config.js';
import { store, buscar, persistir } from '../store.js';
import { esc, mxnReal as mxn, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { campo, selectHTML, attrMoneda } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';
import { infoRendimiento } from '../services/rendimientos.js';

const BILLETES = [1000, 500, 200, 100, 50, 20];
const DENOM_MONEDAS = [20, 10, 5, 2, 1, 0.5];
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
            <p class="field-group-title">Monedas</p><div class="den-grid">${DENOM_MONEDAS.map(v => fila('m', v)).join('')}</div>
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
        campo('Saldo actual', 'saldo', attrMoneda(c ? c.saldo : '', 'required')) +
        `<div class="mon-row">` +
        selectHTML('Moneda', 'moneda', MONEDAS.map(m => `<option ${(c?.moneda || 'MXN') === m ? 'selected' : ''}>${m}</option>`).join('')) +
        `<div id="cambio-box" class="hidden">` + campo('Tipo de cambio a MXN', 'tipoCambio', attrMoneda(c?.tipoCambio || '1', 'min="0.0001"'), 'Ej. si $1 USD = $18 MXN, escribe 18.') + `</div></div>` +
        selectHTML('Banco o institución', 'banco', `<option value="">Sin banco</option>` +
            store.data.bancos.map(b => `<option value="${b.id}" ${(c ? c.banco : bancoInicial) === b.id ? 'selected' : ''}>${esc(b.nombre)}</option>`).join('')) +
        selectHTML('¿Genera rendimiento?', 'rinde',
            `<option value="no" ${c?.tasa > 0 ? '' : 'selected'}>No, solo es saldo</option><option value="si" ${c?.tasa > 0 ? 'selected' : ''}>Sí, genera rendimiento</option>`) +
        campo('Rendimiento anual (%)', 'tasa', attrMoneda(c?.tasa || '', 'max="200"'), 'Se acredita solo cada día que abras la app.') +
        `<div data-plazo-box class="hidden">` +
            selectHTML('¿Cuándo genera rendimiento?', 'rendTipo',
                `<option value="diario" ${c?.rendTipo === 'plazo' ? '' : 'selected'}>Todos los días, sin plazo</option><option value="plazo" ${c?.rendTipo === 'plazo' ? 'selected' : ''}>Durante un plazo de meses</option>`) +
            `<div data-plazo class="hidden">` +
                campo('Fecha en que inició', 'inicioRend', `type="date" value="${c?.inicioRend || hoyISO()}"`) +
                campo('Plazo (meses)', 'plazoMeses', `type="number" min="1" max="120" step="1" value="${c?.plazoMeses || ''}"`) +
                campo('Saldo con el que inició — opcional', 'capitalInicio', attrMoneda(c?.capitalInicio || ''), 'Sirve para calcular lo ganado y lo que ganarás en todo el plazo. Vacío = se usa el saldo actual.') +
                '<p class="hint" id="plazo-prev" style="margin:0 0 12px"></p>' +
            `</div></div>`,
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
            const plazo = rinde && fd.get('rendTipo') === 'plazo';
            const inicioRend = plazo ? fd.get('inicioRend') : '';
            const plazoMeses = plazo ? parseInt(fd.get('plazoMeses'), 10) : 0;
            const capitalInicio = plazo ? (num(fd.get('capitalInicio')) || 0) : 0;
            if (plazo && (!inicioRend || !(plazoMeses >= 1 && plazoMeses <= 120))) return toastError('Indica la fecha de inicio y el plazo en meses (1 a 120).');
            let ultimoRendimiento = tasa > 0 ? (c?.tasa > 0 && c.ultimoRendimiento ? c.ultimoRendimiento : hoyISO()) : '';
            if (plazo && inicioRend > ultimoRendimiento) ultimoRendimiento = inicioRend; // si el plazo empieza después, no rinde antes
            const moneda = fd.get('moneda');
            const tipoCambio = moneda === 'MXN' ? 1 : num(fd.get('tipoCambio'));
            if (moneda !== 'MXN' && (!tipoCambio || tipoCambio <= 0)) return toastError('Indica un tipo de cambio válido a MXN.');
            const datos = { nombre, tipo, saldo, banco: fd.get('banco'), tasa, ultimoRendimiento, desglose, moneda, tipoCambio,
                rendTipo: plazo ? 'plazo' : 'diario', inicioRend, plazoMeses, capitalInicio };
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

                const moneda = f.elements.moneda;
                const syncMoneda = () => f.querySelector('#cambio-box').classList.toggle('hidden', moneda.value === 'MXN');
                moneda.addEventListener('change', syncMoneda);
                syncMoneda();

                // Rendimiento: diario o por plazo, con el cálculo en vivo
                const syncRend = () => {
                    const e = f.elements;
                    const si = e.rinde.value === 'si';
                    f.querySelector('[data-plazo-box]').classList.toggle('hidden', !si);
                    const plazo = si && e.rendTipo.value === 'plazo';
                    f.querySelector('[data-plazo]').classList.toggle('hidden', !plazo);
                    e.inicioRend.required = plazo; e.plazoMeses.required = plazo;
                    const prev = f.querySelector('#plazo-prev');
                    const meses = parseInt(e.plazoMeses.value, 10), tasa = parseFloat(e.tasa.value) || 0;
                    if (plazo && e.inicioRend.value && meses >= 1 && tasa > 0) {
                        const i = infoRendimiento({ tasa, saldo: parseFloat(e.saldo.value) || 0, rendTipo: 'plazo', inicioRend: e.inicioRend.value, plazoMeses: meses, capitalInicio: parseFloat(e.capitalInicio.value) || 0 });
                        prev.textContent = `Vence el ${i.fin} · ganancia estimada hasta entonces ≈ ${mxn(i.gananciaRestante)} (saldo final ≈ ${mxn(i.saldoFinal)})`;
                    } else prev.textContent = '';
                };
                ['rinde', 'rendTipo', 'inicioRend', 'plazoMeses', 'capitalInicio', 'tasa', 'saldo'].forEach(n => {
                    f.elements[n].addEventListener('input', syncRend); f.elements[n].addEventListener('change', syncRend);
                });
                syncRend();
            }
        }
    );
}
