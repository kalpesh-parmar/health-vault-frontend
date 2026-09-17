import React from "react";
import { render } from "@testing-library/react-native";
import { AddMedicineCard } from "../../../components/chat/widgets/AddMedicineCard";

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock react-native-modal-datetime-picker
jest.mock("react-native-modal-datetime-picker", () => {
  return function MockDateTimePickerModal() {
    return null;
  };
});

describe("AddMedicineCard - Infinite Render Loop Regression Test", () => {
  const dummyTheme = {
    colors: {
      primary: "#2563eb",
      textPrimary: "#0f172a",
      textSecondary: "#64748b",
      background: "#ffffff",
      card: "#f8fafc",
      border: "#e2e8f0",
    },
  };

  it("mounts without throwing Maximum update depth exceeded error", async () => {
    const setCurrentClientMedId = jest.fn();

    const result = await render(
      <AddMedicineCard
        med={{}}
        initialMedicines={[]}
        currentClientMedId={null}
        setCurrentClientMedId={setCurrentClientMedId}
        onSave={jest.fn()}
        onAddAndContinue={jest.fn()}
        onDraftSync={jest.fn()}
        onSaveMedicines={jest.fn()}
        onExitToOptions={jest.fn()}
        isDark={false}
        theme={dummyTheme}
      />
    );

    expect(result).toBeDefined();
    // Verify child does NOT invoke parent state setters during mount/render phase
    expect(setCurrentClientMedId).not.toHaveBeenCalled();
  });

  it("survives 50 consecutive parent re-renders with fresh prop references without infinite looping", async () => {
    const setCurrentClientMedId = jest.fn();

    const { rerender } = await render(
      <AddMedicineCard
        med={{}}
        initialMedicines={[]}
        currentClientMedId={null}
        setCurrentClientMedId={setCurrentClientMedId}
        onSave={jest.fn()}
        onAddAndContinue={jest.fn()}
        onDraftSync={jest.fn()}
        onSaveMedicines={jest.fn()}
        onExitToOptions={jest.fn()}
        isDark={false}
        theme={dummyTheme}
      />
    );

    // Simulate parent re-rendering 50 times with new object/array references
    for (let i = 0; i < 50; i++) {
      await rerender(
        <AddMedicineCard
          med={{}}
          initialMedicines={[]}
          currentClientMedId={null}
          setCurrentClientMedId={setCurrentClientMedId}
          onSave={() => {}}
          onAddAndContinue={() => {}}
          onDraftSync={() => {}}
          onSaveMedicines={() => {}}
          onExitToOptions={() => {}}
          isDark={false}
          theme={{ ...dummyTheme }}
        />
      );
    }

    // Still should never have called setCurrentClientMedId from an effect
    expect(setCurrentClientMedId).not.toHaveBeenCalled();
  });

  it("mounts with pre-existing drafts without triggering infinite loop", async () => {
    const initialDrafts = [
      {
        client_med_id: "client_med_1",
        id: "client_med_1",
        name: "Paracetamol",
        dose: { count: 1 },
        frequency: "Once Daily",
      },
      {
        client_med_id: "client_med_2",
        id: "client_med_2",
        name: "Amoxicillin",
        dose: { count: 2 },
        frequency: "Twice Daily",
      },
    ];

    const setCurrentClientMedId = jest.fn();

    const { rerender } = await render(
      <AddMedicineCard
        med={{}}
        initialMedicines={initialDrafts}
        currentClientMedId={null}
        setCurrentClientMedId={setCurrentClientMedId}
        onSave={jest.fn()}
        onAddAndContinue={jest.fn()}
        onDraftSync={jest.fn()}
        onSaveMedicines={jest.fn()}
        onExitToOptions={jest.fn()}
        isDark={false}
        theme={dummyTheme}
      />
    );

    // Re-render multiple times
    for (let i = 0; i < 20; i++) {
      await rerender(
        <AddMedicineCard
          med={{}}
          initialMedicines={[...initialDrafts]}
          currentClientMedId={null}
          setCurrentClientMedId={setCurrentClientMedId}
          onSave={() => {}}
          onAddAndContinue={() => {}}
          onDraftSync={() => {}}
          onSaveMedicines={() => {}}
          onExitToOptions={() => {}}
          isDark={false}
          theme={dummyTheme}
        />
      );
    }

    expect(setCurrentClientMedId).not.toHaveBeenCalled();
  });
});
