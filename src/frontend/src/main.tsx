import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { EmailAuthProvider } from "./hooks/useEmailAuth";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Global Error Boundary
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[GlobalErrorBoundary] App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 100%)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "rgba(10,46,26,0.85)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "360px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2
              style={{
                color: "#fff",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              App loading error, please refresh
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              {this.state.error?.message || "Something went wrong"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.6rem 1.5rem",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "0.95rem",
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <EmailAuthProvider>
          <App />
        </EmailAuthProvider>
      </InternetIdentityProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>,
);
