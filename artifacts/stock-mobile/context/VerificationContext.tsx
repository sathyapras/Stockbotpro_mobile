import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const KEY = "email_needs_verification";

interface VerificationContextValue {
  needsVerification: boolean;
  setNeedsVerification: (v: boolean) => void;
  dismiss: () => void;
}

const VerificationContext = createContext<VerificationContextValue>({
  needsVerification: false,
  setNeedsVerification: () => {},
  dismiss: () => {},
});

export function VerificationProvider({ children }: { children: React.ReactNode }) {
  const [needsVerification, setNeeds] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v === "true") setNeeds(true);
    });
  }, []);

  function setNeedsVerification(v: boolean) {
    setNeeds(v);
    AsyncStorage.setItem(KEY, String(v));
  }

  function dismiss() {
    setNeeds(false);
    AsyncStorage.removeItem(KEY);
  }

  return (
    <VerificationContext.Provider value={{ needsVerification, setNeedsVerification, dismiss }}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  return useContext(VerificationContext);
}
