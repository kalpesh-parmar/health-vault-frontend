import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { StructuredReportListCard } from "../StructuredReportListCard";
import { NormalizedReportItem } from "../../../../utils/reportListNormalizer";

// Mock vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

describe("StructuredReportListCard Component", () => {
  const defaultTheme = {
    colors: {
      primary: "#5B4BFF",
      text: "#1e293b",
      background: "#ffffff",
      surface: "#f8fafc",
      border: "#e2e8f0",
    },
  };

  it("renders empty state cleanly when no documents are in vault", async () => {
    const onViewAllReports = jest.fn();

    const { getByText, queryByText } = await render(
      <StructuredReportListCard
        reports={[]}
        pagination={{
          pageNumber: 1,
          pageLimit: 20,
          totalPages: 1,
          totalRecords: 0,
          hasNextPage: false,
          hasPrevPage: false,
        }}
        isDark={false}
        theme={defaultTheme}
        preferredLang="english"
        onViewAllReports={onViewAllReports}
      />
    );

    expect(getByText("Your Medical Documents")).toBeTruthy();
    expect(getByText("No Documents Found")).toBeTruthy();
    expect(
      getByText(
        "There are currently no medical documents uploaded in your health vault."
      )
    ).toBeTruthy();

    expect(queryByText("Upload Document")).toBeNull();
    const viewAllBtn = getByText("Manage in Health Vault");
    await act(async () => {
      fireEvent.press(viewAllBtn);
    });
    expect(onViewAllReports).toHaveBeenCalledTimes(1);
  });

  it("renders populated report items with filename, document type, date and status", async () => {
    const sampleReports: NormalizedReportItem[] = [
      {
        id: "doc-1",
        fileName: "Reports__22.jpg",
        documentType: "DISCHARGE_SUMMARY",
        fileType: "image/jpeg",
        reportDate: "2019-08-21",
        ocrStatus: "completed",
      },
      {
        id: "doc-2",
        fileName: "Report6.jpeg",
        documentType: "LAB_REPORT",
        fileType: "image/jpeg",
        reportDate: "2019-08-07",
        ocrStatus: "completed",
      },
      {
        id: "doc-3",
        fileName: "1000387638.jpg",
        documentType: "LAB_REPORT",
        fileType: "image/jpeg",
        reportDate: "2026-05-27",
        ocrStatus: "completed",
      },
    ];

    const onViewAllReports = jest.fn();
    const onViewReport = jest.fn();

    const { getByText, queryByText } = await render(
      <StructuredReportListCard
        reports={sampleReports}
        pagination={{
          pageNumber: 1,
          pageLimit: 3,
          totalPages: 1,
          totalRecords: 3,
          hasNextPage: false,
          hasPrevPage: false,
        }}
        isDark={false}
        theme={defaultTheme}
        preferredLang="english"
        onViewAllReports={onViewAllReports}
        onViewReport={onViewReport}
      />
    );

    expect(getByText("Your Medical Documents")).toBeTruthy();
    expect(getByText("3 Documents")).toBeTruthy();
    expect(getByText("Reports__22.jpg")).toBeTruthy();
    expect(getByText("Discharge Summary")).toBeTruthy();
    expect(getByText("Report6.jpeg")).toBeTruthy();
    expect(getByText("1000387638.jpg")).toBeTruthy();

    const firstItem = getByText("Reports__22.jpg");
    await act(async () => {
      fireEvent.press(firstItem);
    });
    expect(onViewReport).toHaveBeenCalledWith(sampleReports[0]);

    // Only one button "Manage in Health Vault"
    expect(queryByText("Upload Document")).toBeNull();
    const viewAllBtn = getByText("Manage in Health Vault");
    await act(async () => {
      fireEvent.press(viewAllBtn);
    });
    expect(onViewAllReports).toHaveBeenCalledTimes(1);
  });

  it("paginates 5 documents per page and allows switching to the next 5 documents", async () => {
    const sampleReports: NormalizedReportItem[] = [
      {
        id: "doc-1",
        fileName: "Doc_1.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-2",
        fileName: "Doc_2.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-3",
        fileName: "Doc_3.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-4",
        fileName: "Doc_4.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-5",
        fileName: "Doc_5.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-6",
        fileName: "Doc_6.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-7",
        fileName: "Doc_7.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
      {
        id: "doc-8",
        fileName: "Doc_8.pdf",
        documentType: "LAB_REPORT",
        fileType: "application/pdf",
        reportDate: "2026-01-01",
        ocrStatus: "completed",
      },
    ];

    const { getByText, queryByText } = await render(
      <StructuredReportListCard
        reports={sampleReports}
        isDark={false}
        theme={defaultTheme}
        preferredLang="english"
        onViewAllReports={jest.fn()}
      />
    );

    // Page 1 shows first 5 items
    expect(getByText("Doc_1.pdf")).toBeTruthy();
    expect(getByText("Doc_5.pdf")).toBeTruthy();
    expect(queryByText("Doc_6.pdf")).toBeNull();
    expect(getByText("1 / 2")).toBeTruthy();

    // Switch to page 2 (next 5 items)
    const nextBtn = getByText("Next");
    await act(async () => {
      fireEvent.press(nextBtn);
    });

    // Page 2 shows items 6 to 8
    expect(queryByText("Doc_1.pdf")).toBeNull();
    expect(getByText("Doc_6.pdf")).toBeTruthy();
    expect(getByText("Doc_8.pdf")).toBeTruthy();
    expect(getByText("2 / 2")).toBeTruthy();

    // Switch back to page 1
    const prevBtn = getByText("Previous");
    await act(async () => {
      fireEvent.press(prevBtn);
    });
    expect(getByText("Doc_1.pdf")).toBeTruthy();
    expect(queryByText("Doc_6.pdf")).toBeNull();
  });
});
