/**
 * Print Cost Calculation Service
 * 
 * Computes document printing cost based on Percentage Covered (PPC) of black and colored ink.
 */

// Global variables for cost calculation based on Percentage Covered (PPC)
export const BLACK_M = 0.0053333334;

export const BLACK_B = 1.011690335;
export const COLOR_M = 0.008;
export const COLOR_B = 1.011690335;
export const DEFAULT_PROFIT = 2;

export interface PageCostCalculationInput {
  pageNumber: number;
  copies: number;
  blackPpc: number; // 0 to 100
  colorPpc: number; // 0 to 100
}

export interface PageCostResult {
  pageNumber: number;
  copies: number;
  blackPpc: number;
  colorPpc: number;
  rawBaseCost: number;
  profitAdded: number;
  pageCost: number; // Ceiled cost for a single copy of this page
  totalPageCost: number; // pageCost * copies
}

export interface DocumentCostCalculationOptions {
  colorScheme: 'B&W' | 'Color' | string;
  profit?: number;
}

export interface DocumentCostSummary {
  totalPages: number;
  totalCopies: number;
  colorScheme: string;
  profit: number;
  pageBreakdown: PageCostResult[];
  totalCost: number; // Total document price in Pesos (ceiled per page multiplied by copies)
}

/**
 * Calculates print cost for an individual page.
 * 
 * Formula:
 * - Black only (B&W): f(PPC) = BLACK_M * totalPpc + BLACK_B
 * - Color: f(PPC) = (BLACK_M * blackPpc) + (COLOR_M * colorPpc) + COLOR_B
 * - Raw Cost = f(PPC) + profit (default 2)
 * - Page Cost = Math.ceil(Raw Cost)
 * - Total Page Cost = Page Cost * copies
 */
export function calculatePageCost(
  page: PageCostCalculationInput,
  colorScheme: 'B&W' | 'Color' | string,
  profit: number = DEFAULT_PROFIT
): PageCostResult {
  const copies = page.copies !== undefined ? page.copies : 1;
  if (copies <= 0) {
    return {
      pageNumber: page.pageNumber,
      copies: 0,
      blackPpc: page.blackPpc,
      colorPpc: page.colorPpc,
      rawBaseCost: 0,
      profitAdded: 0,
      pageCost: 0,
      totalPageCost: 0,
    };
  }

  const isColor = colorScheme === 'Color';
  let rawBaseCost: number;

  if (!isColor) {
    // If the color scheme is black, we only do the cost calculation for black
    const totalPpc = Math.max(0, page.blackPpc + (page.colorPpc || 0));
    rawBaseCost = BLACK_M * totalPpc + BLACK_B;
  } else {
    // If colored, we split black and colored coverage
    const blackPart = BLACK_M * Math.max(0, page.blackPpc);
    const colorPart = COLOR_M * Math.max(0, page.colorPpc);
    rawBaseCost = blackPart + colorPart + COLOR_B;
  }

  // Add profit which will be added to the overall cost 
  const rawCostWithProfit = rawBaseCost + profit;

  // Ceiling the result for each page
  const pageCost = Math.ceil(rawCostWithProfit);

  // Duplicate the duplicated pages
  const totalPageCost = pageCost * copies;

  return {
    pageNumber: page.pageNumber,
    copies,
    blackPpc: Number(page.blackPpc.toFixed(2)),
    colorPpc: Number(page.colorPpc.toFixed(2)),
    rawBaseCost: Number(rawBaseCost.toFixed(6)),
    profitAdded: profit,
    pageCost,
    totalPageCost,
  };
}

/**
 * Calculates the total cost of a printed document across all pages and duplicated copies.
 */
export function calculateDocumentCost(
  pages: PageCostCalculationInput[],
  options: DocumentCostCalculationOptions
): DocumentCostSummary {
  const profit = options.profit !== undefined ? options.profit : DEFAULT_PROFIT;
  const colorScheme = options.colorScheme || 'B&W';

  const pageBreakdown = pages.map((page) =>
    calculatePageCost(page, colorScheme, profit)
  );

  const totalCopies = pageBreakdown.reduce((sum, p) => sum + p.copies, 0);
  const totalCost = pageBreakdown.reduce((sum, p) => sum + p.totalPageCost, 0);

  return {
    totalPages: pages.length,
    totalCopies,
    colorScheme,
    profit,
    pageBreakdown,
    totalCost,
  };
}

/**
 * Analyzes RGB distribution on a rendered PDF page canvas to determine
 * percentage covered (PPC) for black/gray ink and colored ink.
 */
export async function analyzePdfPageCoverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNumber: number
): Promise<{ blackPpc: number; colorPpc: number }> {
  try {
    if (!pdfDoc || typeof pdfDoc.getPage !== 'function') {
      // Default fallback for unit test or mock environments
      return { blackPpc: 5.0, colorPpc: 0.0 };
    }

    const page = await pdfDoc.getPage(pageNumber);
    // Downscale for fast RGB distribution analysis (viewport scale 0.5)
    const viewport = page.getViewport({ scale: 0.5 });

    if (typeof document === 'undefined') {
      return { blackPpc: 5.0, colorPpc: 0.0 };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return { blackPpc: 5.0, colorPpc: 0.0 };
    }

    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
    });

    if (renderTask?.promise) {
      await renderTask.promise;
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const totalPixels = canvas.width * canvas.height;

    if (totalPixels === 0) {
      return { blackPpc: 0, colorPpc: 0 };
    }

    let blackPixelCount = 0;
    let colorPixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Transparent or near-white background pixels (paper) are ignored
      if (a < 50 || (r > 240 && g > 240 && b > 240)) {
        continue;
      }

      // Check difference between RGB channels for color saturation
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const delta = maxVal - minVal;

      if (delta <= 20) {
        // Neutral grayscale / black ink
        blackPixelCount++;
      } else {
        // Colored ink
        colorPixelCount++;
      }
    }

    const blackPpc = (blackPixelCount / totalPixels) * 100;
    const colorPpc = (colorPixelCount / totalPixels) * 100;

    return {
      blackPpc: Number(blackPpc.toFixed(2)),
      colorPpc: Number(colorPpc.toFixed(2)),
    };
  } catch (err) {
    console.warn(`Could not analyze page ${pageNumber} coverage:`, err);
    return { blackPpc: 5.0, colorPpc: 0.0 };
  }
}

/**
 * Backend API Client: sends page metrics to server route to verify and compute total document cost.
 */
export async function requestDocumentCostCalculation(
  documentId?: string,
  payload?: {
    pages: PageCostCalculationInput[];
    colorScheme: string;
    profit?: number;
    kioskId?: string;
  }
): Promise<DocumentCostSummary> {
  const actualPayload = payload || { pages: [], colorScheme: 'B&W' };

  if (documentId) {
    try {
      const response = await fetch(`/api/documents/${documentId}/calculate-cost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actualPayload),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          return json.data as DocumentCostSummary;
        }
      }
    } catch (err) {
      console.warn('Backend cost calculation request failed, falling back to local calculation:', err);
    }
  }

  // Graceful fallback to client-side calculation
  return calculateDocumentCost(actualPayload.pages, {
    colorScheme: actualPayload.colorScheme,
    profit: actualPayload.profit,
  });
}
