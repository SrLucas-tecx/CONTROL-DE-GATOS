// Exporta los gastos a Excel (.xlsx con SheetJS). Si la librería no cargó, baja un CSV.
import { store, buscar } from '../store.js';
import { hoyISO } from '../utils.js';
import { toast, toastError } from '../ui/toast.js';

export function exportarGastosExcel() {
    const gs = [...store.data.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!gs.length) return toastError('Aún no hay gastos para exportar.');

    const nombreOrigen = g => { const x = buscar(g.medio === 'tarjeta' ? 'deudas' : 'cuentas', g.origen); return x ? x.nombre : '(eliminado)'; };
    const filas = gs.map(g => ({
        Fecha: g.fecha, Mes: g.fecha.slice(0, 7), Categoría: g.categoria, Detalle: g.detalle || '',
        Tipo: g.hormiga ? 'Hormiga' : 'Normal', Medio: g.medio === 'tarjeta' ? 'Tarjeta de crédito' : 'Cuenta',
        'Cuenta / Tarjeta': nombreOrigen(g), Monto: g.monto
    }));

    const meses = {};
    gs.forEach(g => {
        const m = g.fecha.slice(0, 7);
        meses[m] ??= { Mes: m, 'Total gastado': 0, 'Gastos hormiga': 0, 'Otros gastos': 0, 'Cargado a tarjetas': 0 };
        meses[m]['Total gastado'] += g.monto;
        meses[m][g.hormiga ? 'Gastos hormiga' : 'Otros gastos'] += g.monto;
        if (g.medio === 'tarjeta') meses[m]['Cargado a tarjetas'] += g.monto;
    });
    const resumen = Object.values(meses).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 100) / 100 : v])));
    const nombre = `finanzaspro-gastos-${hoyISO()}`;

    if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        const hoja = XLSX.utils.json_to_sheet(filas);
        hoja['!cols'] = [12, 9, 16, 30, 10, 18, 22, 12].map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(wb, hoja, 'Gastos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen mensual');
        XLSX.writeFile(wb, `${nombre}.xlsx`);
        return toast('Excel descargado.');
    }
    const cols = Object.keys(filas[0]);
    const csv = [cols, ...filas.map(f => cols.map(k => f[k]))]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv' })), download: `${nombre}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    toast('No se pudo cargar la librería de Excel; se descargó un CSV.');
}
