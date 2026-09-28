'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { NavBar } from '@/components/common/nav-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PrintConfirmationView } from './print-confirmation-view';

export interface PrintTaskItem {
  id: string;
  name: string;
  pageNumber: number;
  type: 'print' | 'scan';
  status: 'completed' | 'in_progress' | 'pending';
}

export interface PrintingViewProps {
  kioskId: string;
  documentId: string;
  cost?: number;
  totalPages?: number;
  totalCopies?: number;
  colorScheme?: string;
  paperSize?: string;
  initialShowConfirmation?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc?: any;
}

export const PrintingView: React.FC<PrintingViewProps> = ({
  kioskId,
  documentId,
  cost,
  totalPages = 2,
  totalCopies = 3,
  colorScheme = 'B&W',
  paperSize = 'A4',
  initialShowConfirmation = false,
  pdfDoc,
}) => {
  const router = useRouter();
  const [progress, setProgress] = useState(47);
  const [printRunId, setPrintRunId] = useState<number>(0);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(initialShowConfirmation);
  const [reprintedIds, setReprintedIds] = useState<Set<string>>(new Set());

  const [tasks, setTasks] = useState<PrintTaskItem[]>([
    { id: 'task-1', name: 'Printing page 1',      pageNumber: 1, type: 'print', status: 'completed' },
    { id: 'task-2', name: 'Printing page 1 (1)',   pageNumber: 1, type: 'print', status: 'completed' },
    { id: 'task-3', name: 'Printing page 1 (2)',   pageNumber: 1, type: 'print', status: 'completed' },
    { id: 'task-4', name: 'Scanning page 1',       pageNumber: 1, type: 'scan',  status: 'completed' },
    { id: 'task-5', name: 'Scanning page 1 (1)',   pageNumber: 1, type: 'scan',  status: 'in_progress' },
    { id: 'task-6', name: 'Printing page 2',       pageNumber: 2, type: 'print', status: 'in_progress' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = Math.min(100, prev + 15);

        setTasks((prevTasks) =>
          prevTasks.map((t, idx) => {
            const threshold = (idx + 1) * (100 / prevTasks.length);
            if (next >= threshold) {
              return { ...t, status: 'completed' };
            } else if (next >= threshold - 15) {
              return { ...t, status: 'in_progress' };
            }
            return { ...t, status: 'pending' };
          })
        );

        return next;
      });
    }, 1400);

    return () => clearInterval(timer);
  }, [printRunId]);

  const handleDone = () => {
    setIsConfirmationOpen(true);
  };

  const handleReprintFromConfirmation = (acceptedPairIds: string[]) => {
    // 1. Add to reprinted ids
    setReprintedIds((prev) => new Set([...prev, ...acceptedPairIds]));

    // 2. Return to PrintingView
    setIsConfirmationOpen(false);

    // 3. Configure tasks for reprinting
    const reprintTasks: PrintTaskItem[] = acceptedPairIds.flatMap((id, idx) => {
      const pageMatch = id.match(/p(\d+)/);
      const copyMatch = id.match(/c(\d+)/);
      const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : 1;
      const copyIdx = copyMatch ? parseInt(copyMatch[1], 10) : 0;
      const pageLabel = copyIdx > 0 ? `page ${pageNum} (${copyIdx})` : `page ${pageNum}`;

      return [
        {
          id: `reprint-print-${idx}`,
          name: `Reprinting ${pageLabel}`,
          pageNumber: pageNum,
          type: 'print',
          status: 'in_progress',
        },
        {
          id: `reprint-scan-${idx}`,
          name: `Scanning ${pageLabel}`,
          pageNumber: pageNum,
          type: 'scan',
          status: 'pending',
        },
      ];
    });

    if (reprintTasks.length > 0) {
      setTasks(reprintTasks);
    }

    // 4. Reset progress and start timer
    setProgress(0);
    setPrintRunId((prev) => prev + 1);
  };

  if (isConfirmationOpen) {
    return (
      <PrintConfirmationView
        kioskId={kioskId}
        documentId={documentId}
        pdfDoc={pdfDoc}
        totalPages={totalPages}
        totalCopies={totalCopies}
        reprintedPairIds={Array.from(reprintedIds)}
        onDone={() => router.push(`/kiosk/${kioskId}`)}
        onReprint={handleReprintFromConfirmation}
      />
    );
  }

  return (
    <main className="relative h-screen h-[100dvh] max-h-screen w-full bg-[#E6E6E6] flex flex-col items-center justify-start overflow-hidden select-none">
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
          onAlertClick={() => alert('Printing in progress. Please do not turn off or unplug the kiosk.')}
          onQuestionClick={() => alert('Need assistance? Please ask the kiosk attendant or tap help.')}
        />
      </div>

      {/* Main Content Modal Card */}
      <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col z-10 animate-slide-up mt-3 sm:mt-4">
        <section
          role="region"
          aria-label="Printing in Progress"
          className={cn(
            'w-full flex-1 min-h-0 bg-white rounded-t-[32px] sm:rounded-t-[36px]',
            'shadow-[0_-12px_45px_rgba(0,0,0,0.12)] border-t border-black/[0.04]',
            'flex flex-col px-6 pt-7 sm:pt-8 pb-8 sm:pb-10 overflow-y-auto'
          )}
        >
          {/* Header Row: Title & Percentage */}
          <div className="flex items-center justify-between w-full mb-3">
            <h2 className="text-[22px] sm:text-[24px] font-bold text-[#1E2026] tracking-tight">
              {progress === 100
                ? (reprintedIds.size > 0 ? 'Reprinting Complete' : 'Printing Complete')
                : (reprintedIds.size > 0 ? 'Reprinting...' : 'Printing...')}
            </h2>
            <span className="text-[20px] sm:text-[22px] font-bold text-[#1E2026]">
              {progress}%
            </span>
          </div>

          {/* Yellow Progress Bar */}
          <div className="w-full h-3 bg-[#E2E4EE] rounded-full overflow-hidden mb-6 shrink-0">
            <div
              className="h-full bg-[#FDD41F] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Task Rows List: static, non-expandable */}
          <div className="w-full flex flex-col divide-y divide-[#E5E7EB] shrink-0">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="w-full py-4 flex items-center justify-between"
              >
                <span className="text-[15px] sm:text-[16px] font-medium text-[#4B5563]">
                  {task.name}
                </span>

                {/* Status Icon */}
                <div className="shrink-0 flex items-center">
                  {task.status === 'completed' && (
                    <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  )}
                  {task.status === 'in_progress' && (
                    <div className="w-6 h-6 rounded-full border-2 border-[#DBEAFE] border-t-[#1E3A8A] animate-spin shrink-0" />
                  )}
                  {task.status === 'pending' && (
                    <div className="w-6 h-6 rounded-full border-2 border-[#E5E7EB] shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Done Button when finished */}
          {progress === 100 && (
            <div className="w-full flex justify-center mt-6 sm:mt-8 pb-4 shrink-0 animate-fadeIn">
              <Button
                variant="primary"
                size="lg"
                onClick={handleDone}
                className="w-[180px] sm:w-[200px] h-[52px] rounded-[18px] text-[16px] font-bold shadow-[0_4px_16px_rgba(52,65,142,0.3)] bg-[#34418E] hover:bg-[#28326D] active:scale-95 transition-all cursor-pointer"
              >
                Done
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
