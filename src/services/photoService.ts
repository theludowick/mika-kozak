import { supabase } from '../lib/supabase';
import { ENV } from '../lib/env';
import * as ImageManipulator from 'expo-image-manipulator';
import type { LocationCode } from '../types/menu';

const BUCKET = 'menu-images';

export async function uploadMenuPhoto(
  menuItemId: string,
  imageUri: string,
  locations: LocationCode[],
  note?: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const compressed = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  const photoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${menuItemId}/${photoId}.jpg`;

  const uploadResponse = await fetch(
    `${ENV.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: ENV.SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    },
  );

  if (!uploadResponse.ok) {
    const err = await uploadResponse.json().catch(() => ({ message: uploadResponse.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Upload failed');
  }

  const publicUrl = `${ENV.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  const { data: existing } = await supabase
    .from('menu_item_photos')
    .select('sort_order')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0
    ? (existing[0] as { sort_order: number }).sort_order + 1
    : 0;

  const { error: dbError } = await supabase.from('menu_item_photos').insert({
    menu_item_id: menuItemId,
    image_url: publicUrl,
    locations,
    note: note ?? null,
    sort_order: nextOrder,
    uploaded_by: session.user.id,
  });

  if (dbError) throw dbError;
}

export async function deleteMenuPhoto(photoId: string, imageUrl: string): Promise<void> {
  const urlObj = new URL(imageUrl);
  const pathParts = urlObj.pathname.split('/object/public/menu-images/');
  if (pathParts[1]) {
    await supabase.storage.from('menu-images').remove([pathParts[1]]);
  }
  const { error } = await supabase.from('menu_item_photos').delete().eq('id', photoId);
  if (error) throw error;
}

export async function updatePhotoMeta(
  photoId: string,
  locations: LocationCode[],
  note: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('menu_item_photos')
    .update({ locations, note })
    .eq('id', photoId);
  if (error) throw error;
}

export async function reorderPhotos(
  menuItemId: string,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('menu_item_photos').update({ sort_order: idx }).eq('id', id),
    ),
  );
}
