// Formulario del conteo quincenal: escribes el saldo real de cada app y se compara contra la app.
import { store, buscar, persistir } from '../store.js';
import { esc, num, r2, uid, hoyISO } from '../utils.js';
import { abrirModal } from '../ui/modal.js';
import { toast, toastError } from '../ui/toast.js';
import { quincenaDe, cuadra, TOLERANCIA } from '../services/conteos.js';

// Aquí los montos siempre se ven (no se enmascaran con el ojo): hay que compararlos
const fmt = (v, moneda = 'MXN') => { try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda }).format(v); } catch (e) { return `$${v.toFixed(2)}`; } };

export function formConteo() {
    const { cuentas, deudas, bancos } = store.data;
    if (!cuentas.length && !deudas.length) return toast('Agrega una cuenta o una tarjeta primero.', 'error');

    const fila = (clave, nombre, esperado, moneda) => `
        <label class="field"><span>${esc(nombre)} <small class="meta">— en la app: ${fmt(esperado, moneda)}</small></span>
            <input name="${clave}" type="number" step="0.01" min="0" inputmode="decimal" data-esp="${esperado}" data-mon="${moneda}" placeholder="Saldo real que ves en tu app">
            <small data-dif="${clave}"></small></label>`;
    const grupos = bancos.map(b => ({ nombre: b.nombre, cuentas: cuentas.filter(x => x.banco === b.id) }));
    const sueltas = cuentas.filter(x => !x.banco || !buscar('bancos', x.banco));
    if (sueltas.length) grupos.push({ nombre: 'Sin banco', cuentas: sueltas });
    const bloqueCuentas = grupos.filter(g => g.cuentas.length).map(g =>
        `<p class="field-group-title">${esc(g.nombre)}</p>` + g.cuentas.map(x => fila(`c:${x.id}`, x.nombre, x.saldo, x.moneda || 'MXN')).join('')).join('');
    const bloqueDeudas = deudas.length
        ? '<p class="field-group-title">Tarjetas y deudas (saldo pendiente)</p>' + deudas.map(d => fila(`d:${d.id}`, d.nombre, d.pendiente, 'MXN')).join('') : '';

    abrirModal('Conteo quincenal',
        '<p class="modal-note">Escribe el saldo real que ves hoy en cada app de banco. Lo que dejes vacío no se revisa.</p>' +
        `<label class="field"><span>Fecha del conteo</span><input name="fecha" type="date" required value="${hoyISO()}"></label>` +
        bloqueCuentas + bloqueDeudas +
        '<label class="check"><input type="checkbox" name="ajustar"> <span>Ajustar la app a los saldos reales <small>— la diferencia queda como «Ajuste» en Movimientos</small></span></label>',
        fd => {
            const fecha = fd.get('fecha');
            if (!fecha) return toastError('Elige la fecha del conteo.');
            const items = [];
            for (const [k, v] of fd.entries()) {
                if (k === 'fecha' || k === 'ajustar' || v === '') continue;
                const real = num(v);
                if (real === null || real < 0) return toastError('Revisa los montos: deben ser números válidos.');
                const tipo = k[0], id = k.slice(2);
                const o = buscar(tipo === 'c' ? 'cuentas' : 'deudas', id);
                if (!o) continue;
                const esperado = tipo === 'c' ? o.saldo : o.pendiente;
                items.push({ tipo, id, nombre: o.nombre, moneda: o.moneda || 'MXN', esperado, real, dif: r2(real - esperado) });
            }
            if (!items.length) return toastError('Escribe el saldo real de al menos una cuenta.');

            const ajustar = !!fd.get('ajustar');
            if (ajustar) items.forEach(i => {
                if (i.tipo === 'c') {
                    const c = buscar('cuentas', i.id);
                    if (!c) return;
                    if (i.dif) store.data.movimientos.push({ id: uid(), tipo: 'AJUSTE', monto: i.dif, cuenta: c.id, destino: null, detalle: 'Ajuste de conteo quincenal', fecha });
                    c.saldo = i.real;
                } else { const d = buscar('deudas', i.id); if (d) d.pendiente = i.real; }
            });

            const q = quincenaDe(fecha), ok = cuadra(items);
            (store.data.conteos ||= []).push({ id: uid(), fecha, quincena: q.clave, etiqueta: q.etiqueta, items, ajustado: ajustar, cuadro: ok });
            persistir();
            toast(ok ? '¡Todo cuadra! ✅' : `Hay diferencias en ${items.filter(i => Math.abs(i.dif) >= TOLERANCIA).length} cuenta(s).`);
        },
        {
            submitText: 'Guardar conteo',
            onOpen: f => f.querySelectorAll('input[data-esp]').forEach(i => i.addEventListener('input', () => {
                const el = f.querySelector(`[data-dif="${i.name}"]`);
                if (i.value === '') { el.textContent = ''; return; }
                const dif = r2(parseFloat(i.value) - Number(i.dataset.esp));
                const ok = Math.abs(dif) < TOLERANCIA;
                el.style.color = ok ? 'var(--success)' : 'var(--danger)';
                el.textContent = ok ? '✔ Cuadra' : `Diferencia: ${dif > 0 ? '+' : '−'}${fmt(Math.abs(dif), i.dataset.mon)} (${dif > 0 ? 'lo real es mayor que la app' : 'lo real es menor que la app'})`;
            }))
        }
    );
}

export function eliminarConteo(id) {
    if (!(store.data.conteos || []).some(c => c.id === id)) return;
    if (!confirm('¿Eliminar este conteo? Si ajustaste saldos con él, esos ajustes se conservan.')) return;
    store.data.conteos = store.data.conteos.filter(c => c.id !== id);
    persistir();
    toast('Conteo eliminado.');
}
