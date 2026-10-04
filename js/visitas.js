/* Contador de visitas flotante — Boda José de Jesús & Gloria Adriana */
(function () {
    'use strict';
    const CFG  = window.EVENT_CONFIG || {};
    const URLB = CFG.supabaseUrl;
    const ANON = CFG.supabaseAnon;
    const H    = { 'apikey': ANON, 'Authorization': 'Bearer ' + ANON, 'Content-Type': 'application/json' };

    let sid = localStorage.getItem('foro7_sid');
    if (!sid) { sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); localStorage.setItem('foro7_sid', sid); }

    const pagina = (location.pathname.split('/').pop().replace('.html', '') || 'index').toLowerCase();
    // selector.js y album.js ya registran su propia visita
    const yaRegistra = pagina === 'selector' || pagina === 'album';

    const widget = document.createElement('div');
    widget.id = 'foro7-visit-counter';
    widget.style.cssText = [
        'position:fixed', 'bottom:14px', 'left:14px',
        'background:rgba(74,58,56,0.42)', 'color:rgba(255,255,255,0.8)',
        'font-size:11px', 'padding:4px 11px', 'border-radius:20px',
        'z-index:9000', 'pointer-events:none', 'font-family:sans-serif',
        'letter-spacing:.04em', 'backdrop-filter:blur(4px)'
    ].join(';');
    widget.textContent = '👁 …';

    async function init() {
        try {
            const r = await fetch(`${URLB}/rest/v1/eventos?slug=eq.${CFG.slug}&select=id&limit=1`, { headers: H });
            const [ev] = await r.json();
            if (!ev || !ev.id) return widget.remove();

            if (!yaRegistra) {
                fetch(`${URLB}/rest/v1/visitas`, {
                    method: 'POST',
                    headers: Object.assign({}, H, { 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ evento_id: ev.id, pagina, session_id: sid })
                }).catch(() => {});
            }

            const cr = await fetch(
                `${URLB}/rest/v1/visitas?evento_id=eq.${ev.id}&pagina=like.${pagina}*&select=id`,
                { headers: H }
            );
            const rows = await cr.json();
            widget.textContent = '👁 ' + (Array.isArray(rows) ? rows.length : 0).toLocaleString('es-MX');
        } catch (e) { widget.remove(); }
    }

    function mount() { document.body.appendChild(widget); init(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
