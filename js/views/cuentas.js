import { TIPOS, ORDEN_TIPO_CUENTA } from '../config.js';
import { store } from '../store.js';
import { esc, mxn, vacio, disponible, totalApartado, fmtMoneda, esMXN, disponibleMXN } from '../utils.js';
import { proximoPago } from './deudas.js';

export function vistaCuentas(contenedor) {
    const ordenadas = [...store.data.cuentas].sort((a, b) => (ORDEN_TIPO_CUENTA[a.tipo] ?? 9) - (ORDEN_TIPO_CUENTA[b.tipo] ?? 9));

    const cards = ordenadas.map(c => {
        const t = TIPOS[c.tipo];
        const apartado = totalApartado(c);
        const excede = apartado > c.saldo;
        const nativo = !esMXN(c);
        return `
            <div class="card glass-card item-card">
                <h4>
                    <span class="tipo-dot" style="background:${t.color}22;color:${t.color}"><i class="fa-solid ${t.icon}"></i></span>
                    ${esc(c.nombre)}
                </h4>
                <span><span class="badge">${t.label}</span> ${nativo ? `<span class="badge">${c.moneda}</span>` : ''} ${apartado > 0 ? `<span class="badge warn">Apartado: ${fmtMoneda(apartado, c.moneda)}</span>` : ''}</span>
                <p class="amount">${fmtMoneda(disponible(c), c.moneda)}</p>
                <span class="meta">
                    ${apartado > 0 ? `Disponible de ${fmtMoneda(c.saldo, c.moneda)} totales` : 'Disponible'}
                    ${nativo ? ` · ≈ ${mxn(disponibleMXN(c))} MXN` : ''}
                    ${excede ? ' · <span class="text-danger">lo apartado supera el saldo</span>' : ''}
                </span>
                <div class="actions">
                    <button class="btn-ghost" data-action="cuenta-editar" data-id="${c.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn-ghost" data-action="cuenta-apartado" data-id="${c.id}"><i class="fa-solid fa-lock"></i> Apartar dinero</button>
                </div>
            </div>`;
    }).join('');

    contenedor.innerHTML = `
        <div class="module-head">
            <h2>Mis Cuentas</h2>
            <div class="header-actions">
                <button class="btn-outline" data-action="banco-nuevo"><i class="fa-solid fa-building-columns"></i> Añadir Banco</button>
                <button class="btn-primary" data-action="cuenta-nueva"><i class="fa-solid fa-plus"></i> Agregar Cuenta</button>
            </div>
        </div>
        ${cards ? `<div class="grid-cards">${cards}</div>` : vacio('fa-vault', 'No tienes cuentas registradas. Agrega la primera para empezar.')}
        ${seccionTarjetas()}`;
}

// Tarjetas de crédito: viven en Deudas, pero aquí se ven junto al resto del dinero
function seccionTarjetas() {
    const tarjetas = store.data.deudas.filter(d => (d.tipo || 'tarjeta') === 'tarjeta');
    const cards = tarjetas.map(d => {
        const usoPct = d.limite > 0 ? Math.min(100, Math.round((d.pendiente / d.limite) * 100)) : null;
        const color = usoPct >= 90 ? 'var(--danger)' : usoPct >= 60 ? 'var(--amber)' : '';
        return `
            <div class="card glass-card item-card deuda">
                <h4><i class="fa-solid fa-credit-card ico-rose"></i> ${esc(d.nombre)} ${d.pendiente <= 0 ? '<span class="badge ok">Al corriente</span>' : ''}</h4>
                <p class="amount text-danger">${mxn(d.pendiente)}<small class="meta"> debido</small></p>
                ${d.limite > 0 ? `
                    <div class="progress"><span style="width:${usoPct}%;${color ? `background:${color}` : ''}"></span></div>
                    <span class="meta">Límite ${mxn(d.limite)} · Disponible ${mxn(Math.max(0, d.limite - d.pendiente))} (${usoPct}% usado)</span>`
                    : `<span class="meta">${d.tasa > 0 ? `Tasa ${d.tasa}% anual` : 'Sin intereses'}</span>`}
                <span class="meta">${d.diaCorte ? `Corte: ${proximoPago(d.diaCorte)}` : ''}${d.diaCorte && d.diaPago ? ' · ' : ''}${d.diaPago ? `Límite de pago: ${proximoPago(d.diaPago)}` : ''}</span>
                <div class="actions">
                    <button class="btn-success" data-action="deuda-abonar" data-id="${d.id}" ${d.pendiente <= 0 ? 'disabled' : ''}><i class="fa-solid fa-dollar-sign"></i> Abonar</button>
                    <button class="btn-ghost" data-action="deuda-editar" data-id="${d.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                </div>
            </div>`;
    }).join('');

    return `
        <div class="module-head" style="margin-top:32px"><h2>Tarjetas de crédito</h2>
            <button class="btn-primary" data-action="deuda-nueva-tarjeta"><i class="fa-solid fa-plus"></i> Añadir tarjeta</button></div>
        ${tarjetas.length ? `<div class="grid-cards">${cards}</div>` : vacio('fa-credit-card', 'Sin tarjetas de crédito registradas. Para abonos y estrategias de pago completas, ve a la sección Deudas.')}`;
}
