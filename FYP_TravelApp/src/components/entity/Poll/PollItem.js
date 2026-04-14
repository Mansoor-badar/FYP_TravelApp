import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * PollItem
 *
 * A compact pressable card representing a single poll in a list.
 *
 * Props:
 *   poll         – trip_polls row (with `options` array attached: { id, option_text, vote_count }[])
 *   memberCount  – number of accepted members (host + accepted participants)
 *   onPress(poll) – called when the card is tapped
 */
const PollItem = ({ poll, memberCount, onPress }) => {
  if (!poll) return null;

  const options = poll.options ?? [];
  const totalVotes = options.reduce((sum, o) => sum + (o.vote_count ?? 0), 0);
  const isClosed = memberCount > 0 && totalVotes >= memberCount;

  // Find winning option when closed
  const winner = isClosed
    ? options.reduce(
        (best, o) =>
          (o.vote_count ?? 0) > (best?.vote_count ?? -1) ? o : best,
        null
      )
    : null;

  return (
    <Pressable
      onPress={() => onPress?.(poll)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.question} numberOfLines={2}>
          {poll.question || "—"}
        </Text>
        <View style={[styles.badge, isClosed ? styles.badgeClosed : styles.badgeOpen]}>
          <Text style={styles.badgeText}>{isClosed ? "Closed" : "Open"}</Text>
        </View>
      </View>

      {/* Options preview */}
      <View style={styles.optionsPreview}>
        {options.slice(0, 3).map((opt, idx) => {
          const isWinner = isClosed && winner?.id === opt.id;
          return (
            <View key={opt.id ?? idx} style={styles.optionRow}>
              <View
                style={[
                  styles.optionDot,
                  isWinner && styles.optionDotWinner,
                ]}
              />
              <Text
                style={[styles.optionText, isWinner && styles.optionTextWinner]}
                numberOfLines={1}
              >
                {opt.option_text}
              </Text>
              <Text style={styles.voteCount}>{opt.vote_count ?? 0}</Text>
            </View>
          );
        })}
        {options.length > 3 && (
          <Text style={styles.moreOptions}>
            +{options.length - 3} more…
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {memberCount > 0 ? ` of ${memberCount}` : ""}
        </Text>
        {isClosed && winner && (
          <Text style={styles.winnerLabel}>
            🏆 {winner.option_text}
          </Text>
        )}
        <Text style={styles.tapHint}>Tap to {isClosed ? "view result" : "vote"}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.75,
    backgroundColor: "#f9f9f9",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    lineHeight: 21,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  badgeOpen: {
    backgroundColor: "#e6f4ea",
  },
  badgeClosed: {
    backgroundColor: "#f0f0f0",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#444",
  },
  optionsPreview: {
    gap: 6,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    flexShrink: 0,
  },
  optionDotWinner: {
    backgroundColor: "#111",
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: "#555",
  },
  optionTextWinner: {
    color: "#111",
    fontWeight: "700",
  },
  voteCount: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    minWidth: 20,
    textAlign: "right",
  },
  moreOptions: {
    fontSize: 12,
    color: "#aaa",
    marginLeft: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: 12,
    color: "#aaa",
  },
  winnerLabel: {
    fontSize: 12,
    color: "#111",
    fontWeight: "700",
    flex: 1,
  },
  tapHint: {
    fontSize: 11,
    color: "#bbb",
    marginLeft: "auto",
  },
});

export default PollItem;
