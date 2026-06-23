import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, Alert, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useMenuItems } from '../../services/menuService';
import { useCategories } from '../../services/categoryService';
import { CategoryEditModal } from '../menu/components/CategoryEditModal';
import { PositionSettingsModal } from './PositionSettingsModal';
import { ReportedIssuesModal } from './ReportedIssuesModal';
import { useUnresolvedIssueCount } from '../../services/reportedIssuesService';
import { C, FONT } from '../../constants/theme';

interface ProfileScreenProps {
  visible: boolean;
  onClose: () => void;
}

function Avatar({ name, email }: { name: string | null; email: string | undefined }) {
  const initials = name
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (email?.[0] ?? '?').toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function SettingsRow({ label, onPress, danger = false, badge }: { label: string; onPress: () => void; danger?: boolean; badge?: number }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowLeft}>
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <Text style={[styles.settingsRowText, danger && styles.settingsRowDanger]}>{label}</Text>
      </View>
      <Text style={styles.settingsRowChevron}>›</Text>
    </TouchableOpacity>
  );
}

export function ProfileScreen({ visible, onClose }: ProfileScreenProps) {
  const { user, fullName, isAdmin, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const { data: unresolvedCount = 0 } = useUnresolvedIssueCount({ enabled: isAdmin });

  // Profile edit state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft]     = useState('');
  const [savingName, setSavingName]   = useState(false);

  // Password change state
  const [showPassword, setShowPassword]     = useState(false);
  const [currentPwd, setCurrentPwd]         = useState('');
  const [newPwd, setNewPwd]                 = useState('');
  const [confirmPwd, setConfirmPwd]         = useState('');
  const [savingPwd, setSavingPwd]           = useState(false);

  const [showCategories, setShowCategories]             = useState(false);
  const [showPositionSettings, setShowPositionSettings] = useState(false);
  const [showReportedIssues, setShowReportedIssues]     = useState(false);

  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useMenuItems();
  const { data: categories = [], isLoading: catsLoading, isError: catsError } = useCategories();

  useEffect(() => {
    if (visible) {
      setNameDraft(fullName ?? '');
      setEditingName(false);
      setShowPassword(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    }
  }, [visible, fullName]);

  // ── Save name ──────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    const name = nameDraft.trim();
    if (!name) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      setEditingName(false);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSavingName(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!newPwd) { Alert.alert('Required', 'Enter a new password.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    if (newPwd.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters.'); return; }
    setSavingPwd(true);
    try {
      // Verify current password first
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPwd,
      });
      if (signInErr) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw new Error(error.message);
      Alert.alert('Done', 'Password updated successfully.');
      setShowPassword(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    const doSignOut = () => { onClose(); void signOut(); };
    if (Platform.OS === 'web') {
      if ((window as Window & typeof globalThis).confirm('Sign out?')) doSignOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure?', [
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── Navigate to item (closes profile first) ────────────────────────────────
  const handleEditItem = (itemId: string) => {
    onClose();
    router.push(`/menu/${itemId}`);
  };

  const handleGoToItem = (itemId: string) => {
    setShowReportedIssues(false);
    onClose();
    router.push(`/menu/${itemId}`);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.root}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

            {/* Avatar + name */}
            <View style={styles.avatarSection}>
              <Avatar name={fullName} email={user?.email} />
              {!editingName ? (
                <View style={styles.nameRow}>
                  <Text style={styles.displayName}>{fullName ?? 'No name set'}</Text>
                  <TouchableOpacity onPress={() => { setNameDraft(fullName ?? ''); setEditingName(true); }} style={styles.editNameBtn}>
                    <Text style={styles.editNameBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSaveName()}
                    placeholder="Full name"
                    placeholderTextColor={C.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.saveNameBtn, savingName && styles.btnDisabled]}
                    onPress={() => void handleSaveName()}
                    disabled={savingName}
                  >
                    {savingName
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveNameBtnText}>Save</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelNameBtn} onPress={() => setEditingName(false)}>
                    <Text style={styles.cancelNameBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.email}>{user?.email}</Text>
            </View>

            {/* Account */}
            <SectionHeader label="ACCOUNT" />
            <View style={styles.card}>
              <SettingsRow label="Change Password" onPress={() => setShowPassword((v) => !v)} />
            </View>

            {showPassword && (
              <View style={styles.passwordCard}>
                <TextInput
                  style={styles.pwdInput}
                  value={currentPwd}
                  onChangeText={setCurrentPwd}
                  placeholder="Current password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                />
                <TextInput
                  style={styles.pwdInput}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  placeholder="New password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                />
                <TextInput
                  style={styles.pwdInput}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Confirm new password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.pwdSaveBtn, savingPwd && styles.btnDisabled]}
                  onPress={() => void handleChangePassword()}
                  disabled={savingPwd}
                >
                  {savingPwd
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.pwdSaveBtnText}>Update Password</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Admin */}
            {isAdmin && (
              <>
                <SectionHeader label="LEARNING MENU SETTINGS" />
                <View style={styles.card}>
                  <SettingsRow label="Items & Categories Settings" onPress={() => setShowCategories(true)} />
                </View>

                <SectionHeader label="QUIZ SETTINGS" />
                <View style={styles.card}>
                  <SettingsRow label="Position Settings" onPress={() => setShowPositionSettings(true)} />
                </View>

                <SectionHeader label="REPORTS" />
                <View style={styles.card}>
                  <SettingsRow label="Reported Issues" onPress={() => setShowReportedIssues(true)} badge={unresolvedCount} />
                </View>
              </>
            )}

            {/* Sign out */}
            <SectionHeader label="" />
            <View style={styles.card}>
              <SettingsRow label="Sign Out" onPress={handleSignOut} danger />
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Admin sub-modals rendered outside the main modal to avoid nesting issues */}
      <CategoryEditModal
        visible={showCategories}
        categories={categories}
        items={items}
        isLoading={catsLoading}
        isError={catsError}
        onClose={() => setShowCategories(false)}
        onEditItem={handleEditItem}
      />
      <PositionSettingsModal
        visible={showPositionSettings}
        onClose={() => setShowPositionSettings(false)}
      />
      <ReportedIssuesModal
        visible={showReportedIssues}
        onClose={() => setShowReportedIssues(false)}
        onGoToItem={handleGoToItem}
      />
    </>
  );
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

  scroll:  { flex: 1 },
  content: { padding: 16 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primaryMuted, borderWidth: 2, borderColor: C.borderBright,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText:  { fontSize: 26, fontFamily: FONT.bold, color: C.primary },
  displayName: { fontSize: 20, fontFamily: FONT.semiBold, color: C.text, marginBottom: 4 },
  email:       { fontSize: 13, fontFamily: FONT.regular, color: C.textMuted, marginTop: 4 },

  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  editNameBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.surfaceHigh },
  editNameBtnText: { fontSize: 12, color: C.primary, fontFamily: FONT.medium },

  nameEditRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nameInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    color: C.text, fontFamily: FONT.semiBold, fontSize: 16, textAlign: 'center',
  },
  saveNameBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary },
  saveNameBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semiBold },
  cancelNameBtn:     { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: C.surfaceHigh },
  cancelNameBtnText: { color: C.textSub, fontSize: 13, fontFamily: FONT.medium },

  sectionHeader: {
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    color: C.textMuted, fontFamily: FONT.semiBold,
    marginTop: 24, marginBottom: 8,
  },

  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  settingsRowLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsRowText:    { fontSize: 15, fontFamily: FONT.regular, color: C.text },
  settingsRowDanger:  { color: C.error },
  settingsRowChevron: { fontSize: 18, color: C.textMuted, fontFamily: FONT.regular },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: C.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontFamily: FONT.bold, color: '#fff' },

  passwordCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 10, marginTop: 8,
  },
  pwdInput: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontFamily: FONT.regular, fontSize: 14,
  },
  pwdSaveBtn:     { paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', marginTop: 4 },
  pwdSaveBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semiBold },
  btnDisabled:    { opacity: 0.5 },
});
