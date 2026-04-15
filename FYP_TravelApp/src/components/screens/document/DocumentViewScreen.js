import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";
import { formatDate } from "../../../utils/DateUtils";

// ── helpers ───────────────────────────────────────────────────────────────────

const getExtension = (str = "") => {
  const parts = str.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
};

const EXT_COLORS = {
  PDF:  { bg: "#fee2e2", color: "#b91c1c" },
  JPG:  { bg: "#dbeafe", color: "#1d4ed8" },
  JPEG: { bg: "#dbeafe", color: "#1d4ed8" },
  PNG:  { bg: "#d1fae5", color: "#065f46" },
  DOC:  { bg: "#ede9fe", color: "#5b21b6" },
  DOCX: { bg: "#ede9fe", color: "#5b21b6" },
};
const extColor = (ext) => EXT_COLORS[ext] ?? { bg: "#f3f4f6", color: "#374151" };

// ── DocumentViewScreen ────────────────────────────────────────────────────────

/**
 * DocumentViewScreen
 *
 * Shows the metadata for a single stored document and allows the user to:
 *  • Open it in the device's native viewer (Linking.openURL)
 *  • Delete it (owner-only – guarded by matching user_id)
 *
 * Route params:
 *   document – user_documents row ({ id, user_id, doc_name, file_path, uploaded_at })
 */
const DocumentViewScreen = ({ navigation, route }) => {
  const { document } = route.params ?? {};
  const userId = global.UserID ?? null;

  const [deleting, setDeleting] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);

  if (!document) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Document not found.</Text>
      </SafeAreaView>
    );
  }

  const ext = getExtension(document.file_path || document.doc_name);
  const { bg, color } = extColor(ext);
  const isOwner = document.user_id === userId;

  // Shared auth env vars (used for both download and storage delete)
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

  // Build the public storage URL (bucket has "Allow Public Access" SELECT policy)
  // file_path stored as: "user-documents/{uid}/{timestamp}_{name}"
  const publicFileUrl = document.file_path?.startsWith("http")
    ? document.file_path
    : `${supabaseUrl}/storage/v1/object/public/${document.file_path}`;

  // Detect if this is a viewable image type
  const IMAGE_EXTS = ["JPG", "JPEG", "PNG", "GIF", "WEBP", "BMP"];
  const isImage = IMAGE_EXTS.includes(ext);

  const uploadedLabel = document.uploaded_at
    ? formatDate(document.uploaded_at) ?? document.uploaded_at.slice(0, 10)
    : "Unknown date";

  // ── Open / download document ───────────────────────────────────────────
  // The bucket has "Allow Public Access" (SELECT for public), so we can use
  // the plain public URL directly — no signed URL needed.
  const handleOpen = async () => {
    try {
      setOpeningFile(true);

      // Step 1: Download the file from the public URL into the device cache
      const safeName = (document.doc_name || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
      const localUri = FileSystem.cacheDirectory + safeName;

      const { status } = await FileSystem.downloadAsync(publicFileUrl, localUri);
      if (status < 200 || status >= 300) {
        throw new Error(`Download failed (HTTP ${status})`);
      }

      // Step 2: Open with the native share / viewer sheet
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(localUri, {
          dialogTitle: document.doc_name || "Open Document",
        });
      } else {
        // Fallback: open the public URL directly in the browser
        await Linking.openURL(publicFileUrl);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to open the document.");
    } finally {
      setOpeningFile(false);
    }
  };

  // ── Delete document (Storage first, then DB) ───────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      `Permanently delete "${document.doc_name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);

            // Strip the bucket name prefix to get the object path inside the bucket.
            // DB stores: "user-documents/{uid}/{timestamp}_{name}"
            // Storage API path (inside bucket):  "{uid}/{timestamp}_{name}"
            const storagePath = document.file_path
              .replace(/^user-documents\//, "");

            // 1. Delete from Supabase Storage (BLOCKING – uses bulk-delete endpoint)
            //    The bucket has a DELETE policy for the 'public' role so the anon
            //    key is sufficient.  If this fails we abort and leave the DB row
            //    intact so the user can retry.
            let storageOk = false;
            let storageErrText = "";
            try {
              const storageRes = await fetch(
                `${supabaseUrl}/storage/v1/object/user-documents`,
                {
                  method: "DELETE",
                  headers: {
                    apikey: apiKey,
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  // Supabase bulk-delete body: { prefixes: ["path/inside/bucket"] }
                  body: JSON.stringify({ prefixes: [storagePath] }),
                }
              );
              storageErrText = await storageRes.text();
              storageOk = storageRes.ok;
              if (!storageOk) {
                console.warn("Storage delete failed:", storageRes.status, storageErrText);
              }
            } catch (storageErr) {
              storageErrText = storageErr.message;
              console.warn("Storage delete error:", storageErr.message);
            }

            if (!storageOk) {
              setDeleting(false);
              Alert.alert(
                "Delete Failed",
                `Could not remove the file from storage.\n\nDetail: ${storageErrText || "Unknown error"}`
              );
              return;
            }

            // 2. Storage deleted successfully — now remove the DB record
            const dbRes = await API.delete(
              `/rest/v1/user_documents?id=eq.${document.id}`
            );
            setDeleting(false);

            if (!dbRes.isSuccess) {
              Alert.alert("Error", dbRes.message || "Could not delete document record.");
              return;
            }

            navigation.goBack();
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image preview (image files shown inline) ── */}
        {isImage ? (
          <View style={styles.imagePreviewBox}>
            <Image
              source={{ uri: publicFileUrl }}
              style={styles.imagePreview}
              resizeMode="contain"
              onError={() => console.warn("Image preview failed to load:", publicFileUrl)}
            />
          </View>
        ) : (
          /* ── Fallback large icon for non-image files ── */
          <View style={[styles.iconCircle, { backgroundColor: bg }]}>
            <Text style={[styles.iconExt, { color }]}>{ext.slice(0, 5)}</Text>
          </View>
        )}

        {/* ── Document name ── */}
        <Text style={styles.docName}>{document.doc_name || "Untitled"}</Text>

        {/* ── Meta pills ── */}
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: bg }]}>
            <Text style={[styles.metaBadgeText, { color }]}>{ext}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeTextGrey}>Uploaded {uploadedLabel}</Text>
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={styles.infoCard}>
          <InfoRow label="Document Name" value={document.doc_name || "—"} />
          <InfoRow label="File Type" value={ext} />
          <InfoRow label="Uploaded" value={uploadedLabel} />
        </View>

        {/* ── Native viewer note ── */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            {isImage
              ? "📷 Your image is shown above. Tap \"Open Document\" to open it in your gallery or share it."
              : "📎 Tap \"Open Document\" to download and open this file in your device's native viewer (e.g. PDF reader, gallery, or Office app)."}
          </Text>
        </View>
      </ScrollView>

      {/* ── Action tray ── */}
      {deleting ? (
        <View style={styles.actionTray}>
          <ActivityIndicator color="#111" />
        </View>
      ) : (
        <ButtonTray style={styles.actionTray}>
          <Button
            label={openingFile ? "Opening…" : "Open Document"}
            variant="primary"
            loading={openingFile}
            disabled={openingFile || deleting}
            onClick={handleOpen}
          />
          {isOwner && (
            <Button
              label="Delete"
              variant="danger"
              disabled={deleting || openingFile}
              onClick={handleDelete}
            />
          )}
        </ButtonTray>
      )}
    </SafeAreaView>
  );
};

// ── InfoRow ───────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value, mono = false }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text
      style={[infoStyles.value, mono && infoStyles.mono]}
      numberOfLines={2}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
    maxWidth: "38%",
  },
  value: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#666",
  },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  errorText: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 15,
    marginTop: 40,
  },

  // Header / back nav
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    alignSelf: "flex-start",
  },
  backBtnText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },

  // Scroll content
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    gap: 16,
  },

  // Image preview (for image-type files)
  imagePreviewBox: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 4,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },

  // Large icon (non-image files)
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconExt: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Name
  docName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    lineHeight: 28,
  },

  // Meta pills
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metaBadgeTextGrey: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },

  // Info card
  infoCard: {
    width: "100%",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  // Note box
  noteBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    padding: 14,
    width: "100%",
  },
  noteText: {
    fontSize: 13,
    color: "#1d4ed8",
    lineHeight: 19,
  },

  // Action tray
  actionTray: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 0,
  },
});

export default DocumentViewScreen;
