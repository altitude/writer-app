import React from "react";

interface DebugPanelProps {
  data: Record<string, unknown> | null;
}

export const DebugPanel = ({ data }: DebugPanelProps) => {
  return (
    <div className="debug-container">
      <pre>{data ? JSON.stringify(data, null, 2) : "No debug data yet"}</pre>
    </div>
  );
};

