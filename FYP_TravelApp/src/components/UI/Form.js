import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Icons from "./Icon";
import Button, { ButtonTray } from "./Button";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// Form is the main wrapper. Pass your fields as children and give it
// onSubmit/onCancel handlers. submitLabel defaults to "Submit" if you
// don't pass one in.
const Form = ({ children, onSubmit, onCancel, submitLabel = "Submit" }) => {
  return (
    <View style={styles.formContainer}>
      {/*
        KeyboardAwareScrollView handles the keyboard pushing content up.
        extraScrollHeight gives a bit of breathing room above the keyboard
        so the focused field isn't right at the edge.
        keyboardShouldPersistTaps="handled" means taps on buttons still
        work while the keyboard is open — without this, the first tap just
        dismisses the keyboard and does nothing.
      */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.formItems}
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        {children}

        <ButtonTray>
          <Button
            label={submitLabel}
            icon={<Icons.Submit size={16} color="#fff" />}
            onPress={onSubmit}
            variant="primary"
          />
          {onCancel && (
            <Button
              label="Cancel"
              icon={<Icons.Close size={16} color="#555" />}
              onPress={onCancel}
              variant="ghost"
            />
          )}
        </ButtonTray>
      </KeyboardAwareScrollView>
    </View>
  );
};

// A standard text input with a label above it.
// secureTextEntry hides the text — use this for passwords.
const InputText = ({ label, value, onChange, placeholder = "", secureTextEntry = false }) => {
  return (
    <View style={styles.item}>
      {/* Skip rendering the label element entirely if no label was passed */}
      {label ? <Text style={styles.itemLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={styles.itemTextInput}
        placeholderTextColor="#aaa"
      />
    </View>
  );
};

// A dropdown picker. options should be an array of { label, value } objects.
// The prompt is the greyed-out "select something" text shown before a choice is made.
const InputSelect = ({ label, prompt = "Select an option…", options = [], value, onChange }) => {
  return (
    <View style={styles.item}>
      {label ? <Text style={styles.itemLabel}>{label}</Text> : null}
      {/*
        The wrapper View is here because the Picker on Android ignores
        borderRadius on its own — wrapping it and setting overflow: "hidden"
        fixes that.
      */}
      <View style={styles.pickerWrapper}>
        <Picker
          mode="dropdown"
          selectedValue={value}
          onValueChange={onChange}
          style={styles.itemPickerStyle}
        >
          {/* null value means nothing is actually selected yet */}
          <Picker.Item
            value={null}
            label={prompt}
            style={styles.itemPickerPromptStyle}
          />
          {options.map((option, index) => (
            <Picker.Item key={index} value={option.value} label={option.label} />
          ))}
        </Picker>
      </View>
    </View>
  );
};

// Date + time picker. On Android you can't show date and time in one picker,
// so we do it in two steps — date first, then automatically open the time
// picker once the date is confirmed.
// value should be an ISO string (or null). onChange receives an ISO string back.
const DatePicker = ({ label, value, onChange }) => {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState("date"); // toggles between "date" and "time"

  // Fall back to today's date if nothing is selected yet
  const dateValue = value ? new Date(value) : new Date();

  // Format the display string. If value is empty/invalid, show the placeholder text.
  let formattedValue = "Select Date & Time";
  if (value && !isNaN(dateValue.getTime())) {
    const pad = (n) => (n < 10 ? "0" + n : n);
    formattedValue = `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(
      dateValue.getDate()
    )} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
  }

  const handleChange = (event, selectedDate) => {
    const current = selectedDate || dateValue;
    setShow(false);

    if (event.type === "set" || selectedDate) {
      // Always fire onChange so the parent has the latest value
      onChange(current.toISOString());

      if (mode === "date") {
        // Date was just picked — now open the time picker.
        // The 50ms delay is needed on Android; without it the second picker
        // doesn't always open reliably.
        setTimeout(() => {
          setMode("time");
          setShow(true);
        }, 50);
      } else {
        // Time was picked — we're done, reset back to "date" for next time
        setMode("date");
      }
    } else {
      // User cancelled (pressed back / dismissed) — reset mode
      setMode("date");
    }
  };

  return (
    <View style={styles.item}>
      {label ? <Text style={styles.itemLabel}>{label}</Text> : null}
      {/* Tapping this button opens the native date picker */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          setMode("date");
          setShow(true);
        }}
        activeOpacity={0.75}
      >
        <Icons.Calendar size={16} color="#555" />
        <Text style={styles.dateButtonText}>{formattedValue}</Text>
      </TouchableOpacity>

      {/* The native picker only mounts when show is true */}
      {show && (
        <DateTimePicker
          value={dateValue}
          mode={mode}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
};

// Attach sub-components to Form so you can use them as Form.InputText etc.
Form.InputText = InputText;
Form.InputSelect = InputSelect;
Form.DatePicker = DatePicker;

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },

  formItems: {
    gap: 5,
    paddingBottom: 20,
  },

  item: {
    marginBottom: 12,
  },

  itemLabel: {
    color: "grey",
    fontSize: 14,
    marginBottom: 5,
  },

  itemTextInput: {
    height: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#111",
  },

  pickerWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  itemPickerStyle: {
    height: 50,
  },
  itemPickerPromptStyle: {
    color: "gray",
  },

  dateButton: {
    height: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButtonText: {
    fontSize: 15,
    color: "#333",
  },

});

export default Form;
