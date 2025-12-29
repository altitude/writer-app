import React, { createContext, useContext, useMemo, useState } from "react";
import { DebugPanel } from "./DebugPanel";

type DebugData = Record<string, unknown> | null;

type DebugContextValue = {
  data: DebugData;
  setData: (value: DebugData) => void;
};

const DebugContext = createContext<DebugContextValue>({
  data: null,
  setData: () => {},
});

export const DebugProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<DebugData>(null);
  const value = useMemo(() => ({ data, setData }), [data]);

  return (
    <DebugContext.Provider value={value}>
      {children}
      <DebugPanel data={data} />
    </DebugContext.Provider>
  );
};

export const useDebug = () => useContext(DebugContext);

