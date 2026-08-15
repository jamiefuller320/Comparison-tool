"use client";

import { createContext, useContext, type ReactNode } from "react";

export type CompareStickyState = {
  stickyHeader: boolean;
  stickyFirstColumn: boolean;
};

const CompareStickyContext = createContext<CompareStickyState>({
  stickyHeader: false,
  stickyFirstColumn: false,
});

export function CompareStickyProvider({
  value,
  children,
}: {
  value: CompareStickyState;
  children: ReactNode;
}) {
  return (
    <CompareStickyContext.Provider value={value}>
      {children}
    </CompareStickyContext.Provider>
  );
}

export function useCompareSticky(): CompareStickyState {
  return useContext(CompareStickyContext);
}
