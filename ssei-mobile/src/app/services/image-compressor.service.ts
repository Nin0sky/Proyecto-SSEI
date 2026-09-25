import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageCompressorService {

  /**
   * Comprime una imagen Base64/DataURL usando HTML5 Canvas.
   * - Reescala manteniendo proporción (lado mayor = maxDimension).
   * - Convierte a JPEG con la calidad indicada.
   * - Alineado con el backend: 1920px / 0.80 por defecto.
   */
  compress(
    base64Str: string,
    maxDimension: number = 1920,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        // Escalar manteniendo proporción por el lado mayor
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Fondo blanco para imágenes con transparencia (PNG -> JPEG)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str); // Fallback: sin canvas, devolver original
        }
      };

      img.onerror = () => resolve(base64Str);
    });
  }
}