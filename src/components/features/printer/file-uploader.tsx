'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileText, X, Printer, Link as LinkIcon } from 'lucide-react';

interface FileUploaderProps {
  onPrintFile: (file: File, copies: number) => Promise<void>;
  onPrintUrl: (url: string, copies: number) => Promise<void>;
  isPrinting: boolean;
  isUploading: boolean;
}

export function FileUploader({
  onPrintFile,
  onPrintUrl,
  isPrinting,
  isUploading,
}: FileUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directUrl, setDirectUrl] = useState('');
  const [copies, setCopies] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePrint = async () => {
    if (activeTab === 'upload' && selectedFile) {
      await onPrintFile(selectedFile, copies);
    } else if (activeTab === 'url' && directUrl.trim()) {
      await onPrintUrl(directUrl.trim(), copies);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="border border-zinc-300 dark:border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base tracking-tight font-bold">Print Document</CardTitle>
            <CardDescription className="text-xs">
              Upload from your laptop (stored on Supabase) or provide a direct document URL
            </CardDescription>
          </div>
          {/* Mode Switcher Tabs */}
          <div className="flex border border-zinc-300 dark:border-zinc-700 rounded-md p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === 'url'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Direct URL
            </button>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-4">
        {activeTab === 'upload' ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              className="hidden"
              id="print-file-input"
            />

            {!selectedFile ? (
              <label
                htmlFor="print-file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-black bg-zinc-100 dark:border-white dark:bg-zinc-800'
                    : 'border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500'
                }`}
              >
                <UploadCloud className="w-8 h-8 text-zinc-700 dark:text-zinc-300 mb-2" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Click to browse or drop document here
                </span>
                <span className="text-xs text-zinc-500 mt-1">
                  Supports PDF, images, and text documents
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 border border-zinc-300 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-black">
                    <FileText className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'unknown type'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={isPrinting}
                  className="p-1 text-zinc-400 hover:text-black dark:hover:text-white rounded transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Direct Document URL"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://example.com/sample.pdf or Supabase URL"
                className="font-mono text-xs pl-8"
              />
              <LinkIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-8" />
            </div>
            <p className="text-[11px] text-zinc-500">
              The Raspberry Pi must be able to reach this URL over its network or internet.
            </p>
          </div>
        )}

        {/* Action Bar: Copies and Print Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="w-28">
            <Input
              label="Copies"
              type="number"
              min={1}
              max={99}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={isPrinting}
              className="text-center font-mono text-sm"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handlePrint}
            disabled={
              isPrinting ||
              (activeTab === 'upload' && !selectedFile) ||
              (activeTab === 'url' && !directUrl.trim())
            }
            className="flex-1 sm:flex-initial sm:min-w-[180px]"
          >
            <Printer className="w-4 h-4 mr-2" />
            {isUploading
              ? 'Uploading to Supabase...'
              : isPrinting
              ? 'Printing Document...'
              : 'Print Document'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
