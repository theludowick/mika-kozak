import { z } from 'zod';

// ── Raw CSV row schema (kept for tests / legacy reference) ──────────────────

export const MenuRowSchema = z.object({
  id: z.string().optional(),
  related: z.string().optional(),
  category: z.string().optional(),
  'sub-category': z.string().optional(),
  name: z.string().optional(),
  location: z.string().optional(),
  e_ingredients: z.string().optional(),
  r_ingredients: z.string().optional(),
  e_description: z.string().optional(),
  r_description: z.string().optional(),
  e_presentation: z.string().optional(),
  r_presentation: z.string().optional(),
  e_takeout: z.string().optional(),
  r_takeout: z.string().optional(),
  e_facts: z.string().optional(),
  r_facts: z.string().optional(),
  image: z.string().optional(),
});

export type MenuRow = z.infer<typeof MenuRowSchema>;

// ── Location types ──────────────────────────────────────────────────────────

export type EateryLocationCode = 'VD' | 'NW';
export type RestaurantLocationCode = 'LG' | 'GT' | 'NT';
export type LocationCode = EateryLocationCode | RestaurantLocationCode;

export const EATERY_LOCATIONS: EateryLocationCode[] = ['VD', 'NW'];
export const RESTAURANT_LOCATIONS: RestaurantLocationCode[] = ['LG', 'GT', 'NT'];
export const ALL_LOCATIONS: LocationCode[] = [...EATERY_LOCATIONS, ...RESTAURANT_LOCATIONS];

export const LOCATION_NAMES: Record<LocationCode, string> = {
  GT: 'Gastown',
  NW: 'New West',
  VD: 'Victoria Drive',
  LG: 'Langley',
  NT: 'North Vancouver',
};

// ── Photo ───────────────────────────────────────────────────────────────────

export interface MenuItemPhoto {
  id: string;
  imageUrl: string;
  locations: LocationCode[];
  note: string | null;
  sortOrder: number;
}

// ── Parsed menu item ────────────────────────────────────────────────────────

export interface MenuItemFields {
  ingredients: string;
  description: string;
  presentation: string;
  takeout: string;
  facts: string;
}

export interface MenuItem {
  /** Supabase UUID — used for navigation and DB references */
  id: string;
  /** Original CSV id column value — used to resolve related items */
  csvId: string;
  relatedIds: string[];
  name: string;
  category: string;
  subCategory: string;
  locations: LocationCode[];
  /** Thumbnail: first uploaded photo URL, or legacy CSV image URL */
  imageUrl: string | null;
  /** All uploaded photos for this item, ordered by sort_order */
  photos: MenuItemPhoto[];
  eatery: MenuItemFields;
  restaurant: MenuItemFields;
}

// ── Filter state ────────────────────────────────────────────────────────────

export interface MenuFilters {
  search: string;
  category: string;
  subCategory: string;
}
