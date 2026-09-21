import { store, persistir } from '../store.js';
import { num } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { campo, attrMoneda } from '../ui/fields.js';
import { toast } from '../ui/toast.js';
import { CATEGORIAS } from './gasto.js';

export function formPresupuesto() {
    const p = store.data.presupuestos ||= {};
    abrirModal('Presupuesto mensual por categoría',
        '<p class="modal-note">Límite mensual en MXN. Déjalo vacío o en 0 si no quieres límite en esa categoría.</p>' +
        CATEGORIAS.map((k, i) => campo(k, `p_${i}`, attrMoneda(p[k] || ''))).join(''),
        fd => {
            CATEGORIAS.forEach((k, i) => { const n = num(fd.get(`p_${i}`)); if (n > 0) p[k] = n; else delete p[k]; });
            persistir();
            toast('Presupuesto guardado.');
        });
}
