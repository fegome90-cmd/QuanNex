"""Deterministic FSM orchestrator for MCP autonomous workflows."""

from __future__ import annotations

import enum
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


class OrchestratorState(str, enum.Enum):
    PLAN = "PLAN"
    EXEC = "EXEC"
    CRITIC = "CRITIC"
    POLICY = "POLICY"
    DONE = "DONE"
    ABORTED = "ABORTED"


@dataclass
class Budget:
    max_hops: int = 6
    max_latency_ms: int = 90_000
    critic_max_tokens: int = 900


@dataclass
class TransitionLog:
    state: OrchestratorState
    agent: str
    reason: str
    timestamp_ms: int
    latency_ms: int
    payload_reference: Optional[str] = None


@dataclass
class FSMConfig:
    budgets: Dict[str, Budget] = field(default_factory=dict)
    default_budget: str = "standard"
    critic_roles: List[str] = field(default_factory=lambda: ["agents.critic.default"])
    policy_gate: str = "policies.PolicyGate"
    telemetry_hook: Optional[str] = "agents.telemetry.emit_trace"


class OrchestratorFSMAgent:
    """Finite state machine orchestrator coordinating Planner -> Executor -> Critic -> Policy -> Done."""

    def __init__(self, config: Optional[FSMConfig] = None) -> None:
        self.config = config or FSMConfig(
            budgets={
                "standard": Budget(),
                "diagnostic": Budget(max_hops=4, max_latency_ms=60_000, critic_max_tokens=600),
            },
            default_budget="standard",
        )
        self.state = OrchestratorState.PLAN
        self.transitions: List[TransitionLog] = []
        self.start_ms: Optional[int] = None

    def run(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the FSM loop for a single task."""
        self._reset()
        budget = self._resolve_budget(task)
        context = {"task": task, "budget": budget.__dict__}

        while self.state not in {OrchestratorState.DONE, OrchestratorState.ABORTED}:
            hop_start = time.time()

            if self.state == OrchestratorState.PLAN:
                context = self._call_agent(
                    agent_id="agents.planner",
                    state=OrchestratorState.PLAN,
                    context=context,
                    reason="Initial plan derivation",
                )
                self._advance(OrchestratorState.EXEC, hop_start, "Planner completed")

            elif self.state == OrchestratorState.EXEC:
                context = self._call_agent(
                    agent_id=context.get("plan", {}).get("executor", "agents.executor"),
                    state=OrchestratorState.EXEC,
                    context=context,
                    reason="Execute plan step",
                )
                self._advance(OrchestratorState.CRITIC, hop_start, "Executor delivered output")

            elif self.state == OrchestratorState.CRITIC:
                context = self._call_agent(
                    agent_id=self.config.critic_roles[0],
                    state=OrchestratorState.CRITIC,
                    context=context,
                    reason="Quality gate critique",
                    options={"max_tokens": budget.critic_max_tokens},
                )
                critic_decision = context.get("critic", {}).get("decision", "pass")
                next_state = OrchestratorState.POLICY if critic_decision == "pass" else OrchestratorState.EXEC
                self._advance(next_state, hop_start, f"Critic decision: {critic_decision}")

            elif self.state == OrchestratorState.POLICY:
                context = self._call_agent(
                    agent_id=self.config.policy_gate,
                    state=OrchestratorState.POLICY,
                    context=context,
                    reason="Run policy guard before emission",
                )
                policy_outcome = context.get("policy", {}).get("status", "approved")
                next_state = OrchestratorState.DONE if policy_outcome == "approved" else OrchestratorState.ABORTED
                self._advance(next_state, hop_start, f"Policy outcome: {policy_outcome}")

        return {
            "status": self.state.value,
            "transitions": [transition.__dict__ for transition in self.transitions],
            "context": context,
        }

    def _reset(self) -> None:
        self.start_ms = int(time.time() * 1000)
        self.state = OrchestratorState.PLAN
        self.transitions.clear()

    def _resolve_budget(self, task: Dict[str, Any]) -> Budget:
        budget_key = task.get("routing", {}).get("budget_override", self.config.default_budget)
        return self.config.budgets.get(budget_key, self.config.budgets[self.config.default_budget])

    def _call_agent(
        self,
        *,
        agent_id: str,
        state: OrchestratorState,
        context: Dict[str, Any],
        reason: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Placeholder for invoking a downstream MCP agent; returns enriched context."""
        payload_reference = context.get("payload", {}).get("reference") if context.get("payload") else None
        self._log_transition(state, agent_id, reason, payload_reference)
        # This is a stub: integrate with actual MCP call mechanism in orchestration/orchestrator.js.
        context.setdefault("trace", []).append({
            "state": state.value,
            "agent": agent_id,
            "reason": reason,
            "options": options or {},
        })
        return context

    def _advance(self, next_state: OrchestratorState, hop_start: float, reason: str) -> None:
        self.state = next_state
        latency_ms = int((time.time() - hop_start) * 1000)
        if self.config.telemetry_hook:
            self._emit_telemetry(latency_ms, reason)
        if len(self.transitions) > 100:
            self.state = OrchestratorState.ABORTED

    def _log_transition(
        self,
        state: OrchestratorState,
        agent: str,
        reason: str,
        payload_reference: Optional[str],
    ) -> None:
        now_ms = int(time.time() * 1000)
        latency_ms = now_ms - (self.start_ms or now_ms)
        self.transitions.append(
            TransitionLog(
                state=state,
                agent=agent,
                reason=reason,
                timestamp_ms=now_ms,
                latency_ms=latency_ms,
                payload_reference=payload_reference,
            )
        )

    def _emit_telemetry(self, latency_ms: int, reason: str) -> None:
        # Stub for telemetry agent integration; emit structured trace here.
        pass


if __name__ == "__main__":
    sample_task = {
        "task_id": "demo-123",
        "routing": {"budget_override": "standard"},
        "payload": {"reference": "thread-state:demo"},
    }
    orchestrator = OrchestratorFSMAgent()
    result = orchestrator.run(sample_task)
    print(result)
