/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: tests/geometria.test.js
 * ROL: Tests del motor de geometria (js/motor/geometria.js).
 * ARQUITECTURA:
 * - Casos fets a mà (àrees, vores, interiors i polígons no simples coneguts).
 * - Comprovació creuada sobre 10.000 polígons a l'atzar: el I COMPTAT ha de ser
 *   A − B/2 + 1 (Pick). L'àrea, la vora i l'interior es calculen de maneres
 *   diferents, així que si un dels tres falla, la igualtat no quadra.
 * - Les peces del «mètode de la caixa» es comproven mostrejant punts (sense
 *   fer servir el codi que es prova).
 * ÚS: node tests/geometria.test.js
 * ============================================================================
 */
'use strict';
const { suite, ok, eq, finish } = require('./harness');
const G = require('../js/motor/geometria.js');
const Atzar = require('../js/motor/atzar.js');

suite('1. Àrea, vora i interior: casos coneguts');
{
    const quadrat = [
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
    ];
    const c = G.compta(quadrat);
    eq('quadrat 3×3: doble de l’àrea 18', c.A2, 18);
    eq('quadrat 3×3: B = 12', c.B, 12);
    eq('quadrat 3×3: I = 4', c.I, 4);
    eq('B comptat = Σ mcd', G.voraRegio(quadrat), 12);
    const tri = [
        [0, 0],
        [4, 0],
        [0, 2],
    ];
    const t = G.compta(tri);
    eq('triangle (0,0)(4,0)(0,2): A2 = 8', t.A2, 8);
    eq('…B = 8 (mcd(4,2)=2 a la hipotenusa)', t.B, 8);
    eq('…I = 1', t.I, 1);
    const sentitHorari = quadrat.slice().reverse();
    eq('el sentit dels vèrtexs no canvia el recompte', G.compta(sentitHorari).I, 4);
    eq('classifica: un vèrtex és vora', G.classifica(quadrat, [0, 0]), 'vora');
    eq('classifica: mig d’un costat és vora', G.classifica(quadrat, [2, 3]), 'vora');
    eq('classifica: (1,1) dins', G.classifica(quadrat, [1, 1]), 'dins');
    eq('classifica: (4,1) fora', G.classifica(quadrat, [4, 1]), 'fora');
    eq('classifica: (−1,3) fora (a l’altura d’un vèrtex)', G.classifica(quadrat, [-1, 3]), 'fora');
    // Polígon còncau amb vèrtexs a la mateixa altura que el punt
    const ce = [
        [0, 0],
        [4, 0],
        [4, 4],
        [2, 2],
        [0, 4],
    ];
    eq('còncau: (2,3) és fora (a l’entrant)', G.classifica(ce, [2, 3]), 'fora');
    eq('còncau: (1,2) és dins', G.classifica(ce, [1, 2]), 'dins');
    eq('còncau: (3,2) és dins', G.classifica(ce, [3, 2]), 'dins');
}

suite('2. Polígons no simples');
{
    const V = pol => G.validaPoligon(pol);
    eq(
        'menys de 3 vèrtexs',
        V([
            [0, 0],
            [1, 1],
        ]).error,
        'pocs'
    );
    eq(
        'vèrtex repetit',
        V([
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 0],
            [0, 2],
        ]).error,
        'repetit'
    );
    eq(
        'llaç (bow-tie)',
        V([
            [0, 0],
            [2, 2],
            [2, 0],
            [0, 2],
        ]).error,
        'creuen'
    );
    eq(
        'un vèrtex que toca un costat',
        V([
            [0, 0],
            [4, 0],
            [4, 4],
            [2, 0],
            [0, 4],
        ]).error,
        'creuen'
    );
    eq(
        'costat que torna enrere',
        V([
            [0, 0],
            [3, 0],
            [1, 0],
            [1, 2],
        ]).error,
        'enrere'
    );
    eq(
        'triangle aplanat',
        V([
            [0, 0],
            [2, 0],
            [1, 0],
        ]).error,
        'enrere'
    );
    eq(
        'costats alineats que se solapen',
        V([
            [0, 0],
            [4, 0],
            [4, 1],
            [2, 0],
            [0, 1],
        ]).error,
        'creuen'
    );
    ok(
        'quadrat vàlid',
        V([
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
        ]).ok
    );
    ok(
        'vèrtex al mig d’un costat: vàlid',
        V([
            [0, 0],
            [1, 0],
            [2, 0],
            [2, 2],
            [0, 2],
        ]).ok
    );
}

suite('3. Formes de cada fase');
{
    ok(
        'rectangle axial',
        G.esRectangleAxial([
            [1, 1],
            [4, 1],
            [4, 3],
            [1, 3],
        ])
    );
    ok(
        'rectangle amb un punt al mig d’un costat',
        G.esRectangleAxial([
            [1, 1],
            [2, 1],
            [4, 1],
            [4, 3],
            [1, 3],
        ])
    );
    ok(
        'quadrat girat: no és axial',
        !G.esRectangleAxial([
            [2, 0],
            [4, 2],
            [2, 4],
            [0, 2],
        ])
    );
    const tr = G.triangleRectangleAxial([
        [1, 1],
        [5, 1],
        [1, 4],
    ]);
    ok('triangle rectangle axial: catets 4 i 3', tr && tr.catets.sort().join() === '3,4');
    ok(
        'triangle qualsevol: no és rectangle axial',
        !G.triangleRectangleAxial([
            [0, 0],
            [3, 1],
            [1, 3],
        ])
    );
    ok(
        'convex',
        G.esConvex([
            [0, 0],
            [3, 0],
            [4, 2],
            [1, 3],
        ])
    );
    ok(
        'còncau',
        !G.esConvex([
            [0, 0],
            [4, 0],
            [4, 4],
            [2, 2],
            [0, 4],
        ])
    );
}

suite('4. Comprovació creuada amb Pick: 10.000 polígons a l’atzar');
{
    const at = Atzar.crea('pick-10000');
    let mal = [],
        n = 0;
    for (let i = 0; i < 10000; i++) {
        const pol = G.poligonAtzar(at, { n: 11, minV: 3, maxV: 9 });
        if (!G.validaPoligon(pol).ok) {
            mal.push('polígon no vàlid');
            continue;
        }
        const c = G.compta(pol);
        n++;
        // I = A − B/2 + 1  ⇔  2I = A2 − B + 2
        if (2 * c.I !== c.A2 - c.B + 2) mal.push(`${JSON.stringify(pol)}: I=${c.I}, A2=${c.A2}, B=${c.B}`);
        if (c.B !== G.voraRegio(pol)) mal.push(`${JSON.stringify(pol)}: B comptat ≠ Σ mcd`);
    }
    ok(`${n} polígons: 2I = 2A − B + 2 i B comptat = Σ mcd`, n === 10000 && !mal.length, mal.slice(0, 3).join(' · '));
}

suite('5. Forats: A = I + B/2 − 1 + h');
{
    const at = Atzar.crea('forats');
    let mal = [];
    for (let h = 1; h <= 2; h++)
        for (let i = 0; i < 500; i++) {
            const r = G.regioAtzar(at, { n: 11, forats: h });
            const c = G.compta(r);
            if (2 * c.I !== c.A2 - c.B + 2 - 2 * h) mal.push(`h=${h}: ${JSON.stringify(r)}`);
            if (c.B !== G.voraRegio(r)) mal.push('B comptat ≠ Σ mcd');
        }
    ok(
        '1.000 regions amb 1 o 2 forats compleixen la fórmula amb la correcció',
        !mal.length,
        mal.slice(0, 2).join(' · ')
    );
    const quadre = [
        [0, 0],
        [6, 0],
        [6, 6],
        [0, 6],
    ];
    ok(
        'forat que toca la vora: no vàlid',
        !G.validaForat(quadre, [
            [0, 2],
            [2, 2],
            [2, 4],
        ]).ok
    );
    ok(
        'forat que surt: no vàlid',
        !G.validaForat(quadre, [
            [5, 5],
            [7, 5],
            [5, 7],
        ]).ok
    );
    ok(
        'forat ben posat: vàlid',
        G.validaForat(quadre, [
            [2, 2],
            [4, 2],
            [4, 4],
        ]).ok
    );
    ok(
        'dos forats que es toquen: no vàlid',
        !G.validaForat(
            quadre,
            [
                [3, 2],
                [4, 2],
                [4, 3],
            ],
            [
                [
                    [2, 2],
                    [3, 2],
                    [3, 3],
                ],
            ]
        ).ok
    );
}

suite('6. Mètode de la caixa: triangle + peces = caixa (mostreig independent)');
{
    const at = Atzar.crea('caixa');
    // Un punt (no de la xarxa) dins d'un polígon convex qualsevol: tots els productes vectorials del mateix signe
    const dinsConvex = (pol, p) => {
        let s = 0;
        for (let i = 0; i < pol.length; i++) {
            const a = pol[i],
                b = pol[(i + 1) % pol.length];
            const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
            if (c === 0) return false;
            const g = c > 0 ? 1 : -1;
            if (s && g !== s) return false;
            s = g;
        }
        return true;
    };
    let mal = [],
        ambRectangle = 0;
    for (let i = 0; i < 2000; i++) {
        const tri = G.poligonAtzar(at, { n: 11, minV: 3, maxV: 3 });
        const peces = G.pecesCaixa(tri);
        if (peces.some(p => p.tipus === 'rectangle')) ambRectangle++;
        const c = G.caixa(tri);
        // Mostres amb desplaçaments irracionals: mai sobre cap línia de la xarxa ni cap costat (que són racionals)
        for (let x = c.x0; x < c.x1; x++)
            for (let y = c.y0; y < c.y1; y++)
                for (const [dx, dy] of [
                    [Math.SQRT2 - 1, Math.PI - 3],
                    [Math.E - 2, Math.SQRT1_2],
                    [Math.LN2, Math.sqrt(3) - 1],
                ]) {
                    const p = [x + dx, y + dy];
                    const quantes = [tri, ...peces.map(q => q.punts)].filter(q => dinsConvex(q, p)).length;
                    if (quantes !== 1) mal.push(`${JSON.stringify(tri)}: punt ${p} cobert ${quantes} vegades`);
                }
    }
    ok(
        '2.000 triangles: cada punt de la caixa és exactament en una peça (o al triangle)',
        !mal.length,
        mal.slice(0, 2).join(' · ')
    );
    ok('n’hi ha amb un rectangle a la cantonada (el cas difícil)', ambRectangle > 20, `només ${ambRectangle}`);
    const tv = G.ventall([
        [0, 0],
        [4, 0],
        [5, 3],
        [2, 5],
        [0, 3],
    ]);
    eq('ventall d’un pentàgon: 3 triangles', tv.length, 3);
    eq(
        'ventall: les àrees sumen l’àrea del polígon',
        tv.reduce((s, t) => s + Math.abs(G.area2(t)), 0),
        Math.abs(
            G.area2([
                [0, 0],
                [4, 0],
                [5, 3],
                [2, 5],
                [0, 3],
            ])
        )
    );
}

suite('7. Determinisme');
{
    const a = G.poligonAtzar(Atzar.crea('X1'), { n: 11 });
    const b = G.poligonAtzar(Atzar.crea('X1'), { n: 11 });
    eq('la mateixa llavor dona el mateix polígon', JSON.stringify(a), JSON.stringify(b));
    eq('Atzar.hash és estable', Atzar.hash('geopla'), Atzar.hash('geopla'));
}

finish('GEOMETRIA');
