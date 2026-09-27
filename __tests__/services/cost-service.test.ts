import {
  BLACK_M,
  BLACK_B,
  COLOR_M,
  COLOR_B,
  DEFAULT_PROFIT,
  calculatePageCost,
  calculateDocumentCost,
  PageCostCalculationInput,
} from '@/services/cost-service';

describe('Print Cost Service - Cost Calculation Formulas and Constants', () => {
  test('exports the exact required global variables for cost calculation', () => {
    expect(BLACK_M).toBeCloseTo(0.0053333334, 9);
    expect(BLACK_B).toBeCloseTo(1.011690335, 9);
    expect(COLOR_M).toBeCloseTo(0.008, 6);
    expect(COLOR_B).toBeCloseTo(1.011690335, 9);
    expect(DEFAULT_PROFIT).toBe(2);
  });

  test('calculates B&W page cost correctly using black m and b with profit and ceiling', () => {
    // Page with 5% black coverage (PPC = 5)
    // f(PPC) = 0.0053333334 * 5 + 1.011690335 = 0.026666667 + 1.011690335 = 1.038357
    // Profit = 2 => rawCostWithProfit = 3.038357
    // Math.ceil(3.038357) = 4
    const page: PageCostCalculationInput = {
      pageNumber: 1,
      copies: 1,
      blackPpc: 5.0,
      colorPpc: 0.0,
    };

    const result = calculatePageCost(page, 'B&W', 2);
    expect(result.pageCost).toBe(4);
    expect(result.totalPageCost).toBe(4);
    expect(result.rawBaseCost).toBeCloseTo(1.038357, 5);
  });

  test('calculates Color page cost correctly splitting black and colored coverage', () => {
    // Page with 10% black coverage and 20% color coverage
    // f(PPC) = (0.0053333334 * 10) + (0.008 * 20) + 1.011690335
    //        = 0.053333334 + 0.16 + 1.011690335 = 1.225023669
    // Profit = 2 => rawCostWithProfit = 3.225023669
    // Math.ceil(3.225023669) = 4
    const page: PageCostCalculationInput = {
      pageNumber: 1,
      copies: 1,
      blackPpc: 10.0,
      colorPpc: 20.0,
    };

    const result = calculatePageCost(page, 'Color', 2);
    expect(result.pageCost).toBe(4);
    expect(result.totalPageCost).toBe(4);
    expect(result.rawBaseCost).toBeCloseTo(1.2250236, 5);
  });

  test('multiplies ceiled page cost by duplicate copies for duplicated pages', () => {
    const page: PageCostCalculationInput = {
      pageNumber: 2,
      copies: 3, // 3 duplicate copies
      blackPpc: 5.0,
      colorPpc: 0.0,
    };

    const result = calculatePageCost(page, 'B&W', 2);
    expect(result.pageCost).toBe(4);
    expect(result.totalPageCost).toBe(12); // 4 * 3 = 12
  });

  test('calculates total document cost summing all pages and duplicates', () => {
    const pages: PageCostCalculationInput[] = [
      { pageNumber: 1, copies: 1, blackPpc: 5.0, colorPpc: 0.0 }, // cost: 4
      { pageNumber: 2, copies: 2, blackPpc: 8.0, colorPpc: 0.0 }, // cost: 4 * 2 = 8
      { pageNumber: 3, copies: 1, blackPpc: 3.0, colorPpc: 0.0 }, // cost: 4
    ];

    const summary = calculateDocumentCost(pages, { colorScheme: 'B&W', profit: 2 });
    expect(summary.totalPages).toBe(3);
    expect(summary.totalCopies).toBe(4);
    expect(summary.totalCost).toBe(16); // 4 + 8 + 4 = 16
    expect(summary.pageBreakdown).toHaveLength(3);
  });

  test('handles 0 copies appropriately', () => {
    const page: PageCostCalculationInput = {
      pageNumber: 1,
      copies: 0,
      blackPpc: 10.0,
      colorPpc: 0.0,
    };

    const result = calculatePageCost(page, 'B&W', 2);
    expect(result.pageCost).toBe(0);
    expect(result.totalPageCost).toBe(0);
  });
});
