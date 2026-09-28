'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Undo2, Download, Trash2, Loader2, Check } from 'lucide-react';
import { PagePrintOption } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { updateDocumentPrintOptions } from '@/services/kiosk-service';
import { getCachedDocumentId, saveCachedDocumentId } from '@/lib/document-cache';
import { OrganizePageCard } from './organize-page-card';
import { cn } from '@/lib/utils';

export interface OrganizePagesViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
  pdfUrl?: string | null;
  documentId?: string;
  kioskId?: string;
  totalPages?: number;
  initialOptions?: PagePrintOption[];
  onBack: () => void;
  onSaveSuccess?: (newOptions: PagePrintOption[]) => void;
}

const MAX_HISTORY = 30;

export const OrganizePagesView: React.FC<OrganizePagesViewProps> = ({
  pdfDoc,
  pdfUrl,
  documentId,
  kioskId,
  totalPages = 1,
  initialOptions,
  onBack,
  onSaveSuccess,
}) => {
  // 1. Resolve Document ID from prop, cache, or window location
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    if (documentId) return documentId;
    return getCachedDocumentId();
  });

  useEffect(() => {
    if (documentId) {
      setActiveDocId(documentId);
      saveCachedDocumentId(documentId);
    } else {
      const cached = getCachedDocumentId();
      if (cached) setActiveDocId(cached);
    }
  }, [documentId]);

  // 2. Base Options from Database
  const effectiveTotalPages = Math.max(1, pdfDoc?.numPages || totalPages || 1);

  const [originalOptions, setOriginalOptions] = useState<PagePrintOption[]>(() => {
    if (initialOptions && Array.isArray(initialOptions) && initialOptions.length > 0) {
      if (initialOptions.length === 1 && initialOptions[0][0] === 1 && effectiveTotalPages > 1) {
        return Array.from({ length: effectiveTotalPages }, (_, i) => [i + 1, 1] as PagePrintOption);
      }
      return initialOptions;
    }
    return Array.from({ length: effectiveTotalPages }, (_, i) => [i + 1, 1] as PagePrintOption);
  });

  // Client-side change history stack (latest item is the active working state)
  const [history, setHistory] = useState<PagePrintOption[][]>([]);

  // Selection state for deletion mode: set of visible indices
  const [selectedVisibleIndices, setSelectedVisibleIndices] = useState<Set<number>>(new Set());

  // Rearranging state: holds the visibleIndex of the long-pressed page (click-to-place)
  const [rearrangeSourceIndex, setRearrangeSourceIndex] = useState<number | null>(null);
  const isRearranging = rearrangeSourceIndex !== null;

  // Loading and Save status states
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);

  // Fetch document options from Supabase on mount
  useEffect(() => {
    let isCancelled = false;

    async function fetchOriginalOptions() {
      const docId = activeDocId || getCachedDocumentId();
      if (!docId) return;

      try {
        setIsLoadingDb(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('documents')
          .select('options')
          .eq('id', docId)
          .maybeSingle();

        if (isCancelled) return;

        const count = Math.max(1, pdfDoc?.numPages || totalPages || 1);

        let resolvedOptions: PagePrintOption[] = [];
        if (!error && data?.options && Array.isArray(data.options) && data.options.length > 0) {
          // If DB options was just the initial upload placeholder [[1, 1]] while doc has multiple pages
          if (data.options.length === 1 && data.options[0][0] === 1 && count > 1) {
            resolvedOptions = Array.from({ length: count }, (_, i) => [i + 1, 1]);
            updateDocumentPrintOptions(docId, resolvedOptions).catch(console.error);
          } else {
            // Check if any pages up to count are missing
            const presentPages = new Set(data.options.map((opt) => Math.abs(opt[0])));
            const missing: PagePrintOption[] = [];
            for (let p = 1; p <= count; p++) {
              if (!presentPages.has(p)) {
                missing.push([p, 1]);
              }
            }
            if (missing.length > 0 && data.options.length < count) {
              resolvedOptions = [...data.options, ...missing];
              updateDocumentPrintOptions(docId, resolvedOptions).catch(console.error);
            } else {
              resolvedOptions = data.options as PagePrintOption[];
            }
          }
        } else {
          resolvedOptions = Array.from({ length: count }, (_, i) => [i + 1, 1]);
          updateDocumentPrintOptions(docId, resolvedOptions).catch(console.error);
        }

        setOriginalOptions(resolvedOptions);
        setHistory([]);
      } catch (err) {
        console.error('Failed to fetch document options from DB:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingDb(false);
        }
      }
    }

    fetchOriginalOptions();

    return () => {
      isCancelled = true;
    };
  }, [activeDocId, totalPages, pdfDoc?.numPages]);

  // Synchronize options when pdfDoc asynchronously finishes loading with multiple pages
  useEffect(() => {
    if (!pdfDoc?.numPages) return;
    const numPages = pdfDoc.numPages;

    setOriginalOptions((prev) => {
      // If currently only has 1 page placeholder while PDF has more pages
      if (prev.length === 1 && prev[0][0] === 1 && numPages > 1) {
        const full: PagePrintOption[] = Array.from({ length: numPages }, (_, i) => [i + 1, 1]);
        const docId = activeDocId || getCachedDocumentId();
        if (docId) {
          updateDocumentPrintOptions(docId, full).catch(console.error);
        }
        return full;
      }

      // If prev has fewer pages than numPages and is missing pages
      const present = new Set(prev.map((opt) => Math.abs(opt[0])));
      const missing: PagePrintOption[] = [];
      for (let p = 1; p <= numPages; p++) {
        if (!present.has(p)) {
          missing.push([p, 1]);
        }
      }
      if (missing.length > 0 && prev.length < numPages) {
        const full = [...prev, ...missing];
        const docId = activeDocId || getCachedDocumentId();
        if (docId) {
          updateDocumentPrintOptions(docId, full).catch(console.error);
        }
        return full;
      }

      return prev;
    });
  }, [pdfDoc, activeDocId]);

  // Current active options: top of history or original base options
  const currentOptions: PagePrintOption[] = useMemo(() => {
    return history.length > 0 ? history[history.length - 1] : originalOptions;
  }, [history, originalOptions]);

  // Filter visible pages: pages with positive page numbers (negative pages are ignored/hidden in viewer)
  const visibleItems = useMemo(() => {
    return currentOptions
      .map((opt, originalIndex) => ({
        pageNumber: opt[0],
        copies: opt[1],
        originalIndex,
      }))
      .filter((item) => item.pageNumber > 0);
  }, [currentOptions]);

  const isDeletionMode = selectedVisibleIndices.size > 0;

  // Push new state to history (up to MAX_HISTORY)
  const pushHistory = useCallback((newOptions: PagePrintOption[]) => {
    setHistory((prev) => {
      const updated = [...prev, newOptions];
      if (updated.length > MAX_HISTORY) {
        return updated.slice(updated.length - MAX_HISTORY);
      }
      return updated;
    });
  }, []);

  // Move long-pressed page to the right of the chosen target page
  const movePageToRightOf = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      if (fromIdx < 0 || fromIdx >= visibleItems.length) return;
      if (toIdx < 0 || toIdx >= visibleItems.length) return;

      // 1. Reorder visible items array: place fromIdx on the right of toIdx
      const reorderedVisible = [...visibleItems];
      const [movedItem] = reorderedVisible.splice(fromIdx, 1);
      const insertAt = fromIdx < toIdx ? toIdx : toIdx + 1;
      reorderedVisible.splice(insertAt, 0, movedItem);

      // 2. Identify all positive slots in currentOptions
      const positiveSlotIndices: number[] = [];
      currentOptions.forEach((opt, idx) => {
        if (opt[0] > 0) positiveSlotIndices.push(idx);
      });

      // 3. Map new visible items into the positive slots, preserving negative items in their original slots
      const newOptions = [...currentOptions];
      reorderedVisible.forEach((visItem, i) => {
        const slotIdx = positiveSlotIndices[i];
        if (slotIdx !== undefined) {
          newOptions[slotIdx] = [visItem.pageNumber, visItem.copies];
        }
      });

      pushHistory(newOptions);
    },
    [currentOptions, visibleItems, pushHistory]
  );

  // Long press on a page: activates click-to-place rearrange mode
  const handleLongPress = useCallback(
    (visibleIndex: number) => {
      if (selectedVisibleIndices.size > 0) return;
      setRearrangeSourceIndex(visibleIndex);
    },
    [selectedVisibleIndices.size]
  );

  // Card click: in rearrange mode, moves the page to the right of the clicked page; in normal mode, toggles deletion
  const handleCardClick = useCallback(
    (visibleIndex: number) => {
      if (rearrangeSourceIndex !== null) {
        if (visibleIndex === rearrangeSourceIndex) {
          // Clicking the same card cancels rearrange mode
          setRearrangeSourceIndex(null);
        } else {
          // Places the long pressed page on the right of the next page chosen
          movePageToRightOf(rearrangeSourceIndex, visibleIndex);
          setRearrangeSourceIndex(null);
        }
        return;
      }

      // Normal mode: toggle selection for deletion
      setSelectedVisibleIndices((prev) => {
        const updated = new Set(prev);
        if (updated.has(visibleIndex)) {
          updated.delete(visibleIndex);
        } else {
          updated.add(visibleIndex);
        }
        return updated;
      });
    },
    [rearrangeSourceIndex, movePageToRightOf]
  );

  // Delete Action: Negate the selected page numbers in the options array
  const handleDeleteSelected = useCallback(() => {
    if (selectedVisibleIndices.size === 0) return;

    // Map currentOptions: negate page numbers for all selected visible items
    const newOptions: PagePrintOption[] = currentOptions.map((opt, idx) => {
      const isSelected = visibleItems.some(
        (visItem, visIdx) => selectedVisibleIndices.has(visIdx) && visItem.originalIndex === idx
      );
      if (isSelected) {
        return [-Math.abs(opt[0]), opt[1]] as PagePrintOption;
      }
      return opt;
    });

    pushHistory(newOptions);
    setSelectedVisibleIndices(new Set());
    setRearrangeSourceIndex(null);
  }, [currentOptions, visibleItems, selectedVisibleIndices, pushHistory]);

  // Undo Action: Pop one state off the list and use that as our source to display
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    setHistory((prev) => prev.slice(0, -1));
    setSelectedVisibleIndices(new Set());
    setRearrangeSourceIndex(null);
  }, [history.length]);

  // Reset Action: Changes back to the original base form and deletes the history list
  const handleReset = useCallback(() => {
    setHistory([]);
    setSelectedVisibleIndices(new Set());
    setRearrangeSourceIndex(null);
  }, []);

  // Save Action: Saves latest options to DB, updates originalOptions, and clears history
  const handleSave = useCallback(async () => {
    const docId = activeDocId || getCachedDocumentId();
    if (!docId) {
      console.warn('Cannot save: documentId is missing.');
      return;
    }

    const latestOptions = history.length > 0 ? history[history.length - 1] : originalOptions;

    try {
      setIsSaving(true);
      await updateDocumentPrintOptions(docId, latestOptions);
      setOriginalOptions(latestOptions);
      setHistory([]);
      setSelectedVisibleIndices(new Set());
      setRearrangeSourceIndex(null);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
      onSaveSuccess?.(latestOptions);
    } catch (err) {
      console.error('Failed to save document print options:', err);
    } finally {
      setIsSaving(false);
    }
  }, [activeDocId, history, originalOptions, onSaveSuccess]);

  const handleBackClick = () => {
    if (rearrangeSourceIndex !== null) {
      setRearrangeSourceIndex(null);
      return;
    }
    onBack();
  };

  return (
    <div className="relative w-full h-full min-h-0 flex-1 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Scrollable Center Workspace containing 2-Column Grid */}
      <section
        aria-label="Organize document pages list"
        className="w-full max-w-[440px] h-full min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-28 sm:pb-32 z-10"
      >
        {isLoadingDb && visibleItems.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-[#34418E]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-medium">Loading document pages...</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-[15px] font-semibold text-gray-700">
              All pages are currently removed.
            </p>
            <p className="text-[13px] text-gray-500 max-w-[260px]">
              Tap Undo or Reset to restore your document pages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 pb-16">
            {visibleItems.map((item, visIdx) => (
              <OrganizePageCard
                key={`${item.pageNumber}-${item.originalIndex}-${visIdx}`}
                pageNumber={item.pageNumber}
                visibleIndex={visIdx}
                pdfDoc={pdfDoc}
                isSelected={selectedVisibleIndices.has(visIdx)}
                isRearrangeSource={rearrangeSourceIndex === visIdx}
                isRearrangeMode={isRearranging}
                isDeletionMode={isDeletionMode}
                onClick={handleCardClick}
                onLongPress={handleLongPress}
              />
            ))}
          </div>
        )}
      </section>

      {/* Floating Action Buttons: Pinned to the Right Edge */}

      {/* Top Right Cluster: Yellow Back Button & Red Delete Button */}
      <div className="fixed right-0 top-[175px] sm:top-[185px] z-40 flex flex-col items-end gap-3.5 pointer-events-auto">
        {/* Yellow Back Button */}
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="Back to PDF viewer"
          className={cn(
            'h-[52px] sm:h-[56px] w-[95px] sm:w-[105px]',
            'bg-[#FACC15] text-black font-bold text-[15px] sm:text-[16px]',
            'rounded-l-[16px] rounded-r-none shadow-[-2px_4px_16px_rgba(0,0,0,0.12)]',
            'flex items-center justify-center gap-2 pl-3 pr-2.5 cursor-pointer select-none',
            'transition-transform duration-300 ease-in-out hover:brightness-95 active:scale-95',
            isRearranging && 'translate-x-[calc(100%-18px)] pointer-events-none'
          )}
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>Back</span>
        </button>

        {/* Red Delete Button (visible when 1 or more pages are selected) */}
        <button
          type="button"
          onClick={handleDeleteSelected}
          aria-label={`Delete ${selectedVisibleIndices.size} selected page${
            selectedVisibleIndices.size > 1 ? 's' : ''
          }`}
          className={cn(
            'h-[52px] sm:h-[56px] w-[64px] sm:w-[70px]',
            'bg-[#DC2626] text-white',
            'rounded-l-[16px] rounded-r-none shadow-[-2px_4px_16px_rgba(220,38,38,0.3)]',
            'flex items-center justify-center cursor-pointer select-none',
            'transition-all duration-300 ease-in-out hover:bg-red-700 active:scale-95',
            isDeletionMode && !isRearranging
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : 'translate-x-full opacity-0 pointer-events-none',
            isRearranging && 'translate-x-[calc(100%-18px)] opacity-60 pointer-events-none'
          )}
        >
          <Trash2 className="w-6 h-6 stroke-[2]" />
        </button>
      </div>

      {/* Bottom Right Cluster: Orange Reset, Purple Undo, and Green Save Buttons */}
      <div className="fixed right-0 bottom-8 sm:bottom-12 z-40 flex flex-col items-end gap-3 sm:gap-3.5 pointer-events-auto">
        {/* Orange Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          disabled={history.length === 0}
          aria-label="Reset pages to original form"
          className={cn(
            'h-[52px] sm:h-[56px] w-[110px] sm:w-[120px]',
            'bg-[#F97316] text-white font-bold text-[15px] sm:text-[16px]',
            'rounded-l-[16px] rounded-r-none shadow-[-2px_4px_16px_rgba(249,115,22,0.3)]',
            'flex items-center justify-center gap-2 pl-3 pr-2.5 cursor-pointer select-none',
            'transition-transform duration-300 ease-in-out hover:brightness-95 active:scale-95',
            (isDeletionMode || isRearranging) && 'translate-x-[calc(100%-18px)] pointer-events-none',
            history.length === 0 && 'opacity-70 cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
          <span>Reset</span>
        </button>

        {/* Purple Undo Button */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          aria-label="Undo last page change"
          className={cn(
            'h-[52px] sm:h-[56px] w-[110px] sm:w-[120px]',
            'bg-[#7C3AED] text-white font-bold text-[15px] sm:text-[16px]',
            'rounded-l-[16px] rounded-r-none shadow-[-2px_4px_16px_rgba(124,58,237,0.3)]',
            'flex items-center justify-center gap-2 pl-3 pr-2.5 cursor-pointer select-none',
            'transition-transform duration-300 ease-in-out hover:brightness-95 active:scale-95',
            (isDeletionMode || isRearranging) && 'translate-x-[calc(100%-18px)] pointer-events-none',
            history.length === 0 && 'opacity-70 cursor-not-allowed'
          )}
        >
          <Undo2 className="w-5 h-5 stroke-[2.5]" />
          <span>Undo</span>
        </button>

        {/* Green Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="Save page order and selections to document"
          className={cn(
            'h-[52px] sm:h-[56px] w-[110px] sm:w-[120px]',
            'bg-[#22C55E] text-white font-bold text-[15px] sm:text-[16px]',
            'rounded-l-[16px] rounded-r-none shadow-[-2px_4px_16px_rgba(34,197,94,0.3)]',
            'flex items-center justify-center gap-2 pl-3 pr-2.5 cursor-pointer select-none',
            'transition-transform duration-300 ease-in-out hover:brightness-95 active:scale-95',
            (isDeletionMode || isRearranging) && 'translate-x-[calc(100%-18px)] pointer-events-none'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : showSaveToast ? (
            <Check className="w-5 h-5 stroke-[3]" />
          ) : (
            <Download className="w-5 h-5 stroke-[2.5]" />
          )}
          <span>{isSaving ? 'Saving...' : showSaveToast ? 'Saved!' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};
