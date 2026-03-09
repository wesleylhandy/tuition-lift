"use client";

/**
 * ScoutDashboardEntry — Composes ScoutFAB + ScoutModal with auth gating.
 * Per T007 [US1]: FAB visible only when authenticated; opens modal on click.
 */
import { useCallback, useEffect, useState } from "react";
import { ScoutFAB } from "./scout-fab";
import { ScoutModal } from "./scout-modal";

export function ScoutDashboardEntry() {
  const [userId, setUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      const { userId: uid } = (await res.json()) as { userId: string };
      setUserId(uid ?? null);
    };
    load();
  }, []);

  const handleSuccess = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <>
      <ScoutFAB
        onClick={() => setModalOpen(true)}
        visible={!!userId}
      />
      <ScoutModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
