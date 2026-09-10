import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  ChatDocumentPickerModal,
  MedicalDocumentItem,
} from "../src/components/chat/modals/ChatDocumentPickerModal";

describe("ChatDocumentPickerModal Component", () => {
  const mockDocuments: MedicalDocumentItem[] = [
    {
      id: "doc-1",
      fileName: "Blood_Test_Report.pdf",
      documentType: "Lab Report",
    },
    {
      id: "doc-2",
      fileName: "Cardiology_Summary.pdf",
      documentType: "Prescription",
    },
  ];

  it("renders document list and selects general chat when general option pressed", async () => {
    const onSelectMock = jest.fn();
    const onCloseMock = jest.fn();

    await render(
      <ChatDocumentPickerModal
        visible={true}
        documents={mockDocuments}
        selectedDocumentId={null}
        onSelectDocument={onSelectMock}
        onClose={onCloseMock}
        preferredLang="english"
      />
    );

    expect(screen.getByText("Select Mode or Report")).toBeTruthy();
    expect(screen.getByText("General Health Chat (No Document)")).toBeTruthy();
    expect(screen.getByText("Blood_Test_Report.pdf")).toBeTruthy();
    expect(screen.getByText("Cardiology_Summary.pdf")).toBeTruthy();

    fireEvent.press(screen.getByText("General Health Chat (No Document)"));
    expect(onSelectMock).toHaveBeenCalledWith(null);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("selects a specific document when tapped", async () => {
    const onSelectMock = jest.fn();
    const onCloseMock = jest.fn();

    await render(
      <ChatDocumentPickerModal
        visible={true}
        documents={mockDocuments}
        selectedDocumentId="doc-1"
        onSelectDocument={onSelectMock}
        onClose={onCloseMock}
        preferredLang="english"
      />
    );

    fireEvent.press(screen.getByText("Cardiology_Summary.pdf"));
    expect(onSelectMock).toHaveBeenCalledWith(mockDocuments[1]);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("shows empty state and calls onUploadNew when reports list is empty", async () => {
    const onUploadMock = jest.fn();
    const onCloseMock = jest.fn();

    await render(
      <ChatDocumentPickerModal
        visible={true}
        documents={[]}
        selectedDocumentId={null}
        onSelectDocument={jest.fn()}
        onClose={onCloseMock}
        onUploadNew={onUploadMock}
        preferredLang="english"
      />
    );

    expect(
      screen.getByText("You haven't uploaded any medical reports yet.")
    ).toBeTruthy();

    const uploadBtn = screen.getByText("Upload Medical Report");
    fireEvent.press(uploadBtn);
    expect(onUploadMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });
});
