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

  describe("R1 & R2 Acceptance Criteria: Draft Persistence & Cancel Reset", () => {
    it("R1: Persists previous medicines when adding another and opens on blank form with drafts intact", async () => {
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

      const onSaveMedicines = jest.fn();
      const onDraftSync = jest.fn();

      const { rerender, getByText, queryByDisplayValue } = await render(
        <AddMedicineCard
          med={{}}
          initialMedicines={initialDrafts}
          currentClientMedId={null}
          setCurrentClientMedId={jest.fn()}
          onSave={jest.fn()}
          onAddAndContinue={jest.fn()}
          onDraftSync={onDraftSync}
          onSaveMedicines={onSaveMedicines}
          onExitToOptions={jest.fn()}
          isDark={false}
          theme={dummyTheme}
        />
      );

      // Medicine header should reflect Medicine #3 (since 2 drafts exist)
      expect(getByText("Medicine #3")).toBeDefined();

      // Form should be blank for the 3rd medicine
      expect(queryByDisplayValue("Paracetamol")).toBeNull();
      expect(queryByDisplayValue("Amoxicillin")).toBeNull();

      // Parent updates initialMedicines with an appended 3rd medicine
      const threeDrafts = [
        ...initialDrafts,
        {
          client_med_id: "client_med_3",
          id: "client_med_3",
          name: "Ibuprofen",
          dose: { count: 1 },
          frequency: "Once Daily",
        },
      ];

      await rerender(
        <AddMedicineCard
          med={{}}
          initialMedicines={threeDrafts}
          currentClientMedId={null}
          setCurrentClientMedId={jest.fn()}
          onSave={jest.fn()}
          onAddAndContinue={jest.fn()}
          onDraftSync={onDraftSync}
          onSaveMedicines={onSaveMedicines}
          onExitToOptions={jest.fn()}
          isDark={false}
          theme={dummyTheme}
        />
      );

      // Now points to blank Medicine #4, with all 3 previous medicines preserved
      expect(getByText("Medicine #4")).toBeDefined();
    });

    it("R2: Reset draft data ONLY on Cancel when initialMedicines becomes empty", async () => {
      const initialDrafts = [
        {
          client_med_id: "client_med_1",
          id: "client_med_1",
          name: "Paracetamol",
        },
      ];

      const { rerender, getByText } = await render(
        <AddMedicineCard
          med={{}}
          initialMedicines={initialDrafts}
          currentClientMedId={null}
          setCurrentClientMedId={jest.fn()}
          onSave={jest.fn()}
          onAddAndContinue={jest.fn()}
          onDraftSync={jest.fn()}
          onSaveMedicines={jest.fn()}
          onExitToOptions={jest.fn()}
          isDark={false}
          theme={dummyTheme}
        />
      );

      expect(getByText("Medicine #2")).toBeDefined();

      // Simulated Cancel: parent resets initialMedicines to []
      await rerender(
        <AddMedicineCard
          med={{}}
          initialMedicines={[]}
          currentClientMedId={null}
          setCurrentClientMedId={jest.fn()}
          onSave={jest.fn()}
          onAddAndContinue={jest.fn()}
          onDraftSync={jest.fn()}
          onSaveMedicines={jest.fn()}
          onExitToOptions={jest.fn()}
          isDark={false}
          theme={dummyTheme}
        />
      );

      // Now reset to Medicine #1
      expect(getByText("Medicine #1")).toBeDefined();
    });
  });
});
