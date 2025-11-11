# Ícones PWA

Para que o PWA funcione completamente, você precisa criar os seguintes ícones na pasta `public`:

- `pwa-192x192.png` - Ícone 192x192 pixels
- `pwa-512x512.png` - Ícone 512x512 pixels

## Como criar os ícones

1. Crie um ícone quadrado com pelo menos 512x512 pixels
2. Use uma ferramenta online como:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - https://favicon.io/

3. Ou use ImageMagick/GraphicsMagick:
```bash
# Converter uma imagem existente para os tamanhos necessários
convert logo.png -resize 192x192 pwa-192x192.png
convert logo.png -resize 512x512 pwa-512x512.png
```

4. Coloque os arquivos na pasta `apps/web/public/`

## Ícones opcionais

- `favicon.ico` - Favicon tradicional
- `apple-touch-icon.png` - Ícone para iOS (180x180 pixels)
- `mask-icon.svg` - Ícone SVG para máscara



