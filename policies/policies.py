"""Policy gate skeleton for MCP autonomous workflow safeguards."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List


class PolicyViolation(Exception):
    """Raised when a policy fails."""


@dataclass
class PolicyContext:
    task_id: str
    diff_summary: str
    files_changed: List[str]
    test_evidence: List[str]
    lint_output: List[str]
    metadata: Dict[str, Any]


class BasePolicy:
    name: str = "base-policy"
    description: str = ""

    def evaluate(self, context: PolicyContext) -> None:
        raise NotImplementedError


class BlockSensitiveFilesPolicy(BasePolicy):
    name = "block_sensitive_files"
    description = "Prevent modifications to CI and security-critical files without override."
    protected_globs: Iterable[str] = (".github/**", "core/scripts/**", "policies/**")

    def evaluate(self, context: PolicyContext) -> None:
        protected_hits = [path for path in context.files_changed if self._is_protected(path)]
        if protected_hits:
            raise PolicyViolation(
                f"Protected files touched: {', '.join(protected_hits)}. Request manual approval."
            )

    def _is_protected(self, path: str) -> bool:
        return any(path.startswith(prefix.replace("/**", "")) for prefix in self.protected_globs)


class RequireRegressionReferencePolicy(BasePolicy):
    name = "require_regression_reference"
    description = "Bug fixes must reference failing test or reproduction notes."

    def evaluate(self, context: PolicyContext) -> None:
        regression_note = context.metadata.get("regression_reference")
        if not regression_note:
            raise PolicyViolation("Missing regression reference for bug fix task.")


class RequireEvidenceForLintFixesPolicy(BasePolicy):
    name = "require_lint_evidence"
    description = "Lint fixes must include before/after or tool output excerpt."

    def evaluate(self, context: PolicyContext) -> None:
        if not context.lint_output:
            raise PolicyViolation("Lint fix missing tool output evidence.")


class RequireTestProofPolicy(BasePolicy):
    name = "require_test_proof"
    description = "Code changes altering logic must include test results."

    def evaluate(self, context: PolicyContext) -> None:
        if context.metadata.get("intent") in {"refactor", "bugfix"} and not context.test_evidence:
            raise PolicyViolation("Test evidence required for refactor/bugfix tasks.")


class PolicyGate:
    """Minimal policy engine to run registered rules before emitting a patch."""

    def __init__(self, policies: Iterable[BasePolicy] | None = None) -> None:
        self.policies = list(policies or self._default_policies())

    def __call__(self, context: Dict[str, Any]) -> Dict[str, Any]:
        structured = self._to_policy_context(context)
        for policy in self.policies:
            policy.evaluate(structured)
        context.setdefault("policy", {})["status"] = "approved"
        return context

    def _to_policy_context(self, context: Dict[str, Any]) -> PolicyContext:
        return PolicyContext(
            task_id=context.get("task", {}).get("task_id", "unknown"),
            diff_summary=context.get("diff", {}).get("summary", ""),
            files_changed=context.get("diff", {}).get("files", []),
            test_evidence=context.get("evidence", {}).get("tests", []),
            lint_output=context.get("evidence", {}).get("lint", []),
            metadata=context.get("plan", {}),
        )

    @staticmethod
    def _default_policies() -> List[BasePolicy]:
        return [
            BlockSensitiveFilesPolicy(),
            RequireRegressionReferencePolicy(),
            RequireEvidenceForLintFixesPolicy(),
            RequireTestProofPolicy(),
        ]


if __name__ == "__main__":
    gate = PolicyGate()
    sample_context = {
        "task": {"task_id": "demo-123"},
        "diff": {"summary": "Update logic", "files": ["core/module.py"]},
        "evidence": {"tests": ["pytest -q"], "lint": []},
        "plan": {"intent": "refactor"},
    }
    try:
        gate(sample_context)
    except PolicyViolation as error:
        print(f"Policy violation: {error}")
