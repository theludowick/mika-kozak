import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../constants/queryKeys';

export interface ReportedIssue {
  id: string;
  item_id: string;
  item_name: string;
  message: string;
  submitted_by: string;
  submitted_by_name: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

export async function submitIssue(
  itemId: string,
  itemName: string,
  message: string,
  submittedBy: string,
  submittedByName: string | null,
) {
  const { error } = await supabase.from('reported_issues').insert({
    item_id: itemId,
    item_name: itemName,
    message: message.trim(),
    submitted_by: submittedBy,
    submitted_by_name: submittedByName,
  });
  if (error) throw new Error(error.message);
}

export async function resolveIssue(
  id: string,
  resolvedBy: string,
  resolvedByName: string | null,
) {
  const { error } = await supabase
    .from('reported_issues')
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_by_name: resolvedByName,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export function useReportedIssues() {
  return useQuery({
    queryKey: QUERY_KEYS.reportedIssues,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reported_issues')
        .select('*')
        .order('resolved', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ReportedIssue[];
    },
  });
}

export function useUnresolvedIssueCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.unresolvedIssueCount,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reported_issues')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}
