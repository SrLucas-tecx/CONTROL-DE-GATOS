import { TIPOS, ORDEN_TIPO_CUENTA } from '../config.js';
import { store } from '../store.js';
import { esc, mxn, vacio, disponible, totalApartado, fmtMoneda, esMXN, disponibleMXN } from '../utils.js';

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
            <button class="btn-primary" data-action="cuenta-nueva"><i class="fa-solid fa-plus"></i> Agregar Cuenta</button>
        </div>
        ${cards ? `<div class="grid-cards">${cards}</div>` : vacio('fa-vault', 'No tienes cuentas registradas. Agrega la primera para empezar.')}`;
}
