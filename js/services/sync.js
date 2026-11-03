// Sincronización con Google Sheets (Apps Script, ver apps-script/Code.gs).
//  · Cada cambio local se sube ~1.2 s después del último (agrupa cambios seguidos).
//  · Cada 3 s se consulta la versión de la nube; si cambió, se descarga y se repinta.
//  → un cambio hecho en otro dispositivo aparece en 2–5 s.
import { store, normalizar, reemplazarDatos, alCambiar } from '../store.js';
import { toastError } from '../ui/toast.js';

const KEY_SYNC = 'finanzaspro_sync';
const KEY_VER = 'finanzaspro_sync_version';
const KEY_PEND = 'finanzaspro_sync_pendiente';
const INTERVALO = 3000;
const ESPERA_SUBIDA = 1200;

const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
};
let cfg = (() => { try { return JSON.parse(ls.get(KEY_SYNC) || 'null'); } catch (e) { return null; } })();
let version = Number(ls.get(KEY_VER)) || 0;
let suprimir = false, ocupado = false, repetir = false, timerSubida = null, timerPoll = null;

export const syncActivo = () => !!(cfg && cfg.url && cfg.token);
const modalAbierto = () => !document.getElementById('modal-overlay').classList.contains('hidden');

function estado(txt, error = false) {
    const el = document.querySelector('.sidebar-foot .status');
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-circle"></i> ${txt}`;
    el.style.color = error ? 'var(--danger)' : '';
}

async function llamar(cuerpo) {
    const r = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita la verificación previa (CORS)
        body: JSON.stringify({ token: cfg.token, ...cuerpo }),
        signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j.ok && !j.conflicto) throw new Error(j.error || 'Error del servidor');
    return j;
}

function aplicarRemoto(v, data) {
    const datos = normalizar(data);
    if (!datos) { estado('Datos de la nube inválidos', true); return false; }
    suprimir = true; // reemplazarDatos avisa a los oyentes: que no lo tomen como cambio local
    try { reemplazarDatos(datos); } finally { suprimir = false; }
    version = v; ls.set(KEY_VER, String(v)); ls.set(KEY_PEND, '0');
    return true;
}

async function subir(forzar = false) {
    if (!syncActivo()) return;
    if (ocupado) { repetir = true; return; }
    ocupado = true; estado('Guardando…');
    let reforzar = false;
    try {
        const r = await llamar({ accion: 'escribir', base: version, forzar, data: store.data });
        if (r.conflicto) {
            const usarNube = confirm('Se hicieron cambios en otro dispositivo.\n\nAceptar = cargar los de la nube (se pierden los cambios de aquí).\nCancelar = sobrescribir la nube con los de este dispositivo.');
            if (usarNube) aplicarRemoto(r.version, r.data); else reforzar = true;
        } else { version = r.version; ls.set(KEY_VER, String(version)); ls.set(KEY_PEND, '0'); }
        if (!reforzar) estado('Sincronizado');
    } catch (e) {
        estado('Sin conexión: se reintentará', true); // la marca de pendiente sigue puesta; consultar() reintenta
    } finally {
        ocupado = false;
        if (reforzar) subir(true);
        else if (repetir) { repetir = false; programarSubida(); }
    }
}

function programarSubida() {
    ls.set(KEY_PEND, '1');
    clearTimeout(timerSubida);
    timerSubida = setTimeout(() => subir(), ESPERA_SUBIDA);
}
alCambiar(() => { if (!suprimir && syncActivo()) programarSubida(); });

// Pregunta a la nube si hay algo nuevo. Devuelve true si reemplazó los datos locales.
export async function consultar() {
    if (!syncActivo() || ocupado || document.hidden) return false;
    if (ls.get(KEY_PEND) === '1') { subir(); return false; }
    try {
        const { version: remota } = await llamar({ accion: 'version' });
        if (remota === version) { estado('Sincronizado'); return false; }
        if (modalAbierto()) return false; // no cambiar los datos bajo un formulario abierto
        const r = await llamar({ accion: 'leer' });
        if (ls.get(KEY_PEND) === '1' || modalAbierto()) return false; // hubo un cambio local mientras bajaba
        const ok = aplicarRemoto(r.version, r.data);
        if (ok) estado('Sincronizado');
        return ok;
    } catch (e) { estado('Sin conexión', true); return false; }
}

// Al abrir la app o al conectar: decide qué lado manda y arranca la consulta periódica
export async function iniciarSync() {
    if (!syncActivo()) return;
    estado('Conectando…');
    try {
        const r = await llamar({ accion: 'leer' });
        if (!r.data) await subir(true);                       // la hoja está vacía: sube lo de aquí
        else if (ls.get(KEY_PEND) === '1') await subir();     // hay cambios locales sin subir
        else if (r.version !== version) {
            const primera = version === 0;
            if (primera && !confirm('La hoja de Google ya tiene datos.\n\nAceptar = usar los de la hoja (se reemplazan los de este dispositivo).\nCancelar = subir los de este dispositivo y reemplazar la hoja.')) await subir(true);
            else aplicarRemoto(r.version, r.data);
        }
        estado('Sincronizado');
    } catch (e) { estado('Sin conexión', true); }
    clearInterval(timerPoll);
    timerPoll = setInterval(consultar, INTERVALO);
}

export async function conectar(url, token) {
    const previa = cfg;
    cfg = { url, token };
    try { await llamar({ accion: 'version' }); }
    catch (e) { cfg = previa; throw e; }
    ls.set(KEY_SYNC, JSON.stringify(cfg)); ls.del(KEY_VER); ls.del(KEY_PEND);
    version = 0;
    await iniciarSync();
}

export function desconectar() {
    clearInterval(timerPoll); clearTimeout(timerSubida);
    cfg = null; version = 0;
    [KEY_SYNC, KEY_VER, KEY_PEND].forEach(ls.del);
    estado('Local Storage');
}

export async function sincronizarAhora() {
    if (!syncActivo()) return toastError('Primero conecta Google Sheets en Ajustes.');
    clearTimeout(timerSubida);
    if (ls.get(KEY_PEND) === '1') await subir(); else await consultar();
}
