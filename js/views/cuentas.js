import { TIPOS } from '../config.js';
import { store } from '../store.js';
import { esc, mxn, vacio } from '../utils.js';

export function vistaCuentas(contenedor) {
    const cards = store.data.cuentas.map(c => {
        const t = TIPOS[c.tipo];
        return `
            <div class="card glass-card item-card">
                <h4>
                    <span class="tipo-dot" style="background:${t.color}22;color:${t.color}"><i class="fa-solid ${t.icon}"></i></span>
                    ${esc(c.nombre)}
                </h4>
                <span><span class="badge">${t.label}</span></span>
                <p class="amount">${mxn(c.saldo)}</p>
                <div class="actions">
                    <button class="btn-ghost" data-action="cuenta-editar" data-id="${c.id}"><i class="fa-solid fa-pen"></i> Editar</button>
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
