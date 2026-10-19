/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: tests/formula-fases.test.js
 * ROL: Tests de l'analitzador de fórmules (js/motor/formula.js) i de la màquina
 *      de fases (js/motor/fases.js).
 * ÚS: node tests/formula-fases.test.js
 * ============================================================================
 */
'use strict';
const { suite, ok, eq, finish } = require('./harness');
const F = require('../js/motor/formula.js');
const Fases = require('../js/motor/fases.js');
const G = require('../js/motor/geometria.js');
const Atzar = require('../js/motor/atzar.js');

// Valor d'una fórmula com a text («13/2»), o el codi d'error
function val(txt, vars, vals) {
    const r = F.llegeix(txt, vars || ['B', 'I']);
    if (!r.ok) return 'error:' + r.error;
    const v = F.avalua(r.rpn, vals || { B: 6, I: 2 });
    return v ? `${v.n}/${v.d}` : 'div0';
}

suite('1. Fórmules: precedència, coma decimal, multiplicació implícita');
{
    eq('I + B/2 − 1 (B=6, I=2) = 4', val('I + B/2 - 1'), '4/1');
    eq('«A =» al principi', val('A = I + B/2 - 1'), '4/1');
    eq('signe − (U+2212)', val('I + B/2 − 1'), '4/1');
    eq('coma decimal 0,5B', val('I + 0,5B - 1'), '4/1');
    eq('punt decimal 0.5·B', val('I + 0.5·B - 1'), '4/1');
    eq('dos punts per dividir B:2', val('I+B:2-1'), '4/1');
    eq('2(I + 1)', val('2(I+1)'), '6/1');
    eq('(B)(I)', val('(B)(I)'), '12/1');
    eq('(B + I)2: ")" seguit de nombre', val('(B+I)2'), '16/1');
    eq('BI = B·I', val('BI'), '12/1');
    eq('minúscules: i + b/2 - 1', val('i + b/2 - 1'), '4/1');
    eq('precedència: 2 + 3·4 = 14', val('2+3*4'), '14/1');
    eq('esquerra a dreta: 8 − 3 − 2 = 3', val('8-3-2'), '3/1');
    eq('esquerra a dreta: 12 : 3 : 2 = 2', val('12:3:2'), '2/1');
    eq('menys unari: −B + 10 = 4', val('-B+10'), '4/1');
    eq('menys unari dins: 2·(−I) = −4', val('2*(-I)'), '-4/1');
    eq('menys unari i potència de precedència: −2·3 = −6', val('-2*3'), '-6/1');
    eq('fracció exacta: 1/3 + 1/6 = 1/2', val('1/3+1/6'), '1/2');
    eq('divisió per zero', val('B/(I-2)'), 'div0');
}

suite('2. Fórmules: el que no s’accepta');
{
    eq('buida', val('   '), 'error:buida');
    eq('x', val('I + x'), 'error:variable');
    eq('H a F5', val('I + H'), 'error:variable');
    ok('H a F7', val('I + B/2 - 1 + H', ['B', 'I', 'H'], { B: 6, I: 2, H: 1 }) === '5/1');
    eq('operador al final', val('I +'), 'error:operand');
    eq('dos operadors', val('I */ 2'), 'error:operand');
    eq('parèntesi sense tancar', val('(I + 1'), 'error:parentesi');
    eq('parèntesi sense obrir', val('I + 1)'), 'error:parentesi');
    eq('caràcter estrany ^', val('B^2'), 'error:caracter');
    eq('eval prohibit: alert(1)', val('alert(1)'), 'error:variable');
    eq('dues comes 1,2,3', val('1,2,3'), 'error:caracter');
    eq('text amb formatació', F.text(F.frac(13, 2)), '6,5');
    eq('text de fracció periòdica', F.text(F.frac(13, 3)), '13/3');
    eq('text negatiu', F.text(F.frac(-5, 2)), '−2,5');
}

suite('3. Comprovació amb polígons i contraexemple');
{
    const at = Atzar.crea('formula');
    const casos = [];
    for (let i = 0; i < 50; i++) {
        const c = G.compta(G.poligonAtzar(at, { n: 11 }));
        casos.push({ B: c.B, I: c.I, H: 0, A2: c.A2 });
    }
    const pick = F.llegeix('I + B/2 - 1').rpn;
    ok('Pick passa els 50 polígons', F.comprova(pick, casos).ok);
    const dolenta = F.comprova(F.llegeix('I + B/2').rpn, casos);
    ok('I + B/2 falla i dona un contraexemple', !dolenta.ok && dolenta.cas && dolenta.valor);
    const ambH = [];
    const at2 = Atzar.crea('formula-h');
    for (let i = 0; i < 30; i++) {
        const c = G.compta(G.regioAtzar(at2, { n: 11, forats: i % 3 }));
        ambH.push({ B: c.B, I: c.I, H: c.h, A2: c.A2 });
    }
    ok('Pick sense H falla amb forats', !F.comprova(pick, ambH).ok);
    ok('I + B/2 − 1 + H passa amb 0, 1 i 2 forats', F.comprova(F.llegeix('I+B/2-1+H', ['B', 'I', 'H']).rpn, ambH).ok);
}

suite('4. Fases');
{
    let e = Fases.inicial();
    eq('comença a F1', e.fase, 'F1');
    ok('F2 tancada', !Fases.esOberta(e, 'F2'));
    let r = Fases.registra(e, { B: 8, I: 1, h: 0 });
    r = Fases.registra(r.estat, { B: 8, I: 1, h: 0 });
    ok('2 encerts: encara no obre', !r.obre);
    r = Fases.registra(r.estat, { B: 10, I: 2, h: 0 });
    eq('3 encerts: obre F2', r.obre, 'F2');
    ok('F2 oberta', Fases.esOberta(r.estat, 'F2'));
    eq('però continua a F1 fins que l’alumne hi va', r.estat.fase, 'F1');
    ok('registra no modifica l’estat d’entrada', e.encerts.F1 === 0);

    // F5
    e = Fases.obreFins(Fases.inicial(), 'F5');
    eq('obreFins F5', e.fase, 'F5');
    eq('F5 comença per I = 0', Fases.etapaF5(e), 'senseDins');
    r = Fases.registra(e, { B: 5, I: 1 });
    eq('I ≠ 0 no compta', r.motiu, 'teI');
    r = Fases.registra(e, { B: 5, I: 0 });
    r = Fases.registra(r.estat, { B: 5, I: 0 });
    eq('mateixa B no compta', r.motiu, 'repeteixB');
    r = Fases.registra(r.estat, { B: 6, I: 0 });
    r = Fases.registra(r.estat, { B: 7, I: 0 });
    eq('després: B = 4', Fases.etapaF5(r.estat), 'b4');
    r = Fases.registra(r.estat, { B: 5, I: 3 });
    eq('B ≠ 4 no compta', r.motiu, 'noB4');
    [1, 2, 3].forEach(i => (r = Fases.registra(r.estat, { B: 4, I: i })));
    eq('després: la fórmula', Fases.etapaF5(r.estat), 'formula');
    r = Fases.acceptaFormula(r.estat, 'I + B/2 - 1');
    eq('fórmula bona: obre F6', r.obre, 'F6');

    // F7
    e = Fases.obreFins(Fases.inicial(), 'F7');
    r = Fases.registra(e, { B: 8, I: 3, h: 0 });
    eq('F7 sense forat no compta', r.motiu, 'senseForat');
    r = Fases.registra(e, { B: 8, I: 3, h: 1 });
    r = Fases.registra(r.estat, { B: 9, I: 3, h: 1 });
    eq('F7: després de 2 amb forat, la fórmula', Fases.etapaF7(r.estat), 'formula');
    ok('F7: fórmula bona → acabat', Fases.acceptaFormula(r.estat, 'x').estat.acabat);

    // PI
    let p = Fases.obreFins(Fases.inicial('pi'), 'F5');
    eq('perfil PI: no hi ha F5', p.fase, 'F1');
    eq('perfil PI: tres fases', Fases.llista('pi').length, 3);
    p = Fases.obreFins(Fases.inicial('pi'), 'F3');
    [1, 2, 3].forEach(() => (p = Fases.registra(p, { B: 4, I: 0 }).estat));
    ok('perfil PI: F3 feta → acabat', p.acabat);

    // Restaurar
    eq('restaura(null) → inicial', JSON.stringify(Fases.restaura(null)), JSON.stringify(Fases.inicial()));
    eq(
        'restaura(brossa) → inicial',
        Fases.restaura({ versio: 1, fase: 'F9', oberta: 99, encerts: { F1: -3 } }).fase,
        'F1'
    );
    eq('restaura: oberta retallada', Fases.restaura({ versio: 1, fase: 'F3', oberta: 99 }).oberta, 6);
    eq('restaura: fase tancada → la més alta oberta', Fases.restaura({ versio: 1, fase: 'F4', oberta: 1 }).fase, 'F2');
    eq('restaura: versió desconeguda → inicial', Fases.restaura({ versio: 2, fase: 'F3', oberta: 3 }).fase, 'F1');
}

finish('FÓRMULES I FASES');
