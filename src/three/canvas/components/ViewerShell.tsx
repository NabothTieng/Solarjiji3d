import { type ReactNode } from "react";

interface ViewerShellProps {
  children: ReactNode;
}

export function ViewerShell({ children }: ViewerShellProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(255,255,255,0.97)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
