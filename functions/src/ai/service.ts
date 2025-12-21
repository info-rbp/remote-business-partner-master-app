/**
 * AI Service Core Infrastructure
 * Central AI service layer with logging, validation, and execution
 */

import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import { getPromptTemplate, getSchema } from './registry';
import { ensureTaskAllowed } from './task-registry';
import { getGovernanceSettings, isTaskEnabled } from './governance';
import { AIExecutionLog, AIActionType } from './types';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

export class AIService {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;
  private vertexAI: VertexAI;
  private model: any;

  constructor() {
    this.db = admin.firestore();
    this.storage = admin.storage();
    this.vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || '',
      location: 'us-central1',
    });
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
  }

  /**
   * Execute AI function with full logging and validation
   */
  async executeAI<TInput, TOutput>(
    promptId: string,
    schemaId: string,
    input: TInput,
    context: {
      orgId: string;
      entityType: string;
      entityId: string;
      executedBy: string;
      executedByRole: string;
      actionType: AIActionType;
    }
  ): Promise<{
    output: TOutput;
    executionLogId: string;
    validationStatus: 'passed' | 'failed' | 'partial';
    warnings: string[];
  }> {
    const startTime = Date.now();
    let executionLogId = '';
    
    try {
      // Get prompt template and schema
      const promptTemplate = getPromptTemplate(promptId);
      const schemaDefinition = getSchema(schemaId);

      if (!promptTemplate) {
        throw new Error(`Prompt template not found: ${promptId}`);
      }
      if (!schemaDefinition) {
        throw new Error(`Schema not found: ${schemaId}`);
      }

      // Enforce task registry (Phase 12.1) & governance (12.7)
      const { allowed, reason } = ensureTaskAllowed({
        promptTemplateId: promptId,
        entityType: context.entityType as any,
        actionType: context.actionType,
      });
      if (!allowed) {
        throw new Error(`AI task not allowed: ${reason}`);
      }

      const governance = await getGovernanceSettings(context.orgId);
      if (!isTaskEnabled(promptId, governance)) {
        throw new Error(`AI task disabled by governance settings: ${promptId}`);
      }

      // Validate input against prompt's input schema
      const inputValidator = ajv.compile(promptTemplate.inputSchema);
      const inputValid = inputValidator(input);
      if (!inputValid) {
        throw new Error(`Input validation failed: ${JSON.stringify(inputValidator.errors)}`);
      }

      // Build prompt from template
      const prompt = this.buildPrompt(promptTemplate.template, input);
      
      // Prepare full prompt with system instructions
      const fullPrompt = `${promptTemplate.systemPrompt || ''}\n\n${prompt}\n\nOutput JSON Schema:\n${JSON.stringify(schemaDefinition.schema, null, 2)}`;

      // Store input snapshot
      const inputSnapshot = await this.storeSnapshot(
        context.orgId,
        context.entityId,
        'input',
        input
      );

      // Call Gemini
      const response = await this.model.generateContent(fullPrompt);
      
      if (!response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('No content generated from model');
      }

      let outputText = response.response.candidates[0].content.parts[0].text;
      
      // Clean up markdown code blocks if present
      outputText = outputText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse output
      let output: TOutput;
      try {
        output = JSON.parse(outputText);
      } catch (parseError) {
        throw new Error(`Failed to parse AI output as JSON: ${(parseError as Error).message}`);
      }

      // Validate output against schema
      const outputValidator = ajv.compile(schemaDefinition.schema);
      const outputValid = outputValidator(output);
      
      const validationStatus = outputValid ? 'passed' : 'partial';
      const warnings: string[] = [];
      
      if (!outputValid) {
        warnings.push(`Schema validation warnings: ${JSON.stringify(outputValidator.errors)}`);
      }

      // Store output snapshot
      const outputSnapshot = await this.storeSnapshot(
        context.orgId,
        context.entityId,
        'output',
        output
      );

      // Create execution log
      const executionLog: Omit<AIExecutionLog, 'id'> = {
        orgId: context.orgId,
        entityType: context.entityType,
        entityId: context.entityId,
        actionType: context.actionType,
        promptId,
        promptVersion: promptTemplate.version,
        schemaId,
        schemaVersion: schemaDefinition.version,
        executedBy: context.executedBy,
        executedByRole: context.executedByRole,
        executionTimestamp: admin.firestore.Timestamp.now(),
        durationMs: Date.now() - startTime,
        inputSnapshot,
        outputSnapshot,
        validationStatus,
        validationErrors: outputValid ? undefined : outputValidator.errors?.map(e => e.message || ''),
        schemaCompliant: outputValid,
        warnings: warnings.length > 0 ? warnings : undefined,
        modelName: 'gemini-1.5-pro',
        modelVersion: '1.5',
        temperature: 0.7,
        humanReviewed: governance.requireAcknowledgement ? false : true,
      };

      const logRef = await this.db.collection(`orgs/${context.orgId}/aiExecutions`).add(executionLog);
      executionLogId = logRef.id;

      return {
        output,
        executionLogId,
        validationStatus,
        warnings,
      };

    } catch (error) {
      // Log error execution
      const errorLog: Partial<AIExecutionLog> = {
        orgId: context.orgId,
        entityType: context.entityType,
        entityId: context.entityId,
        actionType: context.actionType,
        promptId,
        schemaId,
        executedBy: context.executedBy,
        executedByRole: context.executedByRole,
        executionTimestamp: admin.firestore.Timestamp.now(),
        durationMs: Date.now() - startTime,
        validationStatus: 'failed',
        validationErrors: [(error as Error).message],
        schemaCompliant: false,
        modelName: 'gemini-1.5-pro',
        modelVersion: '1.5',
        inputSnapshot: {
          sizeBytes: 0,
          summary: 'Error occurred before snapshot',
        },
        outputSnapshot: {
          sizeBytes: 0,
          summary: 'Error occurred',
        },
      };

      const logRef = await this.db.collection(`orgs/${context.orgId}/aiExecutions`).add(errorLog);
      executionLogId = logRef.id;

      throw error;
    }
  }

  /**
   * Build prompt from template using simple variable substitution
   */
  private buildPrompt(template: string, data: any): string {
    let prompt = template;

    // Simple Handlebars-like replacement
    // Replace {{variable}} with data.variable
    prompt = prompt.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      path = path.trim();
      
      // Handle conditionals {{#if variable}}
      if (path.startsWith('#if ')) {
        return '';
      }
      if (path === '/if') {
        return '';
      }

      // Navigate nested paths
      const value = this.getNestedValue(data, path);
      
      if (value === undefined || value === null) {
        return '';
      }
      
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      
      return String(value);
    });

    // Remove conditional blocks for now (simple implementation)
    prompt = prompt.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, '');

    return prompt;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Store input/output snapshot in Cloud Storage for audit
   */
  private async storeSnapshot(
    orgId: string,
    entityId: string,
    type: 'input' | 'output',
    data: any
  ): Promise<{
    storagePath?: string;
    sizeBytes: number;
    summary?: string;
    hash?: string;
  }> {
    const jsonString = JSON.stringify(data, null, 2);
    const sizeBytes = Buffer.byteLength(jsonString, 'utf8');

    // For large snapshots, store in Cloud Storage
    if (sizeBytes > 10000) { // > 10KB
      const timestamp = Date.now();
      const fileName = `ai-snapshots/${orgId}/${entityId}/${type}-${timestamp}.json`;
      const bucket = this.storage.bucket();
      const file = bucket.file(fileName);

      await file.save(jsonString, {
        contentType: 'application/json',
        metadata: {
          orgId,
          entityId,
          type,
          timestamp: timestamp.toString(),
        },
      });

      return {
        storagePath: `gs://${bucket.name}/${fileName}`,
        sizeBytes,
        summary: this.createSummary(data),
      };
    }

    // For small snapshots, just return summary
    return {
      sizeBytes,
      summary: this.createSummary(data),
    };
  }

  /**
   * Create a brief summary of data for logging
   */
  private createSummary(data: any): string {
    if (typeof data === 'string') {
      return data.substring(0, 200) + (data.length > 200 ? '...' : '');
    }
    
    const keys = Object.keys(data);
    return `Object with ${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
  }

  /**
   * Get execution history for an entity
   */
  async getExecutionHistory(
    entityType: string,
    entityId: string,
    limit: number = 10
  ): Promise<AIExecutionLog[]> {
    const snapshot = await this.db
      .collectionGroup('aiExecutions')
      .where('entityType', '==', entityType)
      .where('entityId', '==', entityId)
      .orderBy('executionTimestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AIExecutionLog[];
  }

  /**
   * Answer audit questions: "What did AI do, when, and based on what?"
   */
  async getAuditTrail(
    orgId: string,
    entityType?: string,
    entityId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AIExecutionLog[]> {
    let query: admin.firestore.Query = this.db
      .collection(`orgs/${orgId}/aiExecutions`);

    if (entityType) {
      query = query.where('entityType', '==', entityType);
    }

    if (entityId) {
      query = query.where('entityId', '==', entityId);
    }

    if (startDate) {
      query = query.where('executionTimestamp', '>=', admin.firestore.Timestamp.fromDate(startDate));
    }

    if (endDate) {
      query = query.where('executionTimestamp', '<=', admin.firestore.Timestamp.fromDate(endDate));
    }

    query = query.orderBy('executionTimestamp', 'desc').limit(100);

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AIExecutionLog[];
  }

  /**
   * Get snapshot data from Cloud Storage
   */
  async getSnapshot(storagePath: string): Promise<any> {
    if (!storagePath.startsWith('gs://')) {
      throw new Error('Invalid storage path');
    }

    const path = storagePath.replace(/^gs:\/\/[^/]+\//, '');
    const bucket = this.storage.bucket();
    const file = bucket.file(path);

    const [contents] = await file.download();
    return JSON.parse(contents.toString('utf8'));
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
