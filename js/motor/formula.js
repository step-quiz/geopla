/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/motor/formula.js
 * ROL: Llegeix la fórmula que escriu l'alumne (fases F5 i F7) i l'avalua amb
 *      fraccions exactes. Sense eval: algorisme de la via fèrria (shunting-yard).
 * ARQUITECTURA: Pur, sense DOM. Accepta:
 *   - nombres amb coma o punt decimal (0,5 · 0.5) i fraccions (1/2);
 *   - les variables permeses (B, I i, a F7, H), en majúscula o minúscula;
 *   - + − - · * / : i parèntesis; un «A =» opcional al principi;
 *   - multiplicació implícita: 0,5B · 2(I + 1) · B(…) · (…)(…) · (…)B.
 *   Qualsevol altra cosa és un error amb un codi (els textos són a js/ui/textos.js).
 *   Els valors són fraccions { n, d } (d > 0, irreductibles).
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Formula = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ── Fraccions exactes ───────────────────────────────────────────────────
    function mcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            var t = a % b;
            a = b;
            b = t;
        }
        return a || 1;
    }
    function frac(n, d) {
        if (d === undefined) d = 1;
        if (d === 0) throw new Error('divisio0');
        if (d < 0) {
            n = -n;
            d = -d;
        }
        var g = mcd(n, d);
        return { n: n / g, d: d / g };
    }
    var OPS = {
        '+': function (a, b) {
            return frac(a.n * b.d + b.n * a.d, a.d * b.d);
        },
        '-': function (a, b) {
            return frac(a.n * b.d - b.n * a.d, a.d * b.d);
        },
        '*': function (a, b) {
            return frac(a.n * b.n, a.d * b.d);
        },
        '/': function (a, b) {
            if (b.n === 0) throw new Error('divisio0');
            return frac(a.n * b.d, a.d * b.n);
        },
    };
    var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, 'neg': 3 };

    // ── Fitxes (tokens) ─────────────────────────────────────────────────────
    function fitxes(text, variables) {
        var s = String(text || '').replace(/\s+/g, '');
        s = s.replace(/^[aA]=/, '');
        if (!s) return { error: 'buida' };
        var out = [],
            i = 0;
        while (i < s.length) {
            var c = s[i];
            if (/[0-9]/.test(c)) {
                var m = /^(\d+)(?:[.,](\d+))?/.exec(s.slice(i));
                var dec = m[2] || '';
                out.push({ t: 'num', v: frac(parseInt(m[1] + dec, 10), Math.pow(10, dec.length)) });
                i += m[0].length;
                if (s[i] === ',' || s[i] === '.') return { error: 'caracter', pos: i, car: s[i] };
                continue;
            }
            if (/[a-zA-Z]/.test(c)) {
                var v = c.toUpperCase();
                if (variables.indexOf(v) < 0) return { error: 'variable', pos: i, car: c };
                out.push({ t: 'var', v: v });
                i++;
                continue;
            }
            var op = { '+': '+', '-': '-', '−': '-', '·': '*', '*': '*', '/': '/', ':': '/' }[c];
            if (op) {
                out.push({ t: 'op', v: op });
                i++;
                continue;
            }
            if (c === '(' || c === ')') {
                out.push({ t: c });
                i++;
                continue;
            }
            return { error: 'caracter', pos: i, car: c };
        }
        // Multiplicació implícita: (nombre | variable | ")") seguit de (variable | "("), i ")" seguit de nombre
        var amb = [];
        for (var k = 0; k < out.length; k++) {
            var a = amb[amb.length - 1],
                b = out[k];
            if (
                a &&
                (a.t === 'num' || a.t === 'var' || a.t === ')') &&
                (b.t === 'var' || b.t === '(' || (a.t === ')' && b.t === 'num'))
            )
                amb.push({ t: 'op', v: '*' });
            amb.push(b);
        }
        return { fitxes: amb };
    }

    // ── Via fèrria → notació polonesa inversa ───────────────────────────────
    /**
     * @param {string}   text       la fórmula de l'alumne
     * @param {string[]} variables  les permeses, p. ex. ['B', 'I']
     * @returns {{ ok: true, rpn, usades } | { ok: false, error, pos?, car? }}
     */
    function llegeix(text, variables) {
        variables = variables || ['B', 'I'];
        var f = fitxes(text, variables);
        if (f.error) return { ok: false, error: f.error, pos: f.pos, car: f.car };
        var sortida = [],
            pila = [],
            espera = true; // s'espera un operand (al principi, després d'un operador o d'un "(")
        for (var i = 0; i < f.fitxes.length; i++) {
            var t = f.fitxes[i];
            if (t.t === 'num' || t.t === 'var') {
                if (!espera) return { ok: false, error: 'operand' };
                sortida.push(t);
                espera = false;
            } else if (t.t === 'op') {
                var op = t.v;
                if (espera) {
                    if (op === '-') op = 'neg';
                    else if (op === '+')
                        continue; // + unari: no fa res
                    else return { ok: false, error: 'operand' };
                }
                while (pila.length) {
                    var cim = pila[pila.length - 1];
                    if (cim === '(') break;
                    // neg és unari i per la dreta: no treu res del mateix nivell
                    if (op === 'neg' ? PREC[cim] > PREC[op] : PREC[cim] >= PREC[op])
                        sortida.push({ t: 'op', v: pila.pop() });
                    else break;
                }
                pila.push(op);
                espera = true;
            } else if (t.t === '(') {
                if (!espera) return { ok: false, error: 'operand' };
                pila.push('(');
                espera = true;
            } else {
                if (espera) return { ok: false, error: 'operand' };
                while (pila.length && pila[pila.length - 1] !== '(') sortida.push({ t: 'op', v: pila.pop() });
                if (!pila.length) return { ok: false, error: 'parentesi' };
                pila.pop();
                espera = false;
            }
        }
        if (espera) return { ok: false, error: 'operand' };
        while (pila.length) {
            var p = pila.pop();
            if (p === '(') return { ok: false, error: 'parentesi' };
            sortida.push({ t: 'op', v: p });
        }
        var usades = [];
        sortida.forEach(function (x) {
            if (x.t === 'var' && usades.indexOf(x.v) < 0) usades.push(x.v);
        });
        return { ok: true, rpn: sortida, usades: usades };
    }

    /** Avalua una fórmula llegida amb valors enters de les variables. Retorna { n, d } o null (divisió per 0). */
    function avalua(rpn, valors) {
        var pila = [];
        try {
            for (var i = 0; i < rpn.length; i++) {
                var t = rpn[i];
                if (t.t === 'num') pila.push(t.v);
                else if (t.t === 'var') pila.push(frac(valors[t.v], 1));
                else if (t.v === 'neg') {
                    var x = pila.pop();
                    pila.push(frac(-x.n, x.d));
                } else {
                    var b = pila.pop(),
                        a = pila.pop();
                    pila.push(OPS[t.v](a, b));
                }
            }
        } catch (e) {
            if (e.message === 'divisio0') return null;
            throw e;
        }
        return pila[0];
    }

    /**
     * Prova la fórmula amb una llista de casos { B, I, H, A2 } (A2 = doble de l'àrea).
     * @returns {{ ok: true } | { ok: false, cas, valor }}  el primer contraexemple (valor: { n, d } o null)
     */
    function comprova(rpn, casos) {
        for (var i = 0; i < casos.length; i++) {
            var c = casos[i];
            var v = avalua(rpn, { B: c.B, I: c.I, H: c.H || 0 });
            if (!v || v.n * 2 !== c.A2 * v.d) return { ok: false, cas: c, valor: v };
        }
        return { ok: true };
    }

    /** Una fracció com a text català: 6 · 6,5 · 13/3 · −2,5 */
    function text(v) {
        if (!v) return '—';
        if (v.d === 1) return String(v.n).replace('-', '−');
        // Si el denominador només té factors 2 i 5, s'escriu amb decimals (coma)
        var d = v.d;
        while (d % 2 === 0) d /= 2;
        while (d % 5 === 0) d /= 5;
        if (d === 1) {
            var x = v.n / v.d;
            return String(Math.round(x * 1e6) / 1e6)
                .replace('.', ',')
                .replace('-', '−');
        }
        return (v.n < 0 ? '−' : '') + Math.abs(v.n) + '/' + v.d;
    }

    return { frac: frac, llegeix: llegeix, avalua: avalua, comprova: comprova, text: text };
});
