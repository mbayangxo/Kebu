"use client";

import React, { Component, type ReactNode } from "react";

/** Preserve an unsupported node's place in the page rather than losing the entire canvas. */
export class KcdNodeErrorBoundary extends Component<{ children: ReactNode; revision: unknown }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "This element cannot be displayed." };
  }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; revision: unknown }>) {
    if (previous.revision !== this.props.revision && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">This element could not be displayed.</p><p>{this.state.error}</p>
    </div> : this.props.children;
  }
}
