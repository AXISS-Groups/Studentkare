"""
services.agents.code_health_rules — CodeHealth Rule Engine (Gate 2).

Static + AST detection of code-health findings across DEAD, FAKE, TEST, LOG,
ANALYTICS and FALLBACK families, with Tier C (Security/Auth) untouchability
guardrails and line-number-invariant fingerprints.
"""
from __future__ import annotations

import ast
import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List


def generate_fingerprint(rule_id: str, file: str, symbol: str) -> str:
    """Return a SHA256 hex fingerprint that is invariant to line numbers."""
    canonical = f"{rule_id}::{file}::{symbol}".encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def is_tier_c_path(path: str) -> bool:
    """Return True for Tier C (Security & Auth) untouchable paths."""
    norm = path.replace("\\", "/")
    if norm.startswith("migrations/"):
        return True
    if "backend/core/" in norm:
        return True
    if "backend/routers/auth" in norm:
        return True
    if "backend/routers/payment" in norm:
        return True
    return False


@dataclass
class CodeHealthFinding:
    fingerprint: str
    rule_id: str
    family: str
    severity: str
    tier: str
    autofixable: bool
    file: str
    line: int
    symbol: str
    evidence: str
    blast_radius: str
    proposed_fix: str
    confidence: str
    verification_method: str


class CodeHealthRuleEngine:
    def __init__(self, workspace: str) -> None:
        self.workspace = workspace

    def _iter_python_files(self) -> List[Path]:
        root = Path(self.workspace)
        if not root.exists():
            return []
        return list(root.rglob("*.py"))

    def scan_all(self) -> List[CodeHealthFinding]:
        findings: List[CodeHealthFinding] = []
        for path in self._iter_python_files():
            rel = str(path.relative_to(self.workspace)).replace(os.sep, "/")
            findings.extend(self._scan_file(path, rel))
        return findings

    def _scan_file(self, path: Path, rel: str) -> List[CodeHealthFinding]:
        findings: List[CodeHealthFinding] = []
        try:
            source = path.read_text(encoding="utf-8")
        except OSError:
            return findings

        tree = None
        try:
            tree = ast.parse(source)
        except SyntaxError:
            tree = None

        tier = "Tier C" if is_tier_c_path(rel) else "Tier A"
        autofixable = not (tier == "Tier C")

        # FAKE / stub detection: hardcoded `return True`/`return False` or `pass`
        if tree is not None:
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    body = node.body
                    is_stub = False
                    if len(body) == 1:
                        if isinstance(body[0], ast.Return):
                            val = body[0].value
                            if isinstance(val, ast.Constant) and isinstance(val.value, bool):
                                is_stub = True
                        elif isinstance(body[0], ast.Pass):
                            is_stub = True
                    if is_stub:
                        findings.append(
                            CodeHealthFinding(
                                fingerprint=generate_fingerprint("FAKE-001", rel, node.name),
                                rule_id="FAKE-001",
                                family="FAKE",
                                severity="P2",
                                tier=tier,
                                autofixable=autofixable,
                                file=rel,
                                line=getattr(node, "lineno", 1),
                                symbol=node.name,
                                evidence=f"Stub body detected in {node.name}",
                                blast_radius="None",
                                proposed_fix="Implement real logic",
                                confidence="confirmed",
                                verification_method="AST",
                            )
                        )

        # DEAD unused variable detection (AST) — unused simple assignments
        if tree is not None:
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and not self._is_used(target.id, tree):
                            findings.append(
                                CodeHealthFinding(
                                    fingerprint=generate_fingerprint("DEAD-001", rel, target.id),
                                    rule_id="DEAD-001",
                                    family="DEAD",
                                    severity="P3",
                                    tier=tier,
                                    autofixable=autofixable,
                                    file=rel,
                                    line=getattr(node, "lineno", 1),
                                    symbol=target.id,
                                    evidence=f"{target.id} assigned but unused",
                                    blast_radius="None",
                                    proposed_fix="Remove line",
                                    confidence="confirmed",
                                    verification_method="AST",
                                )
                            )

        # TEXT-based families: LOG, TEST, ANALYTICS, FALLBACK
        lines = source.splitlines()
        for idx, line in enumerate(lines, start=1):
            lower = line.lower()
            if "print(" in lower and "logger" not in lower:
                findings.append(self._text_finding("LOG-001", "LOG", "P3", rel, idx, "print", "Logging via print", tier, autofixable))
            if rel.startswith("backend/tests") or "/tests/" in rel or rel.startswith("tests/"):
                findings.append(self._text_finding("TEST-001", "TEST", "P1", rel, idx, "test", "Test file present", tier, autofixable))
            if "analytics" in lower or "analytics" in rel:
                findings.append(self._text_finding("ANALYTICS-001", "ANALYTICS", "P3", rel, idx, "analytics", "Analytics code path", tier, autofixable))
            if "except" in lower and ("pass" in lower or "continue" in lower):
                findings.append(self._text_finding("FALLBACK-001", "FALLBACK", "P2", rel, idx, "fallback", "Silent exception fallback", tier, autofixable))

        return findings

    @staticmethod
    def _text_finding(rule_id, family, severity, file, line, symbol, evidence, tier, autofixable):
        return CodeHealthFinding(
            fingerprint=generate_fingerprint(rule_id, file, symbol),
            rule_id=rule_id,
            family=family,
            severity=severity,
            tier=tier,
            autofixable=autofixable,
            file=file,
            line=line,
            symbol=symbol,
            evidence=evidence,
            blast_radius="None",
            proposed_fix="Refactor",
            confidence="confirmed",
            verification_method="STATIC",
        )

    @staticmethod
    def _is_used(name: str, tree: ast.AST) -> bool:
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and node.id == name and isinstance(node.ctx, ast.Load):
                return True
        return False
