#!/usr/bin/env python3
"""
PROJECTE: geopla (Step Quiz, vanilla JS)
FITXER: tests/docs_vs_codi.py
ROL: Que el README diu el mateix que el codi:
  - les rutes entre `cometes` del README existeixen;
  - la taula de fases té F1–F7 amb els noms de js/ui/textos.js;
  - els nombres que cita («3 polígons», «10.000 polígons», «50 polígons», «6 × 6»)
    són els del codi i dels tests.
ÚS: python3 tests/docs_vs_codi.py   (només biblioteca estàndard)
"""
import pathlib
import re
import sys

ARREL = pathlib.Path(__file__).resolve().parent.parent
llegeix = lambda rel: (ARREL / rel).read_text(encoding='utf-8')
errors = []


def comprova(cond, msg):
    if not cond:
        errors.append(msg)


readme = llegeix('README.md')

# 1. Rutes citades
for ruta in re.findall(r'`([^`\s]+\.(?:js|css|html|py|yml|md))(?:\?[^`]*)?`', readme):
    rel = ruta.split('?')[0]
    if rel.startswith('.github/'):
        continue  # els workflows es creen des del web de GitHub
    comprova((ARREL / rel).exists(), f'README.md cita `{rel}`, que no existeix')

# 2. Fases
textos = llegeix('js/ui/textos.js')
noms = dict(re.findall(r"(F[1-7]): \{ nom: '([^']+)'", textos))
comprova(len(noms) == 7, f'js/ui/textos.js hauria de tenir 7 fases, en té {len(noms)}')
for f, nom in noms.items():
    comprova(f'| {f} · {nom}' in readme, f'README.md: la taula de fases no té «{f} · {nom}»')

# 3. Nombres
quants = re.search(r'var QUANTS = (\d+);', llegeix('js/motor/fases.js')).group(1)
comprova(f's’obre amb {quants} polígons' in readme or f"s'obre amb {quants} polígons" in readme,
         f'README.md: cada fase s’obre amb {quants} polígons (js/motor/fases.js)')
comprova('i < 10000' in llegeix('tests/geometria.test.js') and '10.000 polígons' in readme,
         'README.md i tests/geometria.test.js: 10.000 polígons')
comprova('k < 50' in llegeix('js/ui/app.js') and '50 polígons' in readme,
         'README.md i js/ui/app.js: la fórmula es prova amb 50 polígons')
comprova("PERFIL === 'pi' ? 6 : 11" in llegeix('js/ui/app.js') and '6 × 6' in readme,
         'README.md i js/ui/app.js: el perfil PI té un tauler de 6 × 6')
for n in ('6', '8', '11'):
    comprova(f'`n={n}`' in readme, f'README.md: falta la mida n={n} del full de punts')
    comprova(f'<option value="{n}"' in llegeix('imprimir.html'), f'imprimir.html: falta la mida {n}')

if errors:
    print(f'✗ geopla: {len(errors)} discrepàncies entre la documentació i el codi:')
    for e in errors:
        print('  - ' + e)
    sys.exit(1)
print('✓ geopla: la documentació quadra amb el codi.')
