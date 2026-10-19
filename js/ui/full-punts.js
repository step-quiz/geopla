/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/ui/full-punts.js
 * ROL: El full A4 de punts per imprimir (imprimir.html): geoplans de n × n
 *      punts (6, 8 o 11), separats 1 cm, amb espai per escriure B, I i A.
 * ARQUITECTURA: Script clàssic. La mida es tria al desplegable o amb ?n=6|8|11.
 *      L'avís de «Capçaleres i peus de pàgina» surt un sol cop (desat amb
 *      try/catch: sense localStorage, surt sempre).
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function () {
    'use strict';
    var QUANTS = { 6: 6, 8: 4, 11: 2 };
    var sel = document.getElementById('mida'),
        full = document.getElementById('full');
    var n = parseInt(new URLSearchParams(location.search).get('n'), 10);
    if (QUANTS[n]) sel.value = String(n);

    function geopla(n) {
        // 1 unitat = 1 cm; marge de 0,5 cm
        var m = 0.5,
            w = n - 1 + 2 * m,
            h = '';
        for (var x = 0; x < n; x++)
            for (var y = 0; y < n; y++) h += '<circle cx="' + (x + m) + '" cy="' + (y + m) + '" r="0.06"/>';
        return (
            '<figure class="geopla"><svg viewBox="0 0 ' +
            w +
            ' ' +
            w +
            '" width="' +
            w +
            'cm" height="' +
            w +
            'cm" aria-hidden="true">' +
            h +
            '</svg><figcaption>B = ______ &nbsp; I = ______ &nbsp; A = ______</figcaption></figure>'
        );
    }
    function pinta() {
        var n = parseInt(sel.value, 10),
            h = '';
        for (var i = 0; i < QUANTS[n]; i++) h += geopla(n);
        full.className = 'full full-' + n;
        full.innerHTML = h;
        try {
            history.replaceState(null, '', '?n=' + n);
        } catch (e) {
            /* file:// */
        }
    }
    sel.addEventListener('change', pinta);
    pinta();

    // Avís d'un sol cop
    var avis = document.getElementById('avis'),
        vist = false;
    try {
        vist = localStorage.getItem('geopla:v1:avis-impressio') === '1';
    } catch (e) {
        vist = false;
    }
    avis.hidden = vist;
    document.getElementById('btn-entesos').addEventListener('click', function () {
        avis.hidden = true;
        try {
            localStorage.setItem('geopla:v1:avis-impressio', '1');
        } catch (e) {
            /* sense localStorage */
        }
    });
    document.getElementById('btn-imprimeix').addEventListener('click', function () {
        window.print();
    });
})();
