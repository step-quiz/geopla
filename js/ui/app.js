/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/ui/app.js
 * ROL: Controlador del Geoplà de Pick (index.html): fases, passos de cada
 *      polígon (construir → comptar → àrea), fórmula, taula, desat i impressió.
 * ARQUITECTURA:
 * - Tota la matemàtica és als motors purs (js/motor/*); aquí només hi ha
 *   l'ordre dels passos, els missatges i la pàgina.
 * - Passos d'un polígon (item.pas):
 *     'construir' → 'comptar' → 'area' (F1–F4) → 'fet'
 *     F5 i F7: 'construir' → 'comptar' → 'fet' (l'àrea la dona l'eina)
 *     F6: el polígon el dona l'eina: 'comptar' → 'prediu' → 'fet'
 *     F5 i F7, a l'última etapa: 'formula'
 * - Desat: localStorage amb try/catch (claus geopla:v1:…). Sense desat, es
 *   pot fer igual però no es recorda res.
 * - Paràmetres URL: ?perfil=pi (tauler 6 × 6, només F1–F3) · ?fase=F3 (el
 *   professorat obre fins a aquella fase). Els valors estranys s'ignoren.
 * DEPENDÈNCIES (ordre a index.html): js/motor/atzar.js, geometria.js,
 *      formula.js, fases.js, js/ui/textos.js, js/ui/tauler.js, aquest fitxer.
 * ============================================================================
 */
(function () {
    'use strict';
    var G = window.Geometria,
        F = window.Formula,
        Fases = window.Fases,
        Atzar = window.Atzar,
        T = window.GeoplaTextos;
    var $ = function (id) {
        return document.getElementById(id);
    };

    // ── Configuració de la URL ─────────────────────────────────────────────
    var params;
    try {
        params = new URLSearchParams(location.search);
    } catch (e) {
        params = new URLSearchParams('');
    }
    var PERFIL = params.get('perfil') === 'pi' ? 'pi' : '';
    var N = PERFIL === 'pi' ? 6 : 11;
    var faseURL = (function () {
        var f = String(params.get('fase') || '').toUpperCase();
        if (/^[1-7]$/.test(f)) f = 'F' + f;
        return Fases.llista(PERFIL).indexOf(f) >= 0 ? f : null;
    })();

    // ── Desat ──────────────────────────────────────────────────────────────
    var SUFIX = PERFIL ? '-' + PERFIL : '';
    var CLAU_ESTAT = 'geopla:v1:estat' + SUFIX,
        CLAU_TAULA = 'geopla:v1:taula' + SUFIX,
        CLAU_LLAVOR = 'geopla:v1:llavor';
    function llegeix(clau) {
        try {
            var t = localStorage.getItem(clau);
            return t ? JSON.parse(t) : null;
        } catch (e) {
            return null;
        }
    }
    function desa(clau, valor) {
        try {
            localStorage.setItem(clau, JSON.stringify(valor));
        } catch (e) {
            /* sense localStorage: es continua sense desar */
        }
    }
    // Les files guardades es revisen: només enters i polígons de la mida del tauler
    function filaValida(r) {
        var punt = function (p) {
            return (
                Array.isArray(p) &&
                p.length === 2 &&
                p.every(Number.isInteger) &&
                p[0] >= 0 &&
                p[1] >= 0 &&
                p[0] < N &&
                p[1] < N
            );
        };
        var pol = function (q) {
            return Array.isArray(q) && q.length >= 3 && q.length <= 60 && q.every(punt);
        };
        return (
            r &&
            ['B', 'I', 'A2', 'h'].every(function (k) {
                return Number.isInteger(r[k]) && r[k] >= 0;
            }) &&
            pol(r.pol) &&
            Array.isArray(r.forats) &&
            r.forats.every(pol)
        );
    }

    var estat = Fases.restaura(llegeix(CLAU_ESTAT), PERFIL);
    if (faseURL) estat = Fases.obreFins(estat, faseURL);
    var taula = (llegeix(CLAU_TAULA) || []).filter(filaValida).slice(-200);
    var llavor = llegeix(CLAU_LLAVOR);
    if (typeof llavor !== 'string') {
        llavor = String(Date.now()); // només per variar els polígons de F6 entre ordinadors
        desa(CLAU_LLAVOR, llavor);
    }
    function desaTot() {
        desa(CLAU_ESTAT, estat);
        desa(CLAU_TAULA, taula);
    }

    // ── Estat del polígon que s'està fent ──────────────────────────────────
    var item = null;
    var fetsSessio = 0; // per variar el «Molt bé!» sense atzar

    var els = {
        fases: $('fases'),
        progres: $('progres'),
        titol: $('titol-fase'),
        instruccio: $('instruccio'),
        panell: $('panell'),
        feedback: $('feedback'),
        accions: $('accions'),
        taula: $('taula-cos'),
        taulaBuida: $('taula-buida'),
        colH: $('col-h'),
        anunci: $('anunci'),
        svg: $('tauler'),
    };

    var tauler = window.Tauler.crea(els.svg, {
        n: N,
        onPunt: onPunt,
        onArrossega: onArrossega,
        onTecla: onTecla,
        onCursor: function (p) {
            var k = item && item.pas === 'comptar' ? item.marques[p[0] + ',' + p[1]] : null;
            els.anunci.textContent = 'Punt (' + p[0] + ', ' + p[1] + ')' + (k ? ': ' + k : '');
        },
    });
    els.svg.setAttribute(
        'aria-label',
        'Geoplà de ' + N + ' per ' + N + ' punts. Fletxes per moure’t, Retorn per tocar un punt, Retrocés per desfer.'
    );

    // ── Utilitats ──────────────────────────────────────────────────────────
    var esc = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    var textArea = function (A2) {
        return F.text(F.frac(A2, 2));
    };
    // Un nombre escrit per l'alumne: 6 · 6,5 · 6.5 · 13/2 → { n, d } o null
    function llegeixNombre(txt) {
        var s = String(txt || '')
            .trim()
            .replace(/\s+/g, '');
        var m = /^(\d+)(?:[.,](\d+))?$/.exec(s);
        if (m) {
            var dec = m[2] || '';
            return F.frac(parseInt(m[1] + dec, 10), Math.pow(10, dec.length));
        }
        m = /^(\d+)\/(\d+)$/.exec(s);
        if (m && +m[2] > 0) return F.frac(+m[1], +m[2]);
        return null;
    }
    var esA2 = function (v, A2) {
        return v && v.n * 2 === A2 * v.d;
    }; // v val A2/2?
    function missatges(llista, tipus) {
        // Com a molt 2 missatges a la vegada; mai només «incorrecte»
        els.feedback.innerHTML = llista
            .slice(0, 2)
            .map(function (m) {
                return (
                    '<p class="fb fb-' +
                    (tipus || 'error') +
                    '"><span class="fb-icona" aria-hidden="true">' +
                    (tipus === 'be' ? '✓' : tipus === 'info' ? 'ℹ' : '✗') +
                    '</span> ' +
                    m +
                    '</p>'
                );
            })
            .join('');
    }
    function netejaMissatges() {
        els.feedback.innerHTML = '';
    }
    function boto(text, fn, principal) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = principal ? 'btn btn-principal' : 'btn';
        b.textContent = text;
        b.addEventListener('click', fn);
        els.accions.appendChild(b);
        return b;
    }
    function accions() {
        els.accions.innerHTML = '';
    }
    var vora = function () {
        return item.pols[0];
    };
    var forats = function () {
        return item.pols.slice(1).filter(function (p) {
            return p.tancat;
        });
    };
    function regio() {
        return {
            vora: vora().punts,
            forats: forats().map(function (p) {
                return p.punts;
            }),
        };
    }

    // ── Fases (pestanyes) i progrés ─────────────────────────────────────────
    function pintaFases() {
        els.fases.innerHTML = '';
        Fases.llista(PERFIL).forEach(function (id) {
            var b = document.createElement('button');
            b.type = 'button';
            var oberta = Fases.esOberta(estat, id);
            b.className = 'fase' + (id === estat.fase ? ' actual' : '');
            b.disabled = !oberta;
            b.innerHTML =
                '<span class="fase-id">' +
                id +
                '</span> <span class="fase-nom">' +
                esc(T.FASES[id].curt) +
                '</span>' +
                (oberta ? '' : ' <span class="cadenat" aria-hidden="true">🔒</span>');
            b.setAttribute('aria-label', id + ': ' + T.FASES[id].nom + (oberta ? '' : ' (tancada)'));
            if (id === estat.fase) b.setAttribute('aria-current', 'step');
            b.addEventListener('click', function () {
                if (!Fases.esOberta(estat, id) || id === estat.fase) return;
                estat = Fases.tria(estat, id);
                desaTot();
                comencaItem();
            });
            els.fases.appendChild(b);
        });
        els.titol.textContent = estat.fase + ' · ' + T.FASES[estat.fase].nom;
        var p = Fases.progres(estat);
        var punts = '';
        for (var i = 0; i < p.cal; i++) punts += '<span class="punt' + (i < p.fets ? ' fet' : '') + '"></span>';
        els.progres.innerHTML = punts;
        els.progres.setAttribute('aria-label', p.fets + ' de ' + p.cal);
    }

    // ── Començar un polígon ─────────────────────────────────────────────────
    function comencaItem() {
        item = {
            pas: 'construir',
            pols: [{ punts: [], tancat: false, classe: 'vora' }],
            actiu: 0,
            valid: false,
            marques: {},
            errorsMarques: {},
            capes: [],
            compte: null,
        };
        netejaMissatges();
        pintaFases();
        var f = estat.fase;
        if ((f === 'F5' && Fases.etapaF5(estat) === 'formula') || (f === 'F7' && Fases.etapaF7(estat) === 'formula')) {
            item.pas = 'formula';
        } else if (f === 'F6') {
            var at = Atzar.crea('F6|' + llavor + '|' + (estat.encerts.F6 || 0) + '|' + taula.length);
            item.pols[0] = { punts: G.poligonAtzar(at, { n: N, minV: 4, maxV: 7 }), tancat: true, classe: 'vora' };
            item.valid = true;
            item.compte = G.compta(regio());
            item.pas = 'comptar';
        }
        pinta();
    }

    // ── Pintar tauler + panell ──────────────────────────────────────────────
    function pintaTauler() {
        var construint = item.pas === 'construir' && estat.fase !== 'F6';
        tauler.pinta({
            poligons: item.pols,
            actiu: construint ? item.actiu : -1,
            arrossegable: construint,
            mostraVertexs: item.pas === 'construir',
            marques: item.pas === 'comptar' ? item.marques : {},
            errorsMarques: item.pas === 'comptar' ? item.errorsMarques : {},
            capes: item.capes,
        });
    }
    function pinta() {
        pintaTauler();
        pintaPanell();
    }

    function pintaPanell() {
        accions();
        var f = estat.fase,
            html = '';
        if (item.pas === 'construir') {
            var clau = f;
            if (f === 'F5') clau = 'F5' + Fases.etapaF5(estat);
            if (f === 'F7') clau = item.actiu === 0 ? 'F7vora' : 'F7forat';
            els.instruccio.textContent = T.construir[clau];
            html = '<p class="nota">' + esc(T.construir.ajuda) + '</p>';
            els.panell.innerHTML = html;
            var pol = item.pols[item.actiu];
            boto('Desfés', function () {
                onTecla('desfes');
            });
            if (pol.punts.length >= 3 && !pol.tancat)
                boto('Tanca el polígon', function () {
                    tanca();
                });
            boto('Esborra', function () {
                comencaItem();
            });
            if (item.valid) {
                if (f === 'F7' && item.actiu === 0) boto('Ara el forat →', afegeixForat, true);
                else {
                    if (f === 'F7') boto('Un altre forat', afegeixForat);
                    boto('Ja està →', anarAComptar, true);
                }
            }
        } else if (item.pas === 'comptar') {
            els.instruccio.textContent = forats().length ? T.comptar.instruccioForat : T.comptar.instruccio;
            html =
                '<div class="comptes">' +
                '<label class="compte"><span class="icona-vora" aria-hidden="true"></span> Vora <b>B</b> = <input id="in-b" inputmode="numeric" autocomplete="off" size="3"></label>' +
                '<label class="compte"><span class="icona-dins" aria-hidden="true"></span> Dins <b>I</b> = <input id="in-i" inputmode="numeric" autocomplete="off" size="3"></label>' +
                '</div>';
            els.panell.innerHTML = html;
            posaComptesDeMarques();
            boto('Comprova', comprovaCompte, true);
            boto('Treu les marques', function () {
                item.marques = {};
                item.errorsMarques = {};
                posaComptesDeMarques();
                pintaTauler();
            });
        } else if (item.pas === 'area') {
            pintaArea();
        } else if (item.pas === 'prediu') {
            var fr = estat.f5.formula || 'I + B/2 − 1';
            els.instruccio.textContent = T.f5.prediu;
            els.panell.innerHTML =
                '<p class="formula-recordatori">A = ' +
                esc(fr.replace(/^\s*[aA]\s*=\s*/, '')) +
                '</p><p class="nota">B = ' +
                item.compte.B +
                ', I = ' +
                item.compte.I +
                '</p>' +
                '<label class="camp">A = <input id="in-a" inputmode="decimal" autocomplete="off" size="6"></label>';
            boto('Comprova', comprovaPrediccio, true);
        } else if (item.pas === 'formula') {
            var ambH = f === 'F7';
            els.instruccio.textContent = ambH ? T.f5.formulaH : T.f5.formula;
            els.panell.innerHTML =
                '<label class="camp formula">A = <input id="in-formula" autocomplete="off" spellcheck="false" placeholder="' +
                (ambH ? 'amb B, I i H' : 'amb B i I') +
                '"></label>' +
                '<p class="nota">' +
                esc(f === 'F5' ? T.f5.preguntaI0 + ' ' + T.f5.preguntaB4 : '') +
                '</p>';
            boto(T.f5.comprova, comprovaFormula, true);
            var inp = $('in-formula');
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') comprovaFormula();
            });
        }
        // Enter als camps = Comprova
        [].forEach.call(els.panell.querySelectorAll('input'), function (inp) {
            if (inp.id === 'in-formula') return;
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    var b = els.accions.querySelector('.btn-principal');
                    if (b) b.click();
                }
            });
        });
    }

    // ── Construir ──────────────────────────────────────────────────────────
    function onPunt(p) {
        if (!item) return;
        if (item.pas === 'construir' && estat.fase !== 'F6') return posaVertex(p);
        if (item.pas === 'comptar') return marca(p);
    }
    function posaVertex(p) {
        var pol = item.pols[item.actiu];
        if (pol.tancat) {
            missatges(['El polígon ja és tancat. Arrossega un vèrtex o toca «Desfés».'], 'info');
            return;
        }
        var i = pol.punts.findIndex(function (q) {
            return G.iguals(p, q);
        });
        if (i === 0 && pol.punts.length >= 3) return tanca();
        if (i >= 0) {
            missatges([T.errorsPoligon.repetit]);
            return;
        }
        pol.punts.push(p);
        netejaMissatges();
        pinta();
    }
    function tanca() {
        var pol = item.pols[item.actiu];
        if (pol.punts.length < 3) return;
        pol.tancat = true;
        valida();
        pinta();
    }
    function onArrossega(i, p, final) {
        if (!item || item.pas !== 'construir') return;
        var pol = item.pols[item.actiu];
        if (
            pol.punts.some(function (q, j) {
                return j !== i && G.iguals(p, q);
            })
        )
            return;
        pol.punts[i] = p;
        if (pol.tancat) {
            if (final) valida();
            else item.valid = false;
        }
        if (final) pinta();
        else pintaTauler();
    }
    function onTecla(nom) {
        if (!item) return;
        if (nom === 'desfes' && item.pas === 'construir' && estat.fase !== 'F6') {
            var pol = item.pols[item.actiu];
            if (pol.tancat) pol.tancat = false;
            else if (pol.punts.length) pol.punts.pop();
            else if (item.actiu > 0) {
                item.pols.splice(item.actiu, 1);
                item.actiu = item.pols.length - 1;
                item.pols[item.actiu].tancat = true;
            }
            item.valid = false;
            netejaMissatges();
            if (item.pols[item.actiu].tancat) valida();
            pinta();
        } else if (nom === 'esc') {
            netejaMissatges();
        }
    }
    // Valida el polígon actiu (i, si és la vora, la forma de la fase)
    function valida() {
        var f = estat.fase,
            pol = item.pols[item.actiu];
        item.valid = false;
        var v;
        if (item.actiu === 0) v = G.validaPoligon(pol.punts);
        else
            v = G.validaForat(
                vora().punts,
                pol.punts,
                item.pols.slice(1, item.actiu).map(function (q) {
                    return q.punts;
                })
            );
        if (!v.ok) {
            missatges([T.errorsPoligon[v.error] || T.errorsPoligon.creuen]);
            return;
        }
        if (item.actiu === 0) {
            var e = null,
                s = G.simplifica(pol.punts);
            if (f === 'F1' && !G.esRectangleAxial(pol.punts)) e = T.errorsForma.F1;
            else if (f === 'F2' && !G.triangleRectangleAxial(pol.punts)) e = T.errorsForma.F2;
            else if (f === 'F3' && !G.esTriangle(pol.punts)) e = T.errorsForma.F3;
            else if (f === 'F3' && G.triangleRectangleAxial(pol.punts)) e = T.errorsForma.F3recte;
            else if (f === 'F4' && s.length < 4) e = T.errorsForma.F4pocs;
            else if (f === 'F4' && !G.esConvex(pol.punts)) e = T.errorsForma.F4concau;
            if (e) {
                missatges([e]);
                return;
            }
        }
        item.valid = true;
        missatges(['Polígon correcte. Quan vulguis, continua amb el botó de sota.'], 'be');
    }
    function afegeixForat() {
        item.pols.push({ punts: [], tancat: false, classe: 'forat' });
        item.actiu = item.pols.length - 1;
        item.valid = false;
        netejaMissatges();
        pinta();
    }
    function anarAComptar() {
        // Un forat a mig fer es descarta
        item.pols = item.pols.filter(function (p, i) {
            return i === 0 || p.tancat;
        });
        item.actiu = 0;
        item.compte = G.compta(regio());
        item.pas = 'comptar';
        netejaMissatges();
        pinta();
    }

    // ── Comptar ────────────────────────────────────────────────────────────
    function marca(p) {
        var k = p[0] + ',' + p[1],
            m = item.marques[k];
        if (!m) item.marques[k] = 'vora';
        else if (m === 'vora') item.marques[k] = 'dins';
        else delete item.marques[k];
        delete item.errorsMarques[k];
        posaComptesDeMarques();
        pintaTauler();
        els.anunci.textContent = 'Punt (' + p[0] + ', ' + p[1] + '): ' + (item.marques[k] || 'sense marca');
    }
    function posaComptesDeMarques() {
        var b = 0,
            i = 0;
        Object.keys(item.marques).forEach(function (k) {
            if (item.marques[k] === 'vora') b++;
            else i++;
        });
        if (!Object.keys(item.marques).length) return;
        var ib = $('in-b'),
            ii = $('in-i');
        if (ib) ib.value = b;
        if (ii) ii.value = i;
    }
    function comprovaCompte() {
        var c = item.compte;
        var b = parseInt($('in-b').value, 10),
            i = parseInt($('in-i').value, 10);
        if (!Number.isInteger(b) || !Number.isInteger(i) || b < 0 || i < 0) {
            missatges(['Escriu els dos nombres: B i I.'], 'info');
            return;
        }
        var m = [];
        // Les marques mal posades (si n'hi ha) es veuen amb un cercle vermell
        item.errorsMarques = {};
        var hiHaMarques = Object.keys(item.marques).length > 0,
            malMarcades = 0;
        Object.keys(item.marques).forEach(function (k) {
            if (c.punts[k] !== item.marques[k]) {
                item.errorsMarques[k] = true;
                malMarcades++;
            }
        });
        var vertexs = item.pols.reduce(function (s, p) {
            return s + p.punts.length;
        }, 0);
        var mB = null,
            mI = null;
        if (b !== c.B) {
            if (forats().length && b === G.vora(vora().punts)) mB = T.comptar.voraForat;
            else if (b === vertexs && vertexs !== c.B) mB = T.comptar.nomesVertexs;
            else if (hiHaMarques && !malMarcades && b < c.B) mB = T.comptar.faltenVora;
            else mB = T.comptar.voraMalament;
        }
        if (i !== c.I) {
            if (i === c.I + c.B) mI = T.comptar.voraComDins;
            else if (forats().length && i > c.I) mI = T.comptar.dinsForat;
            else if (hiHaMarques && !malMarcades && i < c.I) mI = T.comptar.faltenDins;
            else mI = T.comptar.dinsMalament;
        }
        if ((mB || mI) && malMarcades) m.push(T.comptar.marquesMalament);
        if (mB) m.push(mB);
        if (mI) m.push(mI);
        if (m.length) {
            missatges(m);
            pintaTauler();
            return;
        }
        netejaMissatges();
        var f = estat.fase;
        if (f === 'F1' || f === 'F2' || f === 'F3' || f === 'F4') {
            item.pas = 'area';
            pinta();
        } else if (f === 'F6') {
            item.pas = 'prediu';
            pinta();
        } else {
            acaba(); // F5 i F7: l'àrea la dona l'eina
        }
    }

    // ── Àrea (F1–F4) ───────────────────────────────────────────────────────
    function camp(id, etiqueta) {
        return (
            '<label class="camp"><span>' +
            etiqueta +
            '</span> <input id="' +
            id +
            '" inputmode="decimal" autocomplete="off" size="5"></label>'
        );
    }
    function pintaArea() {
        var f = estat.fase,
            pol = G.simplifica(vora().punts),
            cx = G.caixa(pol),
            html = '';
        els.instruccio.textContent = T.area[f];
        item.capes = [];
        if (f === 'F1') {
            item.capes.push({ tipus: 'quadrets', caixa: cx });
            html = camp('in-base', 'Base') + camp('in-alcada', 'Alçada') + camp('in-area', 'Àrea');
        } else if (f === 'F2') {
            item.capes.push({
                tipus: 'contorn',
                punts: [
                    [cx.x0, cx.y0],
                    [cx.x1, cx.y0],
                    [cx.x1, cx.y1],
                    [cx.x0, cx.y1],
                ],
            });
            html = camp('in-rect', 'Rectangle') + camp('in-tri', 'Triangle');
        } else if (f === 'F3') {
            item.peces = G.pecesCaixa(pol);
            item.capes.push({
                tipus: 'contorn',
                punts: [
                    [cx.x0, cx.y0],
                    [cx.x1, cx.y0],
                    [cx.x1, cx.y1],
                    [cx.x0, cx.y1],
                ],
            });
            html = camp('in-caixa', 'Caixa (' + (cx.x1 - cx.x0) + ' × ' + (cx.y1 - cx.y0) + ')');
            item.peces.forEach(function (pc, k) {
                item.capes.push({
                    tipus: 'peca',
                    punts: pc.punts,
                    estil: 'abcd'[k],
                    etiqueta: String(k + 1),
                    lloc: centre(pc.punts),
                });
                html += camp(
                    'in-peca' + k,
                    'Peça ' +
                        (k + 1) +
                        ' (' +
                        (pc.tipus === 'triangle' ? 'triangle ' : 'rectangle ') +
                        pc.costats.join(' × ') +
                        ')'
                );
            });
            html += camp('in-tri', 'Triangle');
        } else if (f === 'F4') {
            item.tris = G.ventall(pol);
            item.tris.forEach(function (t, k) {
                if (k > 0) item.capes.push({ tipus: 'diagonal', a: t[0], b: t[1] });
                item.capes.push({ tipus: 'peca', punts: t, estil: 'tri', etiqueta: 'T' + (k + 1), lloc: centre(t) });
                html +=
                    '<div class="fila-tri">' +
                    camp('in-t' + k, 'T' + (k + 1)) +
                    '<button type="button" class="btn btn-petit" data-caixa="' +
                    k +
                    '">' +
                    esc(T.area.F4caixa) +
                    '</button></div>';
            });
            html += camp('in-suma', 'Polígon');
        }
        els.panell.innerHTML = '<div class="camps">' + html + '</div><p class="nota">' + esc(T.area.format) + '</p>';
        [].forEach.call(els.panell.querySelectorAll('[data-caixa]'), function (b) {
            b.addEventListener('click', function () {
                mostraCaixaF4(+b.dataset.caixa);
            });
        });
        boto('Comprova', comprovaArea, true);
        pintaTauler();
        var primer = els.panell.querySelector('input');
        if (primer) primer.focus({ preventScroll: true });
    }
    function centre(punts) {
        var x = 0,
            y = 0;
        punts.forEach(function (p) {
            x += p[0];
            y += p[1];
        });
        return [x / punts.length - 0.12, y / punts.length - 0.12];
    }
    // F4: la caixa d'un triangle (per calcular-lo com a F3)
    function mostraCaixaF4(k) {
        var t = item.tris[k],
            cx = G.caixa(t);
        item.capes = item.capes.filter(function (c) {
            return !c.f4caixa;
        });
        item.capes.unshift({
            tipus: 'contorn',
            f4caixa: true,
            punts: [
                [cx.x0, cx.y0],
                [cx.x1, cx.y0],
                [cx.x1, cx.y1],
                [cx.x0, cx.y1],
            ],
        });
        G.pecesCaixa(t).forEach(function (pc) {
            item.capes.unshift({ tipus: 'peca', f4caixa: true, punts: pc.punts, estil: 'fora' });
        });
        pintaTauler();
        missatges(
            ['T' + (k + 1) + ': caixa ' + (cx.x1 - cx.x0) + ' × ' + (cx.y1 - cx.y0) + ', menys les peces de fora.'],
            'info'
        );
    }
    function valor(id) {
        var el = $(id);
        return el ? llegeixNombre(el.value) : null;
    }
    function comprovaArea() {
        var f = estat.fase,
            pol = G.simplifica(vora().punts),
            cx = G.caixa(pol),
            m = [],
            ids = [].map.call(els.panell.querySelectorAll('input'), function (i) {
                return i.id;
            });
        if (
            ids.some(function (id) {
                return valor(id) === null;
            })
        ) {
            missatges([T.area.format], 'info');
            return;
        }
        var A2 = item.compte.A2;
        if (f === 'F1') {
            var w = cx.x1 - cx.x0,
                h = cx.y1 - cx.y0;
            var b = valor('in-base'),
                al = valor('in-alcada'),
                a = valor('in-area');
            var bOk = esA2(b, 2 * w) || esA2(b, 2 * h);
            var altre = bOk && esA2(b, 2 * w) ? h : w;
            if (!bOk) m.push(T.area.base);
            else if (!esA2(al, 2 * altre)) m.push(T.area.alcada);
            if (!esA2(a, A2)) m.push(esA2(a, 4 * (w + h)) ? T.area.perimetre : T.area.producte);
        } else if (f === 'F2') {
            var r = valor('in-rect'),
                t = valor('in-tri');
            if (!esA2(r, 2 * A2)) m.push(T.area.rectangle);
            if (!esA2(t, A2)) m.push(esA2(t, 2 * A2) ? T.area.meitat : T.area.triangle);
        } else if (f === 'F3') {
            var A2caixa = 2 * (cx.x1 - cx.x0) * (cx.y1 - cx.y0);
            if (!esA2(valor('in-caixa'), A2caixa)) m.push(T.area.caixa);
            item.peces.forEach(function (pc, k) {
                var v = valor('in-peca' + k);
                if (!esA2(v, pc.A2))
                    m.push(
                        pc.tipus === 'triangle' && esA2(v, 2 * pc.A2) ? T.area.pecaMeitat(k + 1) : T.area.peca(k + 1)
                    );
            });
            if (!esA2(valor('in-tri'), A2)) m.push(T.area.resta);
        } else if (f === 'F4') {
            item.tris.forEach(function (t, k) {
                if (!esA2(valor('in-t' + k), Math.abs(G.area2(t)))) m.push(T.area.triangleN(k + 1));
            });
            if (!esA2(valor('in-suma'), A2)) m.push(T.area.suma);
        }
        if (m.length) {
            missatges(m);
            return;
        }
        acaba();
    }

    // ── F6: predir amb la fórmula ──────────────────────────────────────────
    function comprovaPrediccio() {
        var v = valor('in-a');
        if (!v) {
            missatges([T.area.format], 'info');
            return;
        }
        if (!esA2(v, item.compte.A2)) {
            var fr = (estat.f5.formula || 'I + B/2 − 1').replace(/^\s*[aA]\s*=\s*/, '');
            missatges([T.f5.prediuMal(esc(fr) + ' amb B = ' + item.compte.B + ' i I = ' + item.compte.I + '.')]);
            return;
        }
        acaba();
    }

    // ── Fórmula (F5 i F7) ──────────────────────────────────────────────────
    function comprovaFormula() {
        var f = estat.fase,
            vars = f === 'F7' ? ['B', 'I', 'H'] : ['B', 'I'];
        var txt = $('in-formula').value;
        var r = F.llegeix(txt, vars);
        item.pols = [{ punts: [], tancat: false, classe: 'vora' }];
        if (!r.ok) {
            var E = T.f5.errors,
                msg = E[r.error];
            if (r.error === 'variable') msg = (f === 'F7' ? E.variableH : E.variable)(esc(r.car));
            else if (r.error === 'caracter') msg = E.caracter(esc(r.car));
            missatges([msg]);
            pintaTauler();
            return;
        }
        // 1) Les files de la taula (a F5, només les que no tenen forats)
        var files = taula.filter(function (row) {
            return f === 'F7' || row.h === 0;
        });
        var casos = files.map(function (row) {
            return { B: row.B, I: row.I, H: row.h, A2: row.A2, fila: taula.indexOf(row) + 1, row: row };
        });
        var res = F.comprova(r.rpn, casos);
        if (!res.ok) {
            mostraContraexemple(res, true);
            return;
        }
        // 2) 50 polígons a l'atzar (sempre els mateixos)
        var at = Atzar.crea('comprova-' + f),
            aleat = [];
        for (var k = 0; k < 50; k++) {
            var reg =
                f === 'F7'
                    ? G.regioAtzar(at, { n: N, forats: k % 3 })
                    : { vora: G.poligonAtzar(at, { n: N }), forats: [] };
            var c = G.compta(reg);
            aleat.push({ B: c.B, I: c.I, H: c.h, A2: c.A2, regio: reg });
        }
        res = F.comprova(r.rpn, aleat);
        if (!res.ok) {
            mostraContraexemple(res, false);
            return;
        }
        var obre = Fases.acceptaFormula(estat, txt);
        estat = obre.estat;
        item.pols = [{ punts: [], tancat: false, classe: 'vora' }]; // fora el contraexemple
        item.capes = [];
        pintaTauler();
        desaTot();
        pintaFases();
        accions();
        if (f === 'F5') {
            missatges([T.f5.pick], 'be');
            els.panell.innerHTML = '<p class="bellesa">A = I + B/2 − 1</p>';
            if (obre.obre) boto('Vés a ' + obre.obre + ' →', vesA(obre.obre), true);
        } else {
            missatges([T.f5.forats], 'be');
            els.panell.innerHTML = '<p class="bellesa">A = I + B/2 − 1 + H</p>' + reeveHTML();
        }
    }
    function mostraContraexemple(res, deTaula) {
        var c = res.cas;
        var reg = deTaula ? { vora: c.row.pol, forats: c.row.forats } : c.regio;
        item.pols = [{ punts: reg.vora, tancat: true, classe: 'contra' }].concat(
            reg.forats.map(function (q) {
                return { punts: q, tancat: true, classe: 'forat' };
            })
        );
        item.capes = [];
        pintaTauler();
        var m = [T.f5.contraexemple(c.B, c.I, textArea(c.A2), F.text(res.valor), estat.fase === 'F7' ? c.H : 0)];
        if (deTaula) m.unshift(T.f5.contraTaula(c.fila));
        missatges(m);
    }
    function reeveHTML() {
        // Tetraedre de Reeve amb r = 3: (0,0,0), (1,0,0), (0,1,0), (1,1,3). Dibuix propi, en perspectiva
        // cavallera, dins de la seva caixa 1 × 1 × 3 (en gris); els punts són tots els de la xarxa de la caixa.
        var P = function (x, y, z) {
            return [40 + x * 90 + y * 44, 196 - z * 48 - y * 30];
        };
        var seg = function (a, b, cls) {
            return (
                '<line class="' + cls + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'
            );
        };
        var h = '',
            x,
            y,
            z;
        // Caixa
        for (x = 0; x <= 1; x++) for (y = 0; y <= 1; y++) h += seg(P(x, y, 0), P(x, y, 3), 'rv-caixa');
        for (z = 0; z <= 3; z += 3) {
            h += seg(P(0, 0, z), P(1, 0, z), 'rv-caixa') + seg(P(0, 1, z), P(1, 1, z), 'rv-caixa');
            h += seg(P(0, 0, z), P(0, 1, z), 'rv-caixa') + seg(P(1, 0, z), P(1, 1, z), 'rv-caixa');
        }
        for (x = 0; x <= 1; x++)
            for (y = 0; y <= 1; y++)
                for (z = 0; z <= 3; z++) {
                    var q = P(x, y, z);
                    h += '<circle class="rv-punt" cx="' + q[0] + '" cy="' + q[1] + '" r="2.6"/>';
                }
        var v = [P(0, 0, 0), P(1, 0, 0), P(0, 1, 0), P(1, 1, 3)];
        h += '<path class="rv-cara" d="M' + v[0] + ' L' + v[1] + ' L' + v[3] + ' Z"/>';
        h += seg(v[0], v[2], 'rv-amagada') + seg(v[2], v[1], 'rv-amagada') + seg(v[2], v[3], 'rv-amagada');
        h += seg(v[0], v[1], 'rv-aresta') + seg(v[0], v[3], 'rv-aresta') + seg(v[1], v[3], 'rv-aresta');
        v.forEach(function (q) {
            h += '<circle class="rv-vertex" cx="' + q[0] + '" cy="' + q[1] + '" r="4.2"/>';
        });
        return (
            '<figure class="reeve"><svg viewBox="0 0 200 215" role="img" aria-label="Tetraedre de Reeve dins d’una caixa d’1 per 1 per 3: té quatre vèrtexs a la xarxa i cap altre punt de la xarxa a dins ni a la vora">' +
            h +
            '</svg><figcaption>' +
            esc(T.f5.reeve) +
            '</figcaption></figure>'
        );
    }

    // ── Fi d'un polígon ────────────────────────────────────────────────────
    function acaba() {
        var c = item.compte,
            f = estat.fase;
        var fila = {
            B: c.B,
            I: c.I,
            A2: c.A2,
            h: c.h,
            fase: f,
            pol: vora().punts.slice(),
            forats: forats().map(function (p) {
                return p.punts.slice();
            }),
        };
        taula.push(fila);
        var r = Fases.registra(estat, { B: c.B, I: c.I, h: c.h });
        estat = r.estat;
        desaTot();
        item.pas = 'fet';
        item.capes = [];
        pintaTaula(true);
        pintaFases();
        accions();
        els.panell.innerHTML = '';
        fetsSessio++;
        var m = [];
        if (f === 'F5' || f === 'F7') m.push(T.area.donada(textArea(c.A2)));
        if (r.motiu) m.push(T.f5[r.motiu]);
        else m.push(PERFIL ? T.bePI : T.be[fetsSessio % T.be.length]);
        if (f === 'F7' && c.h) {
            var ff = estat.f5.formula && F.llegeix(estat.f5.formula, ['B', 'I']);
            var rpn = ff && ff.ok ? ff.rpn : F.llegeix('I + B/2 - 1').rpn;
            var vp = F.avalua(rpn, { B: c.B, I: c.I });
            m = [T.f5.falla(F.text(vp), textArea(c.A2))];
        }
        missatges(m, r.motiu ? 'info' : 'be');
        if (r.obre || estat.acabat) {
            var nota = PERFIL && estat.acabat ? T.bellesa.PI : T.bellesa[f];
            if (nota) els.panell.innerHTML = '<p class="bellesa-text">' + esc(nota) + '</p>';
        }
        if (r.obre) {
            els.panell.innerHTML += '<p class="obre">' + esc(T.obre(r.obre)) + '</p>';
            boto('Vés a ' + r.obre + ' →', vesA(r.obre), true);
            boto('Un altre aquí', comencaItem);
        } else {
            boto(Fases.progres(estat).etapa === 'formula' ? 'Ara la fórmula →' : 'Un altre →', comencaItem, true);
        }
        pintaTauler();
    }
    function vesA(id) {
        return function () {
            estat = Fases.tria(estat, id);
            desaTot();
            comencaItem();
        };
    }

    // ── Taula ──────────────────────────────────────────────────────────────
    function pintaTaula(nova) {
        var ambH =
            taula.some(function (r) {
                return r.h > 0;
            }) || Fases.esOberta(estat, 'F7');
        els.colH.hidden = !ambH;
        els.taulaBuida.hidden = taula.length > 0;
        els.taula.innerHTML = taula
            .map(function (r, k) {
                return (
                    '<tr' +
                    (nova && k === taula.length - 1 ? ' class="nova"' : '') +
                    '><td>' +
                    (k + 1) +
                    '</td><td>' +
                    r.B +
                    '</td><td>' +
                    r.I +
                    '</td><td>' +
                    textArea(r.A2) +
                    '</td>' +
                    (ambH ? '<td>' + r.h + '</td>' : '') +
                    '<td class="fase-col">' +
                    esc(r.fase) +
                    '</td></tr>'
                );
            })
            .join('');
    }
    function desaCSV() {
        var linies = ['n;B;I;A;H;fase'];
        taula.forEach(function (r, k) {
            linies.push([k + 1, r.B, r.I, textArea(r.A2), r.h, r.fase].join(';'));
        });
        var blob = new Blob(['﻿' + linies.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'geopla-taula.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 1000);
    }
    $('btn-csv').addEventListener('click', desaCSV);
    $('btn-imprimeix').addEventListener('click', function () {
        window.print();
    });
    $('btn-esborra-taula').addEventListener('click', function () {
        if (!confirm(T.taula.esborra)) return;
        taula = [];
        desaTot();
        pintaTaula();
    });
    $('btn-reinicia').addEventListener('click', function () {
        if (!confirm(T.taula.reinicia)) return;
        estat = Fases.inicial(PERFIL);
        taula = [];
        desaTot();
        pintaTaula();
        comencaItem();
    });

    // ── Arrencada ──────────────────────────────────────────────────────────
    if (PERFIL) document.body.classList.add('perfil-' + PERFIL);
    pintaTaula();
    comencaItem();
    desaTot();
})();
