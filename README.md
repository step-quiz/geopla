# Geoplà de Pick

Un geoplà a la pantalla perquè l'alumnat de 1r i 2n d'ESO **descobreixi** el teorema de Pick comptant punts:

> A = I + B/2 − 1

on **B** és el nombre de punts de la xarxa que toquen la vora del polígon i **I**, el nombre de punts de dins. Ningú no els diu la fórmula: la troben ells, mirant la seva taula.

Web: https://geopla.step-quiz.net

## Com funciona

L'alumne fa polígons al geoplà (tocant punts o amb el teclat), compta els punts de la vora i els de dins, i en calcula l'àrea. Cada polígon acabat s'afegeix a **la seva taula** (B, I, A). Cada fase s'obre amb 3 polígons fets bé a l'anterior.

| Fase | Què fa l'alumne | Com troba l'àrea |
|---|---|---|
| F1 · Rectangles | Rectangles amb els costats sobre la quadrícula | Base · alçada (es veuen els quadrets) |
| F2 · Triangles rectangles | Triangles amb els catets sobre la quadrícula | La meitat del rectangle |
| F3 · Qualsevol triangle | Triangles inclinats | La caixa menys les peces de fora (l'eina les dibuixa) |
| F4 · Polígons | Polígons convexos de 4 costats o més | Tallats en triangles des d'un vèrtex |
| F5 · Busca la fórmula | 3 polígons amb I = 0 i 3 amb B = 4; després escriu una fórmula amb B i I | L'eina la comprova amb la seva taula i 50 polígons més, i si falla li ensenya un contraexemple |
| F6 · Prediu | Prediu l'àrea de 3 polígons amb la seva fórmula | — |
| F7 · Polígons amb forats | Polígons amb forats: la fórmula falla. Busca la correcció amb H | I a l'espai? El tetraedre de Reeve |

**Comptar.** Tocar un punt el marca: vora → dins → res. Les marques omplen els comptes soles (també es poden escriure a mà). Si el recompte no és bo, el missatge diu quin és l'error (per exemple, «Només has comptat els vèrtexs») i els punts mal marcats surten amb un cercle vermell.

**Àrees.** S'hi pot escriure `6`, `6,5`, `6.5` o `13/2`.

**La taula** es desa en aquest navegador (no surt de l'ordinador), es pot imprimir i es pot baixar en **CSV** (per obrir-la amb un full de càlcul i comentar-la a classe).

## Adreces per al professorat

| Adreça | Què fa |
|---|---|
| `index.html` | Comença per F1 (o on s'havia quedat) |
| `index.html?fase=F5` | Obre fins a la fase 5 (de F1 a F7) |
| `index.html?perfil=pi` | Perfil PI: tauler de 6 × 6 punts, lletra més gran, només F1–F3 |
| `imprimir.html?n=11` | Full A4 de punts per imprimir: `n=6` (6 geoplans), `n=8` (4) o `n=11` (2), amb 1 cm entre punts |

Els valors estranys a l'adreça s'ignoren.

## Com provar-ho a l'ordinador

No cal instal·lar res: **obre `index.html` amb doble clic** (també des d'un llapis USB o des de la carpeta de baixades del Chromebook). No fa cap petició a internet.

## Com està fet

HTML, CSS i JavaScript sense compilació, amb scripts clàssics perquè funcioni amb doble clic.

```
index.html             el geoplà
imprimir.html          el full de punts
css/tokens.css         colors (clar i fosc)
css/geopla.css         estils del geoplà (i impressió de la taula)
css/imprimir.css       estils del full de punts
js/motor/atzar.js      atzar amb llavor (el de prova1eso)
js/motor/geometria.js  àrea, B i I (comptant punts), validació, formes, mètode de la caixa
js/motor/formula.js    lectura de les fórmules (sense eval) amb fraccions exactes
js/motor/fases.js      les set fases i com s'obren
js/ui/textos.js        tots els textos
js/ui/tauler.js        el tauler SVG: tocar, arrossegar i teclat
js/ui/app.js           el controlador
js/ui/full-punts.js    el full de punts
tools/versio.py        posa al dia els ?v= dels CSS i JS (perquè el navegador no es quedi amb versions velles)
```

Tota la geometria fa servir només nombres enters. El nombre de punts de dins es **compta**, no es calcula amb la fórmula de Pick: és el que ha de descobrir l'alumne, i els tests fan servir la fórmula per comprovar l'àrea, la vora i l'interior l'un contra l'altre.

## Tests

```
node tests/run-all.js
```

| Fitxer | Què comprova |
|---|---|
| `tests/geometria.test.js` | Casos coneguts; Pick sobre 10.000 polígons a l'atzar (2I = 2A − B + 2); forats (1.000 regions); el mètode de la caixa, amb mostreig independent sobre 2.000 triangles |
| `tests/formula-fases.test.js` | Precedència, coma decimal, multiplicació implícita, el que no s'accepta, contraexemples; les fases i el desat |
| `tests/repo.test.js` | Que tot fitxer citat existeix, l'ordre dels scripts, cap adreça externa, cap mòdul ES ni `fetch` (doble clic), textos curts |
| `tools/versio.py --comprova` | Que cap `?v=` és vell |
| `tests/docs_vs_codi.py` | Que aquest README diu el mateix que el codi (fases, rutes, nombres) |

GitHub els passa a cada pujada a `main` (`.github/workflows/tests.yml`).

## Pujar canvis

Els ZIP es pugen a `_uploads/` (GitHub → `_uploads/` → *Add file* → *Upload files*) i el workflow `.github/workflows/unzip-upload.yml` els descomprimeix a l'arrel i en fa commit.

<!-- atribucio-centre:inici -->

---

Material desenvolupat per **David Arso Civil** per al Departament de Matemàtiques de l'INS Miquel Tarradell.
Contingut sota CC BY-NC-SA 4.0, codi sota llicència MIT. Vegeu [`LLICENCIA.md`](LLICENCIA.md).

<!-- atribucio-centre:final -->
