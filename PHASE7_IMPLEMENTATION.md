# Phase 7: Governance & Scope Control Implementation

**Status**: ✅ Foundation Complete

This document summarizes Phase 7's implementation: strict change management, risk ownership, decision logging, and automated red flags.

---

## Overview

Phase 7 ensures:
- **No change without a record** → ChangeRequest7 (Firestore-first)
- **No approval without impact visibility** → ImpactAssessment required before approval
- **No risk without an owner** → Risk7 with mandatory ownerId
- **No decision without context** → Decision7 immutable logs
- **No retrospection without evidence** → AuditLog on every write

---

## Architecture

### Data Models (Firestore)

All Phase 7 entities live under org-scoped projects:

```
orgs/{orgId}/
  projects/{projectId}/
    changeRequests/
      {changeRequestId}        → ChangeRequest7
    risks/
      {riskId}                 → Risk7
    decisions/
      {decisionId}             → Decision7
    redFlags/
      {flagId}                 → RedFlag7
    activity/
      {activityId}             → ProjectActivity6 (existing)
```

#### ChangeRequest7
- **Status workflow**: `draft` → `under_review` → `approved|rejected|repriced`
- **Client requests always start as `draft`** (Phase 7.1 rule)
- **Internal escalations start as `under_review`** (fast-track)
- **Impact assessment** required before approval/repricing
- **Repricing** normalizes renegotiation (not awkward)
- **linkedRequestId** connects to Phase 6 client requests (no duplication)

```typescript
interface ChangeRequest7 {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description: string;
  source: 'client' | 'internal';
  linkedRequestId?: string;
  status: ChangeRequest7Status;
  requestedBy: { userId: string; role: UserRole };
  impact?: ChangeRequest7Impact;     // Assessed by staff/admin
  repricing?: { revisedCost, revisedTimeline, ... };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Risk7
- **Required**: Every risk must have an `ownerId` (non-negotiable)
- **Severity derived** from likelihood × impact matrix
- **Status lifecycle**: `open` → `mitigated|accepted|closed`
- **Closed risks retain history** (no deletion, append-only)
- **Categories**: delivery, scope, client, financial, dependency

```typescript
interface Risk7 {
  id: string;
  title: string;
  description: string;
  category: Risk7Category;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  severity: Risk7Severity;           // Derived
  mitigationPlan?: string;
  ownerId: string;                   // REQUIRED
  status: Risk7Status;
  createdAt: Timestamp;
  closedAt?: Timestamp;              // Retained for history
}
```

#### Decision7
- **Immutable**: Once logged, no edits (append-only philosophy)
- **Linked to change requests** where relevant
- **Full context stored**: optionsConsidered, rationale
- **Types**: scope, timeline, cost, priority

```typescript
interface Decision7 {
  id: string;
  title: string;
  context: string;                   // Why this decision existed
  optionsConsidered?: string[];
  decisionOutcome: string;
  decisionType: 'scope' | 'timeline' | 'cost' | 'priority';
  relatedChangeRequestId?: string;
  decidedBy: string;
  decidedAt: Timestamp;
}
```

#### RedFlag7
- **Non-blocking signals** (inform, not prevent)
- **Computed daily** via scheduled function
- **Auto-surfaces** issues before they become incidents
- **Rules**: milestone overdue, deliverable stuck, client inactive, update missing, unresolved changes

```typescript
interface RedFlag7 {
  id: string;
  orgId: string;
  projectId: string;
  level: 'info' | 'warning' | 'critical';
  source: 'project' | 'milestone' | 'deliverable';
  sourceId?: string;
  rule: 'milestone_overdue' | 'deliverable_stuck' | ...;
  message: string;
  detectedAt: Timestamp;
}
```

---

## Implementation

### 1. Type Definitions (`src/types/data-models.ts`)
- ✅ `ChangeRequest7`, `ChangeRequest7Impact`
- ✅ `Risk7` with derived severity
- ✅ `Decision7` (immutable)
- ✅ `RedFlag7` (non-blocking)

### 2. Governance Helpers (`src/lib/governance.ts`)
Server-side functions implementing Phase 7 rules:

#### Change Requests
- `submitChangeRequest()` → creates CR (draft if client, under_review if internal)
- `moveToReview()` → client → under_review escalation
- `recordImpact()` → staff/admin assess before approval
- `approveChangeRequest()` → guards: impact required
- `rejectChangeRequest()` → with rationale
- `repriceChangeRequest()` → triggers commercial renegotiation

#### Risks
- `logRisk()` → create with mandatory ownerId + derived severity
- `updateRiskStatus()` → transition lifecycle (open → mitigated → closed)
- Severity calculation: `(likelihood + impact) → low|medium|high|critical`

#### Decisions
- `appendDecision()` → immutable log entry
- Auto-linked to change requests where relevant

#### Red Flags
- `upsertRedFlag()` → idempotent write (merge-safe)

### 3. Server Actions (`src/app/projects/actions.ts`)
Next.js server actions wired to governance helpers:

```typescript
export async function createChangeRequest(orgId, projectId, payload, formData)
export async function assessChangeImpact(orgId, projectId, changeRequestId, impact, formData)
export async function approveChange(orgId, projectId, changeRequestId, formData)
export async function rejectChange(orgId, projectId, changeRequestId, rationale, formData)
export async function repriceChange(orgId, projectId, changeRequestId, payload, formData)

export async function createRisk(orgId, projectId, payload, formData)
export async function setRiskStatus(orgId, projectId, riskId, status, formData)

export async function logDecision(orgId, projectId, payload, formData)
```

All actions write to `projects/{projectId}/activity` timeline for audit trail.

### 4. Cloud Functions (`functions/src/phase7.ts`)

#### Scheduled: Red Flags Check (Daily)
- `checkRedFlags()` → 24-hour job
- Scans all projects for:
  - Milestone overdue by X days
  - Deliverable stuck in changes_requested
  - Client inactive for 7+ days
  - Weekly update missing/stale
  - Unresolved change requests ≥3
- Writes deterministic flags (upsertable)

#### Triggers: Integration with Phase 6

**On Client Request Created**
- If `submittedBy='client'` AND `type='request'`
- Auto-creates `ChangeRequest7` in `draft` status
- Links via `linkedRequestId` (no duplication)
- Example: Portal → "I need X" → CR automatically created

**On Deliverable Updated**
- Tracks version increments
- If `status='changes_requested'` AND `version >= 3`
- Auto-suggests CR (escalates repeated revisions)
- Triggers renegotiation conversation

#### Audit Logging
- `onChangeRequestWrite()` → logs CR creation
- `onRiskCreated()` → logs risk identification
- `onDecisionCreated()` → logs decision append
- All feed `auditLogs` collection (governance trail)

---

## Workflow Examples

### Example 1: Client Submits Scope Change

1. Client accesses Portal → "Request Change"
2. `submitChangeRequest({ source: 'client' })` → CR created with `status='draft'`
3. Staff reviews → `moveToReview()` → `status='under_review'`
4. Staff assesses: 20 extra hours, $5k cost
5. `recordImpact({ timeImpact: 20, costImpact: 5000, scopeImpact: '...' })` → filled
6. Staff: "I recommend approval" → `approveChangeRequest()` → `status='approved'`
7. Decision logged: `appendDecision({ decisionType: 'scope', relatedChangeRequestId: crId })`
8. **Client visibility**: Sees request, impact summary, decision outcome (not internal margins)

### Example 2: Repeated Deliverable Revisions → Auto CR

1. Deliverable submitted → Client requests changes (v2)
2. Revised → Client: "More changes" (v3)
3. Revised → Client: "Still not right" (v4)
4. Trigger fires: `onDeliverableUpdated(v4)`
5. Auto-creates CR: "Revisions exceed threshold"
6. Staff escalates: "Scope change, not free revisions"
7. `repriceChange({ revisedCost: original + 2k, ... })`
8. **Result**: Commercial conversation surfaces, not buried in task comments

### Example 3: Red Flag Triggers Daily

1. Milestone due 3 days ago, still open → flag detected
2. `checkRedFlags()` daily job runs
3. Flag upserted: `{ level: 'warning', rule: 'milestone_overdue', message: 'MS X overdue' }`
4. Staff dashboard auto-pulls red flags
5. Weekly update draft: "⚠️ Risks: MS overdue"
6. **Result**: Issues surface, no silent drift

---

## Permissions & Guardrails

### Who Can Do What (Phase 7.7)

| Role | Can Submit CR? | Can Assess Impact? | Can Approve? | Can Close Risk? | Can Delete History? |
|------|---|---|---|---|---|
| **Client** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Staff** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |

### Hard Stops (Non-Negotiable)
- ❌ **Clients cannot approve scope changes** → only internal decision
- ❌ **Staff cannot approve repricing alone** → requires admin
- ❌ **No one can delete risk or decision history** → append-only

---

## Audit Trail (Phase 7.8)

Every action logs: who, what, when, why

```typescript
interface AuditLog {
  orgId: string;
  eventType: 'change_request_created' | 'risk_identified' | 'decision_logged' | ...;
  eventDescription: string;
  actor: string;
  actorRole: UserRole;
  targetType: string;
  targetId: string;
  changes?: Record<string, { before; after }>;
  timestamp: Timestamp;
}
```

Feeds:
- **Dispute resolution**: "Client agreed to X on Y date, here's the log"
- **Retrospectives**: "Why did we miss this milestone? Risk was logged, action plan was..."
- **Governance confidence**: Complete chain of custody for every decision

---

## Integration with Other Phases

### Phase 6 (Delivery)
- **No duplication**: Client requests (Phase 6) → Change Requests (Phase 7)
- Deliverable revisions beyond threshold auto-suggest CR
- Weekly updates reference: open risks, approved changes, pending decisions

### Phase 4 (AI)
- Red flags feed **weekly delivery health reports**
- Risk summaries auto-pulled for decision briefs
- Decision logs inform **knowledge extraction** (why did we choose this?)

---

## Quick Start: Using Phase 7

### For Staff (Creating/Assessing Changes)
```typescript
// 1. Submit a change
const { id: crId } = await createChangeRequest(orgId, projectId, {
  title: 'Client needs report addition',
  description: 'Wants a dashboard summary section',
  source: 'client',
}, formData);

// 2. Assess impact (before approval)
await assessChangeImpact(orgId, projectId, crId, {
  timeImpact: 16,           // hours
  costImpact: 2000,         // currency
  timelineImpact: 7,        // days
  scopeImpact: 'Requires new API endpoint',
}, formData);

// 3. Decide: Approve or Reprice?
await approveChange(orgId, projectId, crId, formData);
// OR
await repriceChange(orgId, projectId, crId, {
  revisedCost: 25000,
  revisedTimelineDays: 103,
}, formData);
```

### For Admin (Risk & Decision Governance)
```typescript
// Log a risk
const { id: riskId } = await createRisk(orgId, projectId, {
  title: 'API vendor SLA risk',
  category: 'dependency',
  likelihood: 'medium',
  impact: 'high',
  ownerId: 'pm-user-id',
}, formData);

// Log decision
await logDecision(orgId, projectId, {
  title: 'Use REST + polling instead of WebSocket',
  context: 'Vendor SLA dropped below SLA; WebSocket not guaranteed',
  optionsConsidered: ['Migrate to different vendor', 'Implement polling', 'Accept risk'],
  decisionOutcome: 'Polling with 5-min intervals',
  decisionType: 'scope',
  relatedChangeRequestId: crId,
}, formData);
```

### For Clients (Portal View)
```typescript
// See pending requests and outcomes
GET /api/projects/{projectId}/changeRequests
  → [{ title, impact: { timeImpact, costImpact }, status, decision }]
  → No internal margin commentary shown
```

---

## Completion Checklist

Phase 7 is **✅ foundationally complete** when:

- [x] All scope changes logged as ChangeRequest7
- [x] Impact assessed before approval (enforcement via `ensureImpactComplete()`)
- [x] Repricing normalized and traceable (repriceChangeRequest workflow)
- [x] Risks owned and tracked (mandatory ownerId, derived severity)
- [x] Red flags surface automatically (daily scheduled job)
- [x] Decisions logged with context (append-only Decision7)
- [x] No silent scope drift (triggers auto-escalate deliverable revisions)
- [x] Integration with Phase 6 (linkedRequestId, activity timeline)
- [x] Audit logging on every write (change, risk, decision)
- [x] Permissions enforced (client can submit, not approve)

**Next steps** (UI Layer):
- Build dashboard components to visualize CR status, risks, decisions
- Implement client portal view for change request outcomes
- Wire red flags into weekly update auto-pull
- Permission checks in frontend (readonly for clients, edit for staff/admin)

---

## Files Modified

| File | Change |
|------|--------|
| `src/types/data-models.ts` | Added ChangeRequest7, Risk7, Decision7, RedFlag7 types |
| `src/lib/governance.ts` | New: Core Phase 7 functions (governance helpers) |
| `src/app/projects/actions.ts` | Added Phase 7 server actions |
| `functions/src/phase7.ts` | New: Scheduled red flags, integration triggers, audit logging |
| `functions/src/index.ts` | Imported and exported Phase 7 functions |

---

## References

- **Phase 7 Spec**: See `IMPLEMENTATION.md` (user attachment)
- **Firestore Schema**: org → projects → [changeRequests, risks, decisions, redFlags]
- **RBAC**: Staff can assess/recommend; only Admin approves scope changes
- **Audit**: Every action logged in `auditLogs` collection

**The uncomfortable truth**: Phase 7 will feel strict. Don't bypass it "just this once". This is the difference between being helpful and being taken advantage of.
