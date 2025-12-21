# Phase 4: AI & Automation Framework - Implementation Guide

## Overview

Phase 4 implements a **safe, auditable, and deeply integrated AI and automation framework** for business operations. The system operates entirely server-side, uses schema-first development, is context-aware, non-destructive, and fully auditable.

## Core Principles

1. ✅ **Server-side only** - No browser keys, no chat toys
2. ✅ **Schema-first development** - All AI outputs validate against strict JSON schemas
3. ✅ **Context-aware** - AI uses business data, not generic prompts
4. ✅ **Non-destructive** - AI augments, never silently overwrites human work
5. ✅ **Fully auditable** - Log every AI action and its context
6. ✅ **Actionable outputs** - Feed workflows, not standalone text

## Architecture

### Directory Structure

```
functions/src/ai/
├── types.ts                    # TypeScript interfaces and types
├── registry.ts                 # Prompt and schema registry with versioning
├── service.ts                  # Core AI service with logging and validation
├── proposal-generation.ts      # Phase 4.2: Proposal draft generation
├── section-regeneration.ts     # Phase 4.3: Section-level regeneration
├── proposal-risk-analysis.ts   # Phase 4.4: Proposal risk analysis
├── engagement-intelligence.ts  # Phase 4.5: Engagement summaries
├── risk-detection.ts           # Phase 4.6: Early warning signals
└── additional-functions.ts     # Phases 4.7-4.11
```

## Phase 4.1: AI Infrastructure & Governance

### Core Components

#### 1. **AI Service Layer** (`ai/service.ts`)
Central service handling all AI execution with:
- Gemini AI integration (Vertex AI)
- Input/output validation using JSON schemas
- Comprehensive execution logging
- Snapshot storage for audit trails
- Error handling and recovery

#### 2. **Prompt Registry** (`ai/registry.ts`)
Versioned prompt templates for:
- Proposal generation
- Section regeneration
- Risk analysis
- Engagement summaries
- Knowledge extraction
- Case study drafting
- Decision briefs
- Client summaries

Each template includes:
- System prompt for AI behavior
- Input/output schemas
- Constraints and validation rules
- Version tracking

#### 3. **Schema Registry** (`ai/registry.ts`)
JSON schemas for validating AI outputs:
- `proposal-content-v1` - Complete proposal structure
- `risk-analysis-v1` - Risk assessment format
- `engagement-summary-v1` - Project status format
- `knowledge-extraction-v1` - Insights format
- `case-study-draft-v1` - Case study structure
- `decision-brief-v1` - Decision brief format
- `client-summary-v1` - Client-facing summary

#### 4. **Execution Logging** (`aiExecutionLogs` collection)
Every AI execution logs:
- Organization, entity type, entity ID
- Action type (generate, regenerate, analyze, etc.)
- Prompt ID and version
- Schema ID and version
- Executor (user ID and role)
- Timestamp and duration
- Input/output snapshots (Cloud Storage for large data)
- Validation status and errors
- Model information and token usage

**Audit Questions Answered:**
- What did AI do? ✅
- When did it happen? ✅
- Based on what input? ✅
- Who triggered it? ✅
- Was the output valid? ✅

## Phase 4.2: Proposal Draft Generation

### Function: `generateProposalDraft`

**Purpose:** Generate complete proposal drafts from discovery answers and business context.

**Inputs:**
- `orgId` - Organization ID
- `proposalId` - Proposal ID
- `discoveryAnswers` - Client discovery responses
- `serviceTemplateId` - Optional service template

**Process:**
1. Fetch business profile (org data)
2. Fetch client profile (proposal data)
3. Fetch service template (if provided)
4. Fetch historical successful proposals for context
5. Build structured prompt with business context
6. Call AI with schema validation
7. Store generated content in proposal
8. Log execution and create audit trail

**Outputs:**
- Executive summary
- Diagnosis
- Scope
- Methodology
- Deliverables with acceptance criteria
- Timeline with milestones
- Assumptions and exclusions
- Acceptance criteria
- Next steps

**Security:** Staff and admin only

## Phase 4.3: Section-Level Regeneration

### Function: `regenerateProposalSection`

**Purpose:** Regenerate specific sections without modifying locked content.

**Key Features:**
- Non-destructive editing
- Locked section preservation
- Version history tracking
- Full proposal context awareness

**Process:**
1. Verify section exists and is not locked
2. Pass full proposal context to AI
3. Regenerate only the specified section
4. Store previous version for audit
5. Update proposal with new content
6. Preserve pricing, milestones, and terms

**Security:** Staff and admin only, respects locked sections

## Phase 4.4: Proposal Risk Analysis

### Function: `analyzeProposalRisk`

**Purpose:** Assess proposals for pricing, scope, timeline, and delivery risks.

**Risk Categories:**
- **Pricing** - Underpricing, model mismatch, unrealistic margins
- **Scope** - Unclear requirements, scope creep potential
- **Timeline** - Unrealistic deadlines, insufficient buffer
- **Deliverables** - Ambiguous acceptance criteria
- **Resources** - Skill gaps, capacity constraints

**Outputs:**
- Risk flags with severity and evidence
- Overall risk score (0-100)
- Confidence score
- Suggested adjustments (non-binding)

**Usage:** Staff-only "Proposal Health" assessments before sending to clients

## Phase 4.5: Engagement Intelligence

### Function: `generateEngagementSummary`

**Purpose:** Generate instant project status awareness.

**Inputs:**
- Project data
- Recent updates and activities
- Current risks
- Change requests
- Client interactions

**Outputs:**
- Executive summary (2-3 sentences)
- Progress vs plan (status, %, details)
- Major risks
- Upcoming decisions
- Client sentiment assessment

**Usage:** Internal/client dashboards, status reports

## Phase 4.6: Early Warning & Risk Signals

### Function: `detectEngagementRisk`

**Purpose:** Proactive detection of project health issues.

**Monitored Signals:**
- Missed milestones
- Repeated revisions
- Delayed responses
- Excessive scope changes
- Low decision velocity

**Outputs:**
- Risk score (0-100) and level
- Detected issues with evidence
- Recommended mitigations with priority

**Actions:**
- Update project health status
- Create high-priority alerts for critical risks
- Notify project managers

**Security:** Staff-only for proactive risk management

## Phase 4.7: Knowledge Extraction & Reuse

### Function: `extractReusableInsights`

**Purpose:** Automatically extract lessons learned from completed projects.

**Trigger:** Project closure or manual execution

**Outputs:**
- Patterns (repeatable approaches)
- Frameworks (structured methodologies)
- Pitfalls (things to avoid)
- Best practices
- Draft knowledge base entry

**Workflow:** Human review → knowledge base entry → compounding intellectual capital

## Phase 4.8: Proof & Case Study Drafting

### Function: `draftCaseStudy`

**Purpose:** Generate compelling case studies from project outcomes.

**Inputs:**
- Project outcomes and metrics
- Client quotes (approved)
- Anonymization preference

**Outputs:**
- Structured draft (challenge, approach, outcome, metrics)
- SEO suggestions (keywords, meta description, slug)
- Testimonial integration

**Workflow:** Internal review → client approval → publishing

## Phase 4.9: Decision Briefs

### Function: `generateDecisionBrief`

**Purpose:** Generate executive decision briefs for major decisions.

**Outputs:**
- Situation summary (1-2 pages)
- Options with pros, cons, and risks
- Recommendation with rationale and assumptions
- Risk assessment

**Usage:** Before major decisions, project transitions, strategic choices

## Phase 4.10: AI in the Operating Rhythm

### Scheduled Functions

#### `weeklyPipelineHealthReport`
**Schedule:** Every Sunday 00:00
**Generates:**
- Pipeline metrics (leads, proposals, conversion rates)
- Pipeline health assessment
- Upcoming decisions

#### `weeklyDeliveryHealthReport`
**Schedule:** Every Sunday 01:00
**Generates:**
- Active project count
- Project status breakdown (on-track, at-risk, delayed)
- Delivery risks
- Upcoming milestones

**Deliverable:** Self-reviewing, consistently monitored operations

## Phase 4.11: Client-Facing AI

### Function: `getClientEngagementSummary`

**Purpose:** Provide clarity-enhancing status updates to clients.

**Strictly Limited To:**
- Current engagement summary
- Required client actions
- Change updates since last review

**Prohibited:**
- Speculative advice
- Internal risk assessments
- Pricing logic
- Resource constraints

**Security:** Client-role access with project verification

## Data Models

### AI Execution Log
```typescript
{
  id: string
  orgId: string
  entityType: string
  entityId: string
  actionType: 'generate' | 'regenerate' | 'analyze' | 'summarize' | 'extract' | 'detect'
  promptId: string
  promptVersion: string
  schemaId: string
  schemaVersion: string
  executedBy: string
  executedByRole: string
  executionTimestamp: Timestamp
  durationMs: number
  inputSnapshot: { storagePath?, sizeBytes, summary, hash? }
  outputSnapshot: { storagePath?, sizeBytes, summary, hash? }
  validationStatus: 'passed' | 'failed' | 'partial'
  validationErrors?: string[]
  schemaCompliant: boolean
  warnings?: string[]
  confidenceScore?: number
  modelName: string
  modelVersion: string
  temperature?: number
  tokensUsed?: number
  previousVersionRef?: string
  modifiedSections?: string[]
  humanReviewed?: boolean
  humanReviewedBy?: string
  humanReviewedAt?: Timestamp
  metadata?: Record<string, unknown>
  tags?: string[]
}
```

## Security & Access Control

### Role-Based Access

| Function | Admin | Staff | Client |
|----------|-------|-------|--------|
| Generate Proposal Draft | ✅ | ✅ | ❌ |
| Regenerate Section | ✅ | ✅ | ❌ |
| Analyze Proposal Risk | ✅ | ✅ | ❌ |
| Generate Engagement Summary | ✅ | ✅ | ✅ (own projects) |
| Detect Engagement Risk | ✅ | ✅ | ❌ |
| Extract Insights | ✅ | ✅ | ❌ |
| Draft Case Study | ✅ | ✅ | ❌ |
| Generate Decision Brief | ✅ | ✅ | ❌ |
| Client Summary | ✅ | ✅ | ✅ (own projects) |

## Deployment

### Install Dependencies
```bash
cd functions
npm install
```

### Build Functions
```bash
npm run build
```

### Deploy to Firebase
```bash
npm run deploy
```

### Environment Variables
Ensure the following are set:
- `GCLOUD_PROJECT` - Google Cloud project ID (auto-set in Firebase Functions)

## Usage Examples

### Generate Proposal Draft
```typescript
const result = await generateProposalDraft({
  orgId: 'org123',
  proposalId: 'proposal456',
  discoveryAnswers: {
    challenge: 'Need to modernize legacy systems',
    timeline: 'Q1 2024',
    budget: '$100k'
  },
  serviceTemplateId: 'template789'
});
```

### Analyze Proposal Risk
```typescript
const riskAnalysis = await analyzeProposalRisk({
  orgId: 'org123',
  proposalId: 'proposal456'
});

// Returns:
// - riskFlags: [{ category, severity, description, evidence }]
// - overallRiskScore: 45 (0-100)
// - suggestedAdjustments: [{ field, currentValue, suggestedValue, rationale }]
```

### Detect Engagement Risk
```typescript
const riskDetection = await detectEngagementRisk({
  orgId: 'org123',
  projectId: 'project789'
});

// Automatically calculates signals:
// - missedMilestones: 2
// - repeatedRevisions: 3
// - delayedResponses: 4
// - scopeChanges: 1
// - decisionVelocity: 7 days
```

## Monitoring & Audit

### Query AI Execution History
```typescript
const aiService = getAIService();
const history = await aiService.getExecutionHistory('proposal', 'proposal456', 10);
```

### Get Audit Trail
```typescript
const auditTrail = await aiService.getAuditTrail(
  'org123',
  'proposal',
  'proposal456',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

### Retrieve Stored Snapshots
```typescript
const snapshot = await aiService.getSnapshot('gs://bucket/path/to/snapshot.json');
```

## Testing

### Manual Testing with Firebase Emulators
```bash
cd functions
npm run serve
```

### Call Functions from Client
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateProposal = httpsCallable(functions, 'generateProposalDraft');

const result = await generateProposal({
  orgId: 'org123',
  proposalId: 'proposal456',
  discoveryAnswers: { /* ... */ }
});
```

## Completion Criteria ✅

- [x] No AI calls from the browser
- [x] All outputs are structured, validated, and logged
- [x] Sales, delivery, and operations benefit directly
- [x] AI enhances human judgment without replacing it
- [x] System is trustworthy for weekly reliance

## Key Benefits

### For Sales
- Faster proposal generation with business context
- Risk assessment before sending
- Historical learning from successful proposals

### For Delivery
- Instant project status awareness
- Early warning of potential issues
- Proactive risk detection and mitigation

### For Operations
- Automated knowledge capture
- Self-reviewing weekly reports
- Executive decision support

### For Clients
- Clear, actionable status updates
- Transparency without confusion
- No speculation or internal risks

## Future Enhancements

1. **Advanced Analytics**
   - ML models for better risk prediction
   - Sentiment analysis on client interactions
   - Predictive milestone completion

2. **Integration Expansion**
   - Slack/Teams notifications for critical alerts
   - Email digest generation
   - Calendar integration for milestone tracking

3. **Enhanced Learning**
   - Feedback loops for improving prompts
   - A/B testing different prompt versions
   - Custom fine-tuning on org-specific patterns

## Support & Documentation

- Technical documentation: `/docs/phase4-technical.md`
- API reference: `/docs/phase4-api.md`
- Architecture diagrams: `/docs/phase4-architecture.md`

## License

Proprietary - All rights reserved
