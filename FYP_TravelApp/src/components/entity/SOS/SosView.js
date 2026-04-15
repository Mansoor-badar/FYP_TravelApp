import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import Button, { ButtonTray } from '../../UI/Button';
import SafetyStatusAPI from '../../API/SafetyStatusAPI';
import useCurrentLocation from '../../../utils/useCurrentLocation';

// ─────────────────────────────────────────────────────────────────────────────
// SosAlertBanner
//
// Displays a red alert card for a SINGLE active SOS entry.
// Intended to be rendered once per active SOS row inside GroupScreen.
//
// Props:
//   userName   – display name of the user in distress
//   lat        – numeric last latitude
//   long       – numeric last longitude
//   updatedAt  – ISO timestamp string of the last update
// ─────────────────────────────────────────────────────────────────────────────

export const SosAlertBanner = ({ userName, lat, long, updatedAt }) => {
  // Pulsing opacity animation to draw attention
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={bannerStyles.card}>
      {/* Left accent bar */}
      <Animated.View style={[bannerStyles.accentBar, { opacity: pulse }]} />

      <View style={bannerStyles.content}>
        {/* Header */}
        <View style={bannerStyles.header}>
          <View style={bannerStyles.sosBadge}>
            <Text style={bannerStyles.sosBadgeText}>SOS</Text>
          </View>
          <Text style={bannerStyles.name} numberOfLines={1}>
            {userName || 'Group member'}
          </Text>
          {formattedTime && (
            <Text style={bannerStyles.time}>{formattedTime}</Text>
          )}
        </View>

        <Text style={bannerStyles.label}>🆘 Emergency alert — last known location</Text>

        {/* Coordinates */}
        {lat != null && long != null ? (
          <View style={bannerStyles.coordRow}>
            <CoordChip label="LAT" value={Number(lat).toFixed(5)} />
            <CoordChip label="LNG" value={Number(long).toFixed(5)} />
          </View>
        ) : (
          <Text style={bannerStyles.noCoord}>Location unavailable</Text>
        )}
      </View>
    </View>
  );
};

// Small label/value chip inside the banner
const CoordChip = ({ label, value }) => (
  <View style={bannerStyles.chip}>
    <Text style={bannerStyles.chipLabel}>{label}</Text>
    <Text style={bannerStyles.chipValue}>{value}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// SosActivateModal
//
// Shown when the user presses SOS while it is NOT active.
// Lets the user set a passkey, then activates SOS with their current location.
//
// Props:
//   visible        – boolean
//   onClose()      – dismiss without activating
//   userId         – current user UUID
//   tripId         – selected trip UUID
//   existingRecord – the safety_status row (or null if it doesn't exist yet)
//   onActivated()  – called after successful activation
// ─────────────────────────────────────────────────────────────────────────────

export const SosActivateModal = ({
  visible,
  onClose,
  userId,
  tripId,
  existingRecord,
  onActivated,
}) => {
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const { location, loading: locLoading, refreshLocation } = useCurrentLocation();

  // Reset fields when the modal re-opens
  useEffect(() => {
    if (visible) {
      setPasskey('');
      setConfirmPasskey('');
      setFieldError('');
    }
  }, [visible]);

  const handleActivate = async () => {
    if (passkey.length < 4) {
      setFieldError('Passkey must be at least 4 characters.');
      return;
    }
    if (passkey !== confirmPasskey) {
      setFieldError('Passkeys do not match.');
      return;
    }
    setFieldError('');
    setSaving(true);

    // Grab the freshest location reading
    let coords = location;
    if (!coords) {
      coords = await refreshLocation();
    }

    const lat = coords?.latitude ?? null;
    const long = coords?.longitude ?? null;

    let res;
    if (existingRecord) {
      // Update the existing row
      res = await SafetyStatusAPI.activateSos(userId, tripId, {
        passkey,
        lat,
        long,
      });
    } else {
      // First-ever SOS for this user+trip → POST a new row
      res = await SafetyStatusAPI.create(userId, tripId, {
        isActive: true,
        passkey,
        lat,
        long,
      });
    }

    setSaving(false);

    if (!res.isSuccess) {
      Alert.alert('Error', res.message || 'Failed to activate SOS.');
      return;
    }

    onActivated?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.sosDot} />
            <Text style={modalStyles.title}>Activate SOS</Text>
          </View>

          <Text style={modalStyles.subtitle}>
            Your location will be shared with your group. Set a passkey to
            deactivate the alert when you're safe.
          </Text>

          {/* Location preview */}
          <View style={modalStyles.locationBox}>
            {locLoading ? (
              <ActivityIndicator size="small" color="#cc0000" />
            ) : location ? (
              <Text style={modalStyles.locationText}>
                📍 {Number(location.latitude).toFixed(5)},{' '}
                {Number(location.longitude).toFixed(5)}
              </Text>
            ) : (
              <Text style={modalStyles.locationMissing}>
                ⚠️ Location unavailable — SOS will still activate.
              </Text>
            )}
          </View>

          {/* Passkey input */}
          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>Passkey</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter a passkey (min 4 chars)"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={passkey}
              onChangeText={setPasskey}
              autoCapitalize="none"
              maxLength={32}
            />
          </View>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>Confirm Passkey</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Re-enter passkey"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={confirmPasskey}
              onChangeText={setConfirmPasskey}
              autoCapitalize="none"
              maxLength={32}
            />
          </View>

          {fieldError ? (
            <Text style={modalStyles.fieldError}>{fieldError}</Text>
          ) : null}

          {/* Actions */}
          <ButtonTray style={modalStyles.tray}>
            <Button
              label="Activate SOS"
              variant="danger"
              onClick={handleActivate}
              loading={saving}
              disabled={saving}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            />
          </ButtonTray>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SosDeactivateModal
//
// Shown when the user presses SOS while it IS active.
// The user must enter their passkey to turn it off.
//
// Props:
//   visible        – boolean
//   onClose()      – dismiss without deactivating
//   userId         – current user UUID
//   tripId         – selected trip UUID
//   existingRecord – the safety_status row (must exist if SOS is active)
//   onDeactivated()– called after successful deactivation
// ─────────────────────────────────────────────────────────────────────────────

export const SosDeactivateModal = ({
  visible,
  onClose,
  userId,
  tripId,
  existingRecord,
  onDeactivated,
}) => {
  const [passkey, setPasskey] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (visible) {
      setPasskey('');
      setFieldError('');
    }
  }, [visible]);

  const handleDeactivate = async () => {
    if (!passkey) {
      setFieldError('Please enter your passkey.');
      return;
    }

    // Validate passkey client-side against the stored value
    if (passkey !== existingRecord?.safety_passkey) {
      setFieldError('Incorrect passkey. SOS remains active.');
      return;
    }

    setFieldError('');
    setSaving(true);

    const res = await SafetyStatusAPI.deactivateSos(userId, tripId);

    setSaving(false);

    if (!res.isSuccess) {
      Alert.alert('Error', res.message || 'Failed to deactivate SOS.');
      return;
    }

    onDeactivated?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={[modalStyles.sosDot, modalStyles.sosDotInactive]} />
            <Text style={modalStyles.title}>Deactivate SOS</Text>
          </View>

          <Text style={modalStyles.subtitle}>
            Enter your passkey to confirm you are safe and deactivate the alert.
          </Text>

          <View style={modalStyles.fieldGroup}>
            <Text style={modalStyles.fieldLabel}>Passkey</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Enter your passkey"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={passkey}
              onChangeText={setPasskey}
              autoCapitalize="none"
              maxLength={32}
            />
          </View>

          {fieldError ? (
            <Text style={modalStyles.fieldError}>{fieldError}</Text>
          ) : null}

          <ButtonTray style={modalStyles.tray}>
            <Button
              label="I'm Safe – Deactivate"
              variant="primary"
              onClick={handleDeactivate}
              loading={saving}
              disabled={saving}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            />
          </ButtonTray>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SosButton
//
// The floating SOS button rendered in the GroupScreen SOS section.
// Opens the appropriate modal depending on current is_sos_active state.
//
// Props:
//   userId         – current user UUID
//   tripId         – selected trip UUID
//   statusRecord   – the safety_status DB row for this user+trip (or null)
//   onStatusChange – called with the updated record after activate/deactivate
// ─────────────────────────────────────────────────────────────────────────────

export const SosButton = ({ userId, tripId, statusRecord, onStatusChange }) => {
  const [showActivate, setShowActivate] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const isActive = statusRecord?.is_sos_active === true;

  // Pulsing scale animation when SOS is active
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isActive) {
      scale.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isActive, scale]);

  const handlePress = () => {
    if (isActive) {
      setShowDeactivate(true);
    } else {
      setShowActivate(true);
    }
  };

  const handleActivated = async () => {
    // Re-fetch the updated row so the parent gets fresh data
    const res = await SafetyStatusAPI.getByUserAndTrip(userId, tripId);
    if (res.isSuccess && res.result) {
      const row = Array.isArray(res.result) ? res.result[0] : res.result;
      onStatusChange?.(row ?? null);
    }
  };

  const handleDeactivated = async () => {
    const res = await SafetyStatusAPI.getByUserAndTrip(userId, tripId);
    if (res.isSuccess && res.result) {
      const row = Array.isArray(res.result) ? res.result[0] : res.result;
      onStatusChange?.(row ?? null);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          btnStyles.wrapper,
          isActive && btnStyles.wrapperActive,
          pressed && btnStyles.wrapperPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isActive ? 'Deactivate SOS' : 'Activate SOS'}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={btnStyles.label}>SOS</Text>
        </Animated.View>
        <Text style={btnStyles.sub}>
          {isActive ? 'Tap to deactivate' : 'Emergency alert'}
        </Text>
      </Pressable>

      <SosActivateModal
        visible={showActivate}
        onClose={() => setShowActivate(false)}
        userId={userId}
        tripId={tripId}
        existingRecord={statusRecord}
        onActivated={handleActivated}
      />

      <SosDeactivateModal
        visible={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        userId={userId}
        tripId={tripId}
        existingRecord={statusRecord}
        onDeactivated={handleDeactivated}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const bannerStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffcccc',
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
    backgroundColor: '#cc0000',
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sosBadge: {
    backgroundColor: '#cc0000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sosBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  label: {
    fontSize: 13,
    color: '#cc0000',
    fontWeight: '600',
  },
  coordRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcccc',
    padding: 8,
    gap: 2,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#cc0000',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  noCoord: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sosDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#cc0000',
  },
  sosDotInactive: {
    backgroundColor: '#111',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  locationBox: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    minHeight: 42,
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  locationMissing: {
    fontSize: 13,
    color: '#e06c00',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  fieldError: {
    fontSize: 13,
    color: '#cc0000',
    fontWeight: '500',
  },
  tray: {
    marginTop: 4,
  },
});

const btnStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#cc0000',
    gap: 4,
    shadowColor: '#cc0000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  wrapperActive: {
    backgroundColor: '#8B0000',
    shadowOpacity: 0.5,
  },
  wrapperPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  sub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
