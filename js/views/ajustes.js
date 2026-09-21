export function vistaAjustes(c) {
    c.innerHTML = `
        <div class="settings-grid">
            <div class="card glass-card"><h4>Exportar copia de seguridad</h4>
                <p>Descarga todo en un .json, o elige solo algunas secciones (por ejemplo, únicamente cuentas y metas).</p>
                <button class="btn-success" data-action="exportar"><i class="fa-solid fa-download"></i> Copia completa</button>
                <button class="btn-outline" data-action="exportar-parcial"><i class="fa-solid fa-list-check"></i> Elegir qué exportar</button></div>
            <div class="card glass-card"><h4>Importar / traspasar datos</h4>
                <p>Carga un .json (completo o parcial), elige qué secciones traer y si reemplazan lo actual o se combinan.</p>
                <button class="btn-primary" data-action="importar"><i class="fa-solid fa-upload"></i> Cargar Archivo JSON</button></div>
        </div>
        <div class="card glass-card danger-zone"><h4><i class="fa-solid fa-triangle-exclamation"></i> Zona de peligro</h4>
            <p class="hint" style="margin:8px 0 14px">Reinicia con datos de demostración o borra todo. Exporta un respaldo antes.</p>
            <div class="actions" style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn-danger" data-action="restablecer">Restablecer datos por defecto</button>
                <button class="btn-danger" data-action="borrar-todo">Borrar todo</button></div></div>`;
}
