'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/common/nav-bar';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/common/button';
import { DocumentRow, PagePrintOption } from '@/types';
import { updateDocumentPrintOptions, deleteDocumentRecord } from '@/services/kiosk-service';
import { deletePrintDocument } from '@/services/storage-service';
import { resolveKioskId } from '@/lib/kiosk';
import { createClient } from '@/lib/supabase/client';
import {
  CopyStepper,
  PageIndicator,
  PageThumbnailCard,
  SideActionButton,
  ViewerMenuPanel,
  PrintStreamModal,
  AnalyzingCostView,
  OrganizePagesView,
  PrintOptions,
} from './components';
import { saveCachedDocumentId } from '@/lib/document-cache';
import {
  analyzePdfPageCoverage,
  requestDocumentCostCalculation,
  PageCostCalculationInput,
} from '@/services/cost-service';
import { usePrinter } from '@/hooks/use-printer';
import { ChevronLeft, ChevronRight, Check, Loader2, ZoomIn, ZoomOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// In-memory cache for parsed PDF document proxies to avoid re-fetching or re-parsing across view toggles
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfDocMemoryCache = new Map<string, any>();

// Global in-memory cache for pre-rendered page canvases: docKey -> (pageNum -> HTMLCanvasElement)
const renderedPageCanvasCache = new Map<string, Map<number, HTMLCanvasElement>>();

// In-flight page render promises: docKey -> (pageNum -> Promise<HTMLCanvasElement>)
const inFlightRenderPromises = new Map<string, Map<number, Promise<HTMLCanvasElement>>>();

function getCachedCanvas(docKey: string, pageNum: number): HTMLCanvasElement | undefined {
  return renderedPageCanvasCache.get(docKey)?.get(pageNum);
}

function setCachedCanvas(docKey: string, pageNum: number, canvas: HTMLCanvasElement): void {
  let docMap = renderedPageCanvasCache.get(docKey);
  if (!docMap) {
    docMap = new Map();
    renderedPageCanvasCache.set(docKey, docMap);
  }
  docMap.set(pageNum, canvas);
}

export interface DocumentViewerProps {
  kioskId?: string;
  documentId?: string;
  initialDocument?: DocumentRow | null;
  file?: File | null;
  onBack?: () => void;
  onHelpClick?: () => void;
  initialViewMode?: 'single' | 'list' | 'organize';
  hideMenu?: boolean;
  hideMaximize?: boolean;
  hideCopyStepper?: boolean;
  hideZoom?: boolean;
  onCancelClick?: () => void;
  children?: React.ReactNode;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  kioskId,
  documentId,
  initialDocument,
  file,
  onBack,
  onHelpClick,
  initialViewMode = 'single',
  hideMenu = false,
  hideMaximize = false,
  hideCopyStepper = false,
  hideZoom = false,
  onCancelClick,
  children,
}) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedPageRef = useRef<number | null>(null);

  const [documentData, setDocumentData] = useState<DocumentRow | null>(initialDocument || null);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number>(1);
  const [totalPdfPages, setTotalPdfPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isSavingOptions, setIsSavingOptions] = useState<boolean>(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'list' | 'organize'>(initialViewMode);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Synchronize documentData when initialDocument prop updates
  useEffect(() => {
    if (initialDocument) {
      setDocumentData(initialDocument);
    }
  }, [initialDocument]);

  const activeDocId = documentId || initialDocument?.id;
  const activeKioskId = kioskId || initialDocument?.kiosk_id;

  // Fetch document row from Supabase if not provided or to ensure fresh options
  useEffect(() => {
    if (!documentData && activeDocId) {
      let isCancelled = false;
      async function fetchDoc() {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', activeDocId)
            .maybeSingle();

          if (!isCancelled && !error && data) {
            setDocumentData(data as DocumentRow);
          }
        } catch (err) {
          console.error('Failed to fetch document row:', err);
        }
      }

      fetchDoc();

      return () => {
        isCancelled = true;
      };
    }
  }, [activeDocId, documentData]);

  // Touch and Drag State
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Debounced database sync ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Raw options from documentData or initialDocument or default 1..totalPdfPages
  const rawOptions: PagePrintOption[] = useMemo(() => {
    const opts = documentData?.options || initialDocument?.options;
    if (Array.isArray(opts) && opts.length > 0) {
      return opts;
    }
    const count = totalPdfPages || 1;
    return Array.from({ length: count }, (_, i) => [i + 1, 1]);
  }, [documentData?.options, initialDocument?.options, totalPdfPages]);

  // Positive visible pages strictly in options order; pages <= 0 are skipped
  const visiblePages = useMemo(() => {
    const list: { pageNumber: number; copies: number; optionsIndex: number }[] = [];
    rawOptions.forEach((opt, idx) => {
      if (Array.isArray(opt) && opt.length >= 2) {
        const pageNum = opt[0];
        const copies = opt[1];
        if (pageNum > 0) {
          list.push({
            pageNumber: pageNum,
            copies: copies > 0 ? copies : 1,
            optionsIndex: idx,
          });
        }
      }
    });
    return list;
  }, [rawOptions]);

  const totalVisibleCount = visiblePages.length;
  const safeVisibleIndex = totalVisibleCount > 0
    ? Math.min(Math.max(1, currentVisibleIndex), totalVisibleCount)
    : 0;
  const activeVisibleItem = totalVisibleCount > 0 ? visiblePages[safeVisibleIndex - 1] : null;
  const activePdfPageNumber = activeVisibleItem ? activeVisibleItem.pageNumber : 1;
  const currentCopies = activeVisibleItem ? activeVisibleItem.copies : 1;

  // Auto-clamp current visible index if total visible count shrinks
  useEffect(() => {
    if (totalVisibleCount > 0 && currentVisibleIndex > totalVisibleCount) {
      setCurrentVisibleIndex(totalVisibleCount);
    }
  }, [totalVisibleCount, currentVisibleIndex]);

  // Persist active document ID into client-side cache
  useEffect(() => {
    if (activeDocId) {
      saveCachedDocumentId(activeDocId);
    }
  }, [activeDocId]);

  // Stable document cache key across re-renders and view toggles
  const documentCacheKey = React.useMemo(() => {
    if (activeDocId) return activeDocId;
    if (initialDocument?.document_url) return initialDocument.document_url;
    if (file) return `${file.name}-${file.size}-${file.lastModified}`;
    return 'default-doc';
  }, [activeDocId, initialDocument?.document_url, file]);

  // Memoize stable PDF URL to prevent generating new ObjectURLs on every render
  const pdfUrl = React.useMemo(() => {
    if (initialDocument?.document_url) {
      return initialDocument.document_url;
    }
    if (file) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [initialDocument?.document_url, file]);

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (file && pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, pdfUrl]);

  // Real-time Raspberry Pi Print Job Stream State
  const printer = usePrinter(activeKioskId);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Print Cost Analysis State
  const [isAnalyzingCost, setIsAnalyzingCost] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('reading rgb distribution...');
  const isAnalysisCancelledRef = useRef<boolean>(false);

  const handleStartCostAnalysis = async (options?: PrintOptions) => {
    const selectedOptions = options || {
      paperSize: 'A4',
      orientation: 'Portrait',
      colorScheme: 'B&W',
    };

    if (visiblePages.length === 0) {
      alert('There are no pages to print.');
      return;
    }

    setIsMenuOpen(false);
    setIsAnalyzingCost(true);
    setAnalysisProgress(0);
    setAnalysisStatusText('reading rgb distribution...');
    isAnalysisCancelledRef.current = false;

    try {
      const pageMetrics: PageCostCalculationInput[] = [];
      const totalToAnalyze = visiblePages.length;

      for (let idx = 0; idx < totalToAnalyze; idx++) {
        if (isAnalysisCancelledRef.current) return;
        const item = visiblePages[idx];
        const displayPageNum = idx + 1;

        const currentProgress = Math.round((idx / totalToAnalyze) * 85);
        setAnalysisProgress(currentProgress);
        setAnalysisStatusText(
          totalToAnalyze > 1
            ? `reading rgb distribution (page ${displayPageNum} of ${totalToAnalyze})...`
            : 'reading rgb distribution...'
        );

        // Short yield for smooth animation
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (isAnalysisCancelledRef.current) return;

        const coverage = await analyzePdfPageCoverage(pdfDoc, item.pageNumber);
        if (isAnalysisCancelledRef.current) return;

        pageMetrics.push({
          pageNumber: item.pageNumber,
          copies: item.copies,
          blackPpc: coverage.blackPpc,
          colorPpc: coverage.colorPpc,
        });
      }

      setAnalysisProgress(90);
      setAnalysisStatusText('calculating document cost...');
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (isAnalysisCancelledRef.current) return;

      const costSummary = await requestDocumentCostCalculation(activeDocId, {
        pages: pageMetrics,
        colorScheme: selectedOptions.colorScheme,
        profit: 2,
        kioskId: activeKioskId,
      });

      if (isAnalysisCancelledRef.current) return;

      setAnalysisProgress(100);
      setAnalysisStatusText('cost calculation complete');

      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`cost_summary_${activeDocId}`, JSON.stringify(costSummary));
        }
      } catch {
        // Ignore sessionStorage write errors
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      if (isAnalysisCancelledRef.current) return;

      const targetUrl = `/kiosk/${activeKioskId}/document_viewer/${activeDocId}/payment?cost=${costSummary.totalCost}&pages=${costSummary.totalPages}&copies=${costSummary.totalCopies}&scheme=${encodeURIComponent(selectedOptions.colorScheme)}&paper=${encodeURIComponent(selectedOptions.paperSize)}`;
      router.push(targetUrl);
    } catch (err) {
      console.error('Cost calculation error:', err);
      if (!isAnalysisCancelledRef.current) {
        setIsAnalyzingCost(false);
        alert('An error occurred while calculating print cost. Please try again.');
      }
    }
  };

  const handleCancelAnalysis = () => {
    isAnalysisCancelledRef.current = true;
    setIsAnalyzingCost(false);
  };

  const handlePrint = async () => {
    setIsMenuOpen(false);
    if (!pdfUrl) {
      alert('Document URL not found.');
      return;
    }
    setIsPrintModalOpen(true);
    await printer.printUrl(pdfUrl, 1);
  };

  // PDF Document State from PDF.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(() => {
    if (documentCacheKey && pdfDocMemoryCache.has(documentCacheKey)) {
      return pdfDocMemoryCache.get(documentCacheKey);
    }
    if (pdfUrl && pdfDocMemoryCache.has(pdfUrl)) {
      return pdfDocMemoryCache.get(pdfUrl);
    }
    return null;
  });
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Load PDF using PDF.js
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      // If there is no PDF file or document URL, trigger error state
      if (!pdfUrl) {
        setPdfError('No document file was found for this record.');
        setIsLoadingPdf(false);
        return;
      }

      // Check in-memory cache first to avoid refetching from network
      const cachedPdf =
        pdfDocMemoryCache.get(documentCacheKey) ||
        (pdfUrl ? pdfDocMemoryCache.get(pdfUrl) : null);

      if (cachedPdf) {
        setPdfDoc(cachedPdf);
        const pagesCount = cachedPdf.numPages || 1;
        setTotalPdfPages(pagesCount);

        // Initialize DB options if it was only upload placeholder [[1, 1]] while doc has multiple pages
        const cachedCurrentOpts = documentData?.options || initialDocument?.options;
        if (
          activeDocId &&
          pagesCount > 1 &&
          (!cachedCurrentOpts ||
            cachedCurrentOpts.length === 0 ||
            (cachedCurrentOpts.length === 1 && cachedCurrentOpts[0][0] === 1))
        ) {
          const fullOpts: PagePrintOption[] = Array.from({ length: pagesCount }, (_, i) => [i + 1, 1]);
          updateDocumentPrintOptions(activeDocId, fullOpts)
            .then((updated) => setDocumentData(updated))
            .catch((err) => console.error('Failed to init options in DB:', err));
        }

        setIsLoadingPdf(false);
        return;
      }

      try {
        setIsLoadingPdf(true);
        setPdfError(null);

        // Dynamically import PDF.js on client side
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib: any = await import('pdfjs-dist/build/pdf.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const loadedPdf = await loadingTask.promise;

        if (isCancelled) return;

        pdfDocMemoryCache.set(documentCacheKey, loadedPdf);
        if (pdfUrl) pdfDocMemoryCache.set(pdfUrl, loadedPdf);
        setPdfDoc(loadedPdf);
        const pagesCount = loadedPdf.numPages || 1;
        setTotalPdfPages(pagesCount);

        // Initialize DB options if it was only upload placeholder [[1, 1]] while doc has multiple pages
        const currentOpts = documentData?.options || initialDocument?.options;
        if (
          activeDocId &&
          pagesCount > 1 &&
          (!currentOpts ||
            currentOpts.length === 0 ||
            (currentOpts.length === 1 && currentOpts[0][0] === 1))
        ) {
          const fullOpts: PagePrintOption[] = Array.from({ length: pagesCount }, (_, i) => [i + 1, 1]);
          updateDocumentPrintOptions(activeDocId, fullOpts)
            .then((updated) => setDocumentData(updated))
            .catch((err) => console.error('Failed to init options in DB:', err));
        }

        setIsLoadingPdf(false);
      } catch (err) {
        console.error('PDF.js loading failed:', err);
        if (!isCancelled) {
          setPdfError('Failed to load PDF document. The file may be missing or corrupted.');
          setIsLoadingPdf(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, documentCacheKey]);

  // Render current PDF page onto canvas with instant cache retrieval and adjacent prefetching
  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentRenderTask: any = null;

    // Background prefetch function to pre-render adjacent visible pages into offscreen canvases
    function triggerPrefetch(currentVisibleIdx: number) {
      if (!pdfDoc || typeof document === 'undefined' || visiblePages.length === 0) return;

      // Prioritize immediate next and previous visible pages
      const candidatePages: number[] = [];
      for (let offset = 1; offset <= 3; offset++) {
        const nextItem = visiblePages[currentVisibleIdx - 1 + offset];
        if (nextItem && nextItem.pageNumber > 0) candidatePages.push(nextItem.pageNumber);
        const prevItem = visiblePages[currentVisibleIdx - 1 - offset];
        if (prevItem && prevItem.pageNumber > 0) candidatePages.push(prevItem.pageNumber);
      }

      const pagesToPrefetch = candidatePages.filter(
        (p) =>
          !getCachedCanvas(documentCacheKey, p) &&
          !inFlightRenderPromises.get(documentCacheKey)?.has(p)
      );

      if (pagesToPrefetch.length === 0) return;

      const scheduleWork =
        typeof window !== 'undefined' && 'requestIdleCallback' in window
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fn: () => void) => (window as any).requestIdleCallback(fn, { timeout: 300 })
          : (fn: () => void) => setTimeout(fn, 50);

      scheduleWork(async () => {
        if (isCancelled || viewMode !== 'single') return;

        for (const p of pagesToPrefetch) {
          if (
            isCancelled ||
            getCachedCanvas(documentCacheKey, p) ||
            inFlightRenderPromises.get(documentCacheKey)?.has(p)
          ) {
            continue;
          }

          try {
            const prefetchPromise = (async () => {
              const pageObj = await pdfDoc.getPage(p);
              const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
              const baseViewport = pageObj.getViewport({ scale: 1.0 });
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
              const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 700;
              const maxAvailableHeight = isMaximized
                ? Math.max(320, screenHeight - 80)
                : Math.max(220, screenHeight - (hideCopyStepper ? 300 : 270));
              const targetWidth = Math.max(220, Math.min(screenWidth - 48, 340));
              const widthScale = targetWidth / baseViewport.width;
              const heightScale = maxAvailableHeight / baseViewport.height;
              const fitScale = Math.min(widthScale, heightScale) * dpr;
              const viewport = pageObj.getViewport({ scale: fitScale });

              const offscreen = document.createElement('canvas');
              offscreen.width = Math.floor(viewport.width);
              offscreen.height = Math.floor(viewport.height);
              const offCtx = offscreen.getContext('2d');
              if (!offCtx) throw new Error('Failed to get 2d context for offscreen canvas');

              const task = pageObj.render({
                canvasContext: offCtx,
                viewport,
              });
              await task.promise;
              setCachedCanvas(documentCacheKey, p, offscreen);
              return offscreen;
            })();

            let inFlightDocMap = inFlightRenderPromises.get(documentCacheKey);
            if (!inFlightDocMap) {
              inFlightDocMap = new Map();
              inFlightRenderPromises.set(documentCacheKey, inFlightDocMap);
            }
            inFlightDocMap.set(p, prefetchPromise);

            await prefetchPromise;
          } catch {
            // Ignore background prefetch errors
          } finally {
            inFlightRenderPromises.get(documentCacheKey)?.delete(p);
          }
        }
      });
    }

    async function renderPage() {
      // Only render single-page canvas when in single page mode
      if (viewMode !== 'single') return;

      const canvas = canvasRef.current;
      if (!pdfDoc || !canvas || isLoadingPdf) return;
      if (visiblePages.length === 0 || !activeVisibleItem) return;

      const targetPdfPage = activePdfPageNumber;

      // 1. If this page is already in our in-memory rendered canvas cache, draw it instantly without loading spinner!
      const cached = getCachedCanvas(documentCacheKey, targetPdfPage);
      if (cached) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = cached.width;
        canvas.height = cached.height;
        canvas.style.width = `${Math.floor(cached.width / dpr)}px`;
        canvas.style.height = `${Math.floor(cached.height / dpr)}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(cached, 0, 0);
        }
        renderedPageRef.current = targetPdfPage;
        setIsRenderingPage(false);
        triggerPrefetch(safeVisibleIndex);
        return;
      }

      // If already drawn on canvas and matches current target page, keep it
      if (renderedPageRef.current === targetPdfPage && canvas.width > 0) {
        triggerPrefetch(safeVisibleIndex);
        return;
      }

      // 2. Check if an in-flight background render promise already exists for this page to prevent duplicate rendering
      const inFlight = inFlightRenderPromises.get(documentCacheKey)?.get(targetPdfPage);
      if (inFlight) {
        setIsRenderingPage(true);
        try {
          const renderedCanvas = await inFlight;
          if (isCancelled || viewMode !== 'single') return;
          const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
          canvas.width = renderedCanvas.width;
          canvas.height = renderedCanvas.height;
          canvas.style.width = `${Math.floor(renderedCanvas.width / dpr)}px`;
          canvas.style.height = `${Math.floor(renderedCanvas.height / dpr)}px`;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(renderedCanvas, 0, 0);
          }
          renderedPageRef.current = targetPdfPage;
          triggerPrefetch(safeVisibleIndex);
        } catch (err) {
          console.error('In-flight render failed, falling back to direct render:', err);
        } finally {
          if (!isCancelled) {
            setIsRenderingPage(false);
          }
        }
        return;
      }

      // 3. Otherwise perform fresh render
      try {
        setIsRenderingPage(true);
        const page = await pdfDoc.getPage(targetPdfPage);
        if (isCancelled) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Calculate responsive scale to fit viewport width
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 380;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 700;
        const maxAvailableHeight = isMaximized
          ? Math.max(320, screenHeight - 80)
          : Math.max(220, screenHeight - (hideCopyStepper ? 300 : 270));
        const targetWidth = Math.max(220, Math.min(screenWidth - 48, 340));
        const widthScale = targetWidth / baseViewport.width;
        const heightScale = maxAvailableHeight / baseViewport.height;
        const fitScale = Math.min(widthScale, heightScale) * dpr;

        const viewport = page.getViewport({ scale: fitScale });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        currentRenderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        if (currentRenderTask?.promise) {
          await currentRenderTask.promise;
        }

        if (!isCancelled) {
          renderedPageRef.current = targetPdfPage;

          // Save rendered bitmap to cache so it never needs to be re-rendered
          try {
            if (typeof document !== 'undefined') {
              const cacheCanvas = document.createElement('canvas');
              cacheCanvas.width = canvas.width;
              cacheCanvas.height = canvas.height;
              const cacheCtx = cacheCanvas.getContext('2d');
              if (cacheCtx) {
                cacheCtx.drawImage(canvas, 0, 0);
                setCachedCanvas(documentCacheKey, targetPdfPage, cacheCanvas);
              }
            }
          } catch {
            // Ignore cache canvas copy errors
          }

          triggerPrefetch(safeVisibleIndex);
        }
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err?.name !== 'RenderingCancelledException') {
          if (err?.message?.includes('already in progress') && !isCancelled) {
            // Automatically retry once if a previous render task was being cancelled
            setTimeout(() => {
              if (!isCancelled && viewMode === 'single') {
                renderPage();
              }
            }, 60);
            return;
          }
          console.error('Error rendering PDF page:', error);
        }
      } finally {
        if (!isCancelled) {
          setIsRenderingPage(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (currentRenderTask && typeof currentRenderTask.cancel === 'function') {
        currentRenderTask.cancel();
      }
    };
  }, [
    pdfDoc,
    activePdfPageNumber,
    safeVisibleIndex,
    visiblePages,
    isLoadingPdf,
    viewMode,
    isMaximized,
    hideCopyStepper,
    documentCacheKey,
  ]);

  // Reset rendered page tracker when document changes
  useEffect(() => {
    renderedPageRef.current = null;
  }, [documentCacheKey]);

  // Navigation handlers across visible pages
  const handlePrevPage = useCallback(() => {
    if (safeVisibleIndex > 1) {
      setCurrentVisibleIndex(safeVisibleIndex - 1);
      setScale(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [safeVisibleIndex]);

  const handleNextPage = useCallback(() => {
    if (safeVisibleIndex < totalVisibleCount) {
      setCurrentVisibleIndex(safeVisibleIndex + 1);
      setScale(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [safeVisibleIndex, totalVisibleCount]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevPage, handleNextPage]);

  // Sync copy amount changes directly to Supabase preserving rawOptions
  const syncOptionsToSupabase = useCallback(
    async (updatedOptions: PagePrintOption[]) => {
      if (!activeDocId) return;

      setIsSavingOptions(true);
      try {
        const updatedDoc = await updateDocumentPrintOptions(activeDocId, updatedOptions);
        setDocumentData(updatedDoc);
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
      } catch (err) {
        console.error('Failed to sync print options to Supabase:', err);
      } finally {
        setIsSavingOptions(false);
      }
    },
    [activeDocId]
  );

  // Update copy amount for the CURRENT active visible page at its specific optionsIndex
  const handleAmountChange = (newAmount: number) => {
    if (!activeVisibleItem) return;
    const clampedAmount = Math.max(1, newAmount);

    const updatedOptions = rawOptions.map((opt, idx) => {
      if (idx === activeVisibleItem.optionsIndex) {
        return [opt[0], clampedAmount] as PagePrintOption;
      }
      return opt;
    });

    setDocumentData((prev) => (prev ? { ...prev, options: updatedOptions } : null));

    // Debounce database sync to avoid spamming while user is clicking buttons
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      syncOptionsToSupabase(updatedOptions);
    }, 350);
  };

  // Calculate maximum panning bounds based on document size, container size, and zoom scale
  const getPanBounds = useCallback((targetScale: number) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || targetScale <= 1.05) {
      return { maxX: 0, maxY: 0 };
    }

    const cWidth = container.clientWidth || 360;
    const cHeight = container.clientHeight || 480;
    const docWidth = canvas?.clientWidth || 300;
    const docHeight = canvas?.clientHeight || 420;

    // Maximum distance the center can pan before edges go out of bounds
    const scaledWidth = docWidth * targetScale;
    const scaledHeight = docHeight * targetScale;

    // Allow panning up to the edge with a comfortable 30px boundary margin
    const maxX = Math.max(0, (scaledWidth - cWidth) / 2 + 30);
    const maxY = Math.max(0, (scaledHeight - cHeight) / 2 + 40);

    return { maxX, maxY };
  }, []);

  const clampPan = useCallback(
    (x: number, y: number, targetScale: number) => {
      if (targetScale <= 1.05) {
        return { x: 0, y: 0 };
      }
      const { maxX, maxY } = getPanBounds(targetScale);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [getPanBounds]
  );

  // Zoom controls with automatic pan clamping
  const handleZoomIn = () => {
    setScale((s) => {
      const next = Math.min(s + 0.25, 3.0);
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  };

  const handleZoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.25, 0.75);
      if (next <= 1.05) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => clampPan(p.x, p.y, next));
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Touch Swipe & Pan Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      pinchStartDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (scale > 1.05) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: touch.clientX - pan.x,
          y: touch.clientY - pan.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      // Pinch zoom in action
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const ratio = currentDist / pinchStartDistanceRef.current;
      setScale((prevScale) => {
        const next = Math.max(0.75, Math.min(prevScale * (ratio > 1 ? 1.03 : 0.97), 3.0));
        setPan((p) => clampPan(p.x, p.y, next));
        return next;
      });
      pinchStartDistanceRef.current = currentDist;
    } else if (e.touches.length === 1 && scale > 1.05 && isDraggingRef.current) {
      // Panning zoomed document with bounded clamping
      const touch = e.touches[0];
      const rawX = touch.clientX - dragStartRef.current.x;
      const rawY = touch.clientY - dragStartRef.current.y;
      setPan(clampPan(rawX, rawY, scale));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    pinchStartDistanceRef.current = null;
    isDraggingRef.current = false;

    // Check for swipe gesture only when not zoomed in
    if (scale <= 1.05 && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Ensure horizontal swipe with natural threshold
      if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 90 && deltaTime < 550) {
        if (deltaX < 0) {
          handleNextPage();
        } else {
          handlePrevPage();
        }
      }
    }
    touchStartRef.current = null;
  };

  // Pointer/Mouse Dragging for desktop users
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (scale > 1.05) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (scale > 1.05 && isDraggingRef.current) {
      const rawX = e.clientX - dragStartRef.current.x;
      const rawY = e.clientY - dragStartRef.current.y;
      setPan(clampPan(rawX, rawY, scale));
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleBackToKiosk = () => {
    if (onBack) {
      onBack();
    } else if (activeKioskId) {
      router.push(`/kiosk/${activeKioskId}`);
    } else {
      router.push('/');
    }
  };

  const handleConfirmCancel = async () => {
    setIsDeletingDocument(true);
    try {
      if (activeDocId) {
        await deleteDocumentRecord(activeDocId, activeKioskId);
        const docUrl = documentData?.document_url || initialDocument?.document_url;
        if (docUrl) {
          await deletePrintDocument(docUrl);
        }
      }
    } catch (err) {
      console.error('Failed to cancel session and delete document:', err);
    } finally {
      setIsDeletingDocument(false);
      setIsCancelModalOpen(false);
      if (onBack) {
        onBack();
      } else {
        const targetKioskId = activeKioskId || resolveKioskId() || '11111111-1111-1111-1111-111111111111';
        router.push(`/kiosk/${targetKioskId}`);
      }
    }
  };

  const handleQuestion = () => {
    if (onHelpClick) {
      onHelpClick();
    } else {
      alert('Swipe left or right to change pages. Use the yellow (-) and blue (+) buttons to set copies.');
    }
  };

  // Render Error View when there is no PDF file or loading failed
  if (pdfError) {
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
        <NavBar onLogoClick={handleBackToKiosk} onQuestionClick={handleQuestion} />

        {/* Error Section with error.svg illustration */}
        <section
          aria-label="Document Error"
          className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-8 z-10"
        >
          <ModalPanel isClickable={false} className="max-w-[340px]">
            <ModalPanel.Icon
              src="error.svg"
              alt="Document Error"
              className="mb-3"
            />
            <ModalPanel.Title>Failed to Load Document</ModalPanel.Title>
            <ModalPanel.Description>
              {pdfError}
            </ModalPanel.Description>
            <div className="mt-4 w-full">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleBackToKiosk}
              >
                Back to Upload
              </Button>
            </div>
          </ModalPanel>
        </section>

        {/* Footer */}
        <footer className="w-full text-center pb-8 pt-2 z-10">
          <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
            Peso Print - 2026
          </p>
        </footer>
        {children}
      </main>
    );
  }

  // Render Loading View while PDF is being fetched and parsed
  if (isLoadingPdf) {
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
        <NavBar onLogoClick={handleBackToKiosk} onQuestionClick={handleQuestion} />

        {/* Loading Spinner */}
        <section className="flex-1 w-full max-w-[430px] flex flex-col items-center justify-center px-6 py-8 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-[#34418E]" />
            <p className="text-[14px] font-semibold text-[#5A6072]">
              Loading document preview...
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full text-center pb-8 pt-2 z-10">
          <p className="text-[13px] font-medium text-[#7C808E] select-none tracking-wide">
            Peso Print - 2026
          </p>
        </footer>
        {children}
      </main>
    );
  }

  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col items-center overflow-hidden select-none">
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

      {/* Top Header Navbar - Fixed at the top, never scrolls */}
      <div className="w-full shrink-0 z-20">
        <NavBar onLogoClick={handleBackToKiosk} onQuestionClick={handleQuestion} />
      </div>

      {/* Screen Side Action Buttons (sticking to screen edges for easy single-hand access) */}
      {/* 1. Red Cancel Button (left side, y=170px) */}
      {!isMaximized && viewMode !== 'organize' && (
        <SideActionButton
          side="left"
          y="170px"
          icon={<X className="w-6 h-6 stroke-[2.5]" />}
          iconAlt="Cancel session"
          bgColor="#DC2626"
          borderColor="#B91C1C"
          textColor="#FFFFFF"
          className="shadow-[2px_4px_18px_rgba(220,38,38,0.35)] hover:bg-[#B91C1C]"
          ariaLabel="Cancel printing session"
          onClick={() => {
            if (onCancelClick) {
              onCancelClick();
            } else {
              setIsCancelModalOpen(true);
            }
          }}
        />
      )}

      {/* 2. Toggle List / Single View Button (left side, moved downward to y=236px) */}
      {!isMaximized && viewMode !== 'organize' && (
        <SideActionButton
          side="left"
          y="400px"
          icon={viewMode === 'list' ? '/icons/pages.svg' : '/icons/cols.svg'}
          iconAlt={viewMode === 'list' ? 'Single page layout' : 'Columns layout'}
          ariaLabel={viewMode === 'list' ? 'Switch to single page view' : 'Switch to page list view'}
          onClick={() => {
            setViewMode((prev) => {
              const next = prev === 'list' ? 'single' : 'list';
              if (next === 'list') setIsMaximized(false);
              if (typeof window !== 'undefined') {
                window.scrollTo(0, 0);
              }
              return next;
            });
          }}
        />
      )}

      {/* 3. Maximize / Minimize Button (left side, moved downward to y=302px, single page view only) */}
      {!hideMaximize && viewMode === 'single' && (
        <SideActionButton
          side="left"
          y="470px"
          icon={isMaximized ? '/icons/minimize.svg' : '/icons/maximize.svg'}
          iconAlt={isMaximized ? 'Minimize page' : 'Maximize page'}
          ariaLabel={isMaximized ? 'Minimize preview' : 'Maximize preview'}
          onClick={() => setIsMaximized((prev) => !prev)}
        />
      )}

      {!hideMenu && !isMaximized && viewMode !== 'organize' && (
        <SideActionButton
          side="right"
          y="170px"
          icon="/icons/menu.svg"
          iconAlt="Document menu"
          bgColor="#34418E"
          textColor="#FFFFFF"
          ariaLabel="Document menu options"
          onClick={() => setIsMenuOpen(true)}
        />
      )}

      {/* Side Menu Panel Drawer */}
      <ViewerMenuPanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOrganizePages={() => {
          setIsMenuOpen(false);
          setIsMaximized(false);
          setViewMode('organize');
        }}
        totalPages={totalVisibleCount}
        onPrint={handleStartCostAnalysis}
      />

      {/* Cost Analysis Loading View matching reference design */}
      {isAnalyzingCost && (
        <AnalyzingCostView
          progress={analysisProgress}
          statusText={analysisStatusText}
          onCancel={handleCancelAnalysis}
          onLogoClick={handleBackToKiosk}
        />
      )}

      {/* Cancel Printing Confirmation Modal using ModalPanel */}
      <ModalPanel
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!isDeletingDocument) {
            setIsCancelModalOpen(false);
          }
        }}
        closeOnBackdropClick={!isDeletingDocument}
        closeOnEscape={!isDeletingDocument}
        backdropTestId="cancel-modal-backdrop"
        ariaLabelledBy="cancel-modal-title"
        ariaDescribedBy="cancel-modal-description"
        className="max-w-[340px] sm:max-w-[360px]"
      >
        <ModalPanel.Icon
          src="/illustrations/confirmation.svg"
          alt="Cancel Confirmation"
          width={110}
          height={145}
          className="w-28 h-36 mb-2"
        />

        <ModalPanel.Title id="cancel-modal-title">
          Cancel printing?
        </ModalPanel.Title>

        <ModalPanel.Description id="cancel-modal-description" className="mb-6 max-w-[270px]">
          Are you sure you want to cancel your printing session? All details will be deleted permanently!
        </ModalPanel.Description>

        <ModalPanel.Actions className="mt-0">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={isDeletingDocument}
            onClick={() => {
              if (!isDeletingDocument) {
                setIsCancelModalOpen(false);
              }
            }}
            className="py-3.5 text-[16px] rounded-[16px]"
          >
            No
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            isLoading={isDeletingDocument}
            disabled={isDeletingDocument}
            onClick={handleConfirmCancel}
            className="py-3.5 text-[16px] rounded-[16px]"
          >
            Cancel
          </Button>
        </ModalPanel.Actions>
      </ModalPanel>

      {/* Real-time Raspberry Pi Print Job Streaming Modal */}
      <PrintStreamModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        stage={printer.stage}
        progress={printer.progress}
        statusMessage={printer.statusMessage}
        logs={printer.logs}
        isPrinting={printer.isPrinting}
        onCancel={printer.cancelPrint}
        onRetry={() => {
          if (pdfUrl) {
            printer.printUrl(pdfUrl, 1);
          }
        }}
        serverUrl={printer.serverUrl}
      />

      {/* Zoom In & Out Side Action Buttons (Single Page View only) */}
      {!hideZoom && !isAnalyzingCost && viewMode === 'single' && (
        <>
          <SideActionButton
            side="right"
            y="400px"
            icon={<ZoomIn className="w-6 h-6 stroke-[2.5]" />}
            iconAlt="Zoom in"
            bgColor="bg-white"
            borderColor="border-[#E2E4E9]"
            textColor="text-[#34418E]"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            ariaLabel="Zoom in"
          />
          <SideActionButton
            side="right"
            y="470px"
            icon={<ZoomOut className="w-6 h-6 stroke-[2.5]" />}
            iconAlt="Zoom out"
            bgColor="bg-white"
            borderColor="border-[#E2E4E9]"
            textColor="text-[#34418E]"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            ariaLabel="Zoom out"
          />
        </>
      )}

      {/* Middle Content Workspace - Consistent Bounded Panel for Page Mode & List Mode */}
      <div className="flex-1 w-full min-h-0 flex flex-col items-center justify-center relative overflow-hidden z-10">
        {/* Organize Pages Mode: Interactive grid for deleting and rearranging pages */}
        {viewMode === 'organize' && (
          <OrganizePagesView
            pdfDoc={pdfDoc}
            pdfUrl={pdfUrl}
            documentId={activeDocId}
            kioskId={activeKioskId}
            totalPages={totalPdfPages}
            initialOptions={documentData?.options || initialDocument?.options}
            onBack={() => setViewMode('single')}
            onSaveSuccess={(newOptions) => {
              setDocumentData((prev) => (prev ? { ...prev, options: newOptions } : null));
              setViewMode('single');
            }}
          />
        )}

        {/* List / Grid View: Scrollable panel listing visible pages */}
        <section
          aria-label="Document pages list"
          className={cn(
            'w-full max-w-[440px] h-full min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 z-10',
            hideCopyStepper ? 'pb-28 sm:pb-32' : 'pb-12',
            viewMode !== 'list' && 'hidden'
          )}
        >
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 pb-12">
            {visiblePages.length > 0 ? (
              visiblePages.map((item, index) => {
                const visibleIndex = index + 1;
                return (
                  <PageThumbnailCard
                    key={`${item.pageNumber}-${index}`}
                    pageNumber={item.pageNumber}
                    pdfDoc={pdfDoc}
                    copies={item.copies}
                    isSelected={visibleIndex === safeVisibleIndex}
                    onClick={() => {
                      setCurrentVisibleIndex(visibleIndex);
                      setScale(1.0);
                      setPan({ x: 0, y: 0 });
                      setViewMode('single');
                      if (typeof window !== 'undefined') {
                        window.scrollTo(0, 0);
                      }
                    }}
                  />
                );
              })
            ) : (
              <div className="col-span-2 py-12 text-center text-[#5A6072]">
                <p className="font-semibold text-base mb-1">No pages to display</p>
                <p className="text-xs text-[#8A90A2]">All pages have been excluded.</p>
              </div>
            )}
          </div>
        </section>

        {/* Single Page View: Consistent panel sized for single page view */}
        <div
          className={cn(
            'w-full h-full min-h-0 flex-1 flex flex-col items-center justify-between relative',
            hideCopyStepper ? 'pb-24 sm:pb-28' : 'pb-2',
            viewMode !== 'single' && 'hidden',
            isMaximized && 'justify-center pb-6'
          )}
        >
          {/* Center Section: Zoomable & Swipeable Document Viewer Canvas */}
          <section
            ref={containerRef}
            aria-label="Document Page Viewer"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative flex-1 min-h-0 w-full max-w-[430px] flex flex-col items-center justify-center px-4 py-1 overflow-hidden touch-none"
          >
            {/* Previous Page Desktop Arrow (Left) */}
            {safeVisibleIndex > 1 && (
              <button
                type="button"
                onClick={handlePrevPage}
                aria-label="Previous page"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md border border-black/[0.06] flex items-center justify-center text-[#34418E] hover:bg-white active:scale-95 transition-all hidden sm:flex cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Page Desktop Arrow (Right) */}
            {safeVisibleIndex < totalVisibleCount && (
              <button
                type="button"
                onClick={handleNextPage}
                aria-label="Next page"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md border border-black/[0.06] flex items-center justify-center text-[#34418E] hover:bg-white active:scale-95 transition-all hidden sm:flex cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Document Sheet Display (Zoomable & Pannable) */}
            {visiblePages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-[#5A6072] bg-white rounded-[16px] shadow-sm border border-black/[0.06] max-w-[320px]">
                <p className="font-semibold text-[15px] mb-1 text-[#2B3040]">No pages to display</p>
                <p className="text-[13px] text-[#7C808E]">
                  All pages in this document have been excluded from printing.
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  'relative transition-transform duration-75 ease-out select-none',
                  scale > 1.05 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                )}
                style={{
                  transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Real PDF Canvas Container */}
                <div
                  className={cn(
                    'bg-white rounded-[10px] shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-black/[0.06]',
                    'overflow-hidden flex items-center justify-center relative'
                  )}
                >
                  {isRenderingPage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px] z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-[#34418E]" />
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className="block max-w-full h-auto pointer-events-none"
                  />
                </div>
              </div>
            )}

            {/* Indicators Row: Swipe to change page (left) + Zoom % & Page Indicator (right) */}
            <div className="w-full max-w-[400px] flex items-center justify-between gap-2 mt-2 z-20 shrink-0">
              {/* Left Side: Swipe to change page with subtle breathing */}
              <div
                aria-label="Swipe gesture hint"
                className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium text-[#5A6072] select-none animate-subtle-breathe"
              >
                <span className="text-[13px] leading-none" aria-hidden="true">&larr;</span>
                <span>Swipe to change page</span>
                <span className="text-[13px] leading-none" aria-hidden="true">&rarr;</span>
              </div>

              {/* Right Side: Zoom Percentage and Page Indicator */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset zoom to 100%"
                  aria-label={`Current zoom ${Math.round(scale * 100)}%, click to reset to 100%`}
                  className={cn(
                    'px-3 py-1.5 rounded-[12px] bg-[#EAEBED]/90 backdrop-blur-sm',
                    'border border-[#DCDFE5] text-[#3E4354] font-semibold text-[13px] sm:text-[14px]',
                    'shadow-[0_2px_8px_rgba(0,0,0,0.06)] select-none cursor-pointer',
                    'hover:bg-white active:scale-95 transition-all'
                  )}
                >
                  {Math.round(scale * 100)}%
                </button>
                <PageIndicator currentPage={safeVisibleIndex} totalPages={totalVisibleCount} />
              </div>
            </div>
          </section>

          {/* Bottom Control Section: White Floating Card with Copy Stepper (hidden when maximized or hideCopyStepper) */}
          {!hideCopyStepper && !isMaximized && (
            <footer className="w-full shrink-0 bg-white rounded-t-[30px] sm:rounded-t-[36px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] border-t border-black/[0.04] px-6 pt-5 pb-7 sm:pb-8 flex flex-col items-center justify-center z-20">
              <div className="relative flex flex-col items-center">
                {/* Copy Stepper Component: [-] [4 Amount] [+] */}
                <CopyStepper
                  amount={currentCopies}
                  onAmountChange={handleAmountChange}
                  min={1}
                  max={99}
                  disabled={visiblePages.length === 0}
                />

                {/* Database Sync Status Indicator */}
                <div className="h-5 mt-2 flex items-center justify-center">
                  {isSavingOptions && (
                    <span className="text-[11px] font-medium text-[#34418E] flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving changes...
                    </span>
                  )}
                  {!isSavingOptions && showSaveIndicator && (
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 transition-opacity">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Saved
                    </span>
                  )}
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>

      {/* Composable children slot (e.g. PaymentPanel overlay) */}
      {children}
    </main>
  );
};
