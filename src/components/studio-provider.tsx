import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { openStudio, type StudioDB } from "@/lib/studio-db";
const Context = createContext<{
  db: StudioDB | null;
  revision: number;
  refresh: () => void;
  error: string;
}>({ db: null, revision: 0, refresh: () => {}, error: "" });
export function StudioProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<StudioDB | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    openStudio()
      .then(setDb)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <Context.Provider value={{ db, revision, refresh: () => setRevision((n) => n + 1), error }}>
      {children}
    </Context.Provider>
  );
}
export const useStudio = () => useContext(Context);
