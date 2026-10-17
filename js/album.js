/* ============================================================
   ÁLBUM — Boda José de Jesús & Gloria Adriana
   Solo presentación: sin herramientas, sin botones, sin marcas.

   album.html                     → álbum digital (por defecto)
   album.html?filtro=impresion    → fotos de impresión
   album.html?filtro=ampliacion   → la(s) ampliación(es)
   album.html?filtro=todas        → todas las elegidas
   (los enlaces que genera el selector siguen funcionando)
   ============================================================ */
(function () {
'use strict';

const CFG    = window.EVENT_CONFIG;
const IDS    = window.HERRAMIENTAS.map(t => t.id);
const photos = window.PHOTOS || [];        // completa: visor
const thumbs = window.PHOTO_THUMBS || [];  // miniatura: galería

const TITULOS = {
    album:      'Álbum de fotos',
    impresion:  'Fotos para impresión',
    ampliacion: 'La ampliación',
    descartada: 'Fotos descartadas',
    todas:      'Nuestras fotos',
    fotos:      'Nuestras fotos'
};

let selecciones = {};
let indices     = [];
let pos         = null;
let filtro      = 'album';
let touchX = 0, touchY = 0, quietoTimer = null;

const $ = id => document.getElementById(id);

function leerFiltro() {
    const p = new URLSearchParams(location.search);
    const v = (p.get('filtro') || p.get('f') || '').trim().toLowerCase();
    return TITULOS[v] ? v : null;
}

function calcularIndices() {
    const out = [];
    for (let i = 0; i < photos.length; i++) {
        const sel = selecciones[i] || {};
        const ok = filtro === 'todas'  ? !sel.descartada && IDS.some(id => sel[id])
                 : filtro === 'fotos'  ? !sel.descartada
                 : sel[filtro] === true;
        if (ok) out.push(i);
    }
    return out;
}

/* ── Portada ──────────────────────────────────────────────── */
function renderPortada() {
    $('albumTipo').textContent    = CFG.tipo + ' · ' + CFG.fechaTexto;
    $('albumNombre').textContent  = CFG.nombre;
    $('albumTitulo').textContent  = TITULOS[filtro];
    $('cierreNombre').textContent = CFG.nombre;
}

function fondoPortada() {
    if (!indices.length) return;
    const src = photos[indices[0]];
    const im = new Image();
    im.onload = () => {
        const f = $('portadaFondo');
        f.style.backgroundImage = `url("${src}")`;
        requestAnimationFrame(() => f.classList.add('listo'));
    };
    im.src = src;
}

/* ── Galería ──────────────────────────────────────────────────
   Mosaico por columnas propias: cada foto se agrega YA cargada a la
   columna más corta, en orden. Nada de lo ya mostrado se mueve. */
let columnas = [], siguiente = 0, enVuelo = 0, listas = {}, aColocar = 0;
let colocadas = [], sentinela = null;

function numColumnas() {
    const w = window.innerWidth;
    return w < 560 ? 2 : w < 1000 ? 3 : 4;
}

function crearColumnas() {
    const grid = $('albumGrid');
    grid.querySelectorAll('.columna').forEach(c => c.remove());
    columnas = [];
    for (let i = 0; i < numColumnas(); i++) {
        const c = document.createElement('div');
        c.className = 'columna';
        grid.insertBefore(c, sentinela);
        columnas.push(c);
    }
}

function colocar(fig) {
    let corta = columnas[0];
    columnas.forEach(c => { if (c.offsetHeight < corta.offsetHeight) corta = c; });
    corta.appendChild(fig);
}

function renderGaleria() {
    const grid = $('albumGrid');
    grid.innerHTML = '';
    if (!indices.length) {
        grid.innerHTML = '<p class="galeria-vacia">' +
            (photos.length ? 'Muy pronto aquí estarán sus fotos.'
                           : 'Las fotos se publican después del evento.') + '</p>';
        return;
    }
    sentinela = document.createElement('div');
    sentinela.className = 'sentinela';
    grid.appendChild(sentinela);
    crearColumnas();
    new IntersectionObserver(es => { if (es[0].isIntersecting) cargarMas(); },
                             { rootMargin: '900px 0px' }).observe(sentinela);
    cargarMas();

    let ancho = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth === ancho) return;
        ancho = window.innerWidth;
        if (numColumnas() === columnas.length) return;
        crearColumnas();
        colocadas.forEach(colocar);
    });
}

/* Precarga hasta 4 a la vez, pero coloca estrictamente en orden */
function cargarMas() {
    const r = sentinela.getBoundingClientRect();
    if (r.top > window.innerHeight + 900) return;
    while (enVuelo < 4 && siguiente < indices.length) {
        const p = siguiente++;
        const idx = indices[p];
        enVuelo++;
        const img = new Image();
        img.alt = '';
        img.onload = img.onerror = () => { enVuelo--; listas[p] = img; vaciar(); };
        img.src = thumbs[idx] || photos[idx];
    }
}

function vaciar() {
    while (listas[aColocar]) {
        const p = aColocar, img = listas[p];
        delete listas[p];
        aColocar++;
        const fig = document.createElement('figure');
        fig.className = 'foto';
        fig.appendChild(img);
        fig.addEventListener('click', () => abrir(p));
        colocar(fig);
        colocadas.push(fig);
        requestAnimationFrame(() => fig.classList.add('visible'));
    }
    cargarMas();
}

/* ── Visor ────────────────────────────────────────────────── */
function mostrar(p) {
    const img = $('visorImg');
    const src = photos[indices[p]];
    img.classList.add('cambiando');
    const pre = new Image();
    pre.onload = pre.onerror = () => {
        img.src = src;
        img.classList.remove('cambiando');
    };
    pre.src = src;
    [p + 1, p - 1].forEach(q => {
        if (q >= 0 && q < indices.length) new Image().src = photos[indices[q]];
    });
}

function abrir(p) {
    pos = p;
    $('visorImg').src = photos[indices[p]];
    $('visor').classList.add('activo');
    document.body.style.overflow = 'hidden';
    mostrar(p);
    despertar();
}

function cerrar() {
    $('visor').classList.remove('activo');
    document.body.style.overflow = '';
    pos = null;
}

function mover(d) {
    if (pos === null) return;
    pos = (pos + d + indices.length) % indices.length;
    mostrar(pos);
}

/* La "×" se desvanece si no se mueve el mouse */
function despertar() {
    const v = $('visor');
    v.classList.remove('quieto');
    clearTimeout(quietoTimer);
    quietoTimer = setTimeout(() => v.classList.add('quieto'), 2500);
}

/* ── Arranque ─────────────────────────────────────────────── */
async function iniciar() {
    const pedido = leerFiltro();
    filtro = pedido || 'album';
    renderPortada();
    try {
        selecciones = await SB.fetchSelecciones();
    } catch (e) {
        try { selecciones = JSON.parse(localStorage.getItem('josegloria_selecciones') || '{}'); }
        catch (e2) { selecciones = {}; }
    }
    indices = calcularIndices();
    // Sin ?filtro: si el álbum digital aún está vacío, mostrar las elegidas
    // y, si tampoco hay, todas las fotos (menos descartadas).
    if (!pedido) {
        for (const f of ['todas', 'fotos']) {
            if (indices.length) break;
            filtro = f;
            indices = calcularIndices();
        }
        renderPortada();
    }
    fondoPortada();
    renderGaleria();
    try { SB.registrarVisita('album-' + filtro); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    iniciar();

    const v = $('visor');
    $('visorCerrar').addEventListener('click', cerrar);
    $('visorPrev').addEventListener('click', () => mover(-1));
    $('visorNext').addEventListener('click', () => mover(1));
    $('visorImg').addEventListener('click', cerrar);
    v.addEventListener('mousemove', despertar);
    v.addEventListener('touchstart', e => {
        touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
    }, { passive: true });
    v.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) mover(dx > 0 ? -1 : 1);
        else if (dy > 90) cerrar();   // deslizar hacia abajo cierra
    }, { passive: true });

    document.addEventListener('keydown', e => {
        if (pos === null) return;
        if (e.key === 'Escape')     cerrar();
        if (e.key === 'ArrowLeft')  mover(-1);
        if (e.key === 'ArrowRight') mover(1);
    });
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

})();
