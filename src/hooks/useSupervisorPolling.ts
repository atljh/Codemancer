import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import { api } from "./useApi";

const POLL_INTERVAL = 15_000;

/**
 * Polls the supervisor for new proposals and injects them as
 * `agent_proposal` messages into the chat.
 */
export function useSupervisorPolling() {
  const knownPlanIds = useRef(new Set<string>());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      const { settings, setSupervisorProposalCount, messages, addMessage } =
        useGameStore.getState();

      if (!settings.supervisor_enabled) {
        setSupervisorProposalCount(0);
        return;
      }

      try {
        const { count } = await api.getSupervisorProposalCount();
        setSupervisorProposalCount(count);

        if (count > 0) {
          const plans = await api.getSupervisorPlans("proposed");

          // Dedup: only inject plans we haven't seen yet
          const existingIds = new Set(
            messages
              .filter((m) => m.type === "agent_proposal")
              .map((m) => {
                try {
                  const meta = m.content.split("---meta---")[1];
                  return meta ? JSON.parse(meta).plan_id : null;
                } catch {
                  return null;
                }
              })
              .filter(Boolean),
          );

          for (const plan of plans) {
            if (existingIds.has(plan.id) || knownPlanIds.current.has(plan.id)) {
              continue;
            }
            knownPlanIds.current.add(plan.id);

            const meta = JSON.stringify({
              plan_id: plan.id,
              signal_title: plan.signal_title,
              signal_reason: plan.signal_reason,
              sandbox_mode: plan.sandbox_mode,
              steps: plan.steps,
              affected_files: plan.affected_files,
              status: plan.status,
            });

            addMessage({
              role: "system",
              content: `[AGENT_PROPOSAL] ${plan.signal_title}\n---meta---${meta}`,
              type: "agent_proposal",
            });
          }
        }
      } catch {
        // polling failed silently
      }
    }

    poll();
    timer = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, []);
}
