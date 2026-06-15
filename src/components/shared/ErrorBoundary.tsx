import React, { Component, ErrorInfo, ReactNode } from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  componentName?: string;
  receivedProps?: any;
  navigationParams?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log the complete diagnostics to the console / service
    console.error("================ ERROR BOUNDARY CAUGHT AN ERROR ================");
    console.error(`Component Name: ${this.props.componentName || "Unknown Component"}`);
    console.error(`Error: ${error.message}`);
    console.error("Stack Trace:", errorInfo.componentStack);
    if (this.props.receivedProps) {
      console.error("Received Props:", JSON.stringify(this.props.receivedProps, null, 2));
    }
    if (this.props.navigationParams) {
      console.error("Navigation Params:", JSON.stringify(this.props.navigationParams, null, 2));
    }
    console.error("================================================================");
  }

  public render() {
    if (this.state.hasError) {
      return (
        <FallbackContainer>
          <IconWrapper>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </IconWrapper>
          <Title>{this.props.fallbackTitle || "Something went wrong"}</Title>
          <Subtitle>
            {this.props.fallbackSubtitle || "An unexpected error occurred in this module."}
          </Subtitle>
          <RetryButton
            activeOpacity={0.8}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <RetryText>Try Again</RetryText>
          </RetryButton>
        </FallbackContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Styled fallback UI components
const FallbackContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: #ffffff;
`;

const IconWrapper = styled.View`
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background-color: #fef2f2;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 8px;
`;

const Subtitle = styled.Text`
  font-size: 14px;
  color: #64748b;
  text-align: center;
  line-height: 20px;
  margin-bottom: 24px;
`;

const RetryButton = styled.TouchableOpacity`
  background-color: #2563eb;
  padding-vertical: 12px;
  padding-horizontal: 24px;
  border-radius: 12px;
  shadow-color: #2563eb;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 6px;
  elevation: 3;
`;

const RetryText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;
