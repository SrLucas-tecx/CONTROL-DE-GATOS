// Menú ⋯ de una fila de tabla. La lógica de abrir/cerrar vive en actions.js (data-rowmenu).
// items: [[acción, texto, ícono, peligro?], ...]
export const menuFila = (id, items) => `<div class="menu-wrap row-menu">
    <button type="button" class="icon-btn" data-rowmenu aria-haspopup="true" aria-expanded="false" aria-label="Acciones"><i class="fa-solid fa-ellipsis"></i></button>
    <div class="menu hidden" role="menu">${items.map(([accion, texto, icono, peligro]) =>
        `<button type="button" class="menu-item${peligro ? ' danger' : ''}" role="menuitem" data-action="${accion}" data-id="${id}"><i class="fa-solid ${icono}"></i> ${texto}</button>`).join('')}</div></div>`;
