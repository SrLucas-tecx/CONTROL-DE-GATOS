// Exportar / importar / borrar datos.
import { store, normalizar, reemplazarDatos, datosIniciales } from '../store.js';
import { render } from '../router.js';
import { toast, toastError } from '../ui/toast.js';

export function exportarDatos() {
    const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzaspro-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Copia de seguridad descargada.');
}

export function importarDatos(archivo) {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
        try {
            const datos = normalizar(JSON.parse(lector.result));
            if (!datos) return toastError('El archivo no tiene el formato de FinanzasPro.');
            if (!confirm('Esto sobrescribirá tus datos actuales. ¿Continuar?')) return;
            reemplazarDatos(datos);
            render('dashboard');
            toast('Datos importados correctamente.');
        } catch (e) {
            toastError('No se pudo leer el archivo JSON.');
        }
    };
    lector.onerror = () => toastError('No se pudo abrir el archivo.');
    lector.readAsText(archivo);
}

export function borrarTodo() {
    if (!confirm('Se borrarán todas tus cuentas, deudas y metas. ¿Continuar?')) return;
    reemplazarDatos({ cuentas: [], deudas: [], metas: [], movimientos: [], bancos: [], gastos: [], recurrentes: [] });
    toast('Datos borrados.');
}

export function restablecer() {
    if (!confirm('Se restablecerán los datos de demostración y se perderán los actuales. ¿Continuar?')) return;
    reemplazarDatos(datosIniciales());
    toast('Datos restablecidos.');
}
