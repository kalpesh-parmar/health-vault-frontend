import React from "react";
import {
  StructuredReportDocument,
  SingleStructuredReportSummaryCard,
  SingleStructuredReportSummaryCardProps,
} from "../chat/widgets/StructuredReportSummaryCard";

type OnboardingReportSummaryCardProps = Omit<
  SingleStructuredReportSummaryCardProps,
  "document"
> & {
  document: StructuredReportDocument;
};

export const OnboardingReportSummaryCard: React.FC<
  OnboardingReportSummaryCardProps
> = ({ document, ...props }) => {
  // Onboarding always displays one report, using the same detail design as
  // the report selected in the chat card's modal.
  return <SingleStructuredReportSummaryCard document={document} {...props} />;
};

