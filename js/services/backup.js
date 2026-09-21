// Exportar / importar (completo o por secciones) / borrar / restablecer.
import { store, normalizar, reemplazarDatos, datosIniciales } from '../store.js';
import { render } from '../router.js';
import { KEY_RESPALDO } from '../config.js';
import { hoyISO, uid } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { selectHTML } from '../ui/fields.js';
import { toast, toastError } from '../ui/toast.js';

const SECCIONES = {
    cuentas: 'Cuentas', bancos: 'Bancos', deudas: 'Deudas (tarjetas y préstamos)', metas: 'Metas de ahorro',
    movimientos: 'Movimientos', gastos: 'Gastos', recurrentes: 'Pagos e ingresos mensuales', presupuestos: 'Presupuestos'
};
const cantidad = v => Array.isArray(v) ? v.length : Object.keys(v || {}).length;
const esValida = (k, v) => k === 'presupuestos' ? !!v && typeof v === 'object' && !Array.isArray(v) : Array.isArray(v);

function descargar(obj, nombre) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

const casillas = (secciones, fuente) => Object.entries(secciones).map(([k, l]) =>
    `<label class="check"><input type="checkbox" name="s_${k}" checked> <span>${l} <small>(${cantidad(fuente[k])})</small></span></label>`).join('');

// Une por ID: lo nuevo se agrega y lo que ya existe se actualiza
function fusionar(k, actual, nuevos) {
    if (k === 'presupuestos') return { ...actual, ...nuevos };
    const mapa = new Map(actual.map(x => [String(x.id), x]));
    nuevos.forEach(x => { const id = String(x.id ?? uid()); mapa.set(id, { ...x, id }); });
    return [...mapa.values()];
}

export function exportarDatos() {
    descargar(store.data, `finanzaspro-respaldo-${hoyISO()}.json`);
    try { localStorage.setItem(KEY_RESPALDO, hoyISO()); } catch (e) { /* sin almacenamiento */ }
    toast('Copia de seguridad completa descargada.');
}

export function exportarParcial() {
    abrirModal('Elegir qué exportar',
        '<p class="modal-note">Marca solo las secciones que quieres en el archivo.</p>' + casillas(SECCIONES, store.data) +
        '<p class="hint" style="margin-top:0">Los movimientos y gastos hacen referencia a cuentas y tarjetas; expórtalos junto con ellas si quieres conservar los nombres.</p>',
        fd => {
            const sel = Object.keys(SECCIONES).filter(k => fd.get(`s_${k}`));
            if (!sel.length) return toastError('Elige al menos una sección.');
            descargar({ ...Object.fromEntries(sel.map(k => [k, store.data[k]])), _parcial: true, _exportado: hoyISO() },
                `finanzaspro-${sel.length === Object.keys(SECCIONES).length ? 'completo' : 'parcial'}-${hoyISO()}.json`);
            toast(`Exportado: ${sel.map(k => SECCIONES[k]).join(', ')}.`);
        },
        { submitText: 'Descargar' });
}

export function importarDatos(archivo) {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
        let json;
        try { json = JSON.parse(lector.result); } catch (e) { return toastError('No se pudo leer el archivo JSON.'); }
        const presentes = Object.fromEntries(Object.entries(SECCIONES).filter(([k]) => esValida(k, json?.[k])));
        if (!Object.keys(presentes).length) return toastError('El archivo no tiene datos de FinanzasPro.');

        abrirModal('Importar datos',
            '<p class="modal-note">El archivo contiene estas secciones. Elige cuáles traer.</p>' + casillas(presentes, json) +
            selectHTML('¿Cómo aplicarlas?', 'modo',
                '<option value="reemplazar">Reemplazar lo que tengo en esas secciones</option><option value="combinar">Combinar (agrega y actualiza por ID)</option>'),
            fd => {
                const sel = Object.keys(presentes).filter(k => fd.get(`s_${k}`));
                if (!sel.length) return toastError('Elige al menos una sección.');
                const candidato = { ...store.data };
                sel.forEach(k => { candidato[k] = fd.get('modo') === 'combinar' ? fusionar(k, store.data[k], json[k]) : json[k]; });
                const datos = normalizar(candidato);
                if (!datos) return toastError('Los datos del archivo no tienen un formato válido.');
                reemplazarDatos(datos);
                render('dashboard');
                toast(`Importado: ${sel.map(k => SECCIONES[k]).join(', ')}.`);
            },
            { submitText: 'Importar' });
    };
    lector.onerror = () => toastError('No se pudo abrir el archivo.');
    lector.readAsText(archivo);
}

export function borrarTodo() {
    if (!confirm('Se borrarán todas tus cuentas, deudas y metas. ¿Continuar?')) return;
    reemplazarDatos({ cuentas: [], deudas: [], metas: [], movimientos: [], bancos: [], gastos: [], recurrentes: [], presupuestos: {} });
    toast('Datos borrados.');
}

export function restablecer() {
    if (!confirm('Se restablecerán los datos de demostración y se perderán los actuales. ¿Continuar?')) return;
    reemplazarDatos(datosIniciales());
    toast('Datos restablecidos.');
}
