import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { formatDate } from "../../../utils/DateUtils";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Derives a short file extension label from a file_path / doc_name string.
 * E.g. "visa_document.pdf" → "PDF"
 */
const getExtension = (filePathOrName = "") => {
  const parts = filePathOrName.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase().slice(0, 5);
};

/**
 * Returns a colour pair for a given extension badge.
 */
const EXT_COLORS = {
  PDF: { bg: "#fee2e2", color: "#b91c1c" },
  JPG: { bg: "#dbeafe", color: "#1d4ed8" },
  JPEG: { bg: "#dbeafe", color: "#1d4ed8" },
  PNG: { bg: "#d1fae5", color: "#065f46" },
  DOC: { bg: "#ede9fe", color: "#5b21b6" },
  DOCX: { bg: "#ede9fe", color: "#5b21b6" },
  DEFAULT: { bg: "#f3f4f6", color: "#374151" },
};

const extColor = (ext) => EXT_COLORS[ext] ?? EXT_COLORS.DEFAULT;

// ── DocumentItem ──────────────────────────────────────────────────────────────

/**
 * DocumentItem
 *
 * A compact pressable row representing a single stored document.
 *
 * Props:
 *   document  – user_documents row: { id, user_id, doc_name, file_path, uploaded_at }
 *   onPress(document) – called when the row is tapped
 */
const DocumentItem = ({ document, onPress }) => {
  if (!document) return null;

  const ext = getExtension(document.file_path || document.doc_name);
  const { bg, color } = extColor(ext);

  const uploadedLabel = document.uploaded_at
    ? formatDate(document.uploaded_at) ?? document.uploaded_at.slice(0, 10)
    : null;

  return (
    <Pressable
      onPress={() => onPress?.(document)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      {/* Icon area */}
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Text style={[styles.iconExt, { color }]}>{ext.slice(0, 4)}</Text>
      </View>

      {/* Text content */}
      <View style={styles.textArea}>
        <Text style={styles.docName} numberOfLines={1}>
          {document.doc_name || "Untitled"}
        </Text>
        {uploadedLabel && (
          <Text style={styles.uploadedAt}>Uploaded {uploadedLabel}</Text>
        )}
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  rowPressed: {
    backgroundColor: "#f9f9f9",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconExt: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  textArea: {
    flex: 1,
    gap: 2,
  },
  docName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  uploadedAt: {
    fontSize: 11,
    color: "#aaa",
  },

  chevron: {
    fontSize: 20,
    color: "#ccc",
    flexShrink: 0,
  },
});

export default DocumentItem;
