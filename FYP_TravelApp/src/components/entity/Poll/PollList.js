import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PollItem from "./PollItem";

/**
 * PollList
 *
 * Renders a list of PollItem cards.
 *
 * Props:
 *   polls       – array of trip_polls rows, each with `options[]` attached
 *   memberCount – accepted member count for closed-state detection
 *   onSelect(poll) – called when a card is tapped
 */
const PollList = ({ polls = [], memberCount = 0, onSelect }) => {
  if (polls.length === 0) {
    return (
      <Text style={styles.empty}>No polls yet. Be the first to create one!</Text>
    );
  }

  return (
    <View style={styles.list}>
      {polls.map((poll) => (
        <PollItem
          key={poll.id}
          poll={poll}
          memberCount={memberCount}
          onPress={onSelect}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  empty: {
    fontSize: 14,
    color: "#aaa",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default PollList;
