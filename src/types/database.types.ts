export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Print page option pair: [pageNumber, copyCount]
 * e.g., [1, 3] = page 1, 3 copies; [2, 0] = page 2, 0 copies (skipped/removed)
 */
export type PagePrintOption = [pageNumber: number, copyCount: number];

export interface Database {
  public: {
    Tables: {
      kiosks: {
        Row: {
          id: string;
          session: string | null;
          date_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session?: string | null;
          date_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session?: string | null;
          date_updated?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          kiosk_id: string;
          name: string;
          document_url: string;
          options: PagePrintOption[];
          date_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          kiosk_id: string;
          name: string;
          document_url: string;
          options?: PagePrintOption[];
          date_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          kiosk_id?: string;
          name?: string;
          document_url?: string;
          options?: PagePrintOption[];
          date_updated?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_kiosk_id_fkey';
            columns: ['kiosk_id'];
            isOneToOne: false;
            referencedRelation: 'kiosks';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type KioskRow = Database['public']['Tables']['kiosks']['Row'];
export type KioskInsert = Database['public']['Tables']['kiosks']['Insert'];
export type KioskUpdate = Database['public']['Tables']['kiosks']['Update'];

export type DocumentRow = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
