// Reporte mensual: mismo cálculo para Excel (varias hojas) y PDF (página imprimible).
import { store, buscar } from '../store.js';
import { TIPOS, ORDEN_TIPO_CUENTA } from '../config.js';
import { ETIQ_TIPO_DEUDA } from './deudaEtiquetas.js';
import { mxnReal as mxn, disponible, disponibleMXN, saldoMXN, esMXN, hoyISO } from '../utils.js';
import { restantes, montoRestante } from './msi.js';
import { ETIQ_DIRECCION, ETIQ_CONTRAPARTE, proximoPago, totalesPrestamos } from './prestamos.js';
import { toast, toastError } from '../ui/toast.js';

const etiquetaMes = m => { const [y, mm] = m.split('-'); return new Date(y, mm - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }); };
const r2v = n => Math.round(n * 100) / 100;

// Todos los números del reporte, listos para volcarse a Excel o a HTML
function calcular(mes) {
    const { cuentas, deudas, gastos, metas, msi, movimientos, prestamos } = store.data;
    const { debo, meDeben } = totalesPrestamos();
    const delMes = gastos.filter(g => g.fecha.startsWith(mes));
    const gastoMes = r2v(delMes.reduce((a, g) => a + g.monto, 0));
    const ingresosMes = r2v(movimientos.filter(m => m.tipo === 'INCOME' && !m.informativo && m.fecha.startsWith(mes)).reduce((a, m) => a + m.monto, 0));
    const liquidez = r2v(cuentas.reduce((a, c) => a + disponibleMXN(c), 0));
    const totalDeudas = r2v(deudas.reduce((a, d) => a + d.pendiente, 0));
    const porCategoria = [...new Set(delMes.map(g => g.categoria))]
        .map(k => ({ categoria: k, total: r2v(delMes.filter(g => g.categoria === k).reduce((a, g) => a + g.monto, 0)) }))
        .sort((a, b) => b.total - a.total);

    return {
        mes, etiqueta: etiquetaMes(mes),
        resumen: {
            'Patrimonio neto (MXN)': r2v(liquidez + meDeben - totalDeudas - debo),
            'Liquidez disponible (MXN)': liquidez,
            'Deudas totales (MXN)': totalDeudas,
            'Préstamos por pagar (MXN)': debo,
            'Préstamos por cobrar (MXN)': meDeben,
            'Ingresos del mes (MXN)': ingresosMes,
            'Gasto del mes (MXN)': gastoMes,
            'Ahorro neto del mes (MXN)': r2v(ingresosMes - gastoMes),
            'Gastos hormiga del mes (MXN)': r2v(delMes.filter(g => g.hormiga).reduce((a, g) => a + g.monto, 0))
        },
        cuentas: [...cuentas].sort((a, b) => (ORDEN_TIPO_CUENTA[a.tipo] ?? 9) - (ORDEN_TIPO_CUENTA[b.tipo] ?? 9)).map(c => ({
            Nombre: c.nombre, Tipo: TIPOS[c.tipo]?.label || c.tipo, Moneda: c.moneda || 'MXN',
            Saldo: c.saldo, Apartado: (c.apartados || []).reduce((a, x) => a + x.monto, 0), Disponible: disponible(c),
            'Equivalente en MXN': esMXN(c) ? '' : saldoMXN(c)
        })),
        tarjetas: deudas.map(d => ({
            Nombre: d.nombre, Tipo: ETIQ_TIPO_DEUDA[d.tipo] || 'Tarjeta de crédito', 'Saldo a pagar': d.pendiente,
            'Límite': d.limite || '', 'Pago mínimo': d.pagoMinimo || '', 'Tasa anual %': d.tasa || 0,
            'Día de corte': d.diaCorte || '', 'Día límite de pago': d.diaPago || ''
        })),
        gastosPorCategoria: porCategoria,
        gastos: delMes.map(g => ({ Fecha: g.fecha, Categoría: g.categoria, Detalle: g.detalle || '', Tipo: g.hormiga ? 'Hormiga' : 'Normal', 'Pagado con': g.medio === 'tarjeta' ? (buscar('deudas', g.origen)?.nombre || '') : (buscar('cuentas', g.origen)?.nombre || ''), Monto: g.monto })),
        metas: metas.map(m => ({ Nombre: m.nombre, Llevas: m.actual, Objetivo: m.objetivo, '% logrado': m.objetivo > 0 ? Math.round((m.actual / m.objetivo) * 100) : 0, 'Plazo (meses)': m.meses })),
        prestamos: prestamos.map(x => ({
            Tipo: ETIQ_DIRECCION[x.direccion], 'Con quién': ETIQ_CONTRAPARTE[x.contraparteTipo] || 'Persona', Contraparte: x.contraparte,
            'Monto original': x.monto, Pendiente: x.pendiente, 'Tasa anual %': x.tasa || 0, 'Fecha del préstamo': x.fecha || '',
            'Próximo pago': proximoPago(x) || '', 'Fecha de liquidación': x.fechaLiquidacion || '',
            Obligatoria: x.fechaLiquidacion ? (x.obligatoria ? 'Sí' : 'No') : '', Estado: x.pendiente <= 0 ? 'Liquidado' : 'Activo'
        })),
        msi: msi.filter(m => restantes(m) > 0).map(m => ({ Compra: m.nombre, Tarjeta: buscar('deudas', m.deuda)?.nombre || '', 'Cuota mensual': m.cuota, 'Cuotas pagadas': `${m.cobrados.length}/${m.meses}`, Restante: montoRestante(m) }))
    };
}

export function generarReporteExcel(mes) {
    if (typeof XLSX === 'undefined') return toastError('No se pudo cargar la librería de Excel (revisa tu conexión).');
    const r = calcular(mes);
    const wb = XLSX.utils.book_new();
    const hojaResumen = XLSX.utils.json_to_sheet([r.resumen].flatMap(o => Object.entries(o).map(([Concepto, Valor]) => ({ Concepto, Valor }))));
    hojaResumen['!cols'] = [{ wch: 32 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, hojaResumen, 'Resumen');
    const hojas = { Cuentas: r.cuentas, Tarjetas: r.tarjetas, 'Gastos por categoría': r.gastosPorCategoria, Gastos: r.gastos, Metas: r.metas, 'Préstamos': r.prestamos, MSI: r.msi };
    Object.entries(hojas).forEach(([nombre, filas]) => { if (filas.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), nombre); });
    XLSX.writeFile(wb, `finanzaspro-reporte-${mes}.xlsx`);
    toast('Reporte en Excel descargado.');
}

export function generarReportePDF(mes) {
    const r = calcular(mes);
    const win = window.open('', '_blank');
    if (!win) return toastError('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.');
    const filaResumen = Object.entries(r.resumen).map(([k, v]) => `<tr><td>${k}</td><td class="num">${mxn(v)}</td></tr>`).join('');
    const tabla = (titulo, filas, cols) => !filas.length ? '' : `
        <h2>${titulo}</h2>
        <table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filas.map(f => `<tr>${cols.map(c => `<td>${typeof f[c] === 'number' ? mxn(f[c]) : (f[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte FinanzasPro — ${r.etiqueta}</title>
        <style>
            body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;margin:32px auto;padding:0 16px}
            h1{font-size:22px;margin-bottom:4px} h2{font-size:15px;margin:28px 0 8px;border-bottom:2px solid #6d28d9;padding-bottom:4px}
            .sub{color:#64748b;margin-bottom:24px}
            table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
            th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0} th{background:#f1f5f9}
            td.num,th.num{text-align:right} .no-print{margin:20px 0}
            @media print{.no-print{display:none}}
        </style></head><body>
        <h1>FinanzasPro — Reporte mensual</h1>
        <p class="sub">${r.etiqueta.charAt(0).toUpperCase() + r.etiqueta.slice(1)} · generado el ${hoyISO()}</p>
        <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button></div>
        <h2>Resumen</h2><table><tbody>${filaResumen}</tbody></table>
        ${tabla('Cuentas', r.cuentas, ['Nombre', 'Tipo', 'Moneda', 'Saldo', 'Disponible'])}
        ${tabla('Tarjetas y deudas', r.tarjetas, ['Nombre', 'Tipo', 'Saldo a pagar', 'Límite', 'Día de corte', 'Día límite de pago'])}
        ${tabla('Préstamos (te prestaron / prestaste)', r.prestamos, ['Tipo', 'Contraparte', 'Monto original', 'Pendiente', 'Próximo pago', 'Fecha de liquidación'])}
        ${tabla('Gasto por categoría', r.gastosPorCategoria, ['categoria', 'total'])}
        ${tabla('Metas de ahorro', r.metas, ['Nombre', 'Llevas', 'Objetivo', '% logrado'])}
        ${tabla('Compras a meses sin intereses', r.msi, ['Compra', 'Tarjeta', 'Cuota mensual', 'Cuotas pagadas', 'Restante'])}
        </body></html>`);
    win.document.close();
}
