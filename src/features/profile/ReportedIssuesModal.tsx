import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useReportedIssues, resolveIssue } from '../../services/reportedIssuesService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { C, FONT } from '../../constants/theme';

interface ReportedIssuesModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToItem: (itemId: string) => void;
}

export function ReportedIssuesModal({ visible, onClose, onGoToItem }: ReportedIssuesModalProps) {
  const queryClient = useQueryClient();
  const { user, fullName } = useAuth();
  const { data: issues = [], isLoading } = useReportedIssues();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [resolving, setResolving]       = useState(false);

  const handleResolve = async () => {
    if (!confirmingId || !user) return;
    setResolving(true);
    try {
      await resolveIssue(confirmingId, user.id, fullName ?? null);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reportedIssues });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unresolvedIssueCount });
      setConfirmingId(null);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setResolving(false);
    }
  };

  const unresolved = issues.filter((i) => !i.resolved);
  const resolved   = issues.filter((i) => i.resolved);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reported Issues</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : issues.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No issues reported yet.</Text>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

            {unresolved.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Open — {unresolved.length}</Text>
                {unresolved.map((issue) => (
                  <View key={issue.id} style={styles.issueCard}>
                    <View style={styles.issueMeta}>
                      <Text style={styles.issueUser}>{issue.submitted_by_name ?? 'Unknown'}</Text>
                      <Text style={styles.issueDot}>·</Text>
                      <Text style={styles.issueDate}>{formatDate(issue.created_at)}</Text>
                    </View>
                    <Text style={styles.issueItem}>{issue.item_name}</Text>
                    <Text style={styles.issueMessage}>{issue.message}</Text>
                    <View style={styles.issueActions}>
                      <TouchableOpacity
                        style={styles.goToBtn}
                        onPress={() => onGoToItem(issue.item_id)}
                      >
                        <Text style={styles.goToBtnText}>Go to Item →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.resolveBtn}
                        onPress={() => setConfirmingId(issue.id)}
                      >
                        <Text style={styles.resolveBtnText}>Mark as Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {resolved.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { marginTop: unresolved.length > 0 ? 24 : 0 }]}>
                  Resolved — {resolved.length}
                </Text>
                {resolved.map((issue) => (
                  <View key={issue.id} style={[styles.issueCard, styles.issueCardResolved]}>
                    <View style={styles.issueMeta}>
                      <Text style={styles.issueUser}>{issue.submitted_by_name ?? 'Unknown'}</Text>
                      <Text style={styles.issueDot}>·</Text>
                      <Text style={styles.issueDate}>{formatDate(issue.created_at)}</Text>
                    </View>
                    <Text style={styles.issueItem}>{issue.item_name}</Text>
                    <Text style={[styles.issueMessage, styles.issueMessageResolved]}>{issue.message}</Text>
                    <View style={styles.resolvedStrip}>
                      <Text style={styles.resolvedStripText}>
                        ✓ Resolved by {issue.resolved_by_name ?? 'Admin'}
                        {issue.resolved_at ? `  ·  ${formatDate(issue.resolved_at)}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* Resolve confirmation overlay */}
        {confirmingId && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmingId(null)}>
            <View style={styles.overlay}>
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>Mark as done?</Text>
                <Text style={styles.confirmBody}>
                  This will log the resolution and remove the issue from the open queue.
                </Text>
                <TouchableOpacity
                  style={[styles.confirmBtnResolve, resolving && styles.btnDisabled]}
                  onPress={() => void handleResolve()}
                  disabled={resolving}
                >
                  {resolving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmBtnResolveText}>Mark as Done</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtnCancel}
                  onPress={() => setConfirmingId(null)}
                  disabled={resolving}
                >
                  <Text style={styles.confirmBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle:  { fontSize: 18, fontFamily: FONT.semiBold, color: C.text },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: C.textSub, fontFamily: FONT.semiBold },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: C.textMuted, fontFamily: FONT.regular },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  groupLabel: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold, marginBottom: 12,
  },

  issueCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
  },
  issueCardResolved: { opacity: 0.7 },

  issueMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  issueUser: { fontSize: 13, fontFamily: FONT.semiBold, color: C.text },
  issueDot:  { fontSize: 12, color: C.textMuted },
  issueDate: { fontSize: 12, color: C.textMuted, fontFamily: FONT.regular },

  issueItem: {
    fontSize: 12, fontFamily: FONT.medium, color: C.primary,
    marginBottom: 8, letterSpacing: 0.3,
  },
  issueMessage:         { fontSize: 14, color: C.text, fontFamily: FONT.regular, lineHeight: 20, marginBottom: 12 },
  issueMessageResolved: { color: C.textMuted, marginBottom: 8 },

  issueActions: { flexDirection: 'row', gap: 8 },
  goToBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderBright, backgroundColor: C.surfaceHigh,
  },
  goToBtnText:   { fontSize: 13, color: C.textSub, fontFamily: FONT.medium },
  resolveBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary },
  resolveBtnText:{ fontSize: 13, color: '#fff', fontFamily: FONT.semiBold },

  resolvedStrip: {
    backgroundColor: C.accentMuted, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  resolvedStripText: { fontSize: 12, color: C.accent, fontFamily: FONT.medium },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  confirmCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.border, gap: 10,
  },
  confirmTitle:            { fontSize: 18, fontFamily: FONT.semiBold, color: C.text },
  confirmBody:             { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, lineHeight: 20 },
  confirmBtnResolve:       { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  confirmBtnResolveText:   { color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  confirmBtnCancel:        { paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  confirmBtnCancelText:    { color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
  btnDisabled:             { opacity: 0.45 },
});
