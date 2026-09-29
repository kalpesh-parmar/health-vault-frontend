import {
  parseReportListMessage,
  normalizeReportItem,
  isDocumentOrReportItem,
} from "../reportListNormalizer";
import { parseMedicationListMessage } from "../medicationListNormalizer";

describe("Report List Normalizer & Parser", () => {
  it("correctly parses user's exact API response as a report list and not a medication list", () => {
    const apiResponseBody = {
      type: "done",
      text: "2026-05-27)",
      mode: "NORMAL_CHAT",
      actionType: "NORMAL_CHAT",
      reply: {
        items: [
          {
            id: "cb4928c7-5793-4eac-9930-e5b2d130f390",
            fileName: "Reports__22.jpg",
            documentType: "DISCHARGE_SUMMARY",
            fileType: "image/jpeg",
            reportDate: "2019-08-21",
            ocrStatus: "completed",
          },
          {
            id: "a72ff32e-5007-420c-9868-d64a113056b9",
            fileName: "Report6.jpeg",
            documentType: "LAB_REPORT",
            fileType: "image/jpeg",
            reportDate: "2019-08-07",
            ocrStatus: "completed",
          },
          {
            id: "4e81867e-f04d-4e9d-8944-7c4da350715e",
            fileName: "1000387638.jpg",
            documentType: "LAB_REPORT",
            fileType: "image/jpeg",
            reportDate: "2026-05-27",
            ocrStatus: "completed",
          },
        ],
        pagination: {
          pageNumber: 1,
          pageLimit: 3,
          totalPages: 1,
          totalRecords: 3,
          hasNextPage: false,
          hasPrevPage: false,
        },
        text: "**Your Medical Documents:**\n1. **Reports__22.jpg** [DISCHARGE_SUMMARY] (Date: 2019-08-21)\n2. **Report6.jpeg** [LAB_REPORT] (Date: 2019-08-07)\n3. **1000387638.jpg** [LAB_REPORT] (Date: 2026-05-27)",
        formattedText:
          "**Your Medical Documents:**\n1. **Reports__22.jpg** [DISCHARGE_SUMMARY] (Date: 2019-08-21)\n2. **Report6.jpeg** [LAB_REPORT] (Date: 2019-08-07)\n3. **1000387638.jpg** [LAB_REPORT] (Date: 2026-05-27)",
      },
      title: null,
      subtitle: null,
      fields: [],
      explainer: null,
      loginSummary: null,
      documentSummary: null,
      sessionId: "0e43dd11-2b20-4010-8d45-5edbb0f0fd6b",
      onboardingState: null,
      state: null,
      medicines: [],
      citations: [],
      document: null,
      medication: null,
      suggestedAction: null,
      options: [],
      requireSelection: false,
      reports: [],
      allowMultiSelect: false,
      selectionType: null,
    };

    // 1. Check report list parser
    const reportResult = parseReportListMessage(
      apiResponseBody.reply,
      apiResponseBody
    );

    expect(reportResult.isReportList).toBe(true);
    expect(reportResult.items).toHaveLength(3);
    expect(reportResult.items[0]).toEqual({
      id: "cb4928c7-5793-4eac-9930-e5b2d130f390",
      fileName: "Reports__22.jpg",
      documentType: "DISCHARGE_SUMMARY",
      fileType: "image/jpeg",
      reportDate: "2019-08-21",
      ocrStatus: "completed",
      s3Key: undefined,
      fileUrl: undefined,
      imageUri: undefined,
      summary: undefined,
      raw: apiResponseBody.reply.items[0],
    });

    expect(reportResult.items[1].fileName).toBe("Report6.jpeg");
    expect(reportResult.items[1].documentType).toBe("LAB_REPORT");
    expect(reportResult.items[2].fileName).toBe("1000387638.jpg");
    expect(reportResult.items[2].documentType).toBe("LAB_REPORT");

    expect(reportResult.pagination).toEqual({
      pageNumber: 1,
      pageLimit: 3,
      totalPages: 1,
      totalRecords: 3,
      hasNextPage: false,
      hasPrevPage: false,
    });

    // 2. Ensure medication parser does NOT falsely claim this document payload
    const medResult = parseMedicationListMessage(
      apiResponseBody.reply,
      apiResponseBody
    );
    expect(medResult.isMedicationList).toBe(false);
  });

  it("handles empty report list response", () => {
    const payload = {
      items: [],
      pagination: {
        pageNumber: 1,
        pageLimit: 10,
        totalPages: 1,
        totalRecords: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };

    const result = parseReportListMessage(payload, {
      task: "REPORT_LIST",
    });

    expect(result.isReportList).toBe(true);
    expect(result.items).toHaveLength(0);
    expect(result.pagination?.totalRecords).toBe(0);
  });

  it("normalizes report items with missing fields safely", () => {
    const item = normalizeReportItem({
      name: "Scan.png",
      type: "prescription",
      status: "completed",
    }, 0);

    expect(item.id).toBe("report-0");
    expect(item.fileName).toBe("Scan.png");
    expect(item.documentType).toBe("PRESCRIPTION");
    expect(item.ocrStatus).toBe("completed");
  });
});
