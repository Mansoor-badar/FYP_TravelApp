import React from "react";
import { View, Text, StyleSheet } from "react-native";
import DocumentItem from "./DocumentItem";

/**
 * DocumentList
 *
 * Renders a vertical list of DocumentItem rows.
 *
 * Props:
 *   documents     – array of user_documents rows
 *   onSelect(doc) – called when a row is pressed
 */
const DocumentList = ({ documents = [], onSelect }) => {
  if (documents.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyText}>No documents stored yet.</Text>
        <Text style={styles.emptyHint}>
          Tap "＋ Upload Document" to add your first travel document.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {documents.map((doc) => (
        <DocumentItem key={doc.id} document={doc} onPress={onSelect} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default DocumentList;
