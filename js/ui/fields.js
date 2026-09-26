// Helpers para construir los campos de los formularios.
import { store } from '../store.js';
import { esc, mxn, disponible, fmtMoneda, esMXN } from '../utils.js';

export const campo = (label, name, attrs = '', hint = '') =>
    `<label class="field"><span>${label}</span><input name="${name}" ${attrs}>${hint ? `<small>${hint}</small>` : ''}</label>`;

export const selectHTML = (label, name, opciones) =>
    `<label class="field"><span>${label}</span><select name="${name}">${opciones}</select></label>`;

export const attrMoneda = (valor = '', extra = '') =>
    `type="number" step="0.01" min="0" inputmode="decimal" value="${valor}" ${extra}`;

export const opcionesCuentas = (seleccionada = '') =>
    store.data.cuentas.map(c => `<option value="${c.id}" ${c.id === seleccionada ? 'selected' : ''}>${esc(c.nombre)} — ${fmtMoneda(disponible(c), c.moneda)}${esMXN(c) ? '' : ` (${c.moneda})`} disp.</option>`).join('');
