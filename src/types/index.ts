export * from './database.types';
export * from './printer.types';

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
}

export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}
