import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import DocumentList from "./DocumentList";
import Button from "../../UI/Button";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.82;

/**
 * DocumentDrawer
 *
 * A Telegram-style slide-in side drawer that lists the user's stored documents
 * and provides an upload action.
 *
 * Touch architecture
 * ──────────────────
 *   The backdrop Animated.View is purely VISUAL (pointerEvents="none") so it
 *   never intercepts touches that land on the drawer.  A separate, narrow
 *   Pressable covers only the right-hand strip (outside the drawer) to handle
 *   tap-to-dismiss.  This eliminates the Android z-order / native-driver touch
 *   bleed that caused the upload button's bottom half to be unreachable.
 *
 * Props:
 *   visible      – boolean
 *   onClose()    – close drawer
 *   documents    – user_documents rows
 *   loading      – show spinner while fetching
 *   uploading    – show inline progress while uploading
 *   onUpload()   – called when user taps "Upload Document"
 *   onSelect(doc)– called when a document row is tapped
 */
const DocumentDrawer = ({
  visible,
  onClose,
  documents = [],
  loading = false,
  uploading = false,
  onUpload,
  onSelect,
}) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* ── Visual backdrop (no touch events – never blocks the drawer) ── */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="none"
      />

      {/* ── Tap-to-dismiss area (RIGHT strip only – outside the drawer) ── */}
      <Pressable style={styles.dismissArea} onPress={onClose} />

      {/* ── Drawer panel ── */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerTitleRow}>
            <View style={styles.drawerIconWrap}>
              <Text style={styles.drawerIcon}>📁</Text>
            </View>
            <View>
              <Text style={styles.drawerTitle}>My Documents</Text>
              <Text style={styles.drawerSubtitle}>
                {documents.length} document{documents.length !== 1 ? "s" : ""} stored
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            hitSlop={8}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Upload button / uploading indicator */}
        <View style={styles.uploadSection}>
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.uploadingText}>Uploading document…</Text>
            </View>
          ) : (
            <Pressable
              onPress={onUpload}
              style={({ pressed }) => [
                styles.uploadBtn,
                pressed && styles.uploadBtnPressed,
              ]}
            >
              <Text style={styles.uploadBtnLabel}>＋ Upload Document</Text>
            </Pressable>
          )}
        </View>

        {/* Document list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#111" />
          </View>
        ) : (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <DocumentList documents={documents} onSelect={onSelect} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Visual-only backdrop (no pointer events)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  // Dismiss strip – only the area to the RIGHT of the drawer
  dismissArea: {
    position: "absolute",
    top: 0,
    left: DRAWER_WIDTH,
    right: 0,
    bottom: 0,
  },

  // Drawer panel
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 6, height: 0 },
    elevation: 20,
  },

  // Header
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#111",
  },
  drawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drawerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerIcon: {
    fontSize: 22,
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  drawerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Upload
  uploadSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  // Custom upload Pressable (avoids Button's flex:1 which can clip the hitbox)
  uploadBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnPressed: {
    opacity: 0.75,
  },
  uploadBtnLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 46,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  // List
  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});

export default DocumentDrawer;
