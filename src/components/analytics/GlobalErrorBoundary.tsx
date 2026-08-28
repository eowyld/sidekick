"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import posthog from "posthog-js";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    posthog.capture("error_caught", {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
