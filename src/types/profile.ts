import type { LocationCode } from './menu';

export interface Profile {
  id: string;
  full_name: string | null;
  position: string | null;
  location: LocationCode | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export const POSITIONS = [
  { code: 'server', name: 'Server' },
  { code: 'bar', name: 'Bar' },
  { code: 'lavka', name: 'Lavka' },
  { code: 'welcome', name: 'Welcome / Host' },
  { code: 'hot', name: 'Hot Line' },
  { code: 'cold', name: 'Cold Line' },
  { code: 'baker', name: 'Baker' },
  { code: 'driver', name: 'Driver' },
  { code: 'cook', name: 'Cook' },
  { code: 'bread', name: 'Bread' },
] as const;

export type PositionCode = (typeof POSITIONS)[number]['code'];
