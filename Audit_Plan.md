# Incremental Codebase Audit & Architecture Synchronization

## 1. Role and Mission

Act as a Senior Software Architect, Staff Engineer, DevOps Engineer, Security Engineer, QA Engineer, and Engineering Manager.

You are working with an evolving startup codebase whose existing architecture audit reports are stored in `/audit/`.

Your task is to **bring the existing audit documentation up to date with the current implementation, reassess previous findings, and introduce new audit dimensions whenever the codebase requires them.**

The repository may have changed substantially since the previous audit. New modules, features, dependencies, infrastructure, integrations, architectural patterns, and developer workflows may have been introduced.

Do not assume that existing audit reports accurately represent the current codebase.

Your objective is to maintain a reliable, evidence-based, continuously updated architectural assessment of a startup codebase intended to support a growing engineering team.

The target is a system that remains maintainable, secure, understandable, testable, and practical for a 10–15 person engineering team, with room for future growth.

---

## 2. Mandatory Operating Rules

### Rule A — Inspect Before Editing

Before updating any audit document:

1. Inspect the repository root and determine the actual project structure.
2. Locate the existing `/audit/` directory and inventory every file within it.
3. Read the existing audit reports relevant to the current codebase.
4. Inspect the current implementation, configuration, dependencies, tests, scripts, infrastructure, and documentation.
5. Identify changes since the previous audit wherever Git history, diffs, commits, or other reliable evidence is available.
6. Establish which existing findings remain valid, which have been resolved, which have changed, and which are no longer supported by the current implementation.
7. Identify newly introduced components and architectural concerns not covered by the existing audit reports.

Do not begin rewriting reports before understanding the current implementation and the existing audit structure.

### Rule B — Preserve Existing Audit Work

The existing audit files are the baseline for this update.

- Update existing files in place wherever possible.
- Preserve valid findings, useful explanations, architectural decisions, and recommendations.
- Do not regenerate every report from scratch simply because the code has changed.
- Do not remove an existing finding merely because it is absent from the latest diff.
- Revalidate findings against the current code before changing their status.
- Preserve historical context when it helps explain recurring problems, architectural decisions, or regressions.
- Correct outdated file paths, function names, module descriptions, dependency information, and architectural assumptions.
- Consolidate duplicated findings when appropriate, while preserving references to affected components.
- Avoid duplicating the same finding across multiple reports unless a cross-reference is useful.

A report should evolve as the codebase evolves, rather than becoming a collection of unrelated audit snapshots.

### Rule C — Strictly Protect Application Code

This task is a documentation-only audit update.

You MAY create, edit, rename, move, or reorganize Markdown files inside `/audit/` when necessary to maintain the audit documentation.

You MUST NOT modify anything outside the audit documentation scope.

Do not:

- Modify, refactor, format, or delete application source code.
- Modify tests, build scripts, package manifests, lockfiles, or configuration files.
- Install or upgrade dependencies.
- Modify Dockerfiles, Docker Compose files, CI/CD workflows, or deployment configurations.
- Change environment variables or `.env` files.
- Create commits, branches, or Git history changes.
- Push changes or modify remote repository settings.
- Generate application code as part of the audit.
- Execute destructive commands or commands that change application state.

Use read-only inspection commands. Avoid executing application code or tests if doing so could modify data, install packages, or alter the environment.

If a validation requires a potentially mutating operation, document the limitation instead of performing it.

**The only intended repository changes are updates to audit documentation.**

---

## 3. Establish the Current Codebase State

Build an accurate snapshot of the current implementation before reassessing the reports.

Inspect the following where applicable:

- Repository and directory structure.
- Applications, services, packages, and shared modules.
- Programming languages and frameworks.
- Frontend, backend, mobile, and desktop components.
- API endpoints, contracts, clients, and integrations.
- Data models, databases, migrations, and persistence layers.
- Authentication, authorization, permissions, and identity management.
- State management and UI architecture, including MVVM where applicable.
- Dependency manifests and lockfiles.
- Environment configuration and secrets management.
- Dockerfiles, Compose configurations, and container boundaries.
- Build, development, testing, and deployment scripts.
- CI/CD pipelines and infrastructure configuration.
- Logging, error handling, monitoring, and observability.
- Unit, integration, component, and end-to-end tests.
- Documentation, developer onboarding, and Git workflow guidance.
- AI/ML systems, model integrations, background jobs, queues, and asynchronous processing where present.
- Generated code, generated assets, caches, and other build artifacts.
- Platform-specific behavior and cross-platform compatibility where applicable.

Adapt this inventory to the technologies actually present. Do not force irrelevant categories onto the project.

### Git and change discovery

When Git information is available, inspect relevant evidence such as:

- Working-tree changes.
- Changes between the previous audit baseline and the current revision.
- Recent commits and changed-file lists.
- Renamed, deleted, and newly introduced files.
- Dependency and configuration changes.
- Changes to public interfaces and shared modules.

Use an existing recorded commit or revision as the baseline if one is documented and reliable.

If no previous revision is available, do not invent one. Compare the current repository with the existing audit reports and explicitly state that the exact change history could not be established.

Distinguish between:

1. Verified code changes.
2. Newly discovered implementation details.
3. Previously documented issues that still exist.
4. Inferences that require further validation.

Do not claim that a change is new simply because it was not mentioned in an old report.

---

## 4. Perform an Audit Synchronization Pass

Compare the current codebase with the existing audit files.

For every significant finding, determine its current status.

Use the following statuses consistently:

- **OPEN** — The issue remains present and relevant.
- **PARTIALLY RESOLVED** — Some aspects have improved, but the issue remains.
- **RESOLVED** — Evidence confirms that the issue has been fixed.
- **REGRESSED** — A previously resolved issue has returned.
- **CHANGED** — The implementation or nature of the issue has materially changed.
- **SUPERSEDED** — A different architectural approach or implementation has replaced the old one.
- **NOT REVALIDATED** — There is insufficient evidence to determine its current status.
- **NO LONGER APPLICABLE** — The affected component or requirement no longer exists or is no longer relevant.

Do not use RESOLVED just because a file was renamed, a function moved, or a refactor changed the implementation's appearance.

Validate whether the underlying risk has actually disappeared.

### For each updated finding, capture:

- Finding ID.
- Title.
- Severity.
- Current status.
- Affected file paths and symbols.
- Evidence from the current implementation.
- Previous assessment, if available.
- What changed since the previous assessment.
- Current impact.
- Recommended action.
- Relevant dependencies or blockers.
- Related audit reports.

Use stable finding IDs, such as `ARCH-001`, `SEC-003`, or `TEST-002`, where practical. Preserve existing IDs when they are already established.

If a finding has been resolved, retain a concise resolution record when its history is useful. Avoid allowing resolved findings to dominate current executive summaries and active action plans.

If a finding has been superseded, link the old and replacement findings where practical.

---

## 5. Update the Existing Audit Dimensions

Use the existing audit files as the starting point. Reassess each dimension against the current implementation.

The initial audit scope includes:

1. Technology stack discovery.
2. Repository and monorepo structure.
3. Overall system architecture.
4. MVVM architecture, where applicable.
5. Separation of concerns.
6. Code quality.
7. AI-assisted development and technical debt.
8. Developer collaboration.
9. Git and branching workflow.
10. Developer onboarding.
11. Installation and setup.
12. Documentation.
13. Environment and configuration management.
14. Dependency management.
15. Testing strategy.
16. Error handling and logging.
17. API architecture and contracts.
18. Database architecture.
19. Security.
20. CI/CD and deployment.
21. Scalability.
22. Maintainability.
23. Observability.
24. Project organization.
25. Naming and coding conventions.
26. Technical debt.
27. Developer experience.
28. Production readiness.
29. Startup team scalability.
30. Long-term architectural risks.

These dimensions are a baseline, not a fixed limit.

If the current repository contains additional technologies, architectural boundaries, or operational responsibilities, identify and audit them as described in Section 6.

### Specific update requirements

**Architecture and module boundaries**

Verify whether new features preserve separation of concerns, dependency direction, and clear ownership boundaries. Identify new coupling, duplicated logic, circular dependencies, and shared modules that have become bottlenecks.

**MVVM**

If MVVM is used or explicitly intended, assess its actual implementation. If the project uses a different architecture, document the architecture that exists instead of forcing MVVM onto it.

**Dependencies and configuration**

Reconcile dependency manifests, lockfiles, runtime requirements, environment variables, and setup instructions with the current repository. Do not assume that a package or configuration is unused without adequate evidence.

**APIs and databases**

Review newly introduced endpoints, schemas, models, migrations, integrations, validation, authorization, transaction handling, and compatibility risks.

**Security and reliability**

Reassess new trust boundaries, external integrations, data flows, permissions, secrets handling, error handling, retry behavior, concurrency, and failure isolation.

**Testing**

Identify new functionality that lacks appropriate test coverage. Distinguish between tests that exist and tests whose successful execution has actually been verified.

**Developer collaboration**

Check whether new modules, shared configuration, central files, and cross-package dependencies increase merge conflicts or prevent developers from working independently.

**Installation and deployment**

Revalidate existing setup and deployment documentation against current scripts, configuration, container definitions, environment variables, and dependency requirements.

**Scalability and maintainability**

Determine whether recent implementation choices introduce significant future costs. Recommend incremental improvements and avoid unnecessary rewrites or premature microservices.

---

## 6. Discover and Create New Audit Dimensions

This is a mandatory part of the task.

Do not restrict the audit to the original 30 dimensions.

If new code introduces a substantial architectural area that is not adequately covered by existing reports, determine whether a dedicated audit file is warranted.

Potential examples include, but are not limited to:

- AI/LLM architecture and model integration.
- Agent orchestration, tools, and workflow execution.
- Prompt management, model evaluation, and AI observability.
- RAG pipelines, embeddings, vector databases, and retrieval quality.
- Event-driven architecture and message queues.
- Background workers and scheduled jobs.
- Real-time communication, WebSockets, and streaming.
- File processing, media pipelines, and object storage.
- Mobile architecture and platform-specific integrations.
- Shared design systems and component libraries.
- Feature flags, experimentation, and release controls.
- Multi-tenancy and tenant isolation.
- Authorization and permission models.
- Data governance, privacy, retention, and compliance.
- Caching and distributed state.
- Search infrastructure.
- Infrastructure as code and cloud resource management.
- Performance, load testing, and resource utilization.
- Accessibility and internationalization.
- Analytics, telemetry, and data pipelines.
- SDKs, public interfaces, and API compatibility.
- Offline functionality and synchronization.
- Cross-platform compatibility.
- Supply-chain security and software provenance.

These are examples, not a checklist requiring every file to exist.

### New-dimension decision criteria

Create a dedicated audit file when one or more of the following applies:

1. A major new subsystem has been introduced.
2. The existing audit structure cannot adequately capture its risks.
3. The subsystem has specialized security, reliability, scalability, or testing requirements.
4. The subsystem introduces a new architectural boundary or operational responsibility.
5. The subsystem is important enough to require independent recommendations and ongoing tracking.

Do not create a new file for every new source file or feature.

If an existing report already covers the concern adequately, update that report instead.

### Naming and organization

Follow the existing audit naming convention wherever possible.

For a new dimension:

- Choose an unused numeric prefix or another collision-free name.
- Use a descriptive filename.
- Document the dimension's scope and why it needs independent coverage.
- Include evidence, risks, recommendations, and links to related reports.
- Add the new report to the audit index and executive summary where relevant.
- Update any affected action plans, scores, or cross-references.
- Check for duplicate coverage or contradictory recommendations.

Never overwrite an existing report simply to reuse its filename.

---

## 7. Keep the Audit Reports Internally Consistent

Audit reports must describe one coherent current state of the repository.

Update related documents together when a finding materially affects multiple areas.

For example:

- A resolved setup issue should be reflected in the installation audit, onboarding assessment, and action plan.
- A new authentication module may affect architecture, API security, testing, and onboarding reports.
- A changed Docker workflow may affect installation, developer experience, CI/CD, and environment management.
- A newly introduced AI subsystem may require architecture, security, testing, observability, and a dedicated AI audit.
- A resolved high-severity issue should no longer appear as an active blocker in the executive summary.

Use cross-references instead of copying long descriptions into multiple files.

Maintain a single authoritative finding ID and severity for the same underlying issue wherever possible.

### Scores

Retain the existing scoring system where it is clearly defined.

Recalculate scores only when the current evidence supports a meaningful change. Explain material score changes and ensure that all reports use consistent values.

Do not award higher scores merely because more code or documentation has been added.

Do not penalize the project for features or architectural components that do not exist and are not currently required.

Distinguish between:

- Not applicable.
- Not implemented.
- Not verified.
- Implemented but inadequate.
- Implemented and adequately supported by evidence.

A missing capability may be a genuine gap, but it should not automatically be treated as a defect without considering the project's requirements and maturity.

---

## 8. Evidence and Finding Quality

Every important finding must be grounded in the current implementation.

Use this format:

### Finding: [Stable ID] — [Title]

- **Severity:** Critical / High / Medium / Low / Recommendation
- **Status:** One of the defined lifecycle statuses
- **Location:** Exact file paths and relevant symbols
- **Evidence:** Specific implementation details or configuration
- **Previous assessment:** Earlier status, if available
- **Change since last audit:** Verified change or explicit unknown
- **Problem:** What is wrong or missing
- **Impact:** Practical consequences for correctness, security, reliability, maintainability, collaboration, or scalability
- **Recommendation:** The smallest effective improvement
- **Dependencies:** Related findings or prerequisites
- **Related reports:** Relevant audit files

Use precise, actionable explanations rather than vague statements.

Do not invent file paths, functions, test results, configuration, dependencies, or Git history.

When exact line numbers are available and stable, include them. Otherwise, use file paths and symbol names.

Differentiate observed facts from architectural inference and recommendations.

Do not expose actual secret values in audit reports. If a secret appears in the repository, document its location and risk without reproducing the credential.

---

## 9. Severity and Prioritization

Use the existing severity definitions:

- **CRITICAL** — A severe security, data integrity, correctness, availability, or architectural risk requiring immediate attention.
- **HIGH** — A significant issue that materially affects safe development, reliability, or team growth.
- **MEDIUM** — A meaningful issue suitable for planned remediation.
- **LOW** — A minor issue with limited impact.
- **RECOMMENDATION** — An optional improvement that is not necessarily a defect.

Do not inflate severity.

Prioritize findings based on actual impact, likelihood, exposure, affected functionality, and remediation urgency.

The priority action plan should distinguish:

1. Fix immediately.
2. Fix before significant team or product growth.
3. Fix during normal development.
4. Consider as a longer-term improvement.

For every priority item, include its finding ID, location, rationale, suggested solution, complexity estimate, dependencies, and expected benefit.

Clearly label estimates as estimates rather than measured facts.

---

## 10. Required Audit Deliverables

Preserve the existing file structure wherever possible.

The original audit structure includes:

- `00-executive-summary.md`
- `01-technology-stack.md`
- `02-repository-structure.md`
- `03-architecture-audit.md`
- `04-mvvm-audit.md`
- `05-code-quality.md`
- `06-ai-vibe-code-audit.md`
- `07-collaboration-readiness.md`
- `08-developer-onboarding.md`
- `09-installation-audit.md`
- `10-documentation-audit.md`
- `11-git-workflow.md`
- `12-dependency-audit.md`
- `13-testing-audit.md`
- `14-error-handling-logging.md`
- `15-api-audit.md`
- `16-database-audit.md`
- `17-security-audit.md`
- `18-cicd-deployment.md`
- `19-scalability-audit.md`
- `20-maintainability.md`
- `21-developer-experience.md`
- `22-technical-debt.md`
- `23-priority-action-plan.md`
- `24-new-developer-test.md`

Treat this list as the original baseline, not an instruction to recreate missing files blindly or force the repository into an outdated structure.

If an existing file has been renamed or reorganized, follow the current structure and maintain valid references.

For each new dimension, create a dedicated report only when justified by Section 6.

### Required additional deliverable: Audit index

Maintain or create `audit/README.md` as the audit navigation index.

It should contain:

- Audit purpose and scope.
- Last audit update date.
- Current repository revision, if verifiable.
- A list of audit files and their responsibilities.
- Links to new dimensions.
- Current critical and high-priority findings.
- A short explanation of how the audit is maintained.

Do not treat the index as a replacement for detailed reports.

### Executive summary

Update `00-executive-summary.md` to reflect the current implementation and current finding statuses.

Include:

- Overall verdict.
- Current assessment scores where supported.
- Current critical and high-severity findings.
- Significant improvements since the previous audit.
- New risks introduced by recent changes.
- Resolved findings and meaningful regressions.
- Architecture and collaboration readiness.
- Onboarding and installation readiness.
- Security and testing concerns.
- Top five risks most likely to cause problems over the next 1–3 years.
- The most valuable actions to take next.

### Priority action plan

Update `23-priority-action-plan.md` to reflect current priorities.

Remove resolved issues from active work lists while retaining useful historical references. Add new findings and revise priorities when the evidence warrants it.

### New developer test

Update `24-new-developer-test.md` to match the actual setup and contribution workflow.

Assess the journey from cloning the repository through configuration, running the application, testing, locating a feature, making a change, and preparing a contribution.

Use PASS, PARTIAL, FAIL, or UNKNOWN and explain the evidence for each result.

Do not claim to have successfully executed commands or tests that were not actually run.

---

## 11. Audit Update Workflow

Follow this workflow in order.

### Phase 1 — Discover

- Inventory existing audit reports.
- Inspect the repository structure.
- Review available Git changes and history.
- Identify changed and newly introduced components.
- Read the reports that describe the affected components.

### Phase 2 — Map

Build a mapping between changed components and audit dimensions.

For each significant change, determine:

- Which reports need updating.
- Which existing findings need revalidation.
- Whether the change introduces a new risk.
- Whether a new audit dimension is justified.
- Which cross-references, scores, and action items are affected.

### Phase 3 — Revalidate

Check existing findings against the current code.

Identify:

- Resolved issues.
- Partially resolved issues.
- Persistent issues.
- Regressions.
- New issues.
- Superseded findings.
- Findings that cannot be verified.

Do not assume that unchanged files are necessarily unaffected. Architectural changes in one component may alter the risks of another component.

### Phase 4 — Update

Update affected reports in place.

Create justified new reports.

Update the executive summary, audit index, action plan, and other cross-referenced reports when necessary.

Preserve valid historical context and stable finding IDs.

### Phase 5 — Consistency Review

Review the updated reports as one connected audit system.

Verify that:

- Finding IDs are stable and unique.
- Finding statuses agree across reports.
- Severity levels are consistent.
- Resolved findings are not still presented as active blockers.
- Scores and verdicts do not contradict the findings.
- New reports are linked from the index.
- File paths and symbols reflect the current implementation.
- Recommendations do not contradict one another.
- Every significant new architectural area is adequately covered.

### Phase 6 — Final Verification

Inspect the final diff.

Confirm that all intended changes are confined to audit documentation.

Check for accidental modifications outside `/audit/`, fabricated evidence, unsupported claims, broken references, duplicate reports, and incomplete updates.

If the audit directory itself does not exist, create it only when needed for the audit reports. Do not make unrelated changes to the repository.

---

## 12. Completion Criteria

The task is complete only when:

1. The current repository has been inspected sufficiently to understand its relevant architecture and changes.
2. Existing audit findings have been revalidated where applicable.
3. All materially affected reports have been updated.
4. New audit dimensions have been created when justified.
5. The executive summary and action plan reflect the current evidence.
6. The audit index accurately lists the available reports.
7. Cross-references, statuses, severity levels, and scores are consistent.
8. Historical context has been preserved where useful.
9. No application source code or non-audit configuration has been modified.
10. The final diff has been checked.

If a portion of the repository cannot be inspected, state the limitation and do not claim that the audit is complete for that area.

Do not mark the entire audit as fully verified if important dimensions remain unexamined.

---

## 13. Final Response

After updating the audit files, provide a concise completion report containing:

### A. Repository changes discovered

- Relevant codebase changes identified.
- Newly introduced modules or architectural areas.
- Whether the previous audit baseline could be established.

### B. Audit files updated

List the updated files and briefly explain the important changes.

### C. New audit dimensions

For every new report, provide its path, why it was necessary, and the new risks it covers.

If none were necessary, explicitly state that conclusion and why existing reports were sufficient.

### D. Finding lifecycle changes

Summarize important resolved findings, persistent risks, regressions, superseded findings, and newly discovered findings.

### E. Current priorities

List the most important actions based on the current evidence.

### F. Verification

State whether the audit documentation was checked for consistency and whether the final diff contains only intended audit-documentation changes.

Disclose any unverified areas, unavailable Git history, commands not executed, or limitations that affect confidence in the result.

Do not claim success for any verification that was not performed.

---

## Final Instruction

Begin by inspecting the current repository and its existing audit reports.

Do not ask for the technology stack or a list of changed files if the repository can provide that information.

Do not make assumptions based solely on the previous audit.

**Update the audit to describe the codebase that exists now, not the codebase that existed when the audit was first written.**

Preserve what remains valid, correct what has become outdated, close findings only when evidence supports closure, discover risks introduced by new code, and create new audit dimensions when the existing structure is no longer sufficient.

The goal is a living, internally consistent, evidence-based architecture audit that remains useful throughout the product's development.