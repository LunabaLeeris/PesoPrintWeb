'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, RotateCcw, X, ArrowLeft, Loader2 } from 'lucide-react';
import { NavBar } from '@/components/common/nav-bar';
import { getDocumentByIdAndKiosk } from '@/services/kiosk-service';
import { getCachedDocumentId } from '@/lib/document-cache';
import { PrintPairCard, PrintPairItem } from './print-pair-card';
import { ReprintReasonsView } from './reprint-reasons-view';
import { ReprintLoadingView } from './reprint-loading-view';
import { ThankYouView } from './thank-you-view';
import { PagePrintOption } from '@/types';
import { cn } from '@/lib/utils';

export type ConfirmationStage =
  | 'list'
  | 'detail'
  | 'reprint-reasons'
  | 'reprint-loading'
  | 'reprint-results'
  | 'thank-you';

export interface PrintConfirmationViewProps {
  kioskId: string;
  documentId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  totalPages?: number;
  totalCopies?: number;
  initialOptions?: PagePrintOption[];
  reprintedPairIds?: string[];
  onDone?: () => void;
  onReprint?: (acceptedPairIds: string[]) => void;
}

// In-memory cache for parsed PDF document proxies to avoid re-fetching
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const confirmationPdfCache = new Map<string, any>();

export const PrintConfirmationView: React.FC<PrintConfirmationViewProps> = ({
  kioskId,
  documentId,
  pdfDoc: initialPdfDoc,
  totalPages = 2,
  totalCopies = 3,
  initialOptions,
  reprintedPairIds = [],
  onDone,
  onReprint,
}) => {
  const router = useRouter();

  // 1. Session Expiry Countdown (92s matching "1 minute and 32 seconds")
  const [timeLeft, setTimeLeft] = useState<number>(92);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minText = mins === 1 ? '1 minute' : `${mins} minutes`;
    const secText = `${secs} seconds`;
    if (mins > 0) {
      return `${minText} and ${secText}`;
    }
    return `${secs} seconds`;
  };

  // 2. Resolve Document & Options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(initialPdfDoc || null);
  const [options, setOptions] = useState<PagePrintOption[] | null>(initialOptions || null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(!initialPdfDoc);

  useEffect(() => {
    if (initialPdfDoc) {
      setPdfDoc(initialPdfDoc);
      setIsLoadingPdf(false);
      return;
    }

    let isCancelled = false;
    const resolvedDocId = documentId || getCachedDocumentId();

    async function loadDocumentAndPdf() {
      if (!resolvedDocId) {
        setIsLoadingPdf(false);
        return;
      }

      // Check cache first
      if (confirmationPdfCache.has(resolvedDocId)) {
        setPdfDoc(confirmationPdfCache.get(resolvedDocId));
        setIsLoadingPdf(false);
        return;
      }

      try {
        setIsLoadingPdf(true);
        const docRecord = await getDocumentByIdAndKiosk(resolvedDocId, kioskId);
        if (isCancelled) return;

        if (docRecord?.options && Array.isArray(docRecord.options)) {
          setOptions(docRecord.options as PagePrintOption[]);
        }

        const docUrl = docRecord?.document_url;
        if (docUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfjsLib: any = await import('pdfjs-dist/build/pdf.js');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

          const loadingTask = pdfjsLib.getDocument(docUrl);
          const loaded = await loadingTask.promise;
          if (isCancelled) return;

          confirmationPdfCache.set(resolvedDocId, loaded);
          setPdfDoc(loaded);
        }
      } catch (err) {
        console.error('Error loading PDF in PrintConfirmationView:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      }
    }

    loadDocumentAndPdf();

    return () => {
      isCancelled = true;
    };
  }, [documentId, kioskId, initialPdfDoc]);

  // 3. Derive Print Pairs List
  const pairs: PrintPairItem[] = useMemo(() => {
    // If we have document options (e.g. [[1, 2], [2, 1]])
    if (options && options.length > 0) {
      const result: PrintPairItem[] = [];
      options.forEach(([pageNumber, count]) => {
        const absPage = Math.abs(pageNumber);
        for (let copy = 0; copy < count; copy++) {
          result.push({
            id: `pair-p${absPage}-c${copy}`,
            pageNumber: absPage,
            copyIndex: copy,
            label: copy === 0 ? `Page ${absPage}` : `Page ${absPage} (${copy})`,
          });
        }
      });
      return result;
    }

    // Fallback: Generate pairs matching the mock shown in reference images (Page 1, Page 1 (1), Page 2)
    const effectiveTotal = Math.max(1, pdfDoc?.numPages || totalPages || 2);
    if (effectiveTotal >= 2 && totalCopies >= 3) {
      return [
        { id: 'pair-p1-c0', pageNumber: 1, copyIndex: 0, label: 'Page 1' },
        { id: 'pair-p1-c1', pageNumber: 1, copyIndex: 1, label: 'Page 1 (1)' },
        { id: 'pair-p2-c0', pageNumber: 2, copyIndex: 0, label: 'Page 2' },
      ];
    }

    // Default 1 copy per page
    return Array.from({ length: effectiveTotal }, (_, idx) => ({
      id: `pair-p${idx + 1}-c0`,
      pageNumber: idx + 1,
      copyIndex: 0,
      label: `Page ${idx + 1}`,
    }));
  }, [options, pdfDoc?.numPages, totalPages, totalCopies]);

  // 4. Flow Stages
  const [stage, setStage] = useState<ConfirmationStage>('list');

  // Detailed full-comparison view
  const [activeDetailPair, setActiveDetailPair] = useState<PrintPairItem | null>(null);

  // Reprint selection mode
  const [isReprintMode, setIsReprintMode] = useState<boolean>(false);
  const [selectedReprintIds, setSelectedReprintIds] = useState<Set<string>>(new Set());

  // Stored reprint reasons: pairId -> reasons[]
  const [, setReprintReasonsMap] = useState<Record<string, string[]>>({});

  // ML Evaluation results: pairId -> 'accepted' | 'rejected'
  const [reprintResults, setReprintResults] = useState<Record<string, 'accepted' | 'rejected'>>({});

  // Selected reprint pairs list
  const selectedReprintPairs = useMemo(() => {
    return pairs.filter((p) => selectedReprintIds.has(p.id));
  }, [pairs, selectedReprintIds]);

  // Handle click on a pair
  const handlePairClick = (pair: PrintPairItem) => {
    if (stage === 'reprint-results') {
      setActiveDetailPair(pair);
    } else if (isReprintMode) {
      // In reprint mode: toggle selection
      setSelectedReprintIds((prev) => {
        const next = new Set(prev);
        if (next.has(pair.id)) {
          next.delete(pair.id);
        } else {
          next.add(pair.id);
        }
        if (next.size === 0) {
          setIsReprintMode(false);
        }
        return next;
      });
    } else {
      // Normal mode: open full comparison view
      setActiveDetailPair(pair);
    }
  };

  // Handle long-press on a pair: triggers reprint choosing event
  const handlePairLongPress = (pair: PrintPairItem) => {
    if (stage === 'reprint-results') return;
    setIsReprintMode(true);
    setSelectedReprintIds((prev) => {
      const next = new Set(prev);
      next.add(pair.id);
      return next;
    });
  };

  // Cancel reprint mode
  const handleCancelReprint = () => {
    setSelectedReprintIds(new Set());
    setIsReprintMode(false);
  };

  // Trigger Reprint Reasons Questionnaire when blue Reprint button is clicked
  const handleStartReprintFlow = () => {
    if (selectedReprintPairs.length === 0) return;
    setStage('reprint-reasons');
  };

  // Done button action in normal confirmation list: transitions to Thank You completion page
  const handleDoneClick = () => {
    setStage('thank-you');
  };

  // ========================================================
  // STAGE 1: REPRINT REASONS VIEW (Matching Image A)
  // ========================================================
  if (stage === 'reprint-reasons') {
    return (
      <ReprintReasonsView
        selectedPairs={selectedReprintPairs}
        pdfDoc={pdfDoc}
        onCancel={() => {
          setStage('list');
        }}
        onSubmit={(reasons) => {
          setReprintReasonsMap(reasons);
          setStage('reprint-loading');
        }}
      />
    );
  }

  // ========================================================
  // STAGE 2: REPRINT LOADING VIEW (Matching Image B)
  // ========================================================
  if (stage === 'reprint-loading') {
    return (
      <ReprintLoadingView
        onCancel={() => {
          setStage('list');
        }}
        onComplete={() => {
          // Mock ML evaluation verdict (matching Image C: Page 1 Accepted, Page 1 (1) Rejected, Page 2 Accepted)
          const results: Record<string, 'accepted' | 'rejected'> = {};
          selectedReprintPairs.forEach((p, idx) => {
            results[p.id] = idx === 1 ? 'rejected' : 'accepted';
          });
          setReprintResults(results);
          setStage('reprint-results');
        }}
      />
    );
  }

  // ========================================================
  // STAGE: THANK YOU / COMPLETION VIEW (User Image)
  // ========================================================
  if (stage === 'thank-you') {
    return (
      <ThankYouView
        kioskId={kioskId}
        onPrintMore={() => {
          if (onDone) {
            onDone();
          } else {
            router.push(`/kiosk/${kioskId}`);
          }
        }}
      />
    );
  }

  // ========================================================
  // STAGE 3: NORMAL LIST, DETAIL VIEW, OR RESULTS VIEW
  // ========================================================
  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="w-full h-full max-w-[430px] bg-top bg-no-repeat bg-cover opacity-90"
          style={{
            backgroundImage: "url('/background.svg')",
            backgroundSize: '100% auto',
          }}
        />
      </div>

      {/* Top Header Navbar */}
      <div className="w-full shrink-0 z-20">
        <NavBar
          showAlertButton
          onAlertClick={() => alert('Please review your printed copies before leaving the kiosk.')}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
        />

        {/* Expiry Notification Sub-text */}
        <div className="w-full max-w-[430px] mx-auto text-center pt-2 pb-1 px-4 z-10">
          <p className="text-[13px] sm:text-[14px] font-medium text-[#7C808E] select-none">
            This session will expire in{' '}
            <span className="text-[#DC2626] font-semibold">{formatTime(timeLeft)}</span>
          </p>
        </div>
      </div>

      {/* Main Content Modal Card */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-1.5 sm:mt-2 relative">
        <section
          role="region"
          aria-label={
            activeDetailPair
              ? 'Print Comparison View'
              : stage === 'reprint-results'
              ? 'Reprint Evaluation Results'
              : 'Print Confirmation'
          }
          className={cn(
            'w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col overflow-y-auto px-4 sm:px-6 pt-5 pb-24 relative'
          )}
        >
          {activeDetailPair ? (
            /* ======================================================== */
            /* DETAIL COMPARISON VIEW (Matching Image 2)                */
            /* ======================================================== */
            <DetailComparisonView
              pair={activeDetailPair}
              pdfDoc={pdfDoc}
              isReprinted={reprintedPairIds.includes(activeDetailPair.id)}
              onBack={() => setActiveDetailPair(null)}
            />
          ) : (
            /* ======================================================== */
            /* LIST VIEW OR REPRINT RESULTS VIEW (Image 1 & Image C)    */
            /* ======================================================== */
            <div className="w-full flex flex-col gap-4">
              {isLoadingPdf && (
                <div className="w-full py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#34418E]" />
                  <span className="text-[13px] font-medium text-[#7C808E]">
                    Loading printed pages...
                  </span>
                </div>
              )}

              {(stage === 'reprint-results' ? selectedReprintPairs : pairs).map((pair) => (
                <PrintPairCard
                  key={pair.id}
                  pair={pair}
                  pdfDoc={pdfDoc}
                  isReprintMode={isReprintMode && stage !== 'reprint-results'}
                  isSelectedForReprint={selectedReprintIds.has(pair.id) && stage !== 'reprint-results'}
                  isReprinted={reprintedPairIds.includes(pair.id)}
                  status={stage === 'reprint-results' ? reprintResults[pair.id] || null : null}
                  onClick={handlePairClick}
                  onLongPress={handlePairLongPress}
                />
              ))}
            </div>
          )}
        </section>

        {/* ========================================================== */}
        {/* DOCKED ACTION BUTTONS (Matching Reference Screenshots)     */}
        {/* ========================================================== */}

        {/* 1. In Detail View: Single Yellow Back Button (Image 2) */}
        {activeDetailPair && (
          <button
            type="button"
            onClick={() => setActiveDetailPair(null)}
            aria-label="Back to confirmation list"
            className={cn(
              'fixed right-0 z-50 transition-all duration-150 select-none cursor-pointer',
              'top-[180px] sm:top-[190px]',
              'bg-[#FDD41F] hover:bg-[#EAB308] active:scale-95 text-[#1E2026] font-bold text-[15px]',
              'rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none border-y border-l border-[#E2BC16]',
              'shadow-[-2px_4px_18px_rgba(253,212,31,0.4)]',
              'flex items-center gap-2 px-4 py-3'
            )}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span>Back</span>
          </button>
        )}

        {/* 2. In Normal List View: Single Green Done Button (Image 1) */}
        {!activeDetailPair && (!isReprintMode || selectedReprintIds.size === 0) && stage === 'list' && (
          <button
            type="button"
            onClick={handleDoneClick}
            aria-label="Done confirmation"
            className={cn(
              'fixed right-0 z-50 transition-all duration-150 select-none cursor-pointer animate-fadeIn',
              'bottom-[100px] sm:bottom-[115px]',
              'bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white font-bold text-[16px]',
              'rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none border-y border-l border-[#16A34A]',
              'shadow-[-2px_4px_18px_rgba(34,197,94,0.35)]',
              'flex items-center gap-2 px-5 py-3'
            )}
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Done</span>
          </button>
        )}

        {/* 3. In Reprint Choosing Mode: Blue Reprint Button (Right) & Cancel Button (Left) */}
        {!activeDetailPair && isReprintMode && selectedReprintIds.size > 0 && stage === 'list' && (
          <>
            {/* Cancel Button docked on the LEFT edge */}
            <button
              type="button"
              onClick={handleCancelReprint}
              aria-label="Cancel reprint mode"
              className={cn(
                'fixed left-0 z-50 transition-all duration-150 select-none cursor-pointer animate-fadeIn',
                'top-[180px] sm:top-[190px]',
                'bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white font-bold text-[14px]',
                'rounded-r-[18px] sm:rounded-r-[20px] rounded-l-none border-y border-r border-[#991B1B]',
                'shadow-[2px_4px_18px_rgba(220,38,38,0.35)]',
                'flex items-center justify-center p-3.5 sm:p-4'
              )}
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* Reprint Action Button (docked right) */}
            <button
              type="button"
              onClick={handleStartReprintFlow}
              aria-label="Specify reprint reasons"
              className={cn(
                'fixed right-0 z-50 transition-all duration-150 select-none cursor-pointer animate-fadeIn',
                'bottom-[110px] sm:bottom-[125px]',
                'bg-[#34418E] hover:bg-[#28326D] active:scale-95 text-white font-bold text-[16px]',
                'rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none border-y border-l border-[#242E6B]',
                'shadow-[-2px_4px_18px_rgba(52,65,142,0.35)]',
                'flex items-center gap-2 px-5 py-3'
              )}
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              <span>Reprint</span>
            </button>
          </>
        )}

        {/* 4. In Reprint Results Stage: Red Cancel Button (LEFT) + Green Reprint Button (RIGHT) */}
        {!activeDetailPair && stage === 'reprint-results' && (
          <>
            {/* Red Cancel Button docked on the LEFT edge */}
            <button
              type="button"
              onClick={() => {
                setStage('list');
                setIsReprintMode(false);
                setSelectedReprintIds(new Set());
              }}
              aria-label="Cancel reprint results"
              className={cn(
                'fixed left-0 z-50 transition-all duration-150 select-none cursor-pointer animate-fadeIn',
                'top-[180px] sm:top-[190px]',
                'bg-[#DC2626] hover:bg-[#B91C1C] active:scale-95 text-white',
                'rounded-r-[18px] sm:rounded-r-[20px] rounded-l-none border-y border-r border-[#B91C1C]',
                'shadow-[2px_4px_18px_rgba(220,38,38,0.35)]',
                'flex items-center justify-center p-3.5 sm:p-4'
              )}
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* Green Reprint / Print Button docked on bottom right (Image C) */}
            <button
              type="button"
              onClick={() => {
                const accepted = selectedReprintPairs
                  .filter((p) => reprintResults[p.id] !== 'rejected')
                  .map((p) => p.id);
                const toReprint = accepted.length > 0 ? accepted : selectedReprintPairs.map((p) => p.id);
                onReprint?.(toReprint);
              }}
              aria-label="Reprint approved copies"
              className={cn(
                'fixed right-0 z-50 transition-all duration-150 select-none cursor-pointer animate-fadeIn',
                'bottom-[110px] sm:bottom-[125px]',
                'bg-[#22C55E] hover:bg-[#16A34A] active:scale-95 text-white font-bold text-[16px]',
                'rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none border-y border-l border-[#16A34A]',
                'shadow-[-2px_4px_18px_rgba(34,197,94,0.35)]',
                'flex items-center gap-2 px-5 py-3.5'
              )}
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>Print</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
};

/* ==================================================================== */
/* SUBCOMPONENT: DETAIL COMPARISON VIEW (Image 2)                       */
/* Places original document page and printed version vertically stacked */
/* ==================================================================== */

interface DetailComparisonViewProps {
  pair: PrintPairItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  isReprinted?: boolean;
  onBack: () => void;
}

const DetailComparisonView: React.FC<DetailComparisonViewProps> = ({
  pair,
  pdfDoc,
  isReprinted = false,
  onBack,
}) => {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const printedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTaskOrig: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTaskPrinted: any = null;

    async function drawFullPages() {
      if (!pdfDoc) {
        setIsRendering(false);
        return;
      }

      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pair.pageNumber);
        if (isCancelled) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const targetWidth = 380;
        const baseViewport = page.getViewport({ scale: 1.0 });
        const scale = (targetWidth / baseViewport.width) * Math.min(dpr, 2.5);
        const viewport = page.getViewport({ scale });

        // 1. Draw Original Page Canvas
        const origCanvas = originalCanvasRef.current;
        if (origCanvas) {
          origCanvas.width = Math.floor(viewport.width);
          origCanvas.height = Math.floor(viewport.height);
          const ctx = origCanvas.getContext('2d');
          if (ctx) {
            renderTaskOrig = page.render({
              canvasContext: ctx,
              viewport,
            });
            await renderTaskOrig.promise;
          }
        }

        if (isCancelled) return;

        // 2. Draw Printed Page Canvas (for now, actual page as printed prototype)
        const printCanvas = printedCanvasRef.current;
        if (printCanvas) {
          printCanvas.width = Math.floor(viewport.width);
          printCanvas.height = Math.floor(viewport.height);
          const ctx = printCanvas.getContext('2d');
          if (ctx) {
            renderTaskPrinted = page.render({
              canvasContext: ctx,
              viewport,
            });
            await renderTaskPrinted.promise;
          }
        }

        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering detail comparison for page ${pair.pageNumber}:`, err);
        }
      }
    }

    drawFullPages();

    return () => {
      isCancelled = true;
      if (renderTaskOrig && typeof renderTaskOrig.cancel === 'function') {
        renderTaskOrig.cancel();
      }
      if (renderTaskPrinted && typeof renderTaskPrinted.cancel === 'function') {
        renderTaskPrinted.cancel();
      }
    };
  }, [pdfDoc, pair.pageNumber]);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12">
      {/* 1. TOP DOCUMENT: ORIGINAL */}
      <div className="relative w-full bg-white rounded-[12px] border border-[#CBD0DC] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
        {/* Top-Left Badge: "Original" */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-bold bg-[#34418E] text-white shadow-xs">
            Original
          </span>
        </div>

        {/* Canvas for Original PDF Page */}
        <div className="relative w-full aspect-[1/1.414] bg-white flex items-center justify-center p-2">
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] z-5">
              <Loader2 className="w-6 h-6 animate-spin text-[#34418E]/70" />
            </div>
          )}
          <canvas
            ref={originalCanvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Bottom-Center Badge: "Reprint" */}
        {isReprinted && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-fadeIn">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[12px] font-bold bg-[#34418E] text-white shadow-md tracking-wide">
              Reprint
            </span>
          </div>
        )}

        {/* Bottom-Right Badge: "Page X" */}
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <span className="inline-flex items-center px-3.5 py-1 rounded-[10px] text-[12px] font-semibold bg-[#EAEBED]/95 text-[#4B5263] border border-[#CBD0DC] shadow-xs">
            {pair.label}
          </span>
        </div>
      </div>

      {/* 2. BOTTOM DOCUMENT: PRINTED / SCANNED */}
      <div className="relative w-full bg-white rounded-[12px] border border-[#CBD0DC] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
        {/* Top-Left Badge: "Printed" */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-[8px] text-[13px] font-bold bg-[#FACC15] text-[#1E2026] shadow-xs">
            Printed
          </span>
        </div>

        {/* Canvas for Printed PDF Page (for now, actual page with subtle scan contrast) */}
        <div className="relative w-full aspect-[1/1.414] bg-[#F7F7F8] flex items-center justify-center p-2">
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] z-5">
              <Loader2 className="w-6 h-6 animate-spin text-[#34418E]/70" />
            </div>
          )}
          <canvas
            ref={printedCanvasRef}
            className="w-full h-full object-contain pointer-events-none brightness-[0.98] contrast-[1.03]"
          />
        </div>
      </div>
    </div>
  );
};
