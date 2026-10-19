/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/motor/geometria.js
 * ROL: Geometria del geoplà, NOMÉS AMB ENTERS (cap coma flotant): àrea (doble),
 *      punts de la vora (B) i de dins (I), validació de polígons simples i de
 *      forats, formes de cada fase, les peces del «mètode de la caixa» i
 *      polígons a l'atzar per als tests i per a la fase F6.
 * ARQUITECTURA: Pur, sense DOM. El fan servir la interfície (js/ui/*) i els
 *      tests de Node. Un punt és [x, y] (enters, y cap amunt); un polígon és la
 *      llista de vèrtexs en ordre, sense repetir el primer al final. Una regió
 *      és { vora: polígon, forats: [polígons] }.
 *      IMPORTANT: I es calcula COMPTANT punts, mai amb la fórmula de Pick
 *      (és el que l'alumne ha de descobrir, i els tests la fan servir per
 *      comprovar àrea, vora i interior l'un contra l'altre).
 * DEPENDÈNCIES: cap (els generadors reben un objecte d'atzar de js/motor/atzar.js)
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Geometria = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ── Eines bàsiques ──────────────────────────────────────────────────────
    function mcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            var t = a % b;
            a = b;
            b = t;
        }
        return a;
    }
    var clau = function (p) {
        return p[0] + ',' + p[1];
    };
    var iguals = function (p, q) {
        return p[0] === q[0] && p[1] === q[1];
    };
    // Producte vectorial (o→a) × (o→b): > 0 gir a l'esquerra, 0 alineats
    function creu(o, a, b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    }
    var signe = function (n) {
        return n > 0 ? 1 : n < 0 ? -1 : 0;
    };
    // p és sobre el segment tancat ab
    function sobreSegment(p, a, b) {
        return (
            creu(a, b, p) === 0 &&
            Math.min(a[0], b[0]) <= p[0] &&
            p[0] <= Math.max(a[0], b[0]) &&
            Math.min(a[1], b[1]) <= p[1] &&
            p[1] <= Math.max(a[1], b[1])
        );
    }
    // Els segments tancats ab i cd es toquen (també si només es toquen en un punt o se solapen)
    function segmentsEsTallen(a, b, c, d) {
        var d1 = signe(creu(c, d, a)),
            d2 = signe(creu(c, d, b)),
            d3 = signe(creu(a, b, c)),
            d4 = signe(creu(a, b, d));
        if (d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0) return true;
        return sobreSegment(a, c, d) || sobreSegment(b, c, d) || sobreSegment(c, a, b) || sobreSegment(d, a, b);
    }

    // ── Àrea i vora ─────────────────────────────────────────────────────────
    /** El doble de l'àrea amb signe (positiu si els vèrtexs van en sentit antihorari). Sempre enter. */
    function area2(pol) {
        var s = 0;
        for (var i = 0; i < pol.length; i++) {
            var p = pol[i],
                q = pol[(i + 1) % pol.length];
            s += p[0] * q[1] - q[0] * p[1];
        }
        return s;
    }
    /** Punts de la xarxa sobre la vora: Σ mcd(|Δx|, |Δy|) de cada costat. */
    function vora(pol) {
        var s = 0;
        for (var i = 0; i < pol.length; i++) {
            var p = pol[i],
                q = pol[(i + 1) % pol.length];
            s += mcd(q[0] - p[0], q[1] - p[1]);
        }
        return s;
    }
    function caixa(pol) {
        var xs = pol.map(function (p) {
                return p[0];
            }),
            ys = pol.map(function (p) {
                return p[1];
            });
        return {
            x0: Math.min.apply(null, xs),
            y0: Math.min.apply(null, ys),
            x1: Math.max.apply(null, xs),
            y1: Math.max.apply(null, ys),
        };
    }

    // ── On és un punt ───────────────────────────────────────────────────────
    /** 'vora', 'dins' o 'fora' respecte d'un polígon simple (regla parell-senar, amb enters). */
    function classifica(pol, p) {
        var dins = false;
        for (var i = 0; i < pol.length; i++) {
            var a = pol[i],
                b = pol[(i + 1) % pol.length];
            if (sobreSegment(p, a, b)) return 'vora';
            if (a[1] > p[1] !== b[1] > p[1]) {
                // p és a l'esquerra del punt on el costat talla la recta y = p.y?
                var d = b[1] - a[1];
                var esq = (p[0] - a[0]) * d;
                var dre = (p[1] - a[1]) * (b[0] - a[0]);
                if (d > 0 ? esq < dre : esq > dre) dins = !dins;
            }
        }
        return dins ? 'dins' : 'fora';
    }
    var normalitza = function (regio) {
        return Array.isArray(regio) ? { vora: regio, forats: [] } : { vora: regio.vora, forats: regio.forats || [] };
    };
    /** On és p dins d'una regió amb forats: la vora d'un forat també és «vora». */
    function classificaRegio(regio, p) {
        var r = normalitza(regio);
        var c = classifica(r.vora, p);
        if (c !== 'dins') return c;
        for (var i = 0; i < r.forats.length; i++) {
            var f = classifica(r.forats[i], p);
            if (f === 'vora') return 'vora';
            if (f === 'dins') return 'fora';
        }
        return 'dins';
    }

    /**
     * Compta els punts d'una regió (polígon o { vora, forats }).
     * @returns {{ B, I, A2, h, punts }}  A2 = doble de l'àrea; punts: { 'x,y': 'vora'|'dins' }
     */
    function compta(regio) {
        var r = normalitza(regio);
        var c = caixa(r.vora);
        var punts = {},
            B = 0,
            I = 0;
        for (var x = c.x0; x <= c.x1; x++) {
            for (var y = c.y0; y <= c.y1; y++) {
                var k = classificaRegio(r, [x, y]);
                if (k === 'vora') {
                    B++;
                    punts[x + ',' + y] = 'vora';
                } else if (k === 'dins') {
                    I++;
                    punts[x + ',' + y] = 'dins';
                }
            }
        }
        var A2 = Math.abs(area2(r.vora));
        r.forats.forEach(function (f) {
            A2 -= Math.abs(area2(f));
        });
        return { B: B, I: I, A2: A2, h: r.forats.length, punts: punts };
    }
    /** B calculat costat per costat (Σ mcd), per comparar-lo amb el comptat. */
    function voraRegio(regio) {
        var r = normalitza(regio);
        return r.forats.reduce(function (s, f) {
            return s + vora(f);
        }, vora(r.vora));
    }

    // ── Validació ───────────────────────────────────────────────────────────
    /**
     * Un polígon és vàlid si és simple (els costats només es toquen als vèrtexs veïns).
     * @returns {{ ok: true } | { ok: false, error: 'pocs'|'repetit'|'enrere'|'creuen'|'area0', on? }}
     */
    function validaPoligon(pol) {
        var n = pol.length;
        if (n < 3) return { ok: false, error: 'pocs' };
        var vist = {};
        for (var i = 0; i < n; i++) {
            if (vist[clau(pol[i])]) return { ok: false, error: 'repetit', on: pol[i] };
            vist[clau(pol[i])] = true;
        }
        // Dos costats seguits que tornen enrere (es solapen)
        for (i = 0; i < n; i++) {
            var a = pol[(i + n - 1) % n],
                b = pol[i],
                c = pol[(i + 1) % n];
            var dot = (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);
            if (creu(a, b, c) === 0 && dot > 0) return { ok: false, error: 'enrere', on: b };
        }
        // Costats no veïns que es toquen
        for (i = 0; i < n; i++) {
            for (var j = i + 1; j < n; j++) {
                if (j === i + 1 || (i === 0 && j === n - 1)) continue;
                if (segmentsEsTallen(pol[i], pol[(i + 1) % n], pol[j], pol[(j + 1) % n]))
                    return { ok: false, error: 'creuen', costats: [i, j] };
            }
        }
        if (area2(pol) === 0) return { ok: false, error: 'area0' };
        return { ok: true };
    }

    /** Un forat és vàlid si és un polígon simple estrictament dins de la vora i sense tocar els altres forats. */
    function validaForat(voraPol, forat, altres) {
        var v = validaPoligon(forat);
        if (!v.ok) return v;
        altres = altres || [];
        var i, j;
        for (i = 0; i < forat.length; i++) {
            if (classifica(voraPol, forat[i]) !== 'dins') return { ok: false, error: 'fora', on: forat[i] };
            for (j = 0; j < altres.length; j++)
                if (classifica(altres[j], forat[i]) !== 'fora') return { ok: false, error: 'forats', on: forat[i] };
        }
        var anells = [voraPol].concat(altres);
        for (var k = 0; k < anells.length; k++) {
            var r = anells[k];
            for (i = 0; i < forat.length; i++)
                for (j = 0; j < r.length; j++)
                    if (segmentsEsTallen(forat[i], forat[(i + 1) % forat.length], r[j], r[(j + 1) % r.length]))
                        return { ok: false, error: k === 0 ? 'fora' : 'forats' };
        }
        for (k = 0; k < altres.length; k++)
            for (i = 0; i < altres[k].length; i++)
                if (classifica(forat, altres[k][i]) !== 'fora') return { ok: false, error: 'forats' };
        return { ok: true };
    }

    // ── Formes de cada fase ─────────────────────────────────────────────────
    /** Treu els vèrtexs que són al mig d'un costat recte (l'alumne pot haver clicat un punt de la vora). */
    function simplifica(pol) {
        var out = pol.slice(),
            canvi = true;
        while (canvi && out.length > 3) {
            canvi = false;
            for (var i = 0; i < out.length; i++) {
                var a = out[(i + out.length - 1) % out.length],
                    b = out[i],
                    c = out[(i + 1) % out.length];
                if (creu(a, b, c) === 0) {
                    out.splice(i, 1);
                    canvi = true;
                    break;
                }
            }
        }
        return out;
    }
    var esHoritzontal = function (p, q) {
        return p[1] === q[1];
    };
    var esVertical = function (p, q) {
        return p[0] === q[0];
    };
    /** Rectangle amb els costats sobre les línies de la quadrícula. */
    function esRectangleAxial(pol) {
        var s = simplifica(pol);
        if (s.length !== 4) return false;
        for (var i = 0; i < 4; i++) {
            var p = s[i],
                q = s[(i + 1) % 4];
            if (!esHoritzontal(p, q) && !esVertical(p, q)) return false;
        }
        return true;
    }
    /** Triangle rectangle amb els catets sobre les línies de la quadrícula: { angle, catets } o null. */
    function triangleRectangleAxial(pol) {
        var s = simplifica(pol);
        if (s.length !== 3) return null;
        for (var i = 0; i < 3; i++) {
            var a = s[(i + 2) % 3],
                b = s[i],
                c = s[(i + 1) % 3];
            var h = esHoritzontal(a, b) || esHoritzontal(b, c);
            var v = esVertical(a, b) || esVertical(b, c);
            if (h && v) {
                var x = esHoritzontal(a, b) ? a : c,
                    y = esVertical(a, b) ? a : c;
                return { angle: b, catets: [Math.abs(x[0] - b[0]), Math.abs(y[1] - b[1])] };
            }
        }
        return null;
    }
    function esTriangle(pol) {
        return simplifica(pol).length === 3;
    }
    /** Convex: tots els girs cap al mateix costat (els vèrtexs alineats no compten). */
    function esConvex(pol) {
        var s = simplifica(pol),
            sg = 0;
        for (var i = 0; i < s.length; i++) {
            var g = signe(creu(s[i], s[(i + 1) % s.length], s[(i + 2) % s.length]));
            if (g === 0) continue;
            if (sg === 0) sg = g;
            else if (g !== sg) return false;
        }
        return true;
    }

    // ── Mètode de la caixa (F3) i talls en triangles (F4) ───────────────────
    /**
     * Les peces que queden entre un triangle i la seva caixa: un triangle rectangle per a cada costat
     * inclinat i, si un vèrtex no toca la vora de la caixa, un rectangle. Caixa = triangle + peces.
     * @returns {Array<{ tipus: 'triangle'|'rectangle', punts, costats: [a, b], A2 }>}
     */
    function pecesCaixa(tri) {
        var t = simplifica(tri);
        if (t.length !== 3) throw new Error('pecesCaixa: cal un triangle');
        var peces = [],
            cantonades = [];
        for (var i = 0; i < 3; i++) {
            var a = t[i],
                b = t[(i + 1) % 3],
                altre = t[(i + 2) % 3];
            if (esHoritzontal(a, b) || esVertical(a, b)) {
                cantonades.push(null);
                continue;
            }
            var c1 = [a[0], b[1]],
                c2 = [b[0], a[1]];
            var k = signe(creu(a, b, c1)) !== signe(creu(a, b, altre)) ? c1 : c2;
            var dx = Math.abs(b[0] - a[0]),
                dy = Math.abs(b[1] - a[1]);
            cantonades.push(k);
            peces.push({ tipus: 'triangle', punts: [a, k, b], costats: [dx, dy], A2: dx * dy });
        }
        var c = caixa(t);
        var A2caixa = 2 * (c.x1 - c.x0) * (c.y1 - c.y0);
        var resta =
            A2caixa -
            Math.abs(area2(t)) -
            peces.reduce(function (s, p) {
                return s + p.A2;
            }, 0);
        if (resta > 0) {
            // El vèrtex que no toca la vora de la caixa: el rectangle va d'ell a la cantonada de fora
            for (i = 0; i < 3; i++) {
                var p = t[i];
                if (p[0] === c.x0 || p[0] === c.x1 || p[1] === c.y0 || p[1] === c.y1) continue;
                var k1 = cantonades[(i + 2) % 3],
                    k2 = cantonades[i]; // costats que arriben a p i que en surten
                var q = [k1[0] !== p[0] ? k1[0] : k2[0], k1[1] !== p[1] ? k1[1] : k2[1]];
                var w = Math.abs(q[0] - p[0]),
                    h = Math.abs(q[1] - p[1]);
                peces.push({
                    tipus: 'rectangle',
                    punts: [p, [q[0], p[1]], q, [p[0], q[1]]],
                    costats: [w, h],
                    A2: 2 * w * h,
                });
                resta -= 2 * w * h;
            }
        }
        if (resta !== 0) throw new Error('pecesCaixa: les peces no quadren');
        return peces;
    }
    /** Talla un polígon convex en triangles des del primer vèrtex. */
    function ventall(pol) {
        var s = simplifica(pol),
            out = [];
        for (var i = 1; i < s.length - 1; i++) out.push([s[0], s[i], s[i + 1]]);
        return out;
    }

    // ── Polígons a l'atzar (tests i fase F6) ────────────────────────────────
    /**
     * Un polígon simple a l'atzar: k punts de la quadrícula ordenats per l'angle al voltant del seu
     * centre (polígon estrellat), sense vèrtexs alineats ni repetits.
     * @param {object} atzar  de js/motor/atzar.js
     * @param {object} o      { n: punts per costat del tauler, minV, maxV, x0, y0, x1, y1 }
     */
    function poligonAtzar(atzar, o) {
        o = o || {};
        var n = o.n || 11,
            minV = o.minV || 3,
            maxV = o.maxV || 7;
        var x0 = o.x0 !== undefined ? o.x0 : 0,
            y0 = o.y0 !== undefined ? o.y0 : 0,
            x1 = o.x1 !== undefined ? o.x1 : n - 1,
            y1 = o.y1 !== undefined ? o.y1 : n - 1;
        for (var intent = 0; intent < 2000; intent++) {
            var k = atzar.enter(minV, maxV),
                pts = [],
                vist = {};
            while (pts.length < k) {
                var p = [atzar.enter(x0, x1), atzar.enter(y0, y1)];
                if (vist[clau(p)]) continue;
                vist[clau(p)] = true;
                pts.push(p);
            }
            // Ordre per angle al voltant del centre, amb el centre multiplicat per k (tot enter)
            var cx = 0,
                cy = 0;
            pts.forEach(function (q) {
                cx += q[0];
                cy += q[1];
            });
            pts.sort(function (a, b) {
                return Math.atan2(a[1] * k - cy, a[0] * k - cx) - Math.atan2(b[1] * k - cy, b[0] * k - cx);
            });
            if (!validaPoligon(pts).ok) continue;
            if (simplifica(pts).length !== pts.length) continue;
            if (o.convex && !esConvex(pts)) continue;
            return area2(pts) < 0 ? pts.reverse() : pts;
        }
        throw new Error('poligonAtzar: no s’ha trobat cap polígon');
    }
    /** Una regió amb h forats (triangles o rectangles petits estrictament dins). */
    function regioAtzar(atzar, o) {
        o = o || {};
        var n = o.n || 11,
            h = o.forats || 0;
        for (var intent = 0; intent < 500; intent++) {
            var voraPol = poligonAtzar(atzar, { n: n, minV: 4, maxV: 9 });
            var forats = [],
                c = caixa(voraPol);
            for (var t = 0; t < 300 && forats.length < h; t++) {
                var x = atzar.enter(c.x0 + 1, Math.max(c.x0 + 1, c.x1 - 2)),
                    y = atzar.enter(c.y0 + 1, Math.max(c.y0 + 1, c.y1 - 2));
                var w = atzar.enter(1, 2),
                    hh = atzar.enter(1, 2);
                var f =
                    atzar.real() < 0.5
                        ? [
                              [x, y],
                              [x + w, y],
                              [x + w, y + hh],
                              [x, y + hh],
                          ]
                        : [
                              [x, y],
                              [x + w, y],
                              [x, y + hh],
                          ];
                if (validaForat(voraPol, f, forats).ok) forats.push(f);
            }
            if (forats.length === h) return { vora: voraPol, forats: forats };
        }
        throw new Error('regioAtzar: no s’ha trobat cap regió');
    }

    return {
        mcd: mcd,
        clau: clau,
        iguals: iguals,
        creu: creu,
        sobreSegment: sobreSegment,
        segmentsEsTallen: segmentsEsTallen,
        area2: area2,
        vora: vora,
        voraRegio: voraRegio,
        caixa: caixa,
        classifica: classifica,
        classificaRegio: classificaRegio,
        compta: compta,
        validaPoligon: validaPoligon,
        validaForat: validaForat,
        simplifica: simplifica,
        esRectangleAxial: esRectangleAxial,
        triangleRectangleAxial: triangleRectangleAxial,
        esTriangle: esTriangle,
        esConvex: esConvex,
        pecesCaixa: pecesCaixa,
        ventall: ventall,
        poligonAtzar: poligonAtzar,
        regioAtzar: regioAtzar,
    };
});
