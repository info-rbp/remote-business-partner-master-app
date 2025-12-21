# Phases 7 & 8: Governance + Learning System

## Quick Reference: Phase 7 vs Phase 8

| Aspect | Phase 7 (Governance) | Phase 8 (Learning) |
|--------|---|---|
| **Purpose** | Control scope drift, manage risk, log decisions | Capture insight, validate it, reuse it |
| **Core Entity** | ChangeRequest7, Risk7, Decision7 | KnowledgeItem8, Debrief8, Candidate8 |
| **Trigger** | Scope changes, risk identification, decisions | Project completion, manual debrief |
| **AI Role** | None | Assists extraction (supervised) |
| **Human Role** | Approve/reject changes, own risks, decide | Review candidates, promote confidence |
| **Output** | Audit trail, governance records | Reusable knowledge, learning metrics |
| **Prevents** | Silent scope drift, unowned risks | Repeated mistakes, lost insights |
| **Enables** | Professionalism, accountability | Continuous improvement, scaling |

---

## Workflow: Governance + Learning Together

### A Typical Project Lifecycle

```
1. PROPOSAL PHASE
   └─ Phase 8: System suggests relevant knowledge
      (e.g., "Rapid Response checklist")
   
2. DELIVERY PHASE
   ├─ Phase 6: Project runs
   ├─ Phase 7: Changes logged, risks owned, decisions recorded
   └─ Phase 8: Knowledge linked in decisions (context capture)

3. COMPLETION PHASE
   ├─ Phase 7: Red flags checked (monthly health)
   ├─ Phase 8: Project marked complete → debrief triggered
   │   ├─ What worked? (informs reuse)
   │   ├─ What failed? (flags knowledge for assessment)
   │   └─ Unexpected issues? (new patterns emerge)
   │
   └─ Phase 8: AI extracts candidates → staff reviews → knowledge created
      (Each new item linked back to this project as source)

4. RETROSPECTIVE PHASE (3-6 months later)
   ├─ Phase 7: Decision logs show "why we chose X"
   ├─ Phase 8: Knowledge shows "how we do X now"
   └─ New proposal: Both inform better thinking
```

---

## Data Flow: Where Phase 7 & 8 Connect

```
┌─────────────────────────────────────────────────────────────┐
│                    Project Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

        Phase 6: Delivery Executes
                    ↓
        Phase 7: Changes, Risks, Decisions Logged
                    ↓
        Project Completed (status = 'completed')
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
Phase 7:                        Phase 8:
- Check Red Flags              - Debrief Triggered
- Archive/Close Decisions      - Reflection Captured
- Final Risk Status            - AI Extracts Candidates
                                    ↓
                               - Staff Reviews
                                    ↓
                               - Knowledge Created (draft)
                                    ↓
                               - Usage Tracked
                                    ↓
                               - Health Monitored
                                    ↓
    ┌───────────────┬───────────────┐
    ↓               ↓               ↓
Future:          Know:           Know:
Proposals        - What           - How
use this         worked?          to do it?
knowledge        - What
                 failed?
```

---

## Key Integration Points

### 1. Decisions Link to Knowledge
```typescript
// Phase 7: Decision logged
appendDecision({
  title: 'Use incremental delivery gates',
  context: 'Client engagement + scope control',
  relatedChangeRequestId: crId,
});

// Phase 8: Later, knowledge extracted from debrief
// "Incremental Delivery Checkpoints" playbook created
// Both capture the same insight from different angles:
// - Decision: WHY we chose this
// - Knowledge: HOW to replicate it
```

### 2. Red Flags Inform Debrief
```typescript
// Phase 7: Red flag detected
// "Deliverable stuck in changes_requested (v4)"

// Phase 8: Staff writes debrief
// "What didn't work: Unclear acceptance criteria caused revision cycle"
// →  Knowledge extracted: "Caution: Requirements without sign-off"
```

### 3. Knowledge Used, Outcomes Tracked
```typescript
// Phase 8: Knowledge used in proposal
// linkedKnowledgeIds: ["incremental-delivery-id"]

// Later: If project succeeds or fails
// Phase 8: Knowledge outcome updated
// linkedOutcomes: [{ projectId: "proj-123", outcome: "success" }]

// Health check: Uses this to assess knowledge confidence
```

### 4. Governance + Learning Audit Trail
```
auditLogs:
├─ "change_request_created"
├─ "decision_logged"
├─ "debrief_submitted"
├─ "knowledge_item_created"
├─ "candidate_approved"
└─ "knowledge_used_in_proposal"

→ Complete story: What changed, why, what we learned, what we reuse
```

---

## How This Creates Scaling

### Year 1 Baseline
```
Phase 6: Delivery works
Phase 7: Scope controlled (prevents disasters)
Phase 8: Knowledge captured (raw, mostly draft)
```

### Year 2 Cumulative
```
Phase 6: Delivery smooths (fewer surprises)
Phase 7: Patterns visible in decision logs
Phase 8: Knowledge base > 30 items (validated)
         Reuse in proposals +40% faster
         Risk assessment informed by prior outcomes
```

### Year 3+ Compounding
```
Phase 6: Delivery predictable (repeatable patterns)
Phase 7: Decisions get faster (precedents clear)
Phase 8: Knowledge base > 100 items (30+ proven)
         New proposals leverage proven patterns
         Training onboards staff via knowledge base
         Pricing reflects learning (fewer unknowns)
```

---

## Why Both Phases Are Required

### Phase 7 Alone
- ✅ Professional, auditable, accountable
- ❌ Doesn't improve automatically
- ❌ Decisions repeat themselves
- ❌ New staff learn via hard experience

### Phase 8 Alone
- ✅ Learning accumulates
- ❌ No governance (knowledge becomes opinion)
- ❌ Reuse without validation (spreads mistakes)
- ❌ No accountability (who approved this?)

### Phase 7 + Phase 8 Together
- ✅ Professional AND learning
- ✅ Decisions informed by precedent
- ✅ Reuse validated before scaling
- ✅ New staff learn from knowledge base
- ✅ Continuous improvement visible

---

## Operations Checklist: Phases 7 + 8

### Weekly (Phase 7)
- [ ] Review open change requests
- [ ] Assess new risks
- [ ] Log decisions (if scope changed)

### Weekly (Phase 8)
- [ ] Review proposals for knowledge reuse
- [ ] Record usage when knowledge linked

### Monthly (Phase 7)
- [ ] Red flag check (automatic)
- [ ] Review overdue risks

### Monthly (Phase 8)
- [ ] Knowledge health check (automatic)
- [ ] Review candidates for approval

### Quarterly (Phase 8)
- [ ] Promote validated knowledge (if 2+ uses, all successful)
- [ ] Archive unused or failed knowledge
- [ ] "Most valuable knowledge" report
- [ ] Training: New staff learn from knowledge base

### Annually
- [ ] Retrospective: Review 12 months of decisions
- [ ] Retrospective: Review 12 months of reused knowledge
- [ ] Identify gaps (what knowledge don't we have?)
- [ ] Plan knowledge capture for next year

---

## Common Mistakes to Avoid

### Phase 7 Mistakes
- ❌ **"We'll just fix scope later"** → Use change requests from day 1
- ❌ **"Risk is everyone's job"** → Assign clear ownerId
- ❌ **"Decisions are obvious"** → Log them anyway (for precedent)

### Phase 8 Mistakes
- ❌ **"Let AI publish knowledge"** → Supervisor review always
- ❌ **"Generic templates are enough"** → Capture contextual insight
- ❌ **"We'll extract knowledge eventually"** → Debrief at completion, not later
- ❌ **"One-time capture is fine"** → Systematic reuse is the point

### Governance + Learning Mistakes
- ❌ **"Phases 7 & 8 can wait"** → They're non-negotiable infrastructure
- ❌ **"We'll skip the boring audits"** → Audits prove value later
- ❌ **"Knowledge is nice-to-have"** → It's your unfair advantage

---

## Next: Phase 9 (Preview)

After Phases 7 & 8, you have:
- ✅ Governance: Scope + risk + decisions logged
- ✅ Learning: Insight captured + reused
- ❓ What's missing?

**Phase 9 (next): Operating Rhythm**
- Daily: Dashboard of health (red flags, pending approvals)
- Weekly: Status reports that auto-pull Phase 7 & 8 data
- Monthly: Digest of risks, changes, decisions, and learning
- Quarterly: "What are we actually learning?" review

(Speculative; not yet implemented)

---

## References

- [Phase 7 Implementation](PHASE7_IMPLEMENTATION.md)
- [Phase 8 Implementation](PHASE8_IMPLEMENTATION.md)
- Firestore paths: `orgs/{orgId}/projects/{projectId}/[changeRequests|risks|decisions|redFlags|debriefs]`
- Audit trail: `auditLogs` (global, org-scoped)

---

## Summary

**Phases 7 & 8 together form the backbone of a learning organization:**

Phase 7 ensures **nothing happens silently**
Phase 8 ensures **the organization learns from what happens**

Without Phase 7: You improve by accident (chaotic)
Without Phase 8: You improve slowly (inefficient)
Without both: You don't improve at all (stuck)

With both: You scale while keeping excellence (unfair advantage)
