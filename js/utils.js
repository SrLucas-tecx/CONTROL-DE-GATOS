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
