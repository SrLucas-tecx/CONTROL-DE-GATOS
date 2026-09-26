export const $ = sel => document.querySelector(sel);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const r2 = n => Math.round(n * 100) / 100;

export const esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const mxn = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// Convierte un valor de input a número con 2 decimales, o null si no es válido
export const num = v => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? r2(n) : null;
};

export const vacio = (icono, texto) =>
    `<div class="empty"><i class="fa-solid ${icono}"></i><p>${texto}</p></div>`;

// Fecha local en formato YYYY-MM-DD (toISOString usaría UTC y en la noche daría el día siguiente)
export const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Días que faltan para la próxima vez que llega el día `dia` del mes
export function diasHasta(dia) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const f = (y, m) => new Date(y, m, Math.min(dia, new Date(y, m + 1, 0).getDate()));
    let d = f(hoy.getFullYear(), hoy.getMonth());
    if (d < hoy) d = f(hoy.getFullYear(), hoy.getMonth() + 1);
    return Math.round((d - hoy) / 864e5);
}

// Dinero apartado de una cuenta (reservado mentalmente, sigue en el banco pero no se cuenta como disponible)
export const totalApartado = c => (c.apartados || []).reduce((a, x) => a + x.monto, 0);
export const disponible = c => Math.max(0, r2(c.saldo - totalApartado(c)));

// Multi-moneda: si la cuenta no es MXN, se convierte con su tipo de cambio guardado
export const fmtMoneda = (v, moneda = 'MXN') => {
    try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda }).format(v); }
    catch (e) { return mxn(v); } // código de moneda no estándar (ej. "Otra")
};
export const esMXN = c => !c.moneda || c.moneda === 'MXN';
export const tasaCambio = c => esMXN(c) ? 1 : (c.tipoCambio || 1);
export const saldoMXN = c => r2(c.saldo * tasaCambio(c));
export const disponibleMXN = c => r2(disponible(c) * tasaCambio(c));
