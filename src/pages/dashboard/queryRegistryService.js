/**
 * Query Registry Service
 * 
 * Manages LLM queries with Firestore storage and hardcoded fallbacks.
 * Provides CRUD operations, version control, and permission-filtered access.
 */

import { db } from '@healthdesk/shared-services';
import firebase from 'firebase/compat/app';
import { QUERY_METADATA, getQueryMetadata } from './llmQueryMetadata';
import { 
  getLLMManagerLevel, 
  canEditQuery as checkCanEdit,
  canManagePrompts,
  QUERY_CATEGORIES,
} from '../../contexts/LLMManagerContext';
import { DEFAULT_MODEL, LLM_COLLECTIONS } from './llmConstants';

// Alias for local usage (matches existing references throughout this file)
const COLLECTIONS = LLM_COLLECTIONS;

/** Base (P1) query IDs do not contain -regional-. P1 prompt must never be stored in Firestore (only local file + Secret Manager). */
function isBaseP1QueryId(queryId) {
  return typeof queryId === 'string' && queryId.length > 0 && !queryId.includes('-regional-');
}

class QueryRegistryService {
  constructor() {
    this.queriesCollection = COLLECTIONS.QUERIES;
    this.versionsCollection = COLLECTIONS.VERSIONS;
    this.chainsCollection = COLLECTIONS.CHAINS;
    
    // Cache for performance
    this._queryCache = new Map();
    this._cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // One-time sync flag: push hardcoded contextProvided/responseFormat to Firestore
    this._hasSyncedDefaults = false;
  }

  // ============================================
  // PERMISSION-FILTERED QUERIES
  // ============================================

  /**
   * Get all queries the user can edit
   * @param {Object} user - User object with role and scope
   * @returns {Promise<Array>} Array of queries
   */
  async getQueriesForUser(user, authUid = null) {
    if (!canManagePrompts(user)) {
      return [];
    }

    const level = getLLMManagerLevel(user);
    
    // Global managers see everything
    if (level === 'global') {
      return await this.getAllQueries(user, authUid);
    }

    // ChartMind supervisor: ChartMind base queries only (for Position 3 per clinic)
    if (level === 'chartmind-supervisor') {
      const allQueries = await this.getAllQueries(user, authUid);
      return allQueries.filter(q => q.category === QUERY_CATEGORIES.CHARTMIND || (q.id && q.id.startsWith('chartmind-')));
    }

    // ChartMind admin: all ChartMind queries (P1/P2 view-only, P3 edit in UI)
    if (level === 'chartmind-admin') {
      const allQueries = await this.getAllQueries(user, authUid);
      return allQueries.filter(q => q.category === QUERY_CATEGORIES.CHARTMIND || (q.id && q.id.startsWith('chartmind-')));
    }

    // Regional managers: see ALL base queries (P2 editing is template-based, not per-query filtering)
    if (level === 'regional') {
      return await this.getAllQueries(user, authUid);
    }

    // Local and others: Filter by permissions
    const allQueries = await this.getAllQueries(user, authUid);
    return allQueries.filter(query => this.canUserEditQuery(user, query));
  }

  /**
   * Check if a user can edit a specific query
   * @param {Object} user - User object
   * @param {Object} query - Query object
   * @returns {boolean}
   */
  canUserEditQuery(user, query) {
    return checkCanEdit(user, query);
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Get a single query by ID (with fallback to hardcoded)
   * @param {string} queryId - The query ID
   * @returns {Promise<Object|null>} Query object or null
   */
  async getQuery(queryId) {
    // Always bypass cache for chart generation so LLM Query Manager changes (model, maxTokens) take effect immediately
    const skipCache = queryId === 'chartmind-chart-generation';

    if (!skipCache) {
      const cached = this._getFromCache(queryId);
      if (cached) {
        if (cached.prompt && cached.prompt.trim().length > 10) {
          return cached;
        }
        this._queryCache.delete(queryId);
      }
    }

    try {
      // Try Firestore first
      const docRef = db.collection(this.queriesCollection).doc(queryId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const query = { id: docSnap.id, ...docSnap.data(), source: 'firestore' };
        // P1 prompt must never be exposed from Firestore — only in local file and Secret Manager (conceal from other devs).
        if (isBaseP1QueryId(queryId)) {
          query.prompt = '';
        }
        // CRITICAL: Ensure model is always set — fall back to DEFAULT_MODEL if missing
        if (!query.model) {
          console.warn(`[QueryRegistry] Firestore query ${queryId} has no model, defaulting to ${DEFAULT_MODEL}`);
          query.model = DEFAULT_MODEL;
        }
        
        // Base (P1) queries: prompt is intentionally not in Firestore — it lives in Secret Manager (or local files).
        // Only warn and fall back to hardcoded for non-P1 queries (e.g. regional) that have empty prompt.
        const isBaseP1Query = typeof queryId === 'string' && !queryId.includes('-regional-');
        if (!query.prompt || query.prompt.trim().length < 10) {
          if (!isBaseP1Query) {
            console.warn(`[QueryRegistry] Firestore query ${queryId} has empty/invalid prompt, using hardcoded`);
          }
          const meta = getQueryMetadata(queryId);
          if (meta) {
            const hardcodedWithSource = { ...meta, prompt: meta.prompt ?? '', source: 'metadata' };
            if (!skipCache) this._setCache(queryId, hardcodedWithSource);
            return hardcodedWithSource;
          }
        }
        
        // Fill in contextProvided and responseFormat from hardcoded defaults
        // when Firestore has empty values (these are managed in code, not Firestore)
        const meta = getQueryMetadata(queryId);
        if (meta) {
          if (!query.contextProvided && meta.contextProvided) {
            query.contextProvided = meta.contextProvided;
          }
          if (!query.responseFormat && meta.responseFormat) {
            query.responseFormat = meta.responseFormat;
          }
        }
        
        if (!skipCache) this._setCache(queryId, query);
        return query;
      }
    } catch (error) {
      console.warn(`[QueryRegistry] Firestore fetch failed for ${queryId}:`, error.message);
    }

    // Fallback to query metadata (no P1 prompt text in app)
    const meta = getQueryMetadata(queryId);
    if (meta) {
      const hardcodedWithSource = { ...meta, prompt: meta.prompt ?? '', source: 'metadata' };
      if (!skipCache) this._setCache(queryId, hardcodedWithSource);
      return hardcodedWithSource;
    }

    return null;
  }

  /**
   * Get a query by ID and chain position
   * @param {string} queryId - The base query ID (e.g., "chartmind-ddx")
   * @param {number} position - Chain position (1, 2, or 3)
   * @param {Object} options - { adminId, regions } for Position 2/3 queries
   * @returns {Promise<Object|null>} Query object or null
   */
  async getQueryByPosition(queryId, position, options = {}) {
    if (position === 1) {
      // Position 1 is the base query (global)
      return await this.getQuery(queryId);
    }

    if (position === 2) {
      // Position 2: Regional - query with chainPosition=2
      try {
        let snapshot;
        
        // If regions are specified, try to find matching query
        if (options.regions && options.regions.length > 0) {
          // Query for Position 2 queries that have any matching region
          snapshot = await db
            .collection(this.queriesCollection)
            .where('baseQueryId', '==', queryId)
            .where('chainConfig.chainPosition', '==', 2)
            .get();
          
          // Filter by matching regions
          const matchingDocs = snapshot.docs.filter(doc => {
            const queryRegions = doc.data().regions || [];
            return options.regions.some(r => queryRegions.includes(r));
          });
          
          if (matchingDocs.length > 0) {
            return { id: matchingDocs[0].id, ...matchingDocs[0].data() };
          }
        } else {
          // No region filter - get first Position 2 query (for global managers)
          snapshot = await db
            .collection(this.queriesCollection)
            .where('baseQueryId', '==', queryId)
            .where('chainConfig.chainPosition', '==', 2)
            .limit(1)
            .get();
          
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
          }
        }
      } catch (error) {
        console.warn(`[QueryRegistry] Failed to get Position 2 query:`, error.message);
      }
      return null;
    }

    if (position === 3) {
      // Position 3: Local (ChartMind admin) - query with chainPosition=3 and adminId
      if (!options.adminId) {
        console.warn('[QueryRegistry] Position 3 requires adminId');
        return null;
      }

      try {
        const snapshot = await db
          .collection(this.queriesCollection)
          .where('baseQueryId', '==', queryId)
          .where('chainConfig.chainPosition', '==', 3)
          .where('adminId', '==', options.adminId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      } catch (error) {
        console.warn(`[QueryRegistry] Failed to get Position 3 query:`, error.message);
      }
      return null;
    }

    return null;
  }

  /**
   * Get clinic-scoped Position 3 (Local) query for ChartMind.
   * Used when provider is in clinic context (activeClinicId). Clinic-only; no designee fallback.
   * @param {string} clinicId - Clinic ID
   * @param {string} baseQueryId - Base query ID (e.g. chartmind-ddx)
   * @returns {Promise<Object|null>} Query object or null
   */
  async getClinicPosition3(clinicId, baseQueryId) {
    if (!clinicId || !baseQueryId) return null;
    try {
      const docRef = db
        .collection('clinics')
        .doc(clinicId)
        .collection('position3Queries')
        .doc(baseQueryId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      const data = docSnap.data();
      if (data.enabled === false) return null;
      return {
        id: docSnap.id,
        ...data,
        source: 'clinic',
      };
    } catch (error) {
      console.warn(`[QueryRegistry] getClinicPosition3 failed for ${clinicId}/${baseQueryId}:`, error.message);
      return null;
    }
  }

  /**
   * Get Position 3 prompt from a ChartMind template subcollection.
   * Path: chartmindAdmins/{adminId}/templates/{templateId} -> prompts[cardId]
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @param {string} cardId - Card ID (ddx, tests, etc.)
   * @returns {Promise<Object|null>} Prompt config object or null
   */
  async getTemplatePosition3(adminId, templateId, cardId) {
    if (!adminId || !templateId || !cardId) return null;
    try {
      const docRef = db
        .collection('chartmindAdmins')
        .doc(adminId)
        .collection('templates')
        .doc(templateId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      const data = docSnap.data();
      const prompt = data?.prompts?.[cardId];
      if (!prompt) return null;
      return {
        ...prompt,
        source: 'chartmind-template',
        adminId,
        templateId,
      };
    } catch (error) {
      console.warn(`[QueryRegistry] getTemplatePosition3 failed for ${adminId}/${templateId}/${cardId}:`, error.message);
      return null;
    }
  }

  /**
   * Save clinic-scoped Position 3 (create or update).
   * Only chartmind-supervisor (or chartmind-admin/global) should call; Firestore rules enforce write access.
   * @param {string} clinicId - Clinic ID
   * @param {string} baseQueryId - Base query ID (e.g. chartmind-ddx)
   * @param {Object} data - { prompt, model?, temperature?, maxTokens?, inputMode?, enabled? }
   * @param {string} userId - Current user ID (for lastModified/modifiedBy)
   * @returns {Promise<void>}
   */
  async saveClinicPosition3(clinicId, baseQueryId, data, userId) {
    if (!clinicId || !baseQueryId || !baseQueryId.startsWith('chartmind-')) {
      throw new Error('clinicId and ChartMind baseQueryId required');
    }
    const ref = db.collection('clinics').doc(clinicId).collection('position3Queries').doc(baseQueryId);
    const update = {
      prompt: data.prompt ?? '',
      model: data.model ?? DEFAULT_MODEL,
      temperature: data.temperature !== undefined ? data.temperature : 0.7,
      maxTokens: data.maxTokens !== undefined ? data.maxTokens : 2000,
      inputMode: data.inputMode ?? 'B',
      enabled: data.enabled !== false,
      lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      modifiedBy: userId,
    };
    await ref.set(update, { merge: true });
  }

  /**
   * Create or update a Position 2 or 3 query
   * @param {string} baseQueryId - The base query ID (e.g., "chartmind-ddx")
   * @param {number} position - Chain position (2 or 3)
   * @param {Object} queryData - Query configuration
   * @param {string} userId - Creating/updating user's ID
   * @returns {Promise<Object>} Created/updated query
   */
  async createOrUpdatePositionQuery(baseQueryId, position, queryData, userId) {
    if (position !== 2 && position !== 3) {
      throw new Error('Position must be 2 or 3');
    }

    // Get base query to inherit metadata
    const baseQuery = await this.getQuery(baseQueryId);
    if (!baseQuery) {
      throw new Error(`Base query ${baseQueryId} not found`);
    }

    // Check if Position 2/3 query already exists
    let existingQuery = null;
    if (position === 2) {
      const snapshot = await db
        .collection(this.queriesCollection)
        .where('baseQueryId', '==', baseQueryId)
        .where('chainConfig.chainPosition', '==', 2)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        existingQuery = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    } else if (position === 3) {
      if (!queryData.adminId) {
        throw new Error('Position 3 queries require adminId');
      }
      const snapshot = await db
        .collection(this.queriesCollection)
        .where('baseQueryId', '==', baseQueryId)
        .where('chainConfig.chainPosition', '==', 3)
        .where('adminId', '==', queryData.adminId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        existingQuery = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    }

    const queryRef = existingQuery
      ? db.collection(this.queriesCollection).doc(existingQuery.id)
      : db.collection(this.queriesCollection).doc();

    // Build query document
    const queryDoc = {
      // Base query metadata
      baseQueryId,
      featureName: baseQuery.featureName,
      featureDescription: baseQuery.featureDescription,
      category: baseQuery.category,
      
      // Position-specific data
      prompt: queryData.prompt || '',
      model: queryData.model || baseQuery.model || 'gpt-4-turbo',
      temperature: queryData.temperature !== undefined ? queryData.temperature : baseQuery.temperature || 0.7,
      maxTokens: queryData.maxTokens || baseQuery.maxTokens || 2000,
      
      // Chain configuration
      chainConfig: {
        isPartOfChain: true,
        chainId: baseQuery.chainConfig?.chainId || null,
        chainPosition: position,
      },
      
      // Position-specific scoping
      ...(position === 2 && {
        geographicScope: 'regional',
        regions: queryData.regions || [],
        localities: queryData.localities || [],
      }),
      ...(position === 3 && {
        geographicScope: 'local',
        adminId: queryData.adminId,
        designeeEmails: queryData.designeeEmails || [],
      }),
      
      // Metadata
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastEditedBy: userId,
      currentVersion: existingQuery ? (existingQuery.currentVersion || 0) + 1 : 1,
    };

    if (existingQuery) {
      // Update existing
      await queryRef.update(queryDoc);
      
      // Create version
      await this.createVersion(
        queryRef.id,
        { ...existingQuery, ...queryDoc },
        userId,
        queryData.changeReason || 'Updated Position query'
      );
    } else {
      // Create new
      queryDoc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      queryDoc.createdBy = userId;
      queryDoc.stats = {
        totalCalls: 0,
        avgResponseTime: 0,
        avgCost: 0,
        successRate: 0,
        lastUsed: null,
      };
      
      await queryRef.set(queryDoc);
      
      // Create initial version
      await this.createVersion(
        queryRef.id,
        queryDoc,
        userId,
        'Initial Position query'
      );
    }

    // Clear cache
    this._clearCache(queryRef.id);

    return { id: queryRef.id, ...queryDoc };
  }

  /**
   * Get all queries from Firestore
   * @param {Object} [user] - User profile (for sync: create missing hardcoded queries when global manager)
   * @param {string} [authUid] - Auth UID for createdBy when creating missing docs
   * @returns {Promise<Array>} Array of all queries
   */
  async getAllQueries(user = null, authUid = null) {
    try {
      const snapshot = await db
        .collection(this.queriesCollection)
        .orderBy('category')
        .orderBy('featureName')
        .get();

      const firestoreQueries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter out Position 2/3 queries — these are chain members, not base queries.
      // They are loaded separately via getQueryByPosition() when the user opens a
      // specific query card and switches to the P2/P3 tab.  Showing them here would
      // cause them to appear as duplicate top-level entries in the Query Manager UI.
      const baseQueries = firestoreQueries.filter(q => {
        const pos = q.chainConfig?.chainPosition;
        return pos === undefined || pos === null || pos === 1;
      });

      // Merge with hardcoded (hardcoded serves as fallback for missing)
      const queryMap = new Map();
      
      // Add query metadata first (no P1 prompt text in codebase)
      Object.values(QUERY_METADATA).forEach(query => {
        queryMap.set(query.id, { ...query, prompt: query.prompt ?? '', source: 'metadata' });
      });

      // Override with Firestore data, but preserve metadata contextProvided/responseFormat
      // when Firestore has empty values (these fields are managed in code as defaults)
      baseQueries.forEach(query => {
        const meta = queryMap.get(query.id);
        const merged = { ...query, source: 'firestore' };
        if (meta) {
          if (!merged.contextProvided && meta.contextProvided) {
            merged.contextProvided = meta.contextProvided;
          }
          if (!merged.responseFormat && meta.responseFormat) {
            merged.responseFormat = meta.responseFormat;
          }
        }
        queryMap.set(query.id, merged);
      });

      // One-time auto-sync: push hardcoded defaults into Firestore and create missing hardcoded queries
      if (!this._hasSyncedDefaults) {
        this._hasSyncedDefaults = true;
        this.syncHardcodedDefaultsToFirestore(user, authUid).catch(err => {
          console.warn('[QueryRegistry] Auto-sync of defaults failed:', err.message);
        });
      }

      return Array.from(queryMap.values());
    } catch (error) {
      console.warn('[QueryRegistry] Firestore fetch failed, using hardcoded only:', error.message);
      return Object.values(QUERY_METADATA).map(q => ({ ...q, prompt: q.prompt ?? '', source: 'metadata' }));
    }
  }

  /**
   * Create a new query
   * @param {Object} queryData - Query configuration
   * @param {string} userId - Creating user's ID
   * @returns {Promise<Object>} Created query
   */
  async createQuery(queryData, userId) {
    const queryRef = queryData.id 
      ? db.collection(this.queriesCollection).doc(queryData.id)
      : db.collection(this.queriesCollection).doc();

    const newQuery = {
      ...queryData,
      id: queryRef.id,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
      lastEditedBy: userId,
      currentVersion: 1,
      stats: {
        totalCalls: 0,
        avgResponseTime: 0,
        avgCost: 0,
        successRate: 0,
        lastUsed: null,
      },
    };

    await queryRef.set(newQuery);

    // Create initial version
    await this.createVersion(queryRef.id, newQuery, userId, 'Initial version');

    // Clear cache
    this._clearCache(queryRef.id);

    return { id: queryRef.id, ...newQuery };
  }

  /**
   * Update an existing query
   * @param {string} queryId - Query ID
   * @param {Object} updates - Fields to update
   * @param {string} userId - Updating user's ID
   * @param {string} changeReason - Reason for the change
   * @returns {Promise<Object>} Updated query
   */
  async updateQuery(queryId, updates, userId, changeReason) {
    const queryRef = db.collection(this.queriesCollection).doc(queryId);
    const currentQuery = await this.getQuery(queryId);

    if (!currentQuery) {
      throw new Error(`Query ${queryId} not found`);
    }

    // If this is a hardcoded query being edited for the first time,
    // we need to create it in Firestore first
    if (currentQuery.source === 'hardcoded') {
      return await this.createQuery(
        { ...currentQuery, ...updates },
        userId
      );
    }

    const newVersion = (currentQuery.currentVersion || 0) + 1;
    const isP1 = isBaseP1QueryId(queryId);

    // For P1: never store prompt, contextProvided, or responseFormat in Firestore (only in Secret Manager).
    let updatesForDoc = { ...updates };
    let versionSnapshot = { ...currentQuery, ...updates, currentVersion: newVersion };
    if (isP1) {
      delete updatesForDoc.prompt;
      updatesForDoc.prompt = firebase.firestore.FieldValue.delete();
      versionSnapshot.prompt = '';
      delete updatesForDoc.contextProvided;
      updatesForDoc.contextProvided = firebase.firestore.FieldValue.delete();
      versionSnapshot.contextProvided = '';
      delete updatesForDoc.responseFormat;
      updatesForDoc.responseFormat = firebase.firestore.FieldValue.delete();
      versionSnapshot.responseFormat = '';
    }

    // Create new version before updating (version must not contain P1 prompt text)
    await this.createVersion(queryId, versionSnapshot, userId, changeReason);

    // Firestore does not accept undefined; strip undefined values from updates
    const safeUpdates = Object.fromEntries(
      Object.entries(updatesForDoc).filter(([, v]) => v !== undefined)
    );

    // Update main query
    await queryRef.update({
      ...safeUpdates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastEditedBy: userId,
      currentVersion: newVersion,
    });

    // Clear cache
    this._clearCache(queryId);

    return {
      id: queryId,
      ...currentQuery,
      ...updates,
      currentVersion: newVersion,
      ...(isP1 && { prompt: '', contextProvided: '', responseFormat: '' }),
    };
  }

  /**
   * Delete a query
   * @param {string} queryId - Query ID
   * @returns {Promise<void>}
   */
  async deleteQuery(queryId) {
    await db.collection(this.queriesCollection).doc(queryId).delete();
    this._clearCache(queryId);
  }

  // ============================================
  // VERSION CONTROL
  // ============================================

  /**
   * Create a version snapshot
   * @param {string} queryId - Query ID
   * @param {Object} querySnapshot - Full query state
   * @param {string} userId - User making the change
   * @param {string} changeReason - Reason for the change
   * @returns {Promise<Object>} Created version
   */
  async createVersion(queryId, querySnapshot, userId, changeReason) {
    const versionRef = db.collection(this.versionsCollection).doc();

    // Firestore does not allow undefined; P1 queries have no prompt in Firestore (it lives in Secret Manager / local).
    const version = {
      queryId,
      versionNumber: querySnapshot.currentVersion || 1,
      prompt: querySnapshot.prompt ?? '',
      model: querySnapshot.model ?? null,
      temperature: querySnapshot.temperature !== undefined ? querySnapshot.temperature : null,
      maxTokens: querySnapshot.maxTokens !== undefined ? querySnapshot.maxTokens : null,
      changedBy: userId,
      changedAt: firebase.firestore.FieldValue.serverTimestamp(),
      changeReason: changeReason ?? '',
      changeType: this._detectChangeType(querySnapshot) ?? '',
    };

    await versionRef.set(version);
    return { id: versionRef.id, ...version };
  }

  /**
   * Get version history for a query
   * @param {string} queryId - Query ID
   * @returns {Promise<Array>} Array of versions
   */
  async getVersionHistory(queryId) {
    try {
      const snapshot = await db
        .collection(this.versionsCollection)
        .where('queryId', '==', queryId)
        .orderBy('versionNumber', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        changedAt: doc.data().changedAt?.toDate() || null,
      }));
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get version history:', error.message);
      return [];
    }
  }

  /**
   * Rollback to a specific version
   * @param {string} queryId - Query ID
   * @param {number} versionNumber - Version to rollback to
   * @param {string} userId - User performing rollback
   * @returns {Promise<Object>} Updated query
   */
  async rollbackToVersion(queryId, versionNumber, userId) {
    const versions = await this.getVersionHistory(queryId);
    const targetVersion = versions.find(v => v.versionNumber === versionNumber);

    if (!targetVersion) {
      throw new Error(`Version ${versionNumber} not found for query ${queryId}`);
    }

    return await this.updateQuery(
      queryId,
      {
        prompt: targetVersion.prompt,
        model: targetVersion.model,
        temperature: targetVersion.temperature,
        maxTokens: targetVersion.maxTokens,
      },
      userId,
      `Rollback to version ${versionNumber}`
    );
  }

  // ============================================
  // QUERY CHAINING (Global Only)
  // ============================================

  /**
   * Create a query chain
   * @param {Object} chainData - Chain configuration
   * @param {string} userId - Creating user's ID
   * @returns {Promise<Object>} Created chain
   */
  async createChain(chainData, userId) {
    const chainRef = db.collection(this.chainsCollection).doc();

    const newChain = {
      ...chainData,
      id: chainRef.id,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
    };

    await chainRef.set(newChain);

    // Update individual queries to reference chain
    for (const queryConfig of chainData.queries || []) {
      await this.updateQuery(
        queryConfig.queryId,
        {
          'chainConfig.isPartOfChain': true,
          'chainConfig.chainId': chainRef.id,
          'chainConfig.chainPosition': queryConfig.position,
        },
        userId,
        'Added to query chain'
      );
    }

    return { id: chainRef.id, ...newChain };
  }

  /**
   * Get a chain by ID
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object|null>} Chain object or null
   */
  async getChain(chainId) {
    try {
      const docRef = db.collection(this.chainsCollection).doc(chainId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get chain:', error.message);
    }
    return null;
  }

  /**
   * Get all chains
   * @returns {Promise<Array>} Array of chains
   */
  async getAllChains() {
    try {
      const snapshot = await db
        .collection(this.chainsCollection)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get chains:', error.message);
      return [];
    }
  }

  // ============================================
  // GEOGRAPHIC DATA
  // ============================================

  /**
   * Get all geographic regions
   * @returns {Promise<Array>}
   */
  async getRegions() {
    try {
      const snapshot = await db.collection(COLLECTIONS.REGIONS).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get regions:', error.message);
      return [];
    }
  }

  /**
   * Get all geographic localities
   * @returns {Promise<Array>}
   */
  async getLocalities() {
    try {
      const snapshot = await db.collection(COLLECTIONS.LOCALITIES).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get localities:', error.message);
      return [];
    }
  }

  /**
   * Get localities for a specific region
   * @param {string} regionId - Region ID
   * @returns {Promise<Array>}
   */
  async getLocalitiesByRegion(regionId) {
    try {
      const snapshot = await db
        .collection(COLLECTIONS.LOCALITIES)
        .where('region', '==', regionId)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('[QueryRegistry] Failed to get localities by region:', error.message);
      return [];
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Update query usage statistics
   * @param {string} queryId - Query ID
   * @param {Object} callData - Call statistics
   */
  async updateQueryStats(queryId, callData) {
    try {
      const queryRef = db.collection(this.queriesCollection).doc(queryId);
      const currentQuery = await this.getQuery(queryId);

      if (!currentQuery || currentQuery.source === 'hardcoded') {
        return; // Don't update stats for hardcoded queries
      }

      const stats = currentQuery.stats || {
        totalCalls: 0,
        avgResponseTime: 0,
        avgCost: 0,
        successRate: 0,
      };

      const newTotalCalls = stats.totalCalls + 1;

      await queryRef.update({
        'stats.totalCalls': newTotalCalls,
        'stats.avgResponseTime':
          (stats.avgResponseTime * stats.totalCalls + (callData.responseTime || 0)) / newTotalCalls,
        'stats.avgCost':
          (stats.avgCost * stats.totalCalls + (callData.cost || 0)) / newTotalCalls,
        'stats.successRate':
          (stats.successRate * stats.totalCalls + (callData.success ? 1 : 0)) / newTotalCalls,
        'stats.lastUsed': firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.warn('[QueryRegistry] Failed to update stats:', error.message);
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  _getFromCache(queryId) {
    const cached = this._queryCache.get(queryId);
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  _setCache(queryId, data) {
    this._queryCache.set(queryId, {
      data,
      timestamp: Date.now(),
    });
  }

  _clearCache(queryId) {
    if (queryId) {
      this._queryCache.delete(queryId);
    } else {
      this._queryCache.clear();
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  _detectChangeType(querySnapshot) {
    // Simple change type detection
    return 'config_update';
  }

  /**
   * Get queries by category
   * @param {string} category - Category to filter by
   * @returns {Promise<Array>}
   */
  async getQueriesByCategory(category) {
    const allQueries = await this.getAllQueries();
    return allQueries.filter(q => q.category === category);
  }

  /**
   * Get all unique categories
   * @returns {Promise<Array>}
   */
  async getCategories() {
    const allQueries = await this.getAllQueries();
    return [...new Set(allQueries.map(q => q.category).filter(Boolean))];
  }

  // ============================================
  // MIGRATION / SYNC
  // ============================================

  /**
   * Sync hardcoded contextProvided and responseFormat values to Firestore.
   * Creates missing hardcoded-query documents when caller is a global manager (so new queries
   * e.g. symptom-checker-ddx-standalone appear in Firestore without a separate migration).
   * @param {Object} [user] - User profile; when global manager, missing docs are created
   * @param {string} [authUid] - Auth UID for createdBy when creating docs
   * @returns {Promise<{created: string[], updated: string[], skipped: string[], errors: string[]}>}
   */
  async syncHardcodedDefaultsToFirestore(user = null, authUid = null) {
    const results = { created: [], updated: [], skipped: [], errors: [] };
    const isGlobal = user && getLLMManagerLevel(user) === 'global';
    const canCreate = isGlobal && authUid;

    for (const [queryId, hardcoded] of Object.entries(QUERY_METADATA)) {
      try {
        const docRef = db.collection(this.queriesCollection).doc(queryId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          if (canCreate) {
            await this.createQuery({ ...hardcoded }, authUid);
            results.created.push(queryId);
            this._queryCache.delete(queryId);
          } else {
            results.skipped.push(`${queryId} (not in Firestore)`);
          }
          continue;
        }

        const firestoreData = docSnap.data();
        const updates = {};

        // Sync contextProvided if Firestore is empty but hardcoded has a value
        if (!firestoreData.contextProvided && hardcoded.contextProvided) {
          updates.contextProvided = hardcoded.contextProvided;
        }

        // Sync responseFormat if Firestore is empty but hardcoded has a value
        if (!firestoreData.responseFormat && hardcoded.responseFormat) {
          updates.responseFormat = hardcoded.responseFormat;
        }

        // One-time upgrade: if Firestore responseFormat is missing the "no code fences"
        // instruction (added Feb 2026 to prevent markdown-wrapped JSON responses),
        // update it from the hardcoded value which now includes this instruction.
        if (
          firestoreData.responseFormat &&
          hardcoded.responseFormat &&
          hardcoded.responseFormat.includes('no code fences') &&
          !firestoreData.responseFormat.includes('no code fences')
        ) {
          updates.responseFormat = hardcoded.responseFormat;
        }

        if (Object.keys(updates).length > 0) {
          await docRef.update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          results.updated.push(`${queryId} (${Object.keys(updates).join(', ')})`);
          // Invalidate cache for this query
          this._queryCache.delete(queryId);
        } else {
          results.skipped.push(`${queryId} (already populated)`);
        }
      } catch (error) {
        results.errors.push(`${queryId}: ${error.message}`);
      }
    }

    return results;
  }
}

// Export singleton instance
export const queryRegistryService = new QueryRegistryService();

export default queryRegistryService;
