import { type ReactNode } from "react";

interface ViewerHeaderProps {
  title: string;
  children?: ReactNode;
}

export function ViewerHeader({ title, children }: ViewerHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        background: "#f57c00",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <span>{title}</span>
      {children}
    </div>
  );
}
