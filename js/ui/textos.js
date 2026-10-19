/**
 * ============================================================================
 * PROJECTE: geopla (Step Quiz, vanilla JS)
 * FITXER: js/ui/textos.js
 * ROL: Tots els textos que veu l'alumne. Curts: com a molt unes 40 paraules a
 *      la vegada (menys al perfil PI). Els errors diuen QUIN és l'error; les
 *      pistes no donen mai la resposta.
 * ARQUITECTURA: Dades (window.GeoplaTextos); també es carrega amb Node (tests).
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.GeoplaTextos = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    return {
        FASES: {
            F1: { nom: 'Rectangles', curt: 'Rectangles' },
            F2: { nom: 'Triangles rectangles', curt: 'Mig rectangle' },
            F3: { nom: 'Qualsevol triangle', curt: 'Triangles' },
            F4: { nom: 'Polígons', curt: 'Polígons' },
            F5: { nom: 'Busca la fórmula', curt: 'Fórmula' },
            F6: { nom: 'Prediu', curt: 'Prediu' },
            F7: { nom: 'Polígons amb forats', curt: 'Forats' },
        },

        // ── Construir ──────────────────────────────────────────────────────
        construir: {
            F1: 'Fes un rectangle amb els costats sobre les línies de la quadrícula. Toca els punts en ordre i torna al primer per tancar-lo.',
            F2: 'Fes un triangle rectangle amb els dos catets sobre les línies de la quadrícula.',
            F3: 'Fes un triangle qualsevol, però no com els de F2 (mig rectangle): més inclinat.',
            F4: 'Fes un polígon convex (sense cap entrant) de 4 costats o més.',
            F5senseDins: 'Fes un polígon sense cap punt a dins (I = 0). Prova vores (B) diferents.',
            F5b4: 'Ara fes polígons amb només 4 punts a la vora (B = 4), però amb punts a dins diferents.',
            F7vora: 'Fes un polígon gran. Després li faràs un forat.',
            F7forat: 'Ara fes un forat a dins: un polígon petit que no toqui la vora.',
            ajuda: 'Pots arrossegar un vèrtex per moure’l. Amb el teclat: fletxes i Retorn.',
        },
        errorsPoligon: {
            pocs: 'Calen almenys 3 vèrtexs.',
            repetit: 'Has repetit un vèrtex: cada punt només pot ser un cop.',
            enrere: 'Un costat torna enrere per sobre de l’anterior.',
            creuen: 'Dos costats es creuen o es toquen: la goma no es pot creuar.',
            area0: 'Tots els punts són en una recta: no hi ha polígon.',
            fora: 'El forat ha de quedar a dins, sense tocar la vora.',
            forats: 'Els forats no es poden tocar entre ells.',
        },
        errorsForma: {
            F1: 'Això no és un rectangle amb els costats sobre les línies. Mou algun vèrtex.',
            F2: 'Cal un triangle amb un angle recte i els dos catets sobre les línies.',
            F3: 'Cal un triangle (3 vèrtexs).',
            F3recte: 'Aquest és mig rectangle, com els de F2. Fes-ne un de més inclinat.',
            F4pocs: 'Cal un polígon de 4 costats o més.',
            F4concau: 'Té un entrant. De moment, fes-lo convex.',
        },

        // ── Comptar ────────────────────────────────────────────────────────
        comptar: {
            instruccio: 'Compta els punts de la vora (B) i els de dins (I). Tocar un punt el marca: vora → dins → res.',
            instruccioForat: 'Compta els punts de la vora (B), també els de la vora del forat, i els de dins (I).',
            nomesVertexs: 'Només has comptat els vèrtexs. Hi ha punts de la vora que no són vèrtexs?',
            voraMalament: 'El nombre de punts de la vora (B) no és aquest. Torna-ho a mirar costat per costat.',
            voraForat: 'La vora del forat també és vora: també compta.',
            voraComDins: 'Has comptat els punts de la vora com si fossin de dins.',
            dinsMalament: 'El nombre de punts de dins (I) no és aquest.',
            dinsForat: 'Els punts que són dins del forat no són «dins» del polígon.',
            marquesMalament: 'Els punts amb un cercle vermell estan mal marcats.',
            faltenVora: 'Encara et falten punts de la vora per marcar.',
            faltenDins: 'Encara et falten punts de dins per marcar.',
        },

        // ── Àrea ───────────────────────────────────────────────────────────
        area: {
            F1: 'Quina és l’àrea? Escriu la base i l’alçada (en quadrets).',
            F2: 'El triangle és la meitat d’un rectangle. Calcula primer el rectangle.',
            F3: 'L’àrea del triangle = la caixa − les peces de fora.',
            F4: 'El polígon està tallat en triangles. Calcula l’àrea de cada triangle i suma-les.',
            F4caixa: 'Mostra la caixa d’aquest triangle',
            donada: n => `Àrea: ${n}. Aquí te la donem: el que importa és el patró.`,
            format: 'Escriu un nombre: 6, 6,5 o 13/2.',
            base: 'La base no és aquesta: compta els quadrets d’un costat.',
            alcada: 'L’alçada no és aquesta: compta els quadrets de l’altre costat.',
            perimetre: 'Això és el perímetre (la vora), no l’àrea.',
            producte: 'Multiplica la base per l’alçada.',
            rectangle: 'El rectangle no fa això: base per alçada.',
            meitat: 'Això és el rectangle sencer: el triangle n’és la meitat.',
            triangle: 'Revisa el triangle: és la meitat del rectangle.',
            caixa: 'La caixa no fa això: compta-li els costats.',
            peca: n => `La peça ${n} no fa això.`,
            pecaMeitat: n => `La peça ${n} és un triangle: la meitat del rectangle.`,
            resta: 'Caixa menys peces: revisa la resta.',
            triangleN: n => `L’àrea del triangle ${n} no és aquesta.`,
            suma: 'La suma dels triangles no és aquesta.',
        },

        // ── F5–F7 ──────────────────────────────────────────────────────────
        f5: {
            teI: 'Aquest té punts a dins. Ara en busquem amb I = 0.',
            repeteixB: 'Ja en tens un amb aquesta B. Prova una vora diferent.',
            noB4: 'Aquest no té B = 4. Busca’n amb exactament 4 punts a la vora.',
            repeteixI: 'Ja en tens un amb aquesta I. Prova’n un amb més punts a dins.',
            preguntaI0: 'Mira la taula: amb I = 0, com canvia A quan B creix?',
            preguntaB4: 'I amb B = 4: com canvia A quan I creix?',
            formula: 'Escriu una fórmula per a l’àrea A amb B i I. Per exemple: B + I (aquesta no és bona!).',
            formulaH: 'Escriu una fórmula per a l’àrea amb B, I i H (el nombre de forats).',
            comprova: 'Comprova-la',
            contraexemple: (b, i, a, v, h) =>
                `No funciona amb aquest polígon: B = ${b}, I = ${i}${h ? `, H = ${h}` : ''}. L’àrea és ${a}, però la fórmula dona ${v}.`,
            contraTaula: n => `No funciona amb la fila ${n} de la teva taula.`,
            errors: {
                buida: 'Escriu alguna cosa.',
                variable: c => `«${c}» no és ni B ni I.`,
                variableH: c => `«${c}» no és ni B, ni I, ni H.`,
                caracter: c => `No entenc «${c}». Fes servir + − · / i parèntesis.`,
                operand: 'Hi falta un nombre o una lletra entre dos signes.',
                parentesi: 'Els parèntesis no estan aparellats.',
            },
            pick: 'Has trobat el teorema de Pick! Georg Pick el va publicar el 1899: l’àrea de qualsevol polígon de la xarxa es pot saber només comptant punts.',
            prediu: 'Fes servir la teva fórmula: compta B i I, i prediu l’àrea.',
            prediuMal: f => `Revisa el càlcul amb la teva fórmula: ${f}`,
            prediuBe: 'Exacte. La fórmula prediu l’àrea sense tallar res.',
            falla: (pick, a) => `La teva fórmula diu ${pick}, però l’àrea és ${a}. Amb un forat, falla. Per quant?`,
            forats: 'Amb H forats, la fórmula de Pick té una correcció: A = I + B/2 − 1 + H.',
            reeve: 'I a l’espai? No hi ha cap fórmula així. El tetraedre de John Reeve (1957) té els 4 vèrtexs a la xarxa, cap altre punt de la xarxa a la vora ni a dins, i el volum que vulguis.',
        },

        // ── Missatges de fase ──────────────────────────────────────────────
        be: ['Molt bé!', 'Correcte.', 'Ben fet.'],
        bePI: 'Fet ✓',
        obre: f => `Has obert la fase ${f}.`,
        bellesa: {
            F1: 'Fixa’t: en un rectangle, l’àrea és el nombre de quadrets, i base · alçada els compta tots d’una.',
            F2: 'Cada triangle rectangle és mig rectangle. Per això la seva àrea pot acabar en ,5.',
            F3: 'Qualsevol triangle de la xarxa té una àrea que és un nombre sencer o acaba en ,5. Saps per què?',
            F4: 'Tallant en triangles pots trobar l’àrea de qualsevol polígon convex de la xarxa.',
            F6: 'La fórmula funciona sempre: no cal tallar res.',
            PI: 'Has fet rectangles, triangles rectangles i triangles. Molt bona feina!',
        },

        // ── Taula ──────────────────────────────────────────────────────────
        taula: {
            titol: 'La teva taula',
            buida: 'Encara no hi ha cap polígon. Cada polígon que acabis s’hi afegeix.',
            esborra: 'S’esborrarà tota la taula. Vols continuar?',
            reinicia: 'Es tornarà a començar des de F1 i s’esborrarà la taula. Vols continuar?',
        },
    };
});
