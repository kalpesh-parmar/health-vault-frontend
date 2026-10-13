import React from "react";
import {
  StructuredReportDocument,
  StructuredReportSummaryCard,
  StructuredReportSummaryCardProps,
} from "../chat/widgets/StructuredReportSummaryCard";

type OnboardingReportSummaryCardProps = Omit<
  StructuredReportSummaryCardProps,
  "document" | "reportDocuments"
> & {
  document: StructuredReportDocument;
};

export const OnboardingReportSummaryCard: React.FC<
  OnboardingReportSummaryCardProps
> = ({ document, ...props }) => {
  // Do not pass reportDocuments here. The shared card renders the
  // single-document summary directly when that prop is omitted.
  return <StructuredReportSummaryCard document={document} {...props} />;
};

