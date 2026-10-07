import type React from "react";

export const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
};

export const popupStyle: React.CSSProperties = {
  background: "#1e1e2e",
  borderRadius: 12,
  border: "1px solid #313244",
  color: "#cdd6f4",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13,
  display: "flex",
  flexDirection: "column",
  maxHeight: "90vh",
  maxWidth: "90vw",
  width: 820,
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

export const headerStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid #313244",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 15,
  fontWeight: 600,
};

export const bodyStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

export const canvasAreaStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  background: "#181825",
  overflow: "hidden",
  cursor: "crosshair",
};

export const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderLeft: "1px solid #313244",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  overflowY: "auto",
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#a6adc8",
  marginBottom: 6,
};

export const labelRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 4,
};

export const inputStyle: React.CSSProperties = {
  width: 60,
  padding: "4px 8px",
  background: "#313244",
  border: "1px solid #45475a",
  borderRadius: 6,
  color: "#cdd6f4",
  fontSize: 12,
  textAlign: "right",
  outline: "none",
};

export const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  transition: "all 0.15s ease",
};
