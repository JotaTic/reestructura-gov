"use client";

import { useCallback, type RefObject } from "react";

/**
 * Hook para exportar el organigrama (contenedor ReactFlow) a PNG, PDF y Word (imagen embebida).
 * Usa html2canvas para capturar el DOM y jsPDF para generar el PDF.
 *
 * @param containerRef - Ref al div que contiene el ReactFlow
 * @param filename - Nombre base del archivo (sin extensión)
 */
export function useExportOrganigrama(
  containerRef: RefObject<HTMLDivElement | null>,
  filename: string = "organigrama",
) {
  /** Captura el contenedor como canvas usando html2canvas */
  const capture = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!containerRef.current) return null;

    // Importar dinámicamente para no cargar en SSR
    const html2canvas = (await import("html2canvas")).default;

    // Buscar el viewport de ReactFlow dentro del contenedor
    const viewport =
      containerRef.current.querySelector(".react-flow__viewport") as HTMLElement | null;
    const target = viewport || containerRef.current;

    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2, // Alta resolución
      useCORS: true,
      logging: false,
      // Capturar el contenedor completo incluyendo overflow
      scrollX: 0,
      scrollY: 0,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });

    return canvas;
  }, [containerRef]);

  /** Exportar como imagen PNG */
  const exportPNG = useCallback(async () => {
    const canvas = await capture();
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [capture, filename]);

  /** Exportar como PDF (paisaje, ajustado al contenido) */
  const exportPDF = useCallback(async () => {
    const canvas = await capture();
    if (!canvas) return;

    const { jsPDF } = await import("jspdf");

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Determinar orientación según aspecto
    const orientation = imgWidth > imgHeight ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [imgWidth / 2, imgHeight / 2], // /2 porque scale=2
    });

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth / 2, imgHeight / 2);
    pdf.save(`${filename}.pdf`);
  }, [capture, filename]);

  /** Exportar como Word (.docx) con la imagen embebida */
  const exportWord = useCallback(async () => {
    const canvas = await capture();
    if (!canvas) return;

    // Convertir canvas a blob para embebir en HTML-docx
    const imgData = canvas.toDataURL("image/png");

    // Generar un HTML simple que Word puede abrir
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: landscape; margin: 1cm; }
          body { font-family: Calibri, Arial, sans-serif; }
          h1 { color: #0E7490; font-size: 18pt; }
          .meta { color: #64748B; font-size: 10pt; margin-bottom: 12pt; }
        </style>
      </head>
      <body>
        <h1>Estructura Orgánica — Organigrama</h1>
        <p class="meta">Generado desde ReEstructura.Gov · ${new Date().toLocaleDateString("es-CO")}</p>
        <img src="${imgData}" style="max-width:100%; height:auto;" />
      </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [capture, filename]);

  return { exportPNG, exportPDF, exportWord };
}
