/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/ui/tauler.js
 * ROL: El geoplà a la pantalla (SVG): dibuixa els punts, els polígons, les
 *      marques de comptar i les capes d'ajuda, i tradueix toc, arrossegament i
 *      teclat en esdeveniments per al controlador (js/ui/app.js).
 * ARQUITECTURA:
 * - No sap res de fases ni de regles: el controlador li passa un «model» a
 *   pinta(model) i rep onPunt(p), onArrossega(i, p, final) i onTecla(nom).
 * - Coordenades: el punt [x, y] (y cap amunt) és a (x + M, n − 1 − y + M) del
 *   viewBox. Un toc va al punt de la xarxa més proper (cada punt té tota la
 *   seva cel·la com a zona de toc).
 * - La tríada d'interacció: tocar, arrossegar (Pointer Events amb
 *   setPointerCapture) i teclat (fletxes, Retorn o Espai, Retrocés, Esc).
 * DEPENDÈNCIES: cap (el carrega index.html abans de js/ui/app.js)
 * ============================================================================
 */
(function (arrel) {
    'use strict';
    var M = 0.7; // marge al voltant de la xarxa, en unitats de la xarxa

    function crea(svg, opts) {
        var n = opts.n;
        var model = null;
        var cursor = [0, 0];
        var cursorVisible = false;
        var drag = null,
            baixat = null;

        function mida() {
            return n - 1 + 2 * M;
        }
        var X = function (x) {
            return (x + M).toFixed(3);
        };
        var Y = function (y) {
            return (n - 1 - y + M).toFixed(3);
        };

        svg.setAttribute('viewBox', '0 0 ' + mida() + ' ' + mida());
        svg.setAttribute('tabindex', '0');
        svg.setAttribute('role', 'application');
        svg.setAttribute('focusable', 'true');

        // El punt de la xarxa sota el punter (o null si és fora)
        function puntDe(ev) {
            var pt = svg.createSVGPoint();
            pt.x = ev.clientX;
            pt.y = ev.clientY;
            var ctm = svg.getScreenCTM();
            if (!ctm) return null;
            var q = pt.matrixTransform(ctm.inverse());
            var x = Math.round(q.x - M),
                y = n - 1 - Math.round(q.y - M);
            if (x < 0 || y < 0 || x > n - 1 || y > n - 1) return null;
            return [x, y];
        }
        var mateix = function (p, q) {
            return p && q && p[0] === q[0] && p[1] === q[1];
        };

        // ── Punter: tocar i arrossegar ─────────────────────────────────────
        svg.addEventListener('pointerdown', function (ev) {
            if (ev.button !== 0) return;
            var p = puntDe(ev);
            if (!p) return;
            cursorVisible = false;
            baixat = p;
            var act = model && model.actiu >= 0 ? model.poligons[model.actiu] : null;
            if (model && model.arrossegable && act) {
                var i = act.punts.findIndex(function (q) {
                    return mateix(q, p);
                });
                if (i >= 0) drag = { i: i, ara: p, mogut: false };
            }
            try {
                svg.setPointerCapture(ev.pointerId);
            } catch (e) {
                /* navegadors antics */
            }
            ev.preventDefault();
        });
        svg.addEventListener('pointermove', function (ev) {
            if (!drag) return;
            var p = puntDe(ev);
            if (!p || mateix(p, drag.ara)) return;
            drag.ara = p;
            drag.mogut = true;
            opts.onArrossega(drag.i, p, false);
        });
        function acaba(ev, cancel) {
            var d = drag,
                b = baixat;
            drag = null;
            baixat = null;
            if (cancel) return;
            if (d && d.mogut) {
                opts.onArrossega(d.i, d.ara, true);
                return;
            }
            var p = puntDe(ev);
            if (p && mateix(p, b)) {
                cursor = p;
                opts.onPunt(p);
            }
        }
        svg.addEventListener('pointerup', function (ev) {
            acaba(ev, false);
        });
        svg.addEventListener('pointercancel', function (ev) {
            acaba(ev, true);
        });

        // ── Teclat ─────────────────────────────────────────────────────────
        svg.addEventListener('keydown', function (ev) {
            var k = ev.key,
                d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
            if (d) {
                cursor = [
                    Math.max(0, Math.min(n - 1, cursor[0] + d[0])),
                    Math.max(0, Math.min(n - 1, cursor[1] + d[1])),
                ];
                cursorVisible = true;
                if (opts.onCursor) opts.onCursor(cursor);
                pinta(model);
            } else if (k === 'Enter' || k === ' ') {
                cursorVisible = true;
                opts.onPunt(cursor.slice());
            } else if (k === 'Backspace' || k === 'Delete') {
                opts.onTecla('desfes');
            } else if (k === 'Escape') {
                opts.onTecla('esc');
            } else return;
            ev.preventDefault();
        });
        svg.addEventListener('focus', function () {
            if (svg.matches(':focus-visible')) {
                cursorVisible = true;
                pinta(model);
            }
        });
        svg.addEventListener('blur', function () {
            cursorVisible = false;
            pinta(model);
        });

        // ── Dibuix ─────────────────────────────────────────────────────────
        function cami(punts, tancat) {
            return (
                punts
                    .map(function (p, i) {
                        return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]);
                    })
                    .join(' ') + (tancat ? ' Z' : '')
            );
        }
        var esc = function (s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        };

        function pinta(m) {
            model = m || model;
            if (!model) return;
            var h = [],
                x,
                y;
            // Línies de la quadrícula (molt suaus)
            for (x = 0; x < n; x++)
                h.push(
                    '<line class="t-linia" x1="' +
                        X(x) +
                        '" y1="' +
                        Y(0) +
                        '" x2="' +
                        X(x) +
                        '" y2="' +
                        Y(n - 1) +
                        '"/>'
                );
            for (y = 0; y < n; y++)
                h.push(
                    '<line class="t-linia" x1="' +
                        X(0) +
                        '" y1="' +
                        Y(y) +
                        '" x2="' +
                        X(n - 1) +
                        '" y2="' +
                        Y(y) +
                        '"/>'
                );
            // Capes d'ajuda per sota dels polígons
            (model.capes || []).forEach(function (c) {
                if (c.tipus === 'quadrets') {
                    for (x = c.caixa.x0; x < c.caixa.x1; x++)
                        for (y = c.caixa.y0; y < c.caixa.y1; y++)
                            h.push(
                                '<rect class="t-quadret" x="' + X(x) + '" y="' + Y(y + 1) + '" width="1" height="1"/>'
                            );
                } else if (c.tipus === 'peca') {
                    h.push('<path class="t-peca t-peca-' + (c.estil || 'a') + '" d="' + cami(c.punts, true) + '"/>');
                } else if (c.tipus === 'contorn') {
                    h.push('<path class="t-contorn" d="' + cami(c.punts, true) + '"/>');
                } else if (c.tipus === 'diagonal') {
                    h.push('<path class="t-diagonal" d="' + cami([c.a, c.b], false) + '"/>');
                }
            });
            // Polígons
            model.poligons.forEach(function (pol, k) {
                if (!pol.punts.length) return;
                var cls = 't-pol t-pol-' + (pol.classe || 'vora') + (pol.tancat ? ' t-tancat' : ' t-obert');
                h.push('<path class="' + cls + '" d="' + cami(pol.punts, pol.tancat) + '"/>');
                if (k === model.actiu && !pol.tancat && pol.punts.length >= 3)
                    h.push(
                        '<circle class="t-primer" cx="' +
                            X(pol.punts[0][0]) +
                            '" cy="' +
                            Y(pol.punts[0][1]) +
                            '" r="0.32"/>'
                    );
            });
            // Punts de la xarxa i marques
            var marques = model.marques || {},
                errors = model.errorsMarques || {};
            for (x = 0; x < n; x++)
                for (y = 0; y < n; y++) {
                    var kk = x + ',' + y,
                        mk = marques[kk];
                    if (mk === 'vora')
                        h.push(
                            '<rect class="t-marca t-marca-vora" x="' +
                                (x + M - 0.17).toFixed(3) +
                                '" y="' +
                                (n - 1 - y + M - 0.17).toFixed(3) +
                                '" width="0.34" height="0.34" transform="rotate(45 ' +
                                X(x) +
                                ' ' +
                                Y(y) +
                                ')"/>'
                        );
                    else if (mk === 'dins')
                        h.push('<circle class="t-marca t-marca-dins" cx="' + X(x) + '" cy="' + Y(y) + '" r="0.17"/>');
                    else h.push('<circle class="t-punt" cx="' + X(x) + '" cy="' + Y(y) + '" r="0.085"/>');
                    if (errors[kk]) h.push('<circle class="t-error" cx="' + X(x) + '" cy="' + Y(y) + '" r="0.3"/>');
                }
            // Vèrtexs del polígon actiu
            model.poligons.forEach(function (pol, k) {
                if (!model.mostraVertexs && k !== model.actiu) return;
                pol.punts.forEach(function (p) {
                    h.push(
                        '<circle class="t-vertex t-vertex-' +
                            (pol.classe || 'vora') +
                            '" cx="' +
                            X(p[0]) +
                            '" cy="' +
                            Y(p[1]) +
                            '" r="0.16"/>'
                    );
                });
            });
            // Etiquetes (peces, triangles…)
            (model.capes || []).forEach(function (c) {
                if (!c.etiqueta) return;
                var e = c.lloc || c.punts[0];
                h.push(
                    '<text class="t-etiqueta" x="' +
                        (e[0] + M).toFixed(3) +
                        '" y="' +
                        (n - 1 - e[1] + M).toFixed(3) +
                        '">' +
                        esc(c.etiqueta) +
                        '</text>'
                );
            });
            if (cursorVisible)
                h.push('<circle class="t-cursor" cx="' + X(cursor[0]) + '" cy="' + Y(cursor[1]) + '" r="0.36"/>');
            svg.innerHTML = h.join('');
        }

        return {
            pinta: pinta,
            get cursor() {
                return cursor.slice();
            },
        };
    }

    arrel.Tauler = { crea: crea };
})(typeof self !== 'undefined' ? self : this);
