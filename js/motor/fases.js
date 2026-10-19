/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/motor/fases.js
 * ROL: Les set fases del geoplà i com es van obrint (màquina d'estats pura).
 * ARQUITECTURA: Pur, sense DOM. L'estat és un objecte pla (es desa tal qual a
 *      localStorage); totes les funcions en tornen un de NOU, no el modifiquen.
 *   F1 rectangles · F2 triangles rectangles · F3 triangles · F4 polígons convexos
 *   → cadascuna s'obre amb QUANTS (3) polígons fets bé a l'anterior.
 *   F5 investigació: 3 polígons amb I = 0 (B diferents), 3 amb B = 4 (I diferents)
 *      i després la fórmula en B i I. F6 s'obre quan la fórmula és bona.
 *   F6 predicció: 3 àrees predites bé amb la fórmula obren F7.
 *   F7 forats: 2 polígons amb forat i la fórmula en B, I i H. Aquí s'acaba.
 *   Perfil PI (?perfil=pi): només F1–F3.
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Fases = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var QUANTS = 3;
    var IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'];
    var IDS_PI = ['F1', 'F2', 'F3'];
    var F5_SENSE_DINS = 3,
        F5_B4 = 3,
        F7_AMB_FORAT = 2;

    function llista(perfil) {
        return perfil === 'pi' ? IDS_PI : IDS;
    }

    function inicial(perfil) {
        return {
            versio: 1,
            perfil: perfil === 'pi' ? 'pi' : '',
            fase: 'F1',
            oberta: 0, // índex de l'última fase oberta
            encerts: { F1: 0, F2: 0, F3: 0, F4: 0, F6: 0 },
            f5: { senseDins: [], b4: [], formula: '' },
            f7: { ambForat: 0, formula: '' },
            acabat: false,
        };
    }
    var copia = function (e) {
        return JSON.parse(JSON.stringify(e));
    };

    /** L'estat desat (o qualsevol cosa) → un estat vàlid; si no ho és, l'inicial. */
    function restaura(dades, perfil) {
        var e = inicial(perfil);
        if (!dades || typeof dades !== 'object' || dades.versio !== 1) return e;
        var ids = llista(e.perfil);
        if (ids.indexOf(dades.fase) >= 0) e.fase = dades.fase;
        if (Number.isInteger(dades.oberta)) e.oberta = Math.max(0, Math.min(dades.oberta, ids.length - 1));
        if (ids.indexOf(e.fase) > e.oberta) e.fase = ids[e.oberta];
        Object.keys(e.encerts).forEach(function (k) {
            var v = dades.encerts && dades.encerts[k];
            if (Number.isInteger(v) && v >= 0) e.encerts[k] = v;
        });
        if (dades.f5) {
            if (Array.isArray(dades.f5.senseDins)) e.f5.senseDins = dades.f5.senseDins.filter(Number.isInteger);
            if (Array.isArray(dades.f5.b4)) e.f5.b4 = dades.f5.b4.filter(Number.isInteger);
            if (typeof dades.f5.formula === 'string') e.f5.formula = dades.f5.formula.slice(0, 80);
        }
        if (dades.f7) {
            if (Number.isInteger(dades.f7.ambForat) && dades.f7.ambForat >= 0) e.f7.ambForat = dades.f7.ambForat;
            if (typeof dades.f7.formula === 'string') e.f7.formula = dades.f7.formula.slice(0, 80);
        }
        e.acabat = !!dades.acabat;
        return e;
    }

    function esOberta(estat, id) {
        var i = llista(estat.perfil).indexOf(id);
        return i >= 0 && i <= estat.oberta;
    }
    function tria(estat, id) {
        var e = copia(estat);
        if (esOberta(e, id)) e.fase = id;
        return e;
    }
    /** Obre fins a la fase id (enllaç del professorat ?fase=F5). */
    function obreFins(estat, id) {
        var e = copia(estat),
            i = llista(e.perfil).indexOf(id);
        if (i < 0) return e;
        e.oberta = Math.max(e.oberta, i);
        e.fase = id;
        return e;
    }
    function obreSeguent(e) {
        var ids = llista(e.perfil),
            i = ids.indexOf(e.fase);
        if (i + 1 < ids.length) {
            if (e.oberta < i + 1) {
                e.oberta = i + 1;
                return ids[i + 1];
            }
            return null;
        }
        e.acabat = true;
        return null;
    }

    /** En quina etapa és F5: 'senseDins', 'b4' o 'formula'. */
    function etapaF5(estat) {
        if (estat.f5.senseDins.length < F5_SENSE_DINS) return 'senseDins';
        if (estat.f5.b4.length < F5_B4) return 'b4';
        return 'formula';
    }
    function etapaF7(estat) {
        return estat.f7.ambForat < F7_AMB_FORAT ? 'forat' : 'formula';
    }

    /**
     * L'alumne ha acabat bé un polígon (o una predicció, a F6) de la fase actual.
     * @param {object} d  { B, I, h }
     * @returns {{ estat, compta: bool, motiu?: string, obre?: 'F2'… }}
     *   motiu (si no compta): 'teI' (F5: calia I = 0), 'repeteixB' / 'repeteixI' (ja n'hi havia un igual),
     *   'noB4' (calia B = 4), 'senseForat' (F7)
     */
    function registra(estat, d) {
        var e = copia(estat),
            f = e.fase,
            obre = null,
            motiu = null,
            compta = false;
        if (f === 'F5') {
            var et = etapaF5(e);
            if (et === 'senseDins') {
                if (d.I !== 0) motiu = 'teI';
                else if (e.f5.senseDins.indexOf(d.B) >= 0) motiu = 'repeteixB';
                else {
                    e.f5.senseDins.push(d.B);
                    compta = true;
                }
            } else if (et === 'b4') {
                if (d.B !== 4) motiu = 'noB4';
                else if (e.f5.b4.indexOf(d.I) >= 0) motiu = 'repeteixI';
                else {
                    e.f5.b4.push(d.I);
                    compta = true;
                }
            }
        } else if (f === 'F7') {
            if (!d.h) motiu = 'senseForat';
            else if (etapaF7(e) === 'forat') {
                e.f7.ambForat++;
                compta = true;
            }
        } else {
            e.encerts[f] = (e.encerts[f] || 0) + 1;
            compta = true;
            if (e.encerts[f] >= QUANTS) obre = obreSeguent(e);
        }
        var r = { estat: e, compta: compta };
        if (motiu) r.motiu = motiu;
        if (obre) r.obre = obre;
        return r;
    }

    /** La fórmula de F5 (en B i I) o de F7 (en B, I i H) ha passat la comprovació. */
    function acceptaFormula(estat, text) {
        var e = copia(estat),
            obre = null;
        if (e.fase === 'F5') {
            e.f5.formula = String(text).slice(0, 80);
            obre = obreSeguent(e);
        } else if (e.fase === 'F7') {
            e.f7.formula = String(text).slice(0, 80);
            e.acabat = true;
        }
        var r = { estat: e };
        if (obre) r.obre = obre;
        return r;
    }

    /** Quant falta per obrir la fase següent: { fets, cal } (per a la barra de progrés). */
    function progres(estat) {
        var f = estat.fase;
        if (f === 'F5') {
            var et = etapaF5(estat);
            if (et === 'senseDins') return { fets: estat.f5.senseDins.length, cal: F5_SENSE_DINS, etapa: et };
            if (et === 'b4') return { fets: estat.f5.b4.length, cal: F5_B4, etapa: et };
            return { fets: estat.f5.formula ? 1 : 0, cal: 1, etapa: et };
        }
        if (f === 'F7') {
            var e7 = etapaF7(estat);
            return e7 === 'forat'
                ? { fets: estat.f7.ambForat, cal: F7_AMB_FORAT, etapa: e7 }
                : { fets: estat.f7.formula ? 1 : 0, cal: 1, etapa: e7 };
        }
        return { fets: Math.min(estat.encerts[f] || 0, QUANTS), cal: QUANTS, etapa: 'poligons' };
    }

    return {
        QUANTS: QUANTS,
        llista: llista,
        inicial: inicial,
        restaura: restaura,
        esOberta: esOberta,
        tria: tria,
        obreFins: obreFins,
        etapaF5: etapaF5,
        etapaF7: etapaF7,
        registra: registra,
        acceptaFormula: acceptaFormula,
        progres: progres,
    };
});
