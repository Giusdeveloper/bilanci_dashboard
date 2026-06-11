/** @deprecated Sprint 4 — redirect a /editor/ledger-balances */
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function EditorBilancioRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation('/editor/ledger-balances');
  }, [setLocation]);

  return null;
}
