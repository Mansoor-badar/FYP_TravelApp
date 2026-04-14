import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";

// ── PollDetail ─────────────────────────────────────────────────────────────────

/**
 * PollDetail
 *
 * Renders the full poll UI: question, vote bars, voting buttons.
 *
 * Props:
 *   poll        – trip_polls row with `options[]` attached
 *   memberCount – total accepted members (used to detect closed state)
 *   hasVoted    – whether the current user has already voted in this poll
 *   onVote(optionId) – called when the user casts a vote
 *   voting      – boolean, loading state while vote is being saved
 */
const PollDetail = ({ poll, memberCount, hasVoted, onVote, voting }) => {
  if (!poll) return null;

  const options = poll.options ?? [];
  const totalVotes = options.reduce((sum, o) => sum + (o.vote_count ?? 0), 0);
  const isClosed = memberCount > 0 && totalVotes >= memberCount;

  const winner = isClosed
    ? options.reduce(
        (best, o) =>
          (o.vote_count ?? 0) > (best?.vote_count ?? -1) ? o : best,
        null
      )
    : null;

  return (
    <View style={styles.detail}>
      {/* Question */}
      <Text style={styles.question}>{poll.question || "—"}</Text>

      {/* Status badge */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.badge,
            isClosed ? styles.badgeClosed : styles.badgeOpen,
          ]}
        >
          <Text style={styles.badgeText}>
            {isClosed ? "🔒 Closed" : "🗳 Open"}
          </Text>
        </View>
        <Text style={styles.voteTotal}>
          {totalVotes} / {memberCount} vote{memberCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Winner banner */}
      {isClosed && winner && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerLabel}>🏆 Winner</Text>
          <Text style={styles.winnerText}>{winner.option_text}</Text>
        </View>
      )}

      {/* Options */}
      <View style={styles.optionsList}>
        {options.map((opt) => {
          const pct = totalVotes > 0 ? (opt.vote_count ?? 0) / totalVotes : 0;
          const isWinner = isClosed && winner?.id === opt.id;
          const canVote = !isClosed && !hasVoted;

          return (
            <Pressable
              key={opt.id}
              onPress={() => canVote && onVote?.(opt.id)}
              disabled={!canVote || voting}
              style={({ pressed }) => [
                styles.optionCard,
                isWinner && styles.optionCardWinner,
                canVote && pressed && styles.optionCardPressed,
              ]}
            >
              {/* Background fill bar */}
              {totalVotes > 0 && (
                <View
                  style={[
                    styles.fillBar,
                    isWinner ? styles.fillBarWinner : styles.fillBarNormal,
                    { width: `${Math.round(pct * 100)}%` },
                  ]}
                  pointerEvents="none"
                />
              )}

              {/* Content */}
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionText,
                    isWinner && styles.optionTextWinner,
                  ]}
                  numberOfLines={2}
                >
                  {opt.option_text}
                </Text>
                <View style={styles.optionMeta}>
                  {totalVotes > 0 && (
                    <Text style={styles.pctText}>
                      {Math.round(pct * 100)}%
                    </Text>
                  )}
                  <Text style={styles.countText}>
                    {opt.vote_count ?? 0} vote
                    {(opt.vote_count ?? 0) !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              {/* Vote indicator */}
              {canVote && (
                <View style={styles.voteArrow}>
                  <Text style={styles.voteArrowText}>›</Text>
                </View>
              )}
              {voting && (
                <ActivityIndicator size="small" color="#888" style={{ marginLeft: 6 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Already voted notice */}
      {hasVoted && !isClosed && (
        <Text style={styles.votedNotice}>✓ You have voted. Waiting for others…</Text>
      )}
    </View>
  );
};

// ── PollPopup ─────────────────────────────────────────────────────────────────

/**
 * PollPopup
 *
 * A slide-up modal for viewing and voting in a poll.
 *
 * Props:
 *   visible          – boolean
 *   onClose()        – called when the user dismisses
 *   poll             – trip_polls row (with options[]) or null (fetched via pollId)
 *   pollId           – UUID to fetch poll if `poll` is not provided
 *   memberCount      – accepted member count for closed-state detection
 *   votedPollIds     – Set of poll IDs the current user has already voted in (session)
 *   onVoteCast(pollId, optionId, updatedOptions) – called after a successful vote
 *   canDelete        – whether the current user can delete this poll (creator / host)
 *   onDeleted(poll)  – called after a successful delete
 */
export const PollPopup = ({
  visible,
  onClose,
  poll: pollProp,
  pollId,
  memberCount = 0,
  votedPollIds = new Set(),
  onVoteCast,
  canDelete = false,
  onDeleted,
}) => {
  const [poll, setPoll] = useState(pollProp ?? null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  const fetchPoll = useCallback(async () => {
    const id = pollProp?.id ?? pollId;
    if (!id) return;
    setLoading(true);
    setError(null);

    const pollRes = await API.get(
      `/rest/v1/trip_polls?id=eq.${id}&select=*`
    );
    if (!pollRes.isSuccess) {
      setError(pollRes.message || "Failed to load poll.");
      setLoading(false);
      return;
    }
    const pollRow = Array.isArray(pollRes.result)
      ? pollRes.result[0]
      : pollRes.result;
    if (!pollRow) {
      setError("Poll not found.");
      setLoading(false);
      return;
    }

    const optsRes = await API.get(
      `/rest/v1/poll_options?poll_id=eq.${pollRow.id}&select=*`
    );
    const opts =
      optsRes.isSuccess && Array.isArray(optsRes.result)
        ? optsRes.result
        : [];

    setPoll({ ...pollRow, options: opts });
    setLoading(false);
  }, [pollProp, pollId]);

  useEffect(() => {
    if (pollProp) {
      setPoll(pollProp);
    } else if (pollId && visible) {
      fetchPoll();
    }
  }, [pollProp, pollId, visible, fetchPoll]);

  const handleVote = async (optionId) => {
    if (!poll?.id || !optionId) return;
    setVoting(true);

    // Find current vote count
    const targetOption = (poll.options ?? []).find((o) => o.id === optionId);
    if (!targetOption) {
      setVoting(false);
      return;
    }

    const newCount = (targetOption.vote_count ?? 0) + 1;
    const res = await API.patch(
      `/rest/v1/poll_options?id=eq.${optionId}`,
      { vote_count: newCount }
    );

    setVoting(false);

    if (!res.isSuccess) {
      Alert.alert("Error", res.message || "Failed to cast vote.");
      return;
    }

    // Update local state
    const updatedOptions = (poll.options ?? []).map((o) =>
      o.id === optionId ? { ...o, vote_count: newCount } : o
    );
    const updatedPoll = { ...poll, options: updatedOptions };
    setPoll(updatedPoll);
    onVoteCast?.(poll.id, optionId, updatedOptions);
  };

  const handleDelete = () => {
    if (!poll?.id) return;
    Alert.alert(
      "Delete Poll",
      "Delete this poll permanently? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await API.delete(
              `/rest/v1/trip_polls?id=eq.${poll.id}`
            );
            if (res.isSuccess) {
              onDeleted?.(poll);
              onClose();
            } else {
              Alert.alert("Error", res.message || "Could not delete poll.");
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  const hasVoted = votedPollIds.has(poll?.id);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#000" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : poll ? (
              <PollDetail
                poll={poll}
                memberCount={memberCount}
                hasVoted={hasVoted}
                onVote={handleVote}
                voting={voting}
              />
            ) : (
              <Text style={styles.emptyText}>Poll not found.</Text>
            )}
          </ScrollView>

          <ButtonTray style={styles.actionTray}>
            {canDelete && poll && (
              <Button
                label="Delete"
                variant="danger"
                onClick={handleDelete}
              />
            )}
            <Button label="Close" variant="ghost" onClick={onClose} />
          </ButtonTray>
        </View>
      </View>
    </Modal>
  );
};

// ── PollView ──────────────────────────────────────────────────────────────────

/**
 * PollView
 *
 * Standalone full-page poll detail renderer (not in a modal).
 * Suitable for embedding directly in a ScrollView.
 */
const PollView = ({
  poll,
  memberCount,
  hasVoted,
  onVote,
  voting,
}) => {
  return (
    <PollDetail
      poll={poll}
      memberCount={memberCount}
      hasVoted={hasVoted}
      onVote={onVote}
      voting={voting}
    />
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Detail
  detail: {
    gap: 16,
    paddingVertical: 4,
  },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    lineHeight: 28,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeOpen: { backgroundColor: "#e6f4ea" },
  badgeClosed: { backgroundColor: "#f0f0f0" },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  voteTotal: {
    fontSize: 13,
    color: "#888",
  },

  // Winner
  winnerBanner: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  winnerLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#aaa",
  },
  winnerText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },

  // Options
  optionsList: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: "#fff",
  },
  optionCardWinner: {
    borderColor: "#111",
  },
  optionCardPressed: {
    opacity: 0.8,
  },
  fillBar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 0,
  },
  fillBarNormal: {
    backgroundColor: "#f0f0f0",
  },
  fillBarWinner: {
    backgroundColor: "#e8e8e8",
  },
  optionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  optionTextWinner: {
    color: "#111",
    fontWeight: "700",
  },
  optionMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  pctText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  countText: {
    fontSize: 11,
    color: "#aaa",
  },
  voteArrow: {
    paddingRight: 14,
  },
  voteArrowText: {
    fontSize: 22,
    color: "#bbb",
    fontWeight: "300",
  },
  votedNotice: {
    fontSize: 13,
    color: "#2e7d32",
    fontStyle: "italic",
    textAlign: "center",
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  actionTray: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 0,
  },
  errorText: {
    color: "#cc0000",
    textAlign: "center",
    fontSize: 14,
  },
  emptyText: {
    color: "#aaa",
    textAlign: "center",
    fontSize: 14,
  },
});

export default PollView;
