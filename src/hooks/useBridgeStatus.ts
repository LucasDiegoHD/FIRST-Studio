"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BRIDGE_URL, probeRoboRio } from "@/lib/bridge/client";

export const BRIDGE_TOKEN_KEY = "firstStudio_bridgeToken_v1";
export const BRIDGE_URL_KEY = "firstStudio_bridgeUrl_v1";
export const BRIDGE_UPDATED_EVENT = "firstStudio:bridgeUpdated";

export function notifyBridgeUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BRIDGE_UPDATED_EVENT));
  }
}

export interface BridgeStatusState {
  paired: boolean;
  robotConnected: boolean;
  address: string | null;
  mode: string;
}

export function useBridgeStatus(teamNumber: number): BridgeStatusState {
  const [state, setState] = useState<BridgeStatusState>({
    paired: false,
    robotConnected: false,
    address: null,
    mode: "none",
  });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    let token: string | null = null;
    let url = DEFAULT_BRIDGE_URL;
    try {
      token = sessionStorage.getItem(BRIDGE_TOKEN_KEY);
      url = sessionStorage.getItem(BRIDGE_URL_KEY) || DEFAULT_BRIDGE_URL;
    } catch {
      return;
    }

    if (!token) {
      setState({ paired: false, robotConnected: false, address: null, mode: "none" });
      return;
    }

    try {
      const rio = await probeRoboRio(teamNumber, token, url);
      setState({
        paired: true,
        robotConnected: rio.reachable,
        address: rio.address,
        mode: rio.mode,
      });
    } catch {
      setState({
        paired: false,
        robotConnected: false,
        address: null,
        mode: "none",
      });
    }
  }, [teamNumber]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 6000);
    const onUpdated = () => {
      void refresh();
    };
    window.addEventListener(BRIDGE_UPDATED_EVENT, onUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(BRIDGE_UPDATED_EVENT, onUpdated);
    };
  }, [refresh]);

  return state;
}
