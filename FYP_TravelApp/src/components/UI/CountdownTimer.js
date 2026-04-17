import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { endOfUTCDay } from "../../utils/DateUtils";

// ── TimeUnit ──────────────────────────────────────────────────────────────────

const TimeUnit = ({ value, label }) => (
  <View style={styles.unit}>
    <Text style={styles.value}>{String(value).padStart(2, "0")}</Text>
    <Text style={styles.unitLabel}>{label}</Text>
  </View>
);

// ── CountdownTimer ────────────────────────────────────────────────────────────

/**
 * CountdownTimer
 *
 * Generic reusable countdown timer for trips and itinerary items.
 *
 * Shows:
 *   - Before startDate  → startLabel (default "Starts in")
 *   - Between start and end → endLabel (default "Ends in")
 *   - After endDate (or no relevant dates) → renders nothing
 *
 * The end date is automatically stretched to 23:59:59 UTC so a trip/activity
 * stored as a midnight-UTC timestamptz stays active for the full calendar day.
 *
 * Updates every minute. Safe to mount/unmount freely.
 *
 * Props:
 *   startDate  – ISO date/timestamp string for when the event starts
 *   endDate    – ISO date/timestamp string for when the event ends (optional)
 *   startLabel – heading shown in the "before start" phase (default "Starts in")
 *   endLabel   – heading shown in the "ongoing" phase (default "Ends in")
 *   compact    – use a smaller inline layout suitable for embedding in cards
 */
const CountdownTimer = ({
  startDate,
  endDate,
  startLabel = "Starts in",
  endLabel = "Ends in",
  compact = false,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const start = startDate ? new Date(startDate) : null;
  // Use the end date as-is when it already carries a time component (full ISO
  // datetime strings contain 'T'). Only apply endOfUTCDay for bare date strings
  // like "2026-04-17" that have no explicit time — otherwise the stored time
  // (e.g. 01:37) is correctly used as the countdown target.
  const end = endDate
    ? endDate.includes('T')
      ? new Date(endDate)
      : endOfUTCDay(endDate)
    : null;

  if (!start) return null;

  let target, heading, accentColor;

  if (now < start) {
    target = start;
    heading = startLabel;
    accentColor = "#3a7bd5";
  } else if (end && now < end) {
    target = end;
    heading = endLabel;
    accentColor = "#e67e22";
  } else {
    return null;
  }

  const totalMinutes = Math.max(0, Math.floor((target - now) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (compact) {
    return (
      <View
        style={[styles.compactContainer, { borderColor: accentColor + "55" }]}
      >
        <Text style={[styles.compactHeading, { color: accentColor }]}>
          {heading}
        </Text>
        <Text style={[styles.compactTime, { color: accentColor }]}>
          {days > 0 ? `${days}d ` : ""}
          {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: accentColor + "44" }]}>
      <Text style={[styles.heading, { color: accentColor }]}>{heading}</Text>
      <View style={styles.row}>
        <TimeUnit value={days} label="days" />
        <Text style={[styles.sep, { color: accentColor }]}>:</Text>
        <TimeUnit value={hours} label="hrs" />
        <Text style={[styles.sep, { color: accentColor }]}>:</Text>
        <TimeUnit value={minutes} label="min" />
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "#f8f9ff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 14,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unit: {
    alignItems: "center",
    minWidth: 56,
  },
  value: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111",
    lineHeight: 38,
  },
  unitLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Compact variant
  compactContainer: {
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#f8f9ff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  compactHeading: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compactTime: {
    fontSize: 13,
    fontWeight: "700",
  },
  sep: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 38,
    marginBottom: 16,
  },
});

export default CountdownTimer;
