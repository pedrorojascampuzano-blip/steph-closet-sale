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

GitHub Pages desde el branch `main` carpeta `docs/`.
URL: https://pedrorojascampuzano-blip.github.io/steph-closet-sale/

## Virtual try-on + 3D piece

Cualquier prenda con foto tiene 2 botones extra:

- **👗 Probar en modelo** — escoge uno de 4 modelos preset (slim/medium/curvy/petite) o sube tu foto. Manda al endpoint del Apps Script, que llama a `yisol/IDM-VTON` (free HF Space). Devuelve un PNG con la prenda puesta. ~25s.
- **✨ Ver en 3D** — convierte la foto de la prenda en un modelo 3D rotable (GLB). Renderizado con `tencent/Hunyuan3D-2`. ~10s.

Ambos servicios usan **Hugging Face Spaces gratuitos** sin tarjeta. Rate limit interno en el Apps Script: 30 calls/día por acción.

Si los HF Spaces están saturados o caídos, la webapp muestra error claro y la prenda sigue vendible sin esa feature.

Modelos preset en `docs/models/` con attribution en `models/credits.txt` (Pexels, license libre).
