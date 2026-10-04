#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Regenera js/photos.js a partir de los archivos de la carpeta imagenes/.

Uso:
    python generate_photo_list.py

Estructura esperada:
    imagenes/           -> foto completa (se abre en el modal / lightbox)
    imagenes/thumb/     -> miniatura del mismo nombre (se usa en la rejilla)
    imagenes/<sub>/ + imagenes/<sub>/thumb/  -> igual, por subcarpeta (ej. misa-y-fiesta)

Si una foto no tiene miniatura, la rejilla usa la completa.
Respeta el orden de la lista actual (foto_index en Supabase) y agrega las
fotos nuevas al final, en orden natural. Acepta .webp .jpg .jpeg .png .avif.
Ver D:\\eventos\\HERRAMIENTAS_FOTOS.md para el convertidor JPEG -> WebP.
"""

import os
import re
import sys

try:
    from urllib.parse import quote          # py3
except ImportError:
    from urllib import quote               # py2

AQUI    = os.path.dirname(os.path.abspath(__file__))
CARPETA = os.path.join(AQUI, 'imagenes')
THUMBS  = os.path.join(CARPETA, 'thumb')
SALIDA  = os.path.join(AQUI, 'js', 'photos.js')
EXTS    = ('.webp', '.jpg', '.jpeg', '.png', '.avif')

CABECERA = """/* ============================================================
   LISTA DE FOTOS - Boda Jose de Jesus & Gloria Adriana
   NO editar a mano: se regenera con  python generate_photo_list.py
   Fotos: %d   |   Con miniatura: %d
   ============================================================ */

// Foto completa: se abre en el modal del selector y en el lightbox.
window.PHOTOS = [
%s
];

// Miniatura: es lo que carga la rejilla. Si falta, cae a la completa.
window.PHOTO_THUMBS = [
%s
];

// Nombre de archivo original (mismo orden). Se guarda en Supabase
// (datos.filename) para localizar el archivo maestro.
window.PHOTO_FILES = [
%s
];
"""


def clave_natural(nombre):
    partes = re.split(r'(\d+)', nombre.lower())
    return [int(p) if p.isdigit() else p for p in partes]


def listar(carpeta):
    fs = [f for f in os.listdir(carpeta)
          if f.lower().endswith(EXTS)
          and not f.startswith('.')
          and os.path.isfile(os.path.join(carpeta, f))]
    return sorted(fs, key=clave_natural)


def orden_actual():
    """PHOTO_FILES de la lista actual (js/photos.js), en su orden."""
    if not os.path.isfile(SALIDA):
        return []
    with open(SALIDA, 'r', encoding='utf-8') as fh:
        m = re.search(r'window\.PHOTO_FILES\s*=\s*\[(.*?)\];', fh.read(), re.S)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else []


def main():
    if not os.path.isdir(CARPETA):
        print('No existe la carpeta: %s' % CARPETA)
        return 1

    archivos = listar(CARPETA)
    for sub in sorted(os.listdir(CARPETA), key=clave_natural):
        if sub != 'thumb' and os.path.isdir(os.path.join(CARPETA, sub)):
            archivos += ['%s/%s' % (sub, f) for f in listar(os.path.join(CARPETA, sub))]

    # El indice de cada foto es el foto_index guardado en Supabase: se respeta
    # el orden de la lista actual y las fotos nuevas se agregan AL FINAL.
    previas = orden_actual()
    presentes = set(archivos)
    archivos = ([f for f in previas if f in presentes]
                + [f for f in archivos if f not in set(previas)])

    if not archivos:
        print('Sin imagenes en %s (se genera lista vacia).' % CARPETA)

    # Las rutas van codificadas: hay archivos con espacios y parentesis
    # (IMG_1894 (2).webp) que sin %20 dan 404 en GitHub Pages.
    url = lambda p: quote(p, safe='/')

    con_thumb = 0
    thumbs = []
    for f in archivos:
        carpeta, _, nombre = f.rpartition('/')
        t = '%s/thumb/%s' % (carpeta, nombre) if carpeta else 'thumb/%s' % nombre
        if os.path.isfile(os.path.join(CARPETA, t)):
            thumbs.append(url('imagenes/%s' % t))
            con_thumb += 1
        else:
            thumbs.append(url('imagenes/%s' % f))

    bloque = lambda xs: ',\n'.join('    "%s"' % x for x in xs)

    with open(SALIDA, 'w', encoding='utf-8') as fh:
        fh.write(CABECERA % (
            len(archivos), con_thumb,
            bloque(url('imagenes/%s' % f) for f in archivos),
            bloque(thumbs),
            bloque(archivos),
        ))

    print('OK  %d fotos (%d con miniatura) -> %s' % (len(archivos), con_thumb, SALIDA))
    if archivos and con_thumb < len(archivos):
        print('AVISO: %d fotos sin miniatura en imagenes/thumb/' % (len(archivos) - con_thumb))
    print('Recuerda subir la version del script en los HTML:  js/photos.js?v=N')
    return 0


if __name__ == '__main__':
    sys.exit(main())
