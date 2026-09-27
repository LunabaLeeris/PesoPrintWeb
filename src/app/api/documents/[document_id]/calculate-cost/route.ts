import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDocumentCost,
  PageCostCalculationInput,
  DocumentCostCalculationOptions,
} from '@/services/cost-service';

interface RouteContext {
  params: Promise<{
    document_id: string;
  }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { document_id } = await context.params;
    const body = await req.json();

    const { pages, colorScheme = 'B&W', profit } = body as {
      pages?: PageCostCalculationInput[];
      colorScheme?: string;
      profit?: number;
      kioskId?: string;
    };

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { success: false, error: 'Pages array is required for cost calculation' },
        { status: 400 }
      );
    }

    const options: DocumentCostCalculationOptions = {
      colorScheme,
      profit,
    };

    const costSummary = calculateDocumentCost(pages, options);

    return NextResponse.json({
      success: true,
      documentId: document_id,
      data: costSummary,
    });
  } catch (err) {
    console.error('Error calculating document print cost:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown server error during cost calculation',
      },
      { status: 500 }
    );
  }
}
