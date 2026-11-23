"use client";

import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ProjectProvider } from "@/context/project-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <Tooltip.Provider delayDuration={250}>{children}</Tooltip.Provider>
    </ProjectProvider>
  );
}
