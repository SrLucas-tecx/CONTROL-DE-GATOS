export function vistaAjustes(c) {
    c.innerHTML = `
        <div class="settings-grid">
            <div class="card glass-card"><h4>Exportar copia de seguridad</h4>
                <p>Descarga un archivo .json con tus cuentas, movimientos, metas y deudas. Úsalo para respaldar o traspasar tus datos.</p>
                <button class="btn-success" data-action="exportar"><i class="fa-solid fa-download"></i> Descargar Archivo JSON</button></div>
            <div class="card glass-card"><h4>Importar / traspasar datos</h4>
                <p>Selecciona un .json exportado antes para sobrescribir la información de este navegador.</p>
                <button class="btn-primary" data-action="importar"><i class="fa-solid fa-upload"></i> Cargar Archivo JSON</button></div>
        </div>
        <div class="card glass-card danger-zone"><h4><i class="fa-solid fa-triangle-exclamation"></i> Zona de peligro</h4>
            <p class="hint" style="margin:8px 0 14px">Reinicia con datos de demostración o borra todo. Exporta un respaldo antes.</p>
            <div class="actions" style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn-danger" data-action="restablecer">Restablecer datos por defecto</button>
                <button class="btn-danger" data-action="borrar-todo">Borrar todo</button></div></div>`;
}
