/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/motor/atzar.js
 * ROL: Atzar amb llavor: mateixa llavor, mateixa seqüència, sempre.
 * ARQUITECTURA: Pur, sense DOM. Copiat de prova1eso/assets/js/atzar.js
 *      (hash FNV-1a d'una cadena → mulberry32) i embolcallat perquè també es
 *      pugui carregar amb Node (tests). Mai Math.random per a res reproduïble.
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Atzar = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Hash determinista d'una cadena → enter de 32 bits (FNV-1a)
    function hash(txt) {
        var h = 2166136261 >>> 0;
        txt = String(txt);
        for (var i = 0; i < txt.length; i++) {
            h ^= txt.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    /** Un generador nou. llavor: cadena o enter. */
    function crea(llavor) {
        var s = (typeof llavor === 'string' ? hash(llavor) : llavor >>> 0) || 1;
        function real() {
            s = (s + 0x6d2b79f5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        // Enter dins [a, b], tots dos inclosos
        function enter(a, b) {
            return a + Math.floor(real() * (b - a + 1));
        }
        function tria(arr) {
            return arr[Math.floor(real() * arr.length)];
        }
        // Fisher-Yates sobre una còpia
        function barreja(arr) {
            var c = arr.slice();
            for (var i = c.length - 1; i > 0; i--) {
                var j = Math.floor(real() * (i + 1));
                var t = c[i];
                c[i] = c[j];
                c[j] = t;
            }
            return c;
        }
        return { real: real, enter: enter, tria: tria, barreja: barreja };
    }

    return { hash: hash, crea: crea };
});
