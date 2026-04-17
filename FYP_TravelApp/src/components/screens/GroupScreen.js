import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import API from "../API/API";
import SafetyStatusAPI from "../API/SafetyStatusAPI";
import Button from "../UI/Button";
import ScreenHeader from "../UI/common/ScreenHeader";
import SectionHeader from "../UI/common/SectionHeader";
import LoadingSpinner from "../UI/common/LoadingSpinner";
import StatusBanner from "../UI/common/StatusBanner";
import PollList from "../entity/Poll/PollList";
import { PollPopup } from "../entity/Poll/PollView";
import ExpenseList from "../entity/Expense/ExpenseList";
import { ExpensePopup } from "../entity/Expense/ExpenseView";
import { SosButton, SosAlertBanner } from "../entity/SOS/SosView";
import DocumentDrawer from "../entity/Document/DocumentDrawer";
import { endOfUTCDay } from "../../utils/DateUtils";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GroupScreen
 *
 * Responsibilities:
 *   - Show the user's trips (host or accepted member) as selectable chips.
 *   - Fetch and display polls for the selected trip.
 *   - Let the user open a poll detail popup to view results / vote.
 *   - Navigate to AddPollScreen for poll creation.
 *
 * Poll creation logic lives entirely in AddPollScreen + PollForm.
 */
const GroupScreen = ({ navigation }) => {
  const userId = global.UserID ?? null;

  // ── My trips (host OR accepted participant) ──────────────────────────────
  const [myTrips, setMyTrips] = useState([]); // [{ trip, memberCount }]
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // ── Polls for the selected trip ──────────────────────────────────────────
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);

  // ── Poll detail popup ────────────────────────────────────────────────────
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showPollPopup, setShowPollPopup] = useState(false);

  // ── Per-session vote tracking (which poll IDs the user has voted in) ────
  const votedPollIdsRef = useRef(new Set());
  const [votedPollIds, setVotedPollIds] = useState(new Set());

  // ── Expenses for the selected trip ──────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // ── Expense popup ────────────────────────────────────────────────────────
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpensePopup, setShowExpensePopup] = useState(false);

  // ── Trip members (for expense form) ─────────────────────────────────────
  const [tripMembers, setTripMembers] = useState([]);

  // ── SOS / Safety Status ──────────────────────────────────────────────────
  // safetyStatuses – all safety_status rows for the selected trip
  // mySosRecord    – the current user's own row (or null)
  const [safetyStatuses, setSafetyStatuses] = useState([]);
  const [mySosRecord, setMySosRecord] = useState(null);

  // ── Documents ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ─── Derived: currently selected trip entry ───────────────────────────────
  const selectedEntry = myTrips[selectedTripIndex] ?? null;
  const selectedTrip = selectedEntry?.trip ?? null;
  const memberCount = selectedEntry?.memberCount ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  // fetchMyTrips
  //   Loads every trip where the current user is the host OR an accepted
  //   participant, along with each trip's accepted-member count.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMyTrips = useCallback(async () => {
    if (!userId) return;
    setLoadingTrips(true);

    const [tripsRes, participationsRes] = await Promise.all([
      API.get(`/rest/v1/trips?select=*`),
      API.get(
        `/rest/v1/participants?user_id=eq.${userId}&status=eq.accepted&select=trip_id`
      ),
    ]);

    if (!tripsRes.isSuccess) {
      setLoadingTrips(false);
      return;
    }

    const allTrips = Array.isArray(tripsRes.result)
      ? tripsRes.result
      : tripsRes.result
      ? [tripsRes.result]
      : [];

    const myJoinedTripIds = new Set(
      participationsRes.isSuccess && Array.isArray(participationsRes.result)
        ? participationsRes.result.map((p) => p.trip_id)
        : []
    );

    // Keep trips where I'm host OR accepted participant AND trip has not yet ended
    const now = new Date();
    const isEnded = (t) => {
      if (!t.end_date) return false;
      const end = t.end_date.includes('T')
        ? new Date(t.end_date)
        : endOfUTCDay(t.end_date);
      return !!end && end < now;
    };
    const eligible = allTrips.filter(
      (t) => (t.host_id === userId || myJoinedTripIds.has(t.id)) && !isEnded(t),
    );

    // Fetch accepted-participant counts for each eligible trip
    const withCounts = await Promise.all(
      eligible.map(async (trip) => {
        const countRes = await API.get(
          `/rest/v1/participants?trip_id=eq.${trip.id}&status=eq.accepted&select=user_id`
        );
        const rows =
          countRes.isSuccess && Array.isArray(countRes.result)
            ? countRes.result
            : [];
        // +1 to include the host (who is not in the participants table)
        return { trip, memberCount: rows.length + 1 };
      })
    );

    setMyTrips(withCounts);
    setSelectedTripIndex((prev) => (prev >= withCounts.length ? 0 : prev));
    setLoadingTrips(false);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchPolls
  //   Loads all polls for a given tripId from the `trip_polls` table, then
  //   fetches each poll's options from `poll_options`.
  //
  //   NOTE: The `trip_polls` table only has columns:
  //     id, trip_id, question, created_by
  //   There is NO `created_at` column, so we do NOT order by it.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPolls = useCallback(async (tripId) => {
    if (!tripId) {
      setPolls([]);
      return;
    }
    setLoadingPolls(true);

    // ✅ No order clause — trip_polls has no created_at column
    const pollsRes = await API.get(
      `/rest/v1/trip_polls?trip_id=eq.${tripId}&select=*`
    );

    if (!pollsRes.isSuccess) {
      console.warn("fetchPolls error:", pollsRes.message);
      setPolls([]);
      setLoadingPolls(false);
      return;
    }

    const pollRows = Array.isArray(pollsRes.result)
      ? pollsRes.result
      : pollsRes.result
      ? [pollsRes.result]
      : [];

    if (pollRows.length === 0) {
      setPolls([]);
      setLoadingPolls(false);
      return;
    }

    // Fetch options for every poll in parallel
    const pollsWithOptions = await Promise.all(
      pollRows.map(async (poll) => {
        const optsRes = await API.get(
          `/rest/v1/poll_options?poll_id=eq.${poll.id}&select=*`
        );
        const opts =
          optsRes.isSuccess && Array.isArray(optsRes.result)
            ? optsRes.result
            : [];
        return { ...poll, options: opts };
      })
    );

    setPolls(pollsWithOptions);
    setLoadingPolls(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchTripMembers
  //   Loads full profile objects for every accepted participant + host.
  //   Passes [{ id (=user_id), first_name, last_name, username, profile_image_url, ... }]
  //   to AddExpenseScreen so ProfileCard can render each member properly.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchTripMembers = useCallback(async (trip) => {
    if (!trip) {
      setTripMembers([]);
      return;
    }

    // Fetch accepted participants
    const partRes = await API.get(
      `/rest/v1/participants?trip_id=eq.${trip.id}&status=eq.accepted&select=user_id`
    );
    const participantIds =
      partRes.isSuccess && Array.isArray(partRes.result)
        ? partRes.result.map((p) => p.user_id)
        : [];

    // Include the host
    const allIds = [...new Set([trip.host_id, ...participantIds])];

    // Fetch FULL profiles for each member
    const profiles = await Promise.all(
      allIds.map(async (uid) => {
        const pRes = await API.get(
          `/rest/v1/users?id=eq.${uid}&select=*`
        );
        if (pRes.isSuccess && pRes.result) {
          const row = Array.isArray(pRes.result) ? pRes.result[0] : pRes.result;
          // Attach `id` so ExpenseForm can use member.id as the UUID key
          return row ? { ...row, id: uid } : { id: uid };
        }
        return { id: uid };
      })
    );

    setTripMembers(profiles.filter(Boolean));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchDocuments
  //   Loads all user_documents rows for the current user, ordered newest first.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    if (!userId) return;
    setLoadingDocuments(true);
    const res = await API.get(
      `/rest/v1/user_documents?user_id=eq.${userId}&order=uploaded_at.desc`
    );
    if (res.isSuccess) {
      const rows = Array.isArray(res.result)
        ? res.result
        : res.result
        ? [res.result]
        : [];
      setDocuments(rows);
    } else {
      console.warn("fetchDocuments error:", res.message);
    }
    setLoadingDocuments(false);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────
  // handleUploadDocument
  //   Opens the device document picker, uploads the chosen file to Supabase
  //   Storage (bucket: user-documents), then inserts a metadata row into
  //   user_documents.
  // ─────────────────────────────────────────────────────────────────────────
  const handleUploadDocument = async () => {
    // 1. Pick a file
    let pickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch {
      Alert.alert("Error", "Could not open document picker.");
      return;
    }

    // Cancelled
    if (pickerResult.canceled || !pickerResult.assets?.length) return;

    const asset = pickerResult.assets[0];
    const fileName = asset.name;
    const mimeType = asset.mimeType ?? "application/octet-stream";
    const storagePath = `${userId}/${Date.now()}_${fileName}`;

    setUploading(true);

    // 2. Read file as blob and upload to Supabase Storage
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/user-documents/${storagePath}`;

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": mimeType,
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.warn("Storage upload failed:", errText);
        Alert.alert("Upload Failed", "Could not upload the file to storage.");
        setUploading(false);
        return;
      }
    } catch (err) {
      Alert.alert("Upload Error", err.message || "Failed to upload file.");
      setUploading(false);
      return;
    }

    // 3. Insert metadata row into user_documents
    const insertRes = await API.post(`/rest/v1/user_documents`, {
      user_id: userId,
      doc_name: fileName,
      file_path: `user-documents/${storagePath}`,
    });

    setUploading(false);

    if (!insertRes.isSuccess) {
      Alert.alert("Error", insertRes.message || "Failed to save document record.");
      return;
    }

    // 4. Refresh the documents list
    fetchDocuments();
    Alert.alert("Success", `"${fileName}" has been uploaded successfully.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // fetchSafetyStatuses
  //   Loads all safety_status rows for the trip, then resolves the current
  //   user's own row so SosButton can display the correct state.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSafetyStatuses = useCallback(async (tripId) => {
    if (!tripId) {
      setSafetyStatuses([]);
      setMySosRecord(null);
      return;
    }

    const res = await SafetyStatusAPI.getByTrip(tripId);
    if (!res.isSuccess) {
      setSafetyStatuses([]);
      setMySosRecord(null);
      return;
    }

    const rows = Array.isArray(res.result)
      ? res.result
      : res.result
      ? [res.result]
      : [];

    setSafetyStatuses(rows);
    setMySosRecord(rows.find((r) => r.user_id === userId) ?? null);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchExpenses
  //   Loads all expense rows for a trip, then enriches each row with full
  //   payerProfile and debtorProfile objects (for ProfileCard display in
  //   ExpenseView and ExpenseItem).
  // ─────────────────────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async (tripId) => {
    if (!tripId) {
      setExpenses([]);
      return;
    }
    setLoadingExpenses(true);

    const expRes = await API.get(
      `/rest/v1/expenses?trip_id=eq.${tripId}&select=*&order=created_at.desc`
    );

    if (!expRes.isSuccess) {
      console.warn("fetchExpenses error:", expRes.message);
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    const rows = Array.isArray(expRes.result)
      ? expRes.result
      : expRes.result
      ? [expRes.result]
      : [];

    if (rows.length === 0) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    // Collect unique user IDs and fetch their FULL profiles
    const userIds = [...new Set(rows.flatMap((r) => [r.payer_id, r.debtor_id].filter(Boolean)))];
    const profileMap = {};
    await Promise.all(
      userIds.map(async (uid) => {
        const pRes = await API.get(
          `/rest/v1/users?id=eq.${uid}&select=*`
        );
        if (pRes.isSuccess && pRes.result) {
          const row = Array.isArray(pRes.result) ? pRes.result[0] : pRes.result;
          if (row) profileMap[uid] = { ...row, id: uid };
        }
      })
    );

    // Derive flat display names for ExpenseItem (preview cards)
    const displayName = (uid) => {
      const p = profileMap[uid];
      if (!p) return null;
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      return full || p.username || null;
    };

    const enriched = rows.map((r) => ({
      ...r,
      payerProfile: profileMap[r.payer_id] ?? null,
      debtorProfile: profileMap[r.debtor_id] ?? null,
      // Flat names kept for ExpenseItem preview cards
      payerName: displayName(r.payer_id),
      debtorName: displayName(r.debtor_id),
    }));

    setExpenses(enriched);
    setLoadingExpenses(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  //
  // useFocusEffect → re-fetch trips every time the screen gains focus.
  //   This covers returning from AddPollScreen, navigating back from other
  //   tabs, etc.
  //
  // useEffect([myTrips, selectedTripIndex]) → re-fetch polls whenever the
  //   trip list or the selected index changes.
  //   Using `useEffect` (NOT `useFocusEffect`) here is intentional:
  //   `useFocusEffect` does not re-run when its callback dependencies change
  //   while the screen is already focused, so poll fetching would never
  //   trigger after the async trip-fetch completes.
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      fetchMyTrips();
      fetchDocuments();
    }, [fetchMyTrips, fetchDocuments])
  );

  useEffect(() => {
    const entry = myTrips[selectedTripIndex] ?? null;
    const tripId = entry?.trip?.id ?? null;
    fetchPolls(tripId);
    fetchExpenses(tripId);
    fetchTripMembers(entry?.trip ?? null);
    fetchSafetyStatuses(tripId);
  }, [myTrips, selectedTripIndex, fetchPolls, fetchExpenses, fetchTripMembers, fetchSafetyStatuses]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectTrip = (index) => {
    if (index === selectedTripIndex) return;
    setPolls([]); // clear immediately so the old list doesn't flash
    setSelectedTripIndex(index);
  };

  const handleSelectPoll = (poll) => {
    setSelectedPoll(poll);
    setShowPollPopup(true);
  };

  const handleVoteCast = (pollId, _optionId, updatedOptions) => {
    votedPollIdsRef.current.add(pollId);
    setVotedPollIds(new Set(votedPollIdsRef.current));

    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, options: updatedOptions } : p))
    );
    setSelectedPoll((prev) =>
      prev?.id === pollId ? { ...prev, options: updatedOptions } : prev
    );
  };

  const handlePollDeleted = (deletedPoll) => {
    setPolls((prev) => prev.filter((p) => p.id !== deletedPoll.id));
    setShowPollPopup(false);
    setSelectedPoll(null);
  };

  const canDeletePoll =
    selectedPoll?.created_by === userId || selectedTrip?.host_id === userId;

  // ── Expense handlers ───────────────────────────────────────────────────────

  const handleSelectExpense = (expense) => {
    setSelectedExpense(expense);
    setShowExpensePopup(true);
  };

  const handleExpenseStatusChange = (id, newStatus) => {
    const update = (list) =>
      list.map((e) =>
        e.id === id ? { ...e, settlement_status: newStatus } : e
      );
    setExpenses(update);
    setSelectedExpense((prev) =>
      prev?.id === id ? { ...prev, settlement_status: newStatus } : prev
    );
  };

  const handleExpenseSettled = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setShowExpensePopup(false);
    setSelectedExpense(null);
  };

  const handleExpenseDeleted = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setShowExpensePopup(false);
    setSelectedExpense(null);
  };

  const isHost = selectedTrip?.host_id === userId;

  // ── Document handlers ─────────────────────────────────────────────────────

  const handleSelectDocument = (doc) => {
    setShowDocumentDrawer(false);
    navigation.navigate("DocumentView", { document: doc });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Please log in to view your group.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* ── Page header ── */}
        <ScreenHeader
          title="Group"
          rightElement={
            <Pressable
              onPress={() => setShowDocumentDrawer(true)}
              style={({ pressed }) => [
                styles.hamburgerBtn,
                pressed && styles.hamburgerBtnPressed,
              ]}
              accessibilityLabel="Open documents"
              hitSlop={8}
            >
              <View style={styles.hamburgerLine} />
              <View style={[styles.hamburgerLine, styles.hamburgerLineMid]} />
              <View style={styles.hamburgerLine} />
            </Pressable>
          }
        />

        {loadingTrips ? (
          <LoadingSpinner size="large" color="#000" />
        ) : myTrips.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              You are not a member of any active trip.{"\n"}
              Join or create a trip first.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Trip selector ── */}
            <View style={styles.selectorSection}>
              <Text style={styles.sectionLabel}>Your Trips</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tripSelector}
              >
                {myTrips.map(({ trip }, idx) => {
                  const isSelected = idx === selectedTripIndex;
                  return (
                    <Pressable
                      key={trip.id}
                      onPress={() => handleSelectTrip(idx)}
                      style={({ pressed }) => [
                        styles.tripChip,
                        isSelected && styles.tripChipSelected,
                        pressed && styles.tripChipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tripChipText,
                          isSelected && styles.tripChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {trip.title || "—"}
                      </Text>
                      {trip.host_id === userId && (
                        <View style={styles.hostDot} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedTrip && (
                <Text style={styles.tripMeta}>
                  {selectedTrip.destination
                    ? `📍 ${selectedTrip.destination} · `
                    : ""}
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                  {selectedTrip.host_id === userId ? " · You are the host" : ""}
                </Text>
              )}
            </View>

            {/* ── SOS / Safety section ── */}
            {selectedTrip && (
              <View style={styles.sosSection}>
                {/* Section header */}
                <View style={styles.pollsHeader}>
                  <Text style={styles.sectionLabel}>Safety</Text>
                </View>

                {/* Alert banners for other members who have active SOS */}
                {safetyStatuses
                  .filter((s) => s.is_sos_active && s.user_id !== userId)
                  .map((s) => {
                    // Resolve display name from tripMembers
                    const member = tripMembers.find((m) => m.id === s.user_id);
                    const name = member
                      ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() ||
                        member.username
                      : 'Group member';
                    return (
                      <SosAlertBanner
                        key={s.id}
                        userName={name}
                        lat={s.last_lat}
                        long={s.last_long}
                        updatedAt={s.updated_at}
                      />
                    );
                  })}

                {/* If the current user has an active SOS, show their own banner too */}
                {mySosRecord?.is_sos_active && (
                  <View style={styles.myActiveSosBanner}>
                    <Text style={styles.myActiveSosText}>
                      🆘 Your SOS is active — tap the button below to deactivate.
                    </Text>
                  </View>
                )}

                {/* The user's own SOS button */}
                <View style={styles.sosButtonWrapper}>
                  <SosButton
                    userId={userId}
                    tripId={selectedTrip.id}
                    statusRecord={mySosRecord}
                    onStatusChange={(updated) => {
                      setMySosRecord(updated);
                      // Refresh all statuses so banners update for the current user
                      fetchSafetyStatuses(selectedTrip.id);
                    }}
                  />
                </View>
              </View>
            )}

            {/* ── Polls section ── */}
            {selectedTrip && (
              <View style={styles.pollsSection}>
                {/* Header row: label + add button */}
                <View style={styles.pollsHeader}>
                  <Text style={styles.sectionLabel}>Polls</Text>
                  <Button
                    label="＋ New Poll"
                    variant="secondary"
                    onClick={() =>
                      navigation.navigate("AddPoll", {
                        tripId: selectedTrip.id,
                      })
                    }
                    styleButton={styles.newPollBtn}
                    styleLabel={styles.newPollBtnLabel}
                  />
                </View>

                {/* Poll list or loading indicator */}
                {loadingPolls ? (
                  <ActivityIndicator
                    size="small"
                    color="#000"
                    style={{ marginTop: 16 }}
                  />
                ) : (
                  <PollList
                    polls={polls}
                    memberCount={memberCount}
                    onSelect={handleSelectPoll}
                  />
                )}
              </View>
            )}

            {/* ── Expenses section ── */}
            {selectedTrip && (
              <View style={styles.expensesSection}>
                {/* Header row: label + add button */}
                <View style={styles.pollsHeader}>
                  <Text style={styles.sectionLabel}>Expenses</Text>
                  <Button
                    label="＋ New Expense"
                    variant="secondary"
                    onClick={() =>
                      navigation.navigate("AddExpense", {
                        tripId: selectedTrip.id,
                        tripMembers,
                      })
                    }
                    styleButton={styles.newPollBtn}
                    styleLabel={styles.newPollBtnLabel}
                  />
                </View>

                {/* Expense list or loading indicator */}
                {loadingExpenses ? (
                  <ActivityIndicator
                    size="small"
                    color="#000"
                    style={{ marginTop: 16 }}
                  />
                ) : (
                  <ExpenseList
                    expenses={expenses}
                    currentUserId={userId}
                    onSelect={handleSelectExpense}
                  />
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Poll detail popup (view + vote) ── */}
      <PollPopup
        visible={showPollPopup}
        onClose={() => {
          setShowPollPopup(false);
          setSelectedPoll(null);
        }}
        poll={selectedPoll}
        memberCount={memberCount}
        votedPollIds={votedPollIds}
        onVoteCast={handleVoteCast}
        canDelete={canDeletePoll}
        onDeleted={handlePollDeleted}
      />

      {/* ── Expense detail popup (view + settle) ── */}
      <ExpensePopup
        visible={showExpensePopup}
        onClose={() => {
          setShowExpensePopup(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        currentUserId={userId}
        isHost={isHost}
        onStatusChange={handleExpenseStatusChange}
        onDeleted={handleExpenseDeleted}
      />

      {/* ── Document drawer ── */}
      <DocumentDrawer
        visible={showDocumentDrawer}
        onClose={() => setShowDocumentDrawer(false)}
        documents={documents}
        loading={loadingDocuments}
        uploading={uploading}
        onUpload={handleUploadDocument}
        onSelect={handleSelectDocument}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 22,
  },

  // Page header
  pageHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
  },

  // Hamburger menu button
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 2,
  },
  hamburgerBtnPressed: {
    backgroundColor: "#ebebeb",
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#333",
  },
  hamburgerLineMid: {
    width: 13,
    alignSelf: "flex-start",
    marginLeft: 11,
  },

  // Scroll container
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Section label (shared)
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
  },

  // Trip selector
  selectorSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 14,
  },
  tripSelector: {
    gap: 8,
    flexDirection: "row",
    paddingVertical: 2,
  },
  tripChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    maxWidth: 180,
  },
  tripChipSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  tripChipPressed: { opacity: 0.75 },
  tripChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    flexShrink: 1,
  },
  tripChipTextSelected: { color: "#fff" },
  hostDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#888",
    flexShrink: 0,
  },
  tripMeta: {
    fontSize: 12,
    color: "#999",
  },

  // Polls section
  pollsSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 16,
  },

  // Expenses section
  expensesSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  pollsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newPollBtn: {
    flex: 0,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  newPollBtnLabel: { fontSize: 13 },

  // SOS section
  sosSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 20,
  },
  sosButtonWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  myActiveSosBanner: {
    backgroundColor: "#8B0000",
    borderRadius: 10,
    padding: 12,
  },
  myActiveSosText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default GroupScreen;
