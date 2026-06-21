import { supabase } from '../lib/supabase';
import { ENV } from '../lib/env';
import * as ImageManipulator from 'expo-image-manipulator';

const BUCKET = 'menu-images';

export async function fetchMenuPhotos(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('menu_item_photos')
    .select('csv_id, image_url');
  if (error) {
    console.warn('[photoService] fetchMenuPhotos error:', error.message);
    return {};
  }
  const map: Record<string, string> = {};
  data?.forEach((row) => { map[row.csv_id] = row.image_url; });
  return map;
}

export async function uploadMenuPhoto(csvId: string, imageUri: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const compressed = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 800 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  const path = `${csvId}.jpg`;

  // Use fetch directly so the blob is sent as raw binary (not multipart/form-data)
  const uploadResponse = await fetch(
    `${ENV.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: ENV.SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
    },
  );

  if (!uploadResponse.ok) {
    const err = await uploadResponse.json().catch(() => ({ message: uploadResponse.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Upload failed');
  }

  const publicUrl = `${ENV.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;

  const { error: dbError } = await supabase
    .from('menu_item_photos')
    .upsert({ csv_id: csvId, image_url: publicUrl, updated_at: new Date().toISOString() });

  if (dbError) throw dbError;

  return publicUrl;
}
