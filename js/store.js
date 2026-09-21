// Estado de la aplicación + persistencia en localStorage.
// Los demás módulos mutan store.data y llaman a persistir().
import { STORAGE_KEY, TIPOS } from './config.js';
import { uid } from './utils.js';
import { toast } from './ui/toast.js';

export const datosIniciales = () => ({
    cuentas: [
        { id: 'c1', nombre: 'Efectivo Billetera', tipo: 'efectivo', saldo: 1250 },
        { id: 'c2', nombre: 'Cuenta Nómina', tipo: 'debito', saldo: 14200 }
    ],
    deudas: [
        { id: 'd1', nombre: 'Tarjeta Crédito B', pendiente: 15000, tasa: 36, pagoMinimo: 800 }
    ],
    metas: [],
    movimientos: [],
    bancos: [],
    gastos: [],
    recurrentes: [],
    presupuestos: {}
});

// Valida y normaliza datos (localStorage e importación). Devuelve null si son inválidos.
export function normalizar(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.cuentas) || !Array.isArray(d.deudas)) return null;
    const metas = Array.isArray(d.metas) ? d.metas : [];
    const okC = d.cuentas.every(c => c && typeof c.nombre === 'string' && Number.isFinite(c.saldo) && TIPOS[c.tipo]);
    const okD = d.deudas.every(x => x && typeof x.nombre === 'string' && Number.isFinite(x.pendiente));
    const okM = metas.every(m => m && typeof m.nombre === 'string' && Number.isFinite(m.objetivo) && Number.isFinite(m.actual));
    const movs = Array.isArray(d.movimientos) ? d.movimientos : [];
    const okV = movs.every(m => m && ['INCOME', 'EXPENSE', 'TRANSFER', 'AJUSTE'].includes(m.tipo) && Number.isFinite(m.monto));
    const bancos = Array.isArray(d.bancos) ? d.bancos : [];
    const okB = bancos.every(b => b && typeof b.nombre === 'string');
    const gastos = Array.isArray(d.gastos) ? d.gastos : [];
    const okG = gastos.every(g => g && Number.isFinite(g.monto) && typeof g.fecha === 'string' && ['cuenta', 'tarjeta'].includes(g.medio));
    const recurrentes = Array.isArray(d.recurrentes) ? d.recurrentes : [];
    const okR = recurrentes.every(r => r && typeof r.nombre === 'string' && Number.isFinite(r.monto) && Number.isFinite(r.dia) && typeof r.medio === 'string' && typeof r.desde === 'string');
    if (!(okC && okD && okM && okV && okB && okG && okR)) return null;
    return {
        cuentas: d.cuentas.map(c => ({ tasa: 0, banco: '', ...c, id: String(c.id ?? uid()) })),
        deudas:  d.deudas.map(x => ({ tasa: 0, pagoMinimo: 0, ...x, id: String(x.id ?? uid()) })),
        metas:   metas.map(m => ({ meses: 12, ...m, id: String(m.id ?? uid()) })),
        movimientos: movs.map(m => ({ ...m, id: String(m.id ?? uid()) })),
        bancos: bancos.map(b => ({ ...b, id: String(b.id ?? uid()) })),
        gastos: gastos.map(g => ({ ...g, id: String(g.id ?? uid()) })),
        recurrentes: recurrentes.map(r => ({ ultimoMes: '', ...r, id: String(r.id ?? uid()) })),
        presupuestos: d.presupuestos && typeof d.presupuestos === 'object' ? d.presupuestos : {}
    };
}

function cargar() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const datos = normalizar(JSON.parse(raw));
            if (datos) return datos;
        }
    } catch (e) { console.warn('No se pudo leer localStorage:', e); }
    return datosIniciales();
}

export const store = { data: cargar() };

export const buscar = (coleccion, id) => store.data[coleccion].find(x => x.id === id);

export function guardar() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store.data));
    } catch (e) {
        toast('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).', 'error');
    }
}

// Suscripción a cambios: main.js la usa para repintar sin acoplar store con las vistas
const oyentes = [];
export const alCambiar = fn => oyentes.push(fn);

export function persistir() {
    guardar();
    oyentes.forEach(fn => fn());
}

export function reemplazarDatos(nuevos) {
    store.data = nuevos;
    persistir();
}
