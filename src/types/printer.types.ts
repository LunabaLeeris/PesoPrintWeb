export type PrintStage =
  | 'idle'
  | 'uploading'
  | 'downloading'
  | 'spooling'
  | 'printing'
  | 'completed'
  | 'error';

export interface PrintProgressEvent {
  stage: PrintStage;
  progress: number;
  message?: string;
  jobId?: string | null;
  error?: string;
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface PrintLogEntry {
  id: string;
  timestamp: string;
  stage?: string;
  message: string;
  level: LogLevel;
  details?: Record<string, unknown> | string | number | null;
}

export interface PrintRequest {
  fileUrl: string;
  copies?: number;
}

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
}

export interface EndpointTestConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  description?: string;
  defaultBody?: string;
}
