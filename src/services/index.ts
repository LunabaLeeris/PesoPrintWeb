import { createClient } from '@/lib/supabase/client';
import { ServiceResponse } from '@/types';

export async function checkSupabaseConnection(): Promise<ServiceResponse<{ connected: boolean; message: string }>> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    return {
      data: {
        connected: true,
        message: 'Successfully connected to Supabase',
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error connecting to Supabase'),
    };
  }
}
