# Phase 4 Migration & Deployment Guide

## Prerequisites

- Node.js 20+
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project configured
- Firestore database set up
- Cloud Storage bucket configured
- Vertex AI API enabled in Google Cloud

## Step 1: Install Dependencies

```bash
cd functions
npm install
```

New dependencies added:
- `ajv@^8.12.0` - JSON schema validation

## Step 2: Firestore Security Rules

Add the following to `firestore.rules`:

```javascript
// AI Execution Logs - Staff only
match /aiExecutionLogs/{logId} {
  allow read: if isStaffMember();
  allow write: if false; // Server-side only
}

// Risk Analysis - Staff only
match /orgs/{orgId}/proposals/{proposalId}/riskAnalysis/{analysisId} {
  allow read: if isStaffMember();
  allow write: if false; // Server-side only
}

// Knowledge Base Drafts - Staff only
match /orgs/{orgId}/knowledgeBase/drafts/{draftId} {
  allow read: if isStaffMember();
  allow write: if isStaffMember();
}

// Case Studies - Staff only until published
match /orgs/{orgId}/caseStudies/{studyId} {
  allow read: if isStaffMember() || resource.data.status == 'published';
  allow write: if isStaffMember();
}

// Decision Briefs - Staff only
match /orgs/{orgId}/decisionBriefs/{briefId} {
  allow read: if isStaffMember();
  allow write: if isStaffMember();
}

// Reports - Staff only
match /orgs/{orgId}/reports/{reportType}/{reportId} {
  allow read: if isStaffMember();
  allow write: if false; // Server-side only
}

// Alerts - Staff only
match /orgs/{orgId}/alerts/{alertId} {
  allow read: if isStaffMember();
  allow write: if isStaffMember();
}
```

## Step 3: Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "aiExecutionLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "executionTimestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "aiExecutionLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" },
        { "fieldPath": "executionTimestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Step 4: Enable Google Cloud APIs

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage-api.googleapis.com
```

## Step 5: Cloud Storage CORS Configuration

Create `infra/storage/ai-cors.json`:

```json
[
  {
    "origin": ["https://your-app.web.app"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set infra/storage/ai-cors.json gs://your-bucket-name
```

## Step 6: Build and Deploy Functions

```bash
cd functions
npm run build
npm run deploy
```

This deploys all Phase 4 functions:
- `generateProposalDraft`
- `regenerateProposalSection`
- `analyzeProposalRisk`
- `generateEngagementSummary`
- `detectEngagementRisk`
- `extractReusableInsights`
- `draftCaseStudy`
- `generateDecisionBrief`
- `weeklyPipelineHealthReport`
- `weeklyDeliveryHealthReport`
- `getClientEngagementSummary`

## Step 7: Verify Deployment

### Test Individual Functions

```bash
# Test proposal generation
firebase functions:shell

# In the shell:
generateProposalDraft({
  data: {
    orgId: 'your-org-id',
    proposalId: 'test-proposal',
    discoveryAnswers: {}
  },
  auth: {
    uid: 'test-user-id'
  }
})
```

### Check Scheduled Functions

```bash
firebase functions:log --only weeklyPipelineHealthReport
firebase functions:log --only weeklyDeliveryHealthReport
```

## Step 8: Monitor Execution

### View AI Execution Logs

In Firebase Console:
1. Go to Firestore
2. Navigate to `aiExecutionLogs` collection
3. Verify logs are being created with proper structure

### Check Cloud Storage Snapshots

```bash
gsutil ls gs://your-bucket/ai-snapshots/
```

## Step 9: Frontend Integration

### Call AI Functions from React/Next.js

```typescript
// src/lib/ai-client.ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const aiClient = {
  generateProposal: httpsCallable(functions, 'generateProposalDraft'),
  regenerateSection: httpsCallable(functions, 'regenerateProposalSection'),
  analyzeRisk: httpsCallable(functions, 'analyzeProposalRisk'),
  getEngagementSummary: httpsCallable(functions, 'generateEngagementSummary'),
  detectRisk: httpsCallable(functions, 'detectEngagementRisk'),
  extractInsights: httpsCallable(functions, 'extractReusableInsights'),
  draftCaseStudy: httpsCallable(functions, 'draftCaseStudy'),
  generateDecisionBrief: httpsCallable(functions, 'generateDecisionBrief'),
  getClientSummary: httpsCallable(functions, 'getClientEngagementSummary'),
};
```

### Example Usage in Component

```typescript
// app/proposals/[id]/edit/page.tsx
import { aiClient } from '@/lib/ai-client';
import { useState } from 'react';

export default function ProposalEditPage({ params }) {
  const [loading, setLoading] = useState(false);

  const handleGenerateProposal = async () => {
    setLoading(true);
    try {
      const result = await aiClient.generateProposal({
        orgId: 'org123',
        proposalId: params.id,
        discoveryAnswers: { /* ... */ }
      });
      
      console.log('Generated:', result.data);
      // Update UI with generated content
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerateProposal} disabled={loading}>
        {loading ? 'Generating...' : 'Generate with AI'}
      </button>
    </div>
  );
}
```

## Step 10: Add UI Components

### AI Status Indicator

```typescript
// components/ai-status-indicator.tsx
export function AIStatusIndicator({ executionLogId }: { executionLogId: string }) {
  const [log, setLog] = useState(null);

  useEffect(() => {
    if (!executionLogId) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'aiExecutionLogs', executionLogId),
      (snapshot) => setLog(snapshot.data())
    );
    
    return unsubscribe;
  }, [executionLogId]);

  if (!log) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-purple-600">✨ AI Generated</span>
      {log.validationStatus === 'passed' && (
        <span className="text-green-600">✓ Validated</span>
      )}
      <span className="text-gray-500">
        {new Date(log.executionTimestamp.toDate()).toLocaleDateString()}
      </span>
    </div>
  );
}
```

### Risk Score Display

```typescript
// components/risk-score.tsx
export function RiskScoreDisplay({ score, level }: { score: number, level: string }) {
  const colors = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  };

  return (
    <div className={`px-3 py-1 rounded-full ${colors[level as keyof typeof colors]}`}>
      <span className="font-semibold">{score}/100</span>
      <span className="ml-2 text-xs uppercase">{level}</span>
    </div>
  );
}
```

## Step 11: Testing Checklist

- [ ] Staff can generate proposal drafts
- [ ] Staff can regenerate individual sections
- [ ] Locked sections are preserved
- [ ] Risk analysis returns structured data
- [ ] Engagement summaries include all sections
- [ ] Risk detection creates alerts for critical issues
- [ ] Knowledge extraction stores draft entries
- [ ] Case study draft includes SEO suggestions
- [ ] Decision briefs show options and recommendations
- [ ] Weekly reports are generated on schedule
- [ ] Clients can only access their own project summaries
- [ ] All executions are logged in aiExecutionLogs
- [ ] Large snapshots are stored in Cloud Storage
- [ ] Audit trail queries return correct data

## Step 12: Monitoring & Alerts

### Set up Cloud Monitoring Alerts

```bash
# Alert on function errors
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="AI Functions Error Rate" \
  --condition-display-name="High error rate" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

### Dashboard Metrics to Monitor

1. **AI Function Invocations**
   - Total calls per function
   - Success vs error rate
   - Average execution time

2. **Validation Status**
   - Passed vs failed validations
   - Common validation errors

3. **Storage Usage**
   - Snapshot storage size
   - Snapshot count growth

4. **Cost Tracking**
   - Gemini API token usage
   - Cloud Functions execution time
   - Storage costs

## Step 13: Gradual Rollout

### Phase 1: Internal Testing (Week 1)
- Enable for admin users only
- Test all functions with real data
- Monitor logs and costs

### Phase 2: Staff Rollout (Week 2)
- Enable for all staff users
- Gather feedback on UX and outputs
- Refine prompts based on quality

### Phase 3: Client Access (Week 3)
- Enable client summary function
- Monitor client usage patterns
- Ensure no internal data leakage

### Phase 4: Production (Week 4)
- Enable scheduled reports
- Set up monitoring alerts
- Document any issues and resolutions

## Rollback Plan

If issues occur:

```bash
# Disable specific function
firebase functions:config:unset ai.enabled
firebase deploy --only functions

# Rollback to previous deployment
firebase functions:rollback generateProposalDraft
```

## Troubleshooting

### Function Timeout
**Symptom:** Functions timing out on large prompts

**Solution:**
```typescript
// Increase timeout in functions/src/index.ts
setGlobalOptions({ 
  region: "us-central1",
  timeoutSeconds: 300, // 5 minutes
  memory: "1GiB"
});
```

### Validation Errors
**Symptom:** AI outputs failing schema validation

**Solution:**
1. Check AI execution logs for validation errors
2. Review prompt template
3. Add more specific constraints in system prompt
4. Update schema if requirements changed

### High Costs
**Symptom:** Unexpected Gemini API costs

**Solution:**
1. Review token usage in execution logs
2. Optimize prompts to be more concise
3. Implement caching for repeated queries
4. Set daily budget alerts

## Support

For issues or questions:
1. Check `/docs/PHASE4_IMPLEMENTATION.md`
2. Review execution logs in Firestore
3. Check Cloud Functions logs: `firebase functions:log`
4. Contact development team

## Success Metrics

Track these KPIs post-deployment:

- **Proposal Generation**
  - Time saved per proposal: Target 60-80%
  - Quality score: Target >90% first-draft acceptance

- **Risk Detection**
  - Early warning accuracy: Target >75%
  - False positive rate: Target <20%

- **Engagement Intelligence**
  - Summary generation time: Target <30s
  - Staff satisfaction with insights: Target >4/5

- **Knowledge Capture**
  - Insights extracted per project: Target 3-5
  - Knowledge base growth: Target 10% monthly

## Conclusion

Phase 4 transforms AI from a feature into embedded intelligence that:
- Makes sales smarter
- Makes delivery safer
- Compounds knowledge
- Automates proof generation
- Simplifies decision-making
- Keeps clients informed
- Preserves human control

All while being safe, auditable, and trustworthy for daily operational use.
