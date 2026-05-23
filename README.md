# Steph Closet Sale 2026-05-24

Webapp mobile-first para tracking de venta de closet.

## Estructura

- `data/` — copia del Excel original (`inventario-original-2026-05-23.xls`)
- `webapp/` — single-file HTML + `data.json` generado del Excel
- `docs/` — notas

## Cómo se usa

1. Abrir la URL pública en el iPhone
2. Buscar/filtrar prendas (por categoría, talla, texto)
3. Negociar precio: ajustar input "→ $X" directo en la card
4. Tocar "Marcar Vendido" cuando se cierra venta
5. Bottom bar muestra contador + suma total vendido
6. "Exportar" copia resumen al portapapeles
7. "Reset" para arrancar otro día (con confirmación)

Persistencia: localStorage del browser. No hay backend.

## Cómo agregar items nuevos al xls

1. Editar `data/inventario-original-2026-05-23.xls` en Excel
2. Correr el conversor:
   ```
   python3 scripts/build-data.py
   ```
3. Push a GitHub para redeploy de Pages

## Deploy

GitHub Pages desde el branch `main` carpeta `webapp/`.
URL: https://pedrorojascampuzano-blip.github.io/steph-closet-sale/
