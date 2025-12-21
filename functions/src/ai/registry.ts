/**
 * Prompt and Schema Registry
 * Central repository for all AI prompt templates and JSON schemas with versioning
 */

import { PromptTemplate, SchemaDefinition, AIActionType } from './types';

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  'proposal-generation-v1': {
    id: 'proposal-generation-v1',
    name: 'Proposal Generation',
    description: 'Generate comprehensive proposal from discovery data and business context',
    actionType: 'generate',
    version: '1.0.0',
    systemPrompt: `You are an expert business consultant creating professional proposals. 
Your outputs must be factual, based on provided business data, and structured according to the schema.
Never invent information not provided in the context. Be specific and actionable.`,
    template: `Generate a comprehensive business proposal with the following context:

BUSINESS PROFILE:
Name: {{businessProfile.name}}
Industry: {{businessProfile.industry}}
Services: {{businessProfile.services}}
Differentiators: {{businessProfile.differentiators}}
Methodology: {{businessProfile.methodology}}

CLIENT PROFILE:
Company: {{clientProfile.companyName}}
Industry: {{clientProfile.industry}}
Challenges: {{clientProfile.challenges}}
Goals: {{clientProfile.goals}}

DISCOVERY ANSWERS:
{{discoveryAnswers}}

{{#if serviceTemplate}}
SERVICE TEMPLATE:
{{serviceTemplate}}
{{/if}}

{{#if historicalReferences}}
HISTORICAL REFERENCES:
{{historicalReferences}}
{{/if}}

Generate a structured proposal with these sections:
1. Executive Summary - Clear value proposition and expected outcomes
2. Diagnosis - Current situation analysis based on discovery
3. Scope - Specific services and deliverables
4. Methodology - How work will be performed
5. Deliverables - Concrete outputs with acceptance criteria
6. Timeline - Duration and key milestones
7. Assumptions - What we're assuming to be true
8. Exclusions - What is NOT included
9. Acceptance Criteria - How success will be measured
10. Next Steps - Immediate actions required

Return ONLY valid JSON matching the schema. No markdown formatting.`,
    inputSchema: {
      type: 'object',
      required: ['businessProfile', 'clientProfile', 'discoveryAnswers'],
      properties: {
        businessProfile: { type: 'object' },
        clientProfile: { type: 'object' },
        discoveryAnswers: { type: 'object' },
        serviceTemplateId: { type: 'string' },
        historicalReferences: { type: 'array' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/proposal-content-v1',
    },
    constraints: [
      'Must use only information from provided context',
      'Must not invent metrics or guarantees',
      'Must follow business methodology and terminology',
      'All deliverables must have clear acceptance criteria',
      'Timeline must be realistic based on scope',
    ],
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'section-regeneration-v1': {
    id: 'section-regeneration-v1',
    name: 'Section Regeneration',
    description: 'Regenerate a specific section of a proposal non-destructively',
    actionType: 'regenerate',
    version: '1.0.0',
    systemPrompt: `You are regenerating a specific section of a business proposal.
Maintain consistency with the rest of the proposal. Never modify locked sections.
Preserve all pricing, milestones, and contractual terms unless explicitly instructed.`,
    template: `Regenerate the {{sectionKey}} section of this proposal:

CURRENT SECTION CONTENT:
{{currentContent}}

FULL PROPOSAL CONTEXT:
{{fullProposalContext}}

LOCKED SECTIONS (DO NOT REFERENCE OR MODIFY):
{{lockedSections}}

{{#if instructions}}
SPECIFIC INSTRUCTIONS:
{{instructions}}
{{/if}}

REQUIREMENTS:
- Only regenerate the specified section
- Maintain consistency with the proposal context
- Do not modify locked sections
- Preserve all pricing, timeline commitments, and terms
- Return ONLY the new section content in the required format`,
    inputSchema: {
      type: 'object',
      required: ['sectionKey', 'currentContent', 'fullProposalContext', 'lockedSections'],
      properties: {
        sectionKey: { type: 'string' },
        currentContent: {},
        fullProposalContext: { type: 'object' },
        lockedSections: { type: 'array' },
        instructions: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['sectionContent'],
      properties: {
        sectionContent: {},
      },
    },
    constraints: [
      'Never modify locked sections',
      'Preserve pricing and contractual terms',
      'Maintain proposal consistency',
      'Follow specific instructions if provided',
    ],
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'proposal-risk-analysis-v1': {
    id: 'proposal-risk-analysis-v1',
    name: 'Proposal Risk Analysis',
    description: 'Analyze proposal for pricing, scope, and delivery risks',
    actionType: 'analyze',
    version: '1.0.0',
    systemPrompt: `You are an expert business analyst assessing proposal risks.
Identify potential issues with pricing, scope, timeline, and deliverables.
Compare against historical data and industry benchmarks. Be specific and evidence-based.`,
    template: `Analyze this proposal for potential risks:

PROPOSAL DATA:
Pricing: {{proposalData.pricing}}
Scope: {{proposalData.scope}}
Timeline: {{proposalData.timeline}}
Deliverables: {{proposalData.deliverables}}

{{#if historicalProposals}}
HISTORICAL PROPOSALS (for comparison):
{{historicalProposals}}
{{/if}}

Assess risks in these categories:
1. PRICING - Underpricing, pricing model mismatch, unrealistic margins
2. SCOPE - Unclear requirements, scope creep potential, missing critical items
3. TIMELINE - Unrealistic deadlines, insufficient buffer, resource conflicts
4. DELIVERABLES - Ambiguous acceptance criteria, quality concerns
5. RESOURCES - Skill gaps, capacity constraints

For each risk:
- Provide severity (low/medium/high/critical)
- Cite specific evidence from the proposal
- Suggest concrete adjustments if needed

Return structured risk assessment as JSON.`,
    inputSchema: {
      type: 'object',
      required: ['proposalData'],
      properties: {
        proposalData: { type: 'object' },
        historicalProposals: { type: 'array' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/risk-analysis-v1',
    },
    constraints: [
      'Base analysis on evidence, not speculation',
      'Compare to historical data when available',
      'Provide actionable suggestions',
      'Score risks consistently',
    ],
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'engagement-summary-v1': {
    id: 'engagement-summary-v1',
    name: 'Engagement Summary',
    description: 'Generate comprehensive project status summary',
    actionType: 'summarize',
    version: '1.0.0',
    systemPrompt: `You are a project manager creating a concise status summary.
Focus on progress, risks, and decisions. Be factual and actionable.`,
    template: `Generate an engagement summary for this project:

PROJECT DATA:
{{projectData}}

RECENT UPDATES:
{{recentUpdates}}

RISKS:
{{recentRisks}}

CHANGE REQUESTS:
{{changeRequests}}

CLIENT INTERACTIONS:
{{clientInteractions}}

Provide:
1. Executive Summary (2-3 sentences)
2. Progress vs Plan (status, percentage, details)
3. Major Risks (title, impact, description)
4. Upcoming Decisions (title, deadline, importance, context)
5. Client Sentiment (positive/neutral/negative) based on interactions

Be concise but complete. Focus on what leadership needs to know.`,
    inputSchema: {
      type: 'object',
      required: ['projectData'],
      properties: {
        projectData: { type: 'object' },
        recentUpdates: { type: 'array' },
        recentRisks: { type: 'array' },
        changeRequests: { type: 'array' },
        clientInteractions: { type: 'array' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/engagement-summary-v1',
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'risk-detection-v1': {
    id: 'risk-detection-v1',
    name: 'Engagement Risk Detection',
    description: 'Detect early warning signals in project engagement',
    actionType: 'detect',
    version: '1.0.0',
    systemPrompt: `You are an expert at detecting project risks from behavioral signals.
Identify patterns that indicate trouble. Be proactive but not alarmist.`,
    template: `Analyze these engagement signals for risks:

SIGNALS:
- Missed Milestones: {{signals.missedMilestones}}
- Repeated Revisions: {{signals.repeatedRevisions}}
- Delayed Responses: {{signals.delayedResponses}} 
- Scope Changes: {{signals.scopeChanges}}
- Decision Velocity: {{signals.decisionVelocity}} days

PROJECT CONTEXT:
{{projectContext}}

{{#if historicalBaseline}}
HISTORICAL BASELINE:
{{historicalBaseline}}
{{/if}}

Assess:
1. Overall Risk Score (0-100)
2. Risk Level (low/medium/high/critical)
3. Detected Issues with evidence
4. Recommended Mitigations with priority

Focus on actionable insights.`,
    inputSchema: {
      type: 'object',
      required: ['signals', 'projectContext'],
      properties: {
        signals: { type: 'object' },
        projectContext: { type: 'object' },
        historicalBaseline: { type: 'object' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/risk-detection-v1',
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'knowledge-extraction-v1': {
    id: 'knowledge-extraction-v1',
    name: 'Knowledge Extraction',
    description: 'Extract reusable insights from completed projects',
    actionType: 'extract',
    version: '1.0.0',
    systemPrompt: `You are extracting valuable lessons and patterns from completed work.
Focus on reusable insights, frameworks, and pitfalls that will help future projects.`,
    template: `Extract reusable knowledge from this completed project:

PROJECT DATA:
{{projectData}}

PROPOSAL DATA:
{{proposalData}}

DELIVERABLES:
{{deliverables}}

{{#if debriefNotes}}
DEBRIEF NOTES:
{{debriefNotes}}
{{/if}}

{{#if clientFeedback}}
CLIENT FEEDBACK:
{{clientFeedback}}
{{/if}}

Identify:
1. Patterns - Repeatable approaches or techniques
2. Frameworks - Structured methodologies that worked
3. Pitfalls - Things to avoid in similar situations
4. Best Practices - What went exceptionally well

For each insight:
- Provide clear title and description
- Specify applicability (when/where to use)
- Rate confidence (0-1)

Also draft a knowledge base entry with:
- Title, Summary, Context, Approach, Outcome, Lessons Learned`,
    inputSchema: {
      type: 'object',
      required: ['projectData', 'deliverables'],
      properties: {
        projectData: { type: 'object' },
        proposalData: { type: 'object' },
        deliverables: { type: 'array' },
        debriefNotes: { type: 'string' },
        clientFeedback: { type: 'string' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/knowledge-extraction-v1',
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'case-study-draft-v1': {
    id: 'case-study-draft-v1',
    name: 'Case Study Draft',
    description: 'Draft compelling case study from project outcomes',
    actionType: 'generate',
    version: '1.0.0',
    systemPrompt: `You are writing a compelling case study that showcases results.
Focus on challenge, approach, and measurable outcomes. Make it engaging and credible.`,
    template: `Draft a case study for this project:

PROJECT OUTCOMES:
{{projectOutcomes}}

{{#if clientQuotes}}
CLIENT QUOTES (approved):
{{clientQuotes}}
{{/if}}

ANONYMIZATION: {{anonymize}}
{{#if targetAudience}}
TARGET AUDIENCE: {{targetAudience}}
{{/if}}

Create a structured case study with:
1. Title - Compelling and outcome-focused
2. Tagline - One-sentence value proposition
3. Challenge - What problem was being solved
4. Approach - How we addressed it (methodology, tools, strategy)
5. Outcome - Measurable results and achievements
6. Metrics - Key numbers that demonstrate impact
7. Testimonial - Client quote if available

Also provide SEO suggestions:
- Keywords for search optimization
- Meta description (155 characters)
- URL slug

{{#if anonymize}}
IMPORTANT: Anonymize client/company names while keeping story compelling.
{{/if}}`,
    inputSchema: {
      type: 'object',
      required: ['projectOutcomes', 'anonymize'],
      properties: {
        projectOutcomes: { type: 'object' },
        clientQuotes: { type: 'array' },
        anonymize: { type: 'boolean' },
        targetAudience: { type: 'string' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/case-study-draft-v1',
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'decision-brief-v1': {
    id: 'decision-brief-v1',
    name: 'Decision Brief',
    description: 'Generate executive decision brief with options and recommendations',
    actionType: 'generate',
    version: '1.0.0',
    systemPrompt: `You are preparing a decision brief for executives.
Be concise, clear, and actionable. Present options objectively, then recommend.`,
    template: `Generate a decision brief for:

CONTEXT:
Entity Type: {{contextEntityType}}
Entity ID: {{contextEntityId}}

RECENT ACTIVITY:
{{recentActivity}}

RISKS:
{{risks}}

{{#if financials}}
FINANCIALS:
{{financials}}
{{/if}}

{{#if options}}
OPTIONS UNDER CONSIDERATION:
{{options}}
{{/if}}

Create a 1-2 page brief with:
1. SITUATION - Current state and what triggered this decision point
2. OPTIONS - Each option with pros, cons, and risks
3. RECOMMENDATION - Preferred option with clear rationale and assumptions
4. RISKS - Key risks with likelihood, impact, and mitigation

Be objective but decisive. Help executives make informed choices quickly.`,
    inputSchema: {
      type: 'object',
      required: ['contextEntityType', 'contextEntityId', 'recentActivity'],
      properties: {
        contextEntityType: { type: 'string' },
        contextEntityId: { type: 'string' },
        recentActivity: { type: 'array' },
        risks: { type: 'array' },
        financials: { type: 'object' },
        options: { type: 'array' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/decision-brief-v1',
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },

  'client-summary-v1': {
    id: 'client-summary-v1',
    name: 'Client Engagement Summary',
    description: 'Generate client-facing status summary (no internal risks/pricing)',
    actionType: 'summarize',
    version: '1.0.0',
    systemPrompt: `You are creating a clear status update for a client.
Focus on what they need to know and do. Be transparent but professional.
NEVER include internal risks, pricing logic, or speculative advice.`,
    template: `Generate a client-facing summary:

PROJECT STATUS:
{{projectStatus}}

COMPLETED WORK:
{{completedItems}}

UPCOMING WORK:
{{upcomingItems}}

CHANGES SINCE LAST UPDATE:
{{changesSinceLastReview}}

REQUIRED CLIENT ACTIONS:
{{requiredActions}}

Provide a clear, jargon-free summary:
1. Current Status - Where we are in the project
2. Progress Update - What's been accomplished recently
3. Completed Items - List of finished deliverables
4. Upcoming Items - What's coming next
5. Required Actions - What client needs to do (with deadlines)
6. Changes - Any updates to plan or scope

Keep it positive, clear, and action-oriented.
DO NOT include: internal risks, profit margins, resource constraints, speculative advice.`,
    inputSchema: {
      type: 'object',
      required: ['projectStatus'],
      properties: {
        projectStatus: { type: 'object' },
        completedItems: { type: 'array' },
        upcomingItems: { type: 'array' },
        changesSinceLastReview: { type: 'array' },
        requiredActions: { type: 'array' },
      },
    },
    outputSchema: {
      $ref: '#/schemas/client-summary-v1',
    },
    constraints: [
      'No internal risk assessment',
      'No pricing or margin details',
      'No speculative business advice',
      'Focus on clarity and required actions',
    ],
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
      updatedAt: null as any,
    },
  },
};

// ============================================================================
// JSON SCHEMAS
// ============================================================================

export const JSON_SCHEMAS: Record<string, SchemaDefinition> = {
  'proposal-content-v1': {
    id: 'proposal-content-v1',
    name: 'Proposal Content Schema',
    version: '1.0.0',
    description: 'Complete proposal structure with all required sections',
    entityType: 'proposal',
    schema: {
      type: 'object',
      required: ['executiveSummary', 'diagnosis', 'scope', 'methodology', 'deliverables'],
      properties: {
        executiveSummary: {
          type: 'string',
          minLength: 100,
          description: 'High-level overview of value proposition and outcomes',
        },
        diagnosis: {
          type: 'string',
          minLength: 100,
          description: 'Analysis of current situation and challenges',
        },
        scope: {
          type: 'string',
          minLength: 100,
          description: 'Detailed description of services and work to be performed',
        },
        methodology: {
          type: 'string',
          minLength: 100,
          description: 'How the work will be performed',
        },
        deliverables: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['name', 'description'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              acceptanceCriteria: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        timeline: {
          type: 'object',
          required: ['estimatedDuration', 'milestones'],
          properties: {
            estimatedDuration: {
              type: 'number',
              minimum: 1,
              description: 'Duration in days',
            },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'description', 'dueOffset'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  dueOffset: { type: 'number', description: 'Days from project start' },
                },
              },
            },
          },
        },
        assumptions: {
          type: 'array',
          items: { type: 'string' },
        },
        exclusions: {
          type: 'array',
          items: { type: 'string' },
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
        },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'risk-analysis-v1': {
    id: 'risk-analysis-v1',
    name: 'Risk Analysis Schema',
    version: '1.0.0',
    description: 'Structured risk assessment output',
    schema: {
      type: 'object',
      required: ['riskFlags', 'overallRiskScore', 'confidenceScore'],
      properties: {
        riskFlags: {
          type: 'array',
          items: {
            type: 'object',
            required: ['category', 'severity', 'title', 'description'],
            properties: {
              category: {
                type: 'string',
                enum: ['pricing', 'scope', 'timeline', 'deliverables', 'resources'],
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              title: { type: 'string' },
              description: { type: 'string' },
              evidence: { type: 'string' },
              suggestedAction: { type: 'string' },
            },
          },
        },
        overallRiskScore: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
        confidenceScore: {
          type: 'number',
          minimum: 0,
          maximum: 1,
        },
        suggestedAdjustments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'currentValue', 'suggestedValue', 'rationale'],
            properties: {
              field: { type: 'string' },
              currentValue: {},
              suggestedValue: {},
              rationale: { type: 'string' },
            },
          },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'engagement-summary-v1': {
    id: 'engagement-summary-v1',
    name: 'Engagement Summary Schema',
    version: '1.0.0',
    description: 'Project status summary structure',
    schema: {
      type: 'object',
      required: ['executiveSummary', 'progressVsPlan', 'majorRisks', 'upcomingDecisions'],
      properties: {
        executiveSummary: { type: 'string' },
        progressVsPlan: {
          type: 'object',
          required: ['status', 'percentComplete', 'details'],
          properties: {
            status: { type: 'string', enum: ['on-track', 'at-risk', 'delayed'] },
            percentComplete: { type: 'number', minimum: 0, maximum: 100 },
            details: { type: 'string' },
          },
        },
        majorRisks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'impact', 'description'],
            properties: {
              title: { type: 'string' },
              impact: { type: 'string', enum: ['low', 'medium', 'high'] },
              description: { type: 'string' },
            },
          },
        },
        upcomingDecisions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'importance', 'context'],
            properties: {
              title: { type: 'string' },
              deadline: { type: 'string' },
              importance: { type: 'string', enum: ['low', 'medium', 'high'] },
              context: { type: 'string' },
            },
          },
        },
        clientSentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'negative'],
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'risk-detection-v1': {
    id: 'risk-detection-v1',
    name: 'Risk Detection Schema',
    version: '1.0.0',
    description: 'Early warning risk detection output',
    schema: {
      type: 'object',
      required: ['riskScore', 'riskLevel', 'detectedIssues', 'recommendedMitigations'],
      properties: {
        riskScore: { type: 'number', minimum: 0, maximum: 100 },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        detectedIssues: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'severity', 'description', 'evidence'],
            properties: {
              type: { type: 'string' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              description: { type: 'string' },
              evidence: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        recommendedMitigations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['action', 'priority', 'rationale'],
            properties: {
              action: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              rationale: { type: 'string' },
            },
          },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'knowledge-extraction-v1': {
    id: 'knowledge-extraction-v1',
    name: 'Knowledge Extraction Schema',
    version: '1.0.0',
    description: 'Extracted insights and knowledge entries',
    schema: {
      type: 'object',
      required: ['insights', 'draftKnowledgeEntry'],
      properties: {
        insights: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'title', 'description', 'applicability', 'confidence'],
            properties: {
              type: { type: 'string', enum: ['pattern', 'framework', 'pitfall', 'best-practice'] },
              title: { type: 'string' },
              description: { type: 'string' },
              applicability: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
        suggestedTags: { type: 'array', items: { type: 'string' } },
        draftKnowledgeEntry: {
          type: 'object',
          required: ['title', 'summary', 'context', 'approach', 'outcome', 'lessonsLearned'],
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            context: { type: 'string' },
            approach: { type: 'string' },
            outcome: { type: 'string' },
            lessonsLearned: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'case-study-draft-v1': {
    id: 'case-study-draft-v1',
    name: 'Case Study Draft Schema',
    version: '1.0.0',
    description: 'Structured case study content',
    schema: {
      type: 'object',
      required: ['draft', 'seoSuggestions'],
      properties: {
        draft: {
          type: 'object',
          required: ['title', 'tagline', 'challenge', 'approach', 'outcome', 'metrics'],
          properties: {
            title: { type: 'string' },
            tagline: { type: 'string', maxLength: 100 },
            challenge: { type: 'string' },
            approach: { type: 'string' },
            outcome: { type: 'string' },
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                required: ['label', 'value'],
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                  emphasis: { type: 'boolean' },
                },
              },
            },
            testimonial: { type: 'string' },
          },
        },
        seoSuggestions: {
          type: 'object',
          required: ['keywords', 'metaDescription', 'slug'],
          properties: {
            keywords: { type: 'array', items: { type: 'string' } },
            metaDescription: { type: 'string', maxLength: 155 },
            slug: { type: 'string' },
          },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'decision-brief-v1': {
    id: 'decision-brief-v1',
    name: 'Decision Brief Schema',
    version: '1.0.0',
    description: 'Executive decision brief structure',
    schema: {
      type: 'object',
      required: ['situation', 'options', 'recommendation', 'risks'],
      properties: {
        situation: { type: 'string' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description', 'pros', 'cons', 'risks'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              pros: { type: 'array', items: { type: 'string' } },
              cons: { type: 'array', items: { type: 'string' } },
              risks: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        recommendation: {
          type: 'object',
          required: ['option', 'rationale', 'assumptions'],
          properties: {
            option: { type: 'string' },
            rationale: { type: 'string' },
            assumptions: { type: 'array', items: { type: 'string' } },
          },
        },
        risks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description', 'likelihood', 'impact'],
            properties: {
              description: { type: 'string' },
              likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
              impact: { type: 'string', enum: ['low', 'medium', 'high'] },
              mitigation: { type: 'string' },
            },
          },
        },
      },
    },
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },

  'client-summary-v1': {
    id: 'client-summary-v1',
    name: 'Client Summary Schema',
    version: '1.0.0',
    description: 'Client-facing summary (limited scope)',
    schema: {
      type: 'object',
      required: ['currentStatus', 'progressUpdate', 'completedItems', 'upcomingItems', 'requiredActions'],
      properties: {
        currentStatus: { type: 'string' },
        progressUpdate: { type: 'string' },
        completedItems: { type: 'array', items: { type: 'string' } },
        upcomingItems: { type: 'array', items: { type: 'string' } },
        requiredActions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'description'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              deadline: { type: 'string' },
            },
          },
        },
        changesSinceLastReview: { type: 'array', items: { type: 'string' } },
      },
    },
    validationRules: [
      'Must not contain internal risk assessments',
      'Must not contain pricing or margin details',
      'Must not contain speculative business advice',
    ],
    metadata: {
      createdAt: null as any,
      createdBy: 'system',
    },
  },
};

// ============================================================================
// REGISTRY HELPER FUNCTIONS
// ============================================================================

export function getPromptTemplate(promptId: string, version?: string): PromptTemplate | null {
  const key = version ? `${promptId}-${version}` : promptId;
  return PROMPT_TEMPLATES[key] || null;
}

export function getSchema(schemaId: string, version?: string): SchemaDefinition | null {
  const key = version ? `${schemaId}-${version}` : schemaId;
  return JSON_SCHEMAS[key] || null;
}

export function listPromptTemplates(actionType?: AIActionType): PromptTemplate[] {
  const templates = Object.values(PROMPT_TEMPLATES);
  return actionType ? templates.filter(t => t.actionType === actionType) : templates;
}

export function listSchemas(entityType?: string): SchemaDefinition[] {
  const schemas = Object.values(JSON_SCHEMAS);
  return entityType ? schemas.filter(s => s.entityType === entityType) : schemas;
}
