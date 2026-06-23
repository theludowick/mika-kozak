import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { LocationCode } from '../types/menu';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useHiddenPositions() {
  return useQuery({
    queryKey: QUERY_KEYS.hiddenPositions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hidden_positions')
        .select('location, position_code');
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => `${r.location}:${r.position_code}`));
    },
  });
}

export async function setPositionHidden(
  location: LocationCode,
  positionCode: string,
  hidden: boolean,
) {
  if (hidden) {
    const { error } = await supabase
      .from('hidden_positions')
      .upsert({ location, position_code: positionCode });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('hidden_positions')
      .delete()
      .eq('location', location)
      .eq('position_code', positionCode);
    if (error) throw new Error(error.message);
  }
}
