import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { submitIssue } from '../../../services/reportedIssuesService';
import { C, FONT } from '../../../constants/theme';

interface ReportIssueModalProps {
  visible: boolean;
  itemId: string;
  itemName: string;
  onClose: () => void;
}

export function ReportIssueModal({ visible, itemId, itemName, onClose }: ReportIssueModalProps) {
  const { user, fullName } = useAuth();
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage('');
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);
    try {
      await submitIssue(itemId, itemName, message, user.id, fullName ?? null);
      setSubmitted(true);
    } catch {
      // keep form open so user can retry; could show inline error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {submitted ? (
            /* ── Success state ──────────────────────────────────────────── */
            <>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.title}>Thanks!</Text>
              <Text style={styles.body}>
                Your report has been submitted. Thanks for helping us keep the learning menu up to date!
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── Form state ─────────────────────────────────────────────── */
            <>
              <Text style={styles.title}>Report an Issue</Text>
              <Text style={styles.itemLabel} numberOfLines={1}>{itemName}</Text>
              <Text style={styles.body}>
                Describe what seems incorrect or out of date, and a manager will review it.
              </Text>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="e.g. The ingredients list is missing the allergen info…"
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!message.trim() || submitting) && styles.btnDisabled]}
                  onPress={() => void handleSubmit()}
                  disabled={!message.trim() || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.primaryBtnText}>Submit</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={onClose} disabled={submitting}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 380, borderWidth: 1, borderColor: C.border,
  },

  successIcon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  title:       { fontSize: 18, fontFamily: FONT.semiBold, color: C.text, marginBottom: 6 },
  itemLabel:   { fontSize: 13, fontFamily: FONT.medium, color: C.primary, marginBottom: 10 },
  body:        { fontSize: 14, color: C.textSub, fontFamily: FONT.regular, lineHeight: 20, marginBottom: 16 },

  input: {
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: C.text, fontFamily: FONT.regular, fontSize: 14,
    minHeight: 100, lineHeight: 21, marginBottom: 16,
  },

  btnRow:       { gap: 10 },
  primaryBtn:   { paddingVertical: 13, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontSize: 15, fontFamily: FONT.semiBold },
  ghostBtn:     { paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  ghostBtnText: { color: C.textSub, fontSize: 15, fontFamily: FONT.medium },
  btnDisabled:  { opacity: 0.45 },
});
