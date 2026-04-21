/**
 * ChartMind Session Service - Firestore persistence for ChartMind sessions
 * 
 * Handles saving/loading session state to/from Firestore:
 * - Sessions stored at: chartmind/{sessionId}
 * - Active session ID stored in: users/{uid}/profile.activeChartMindSession
 * 
 * Session structure:
 * {
 *   id: string,
 *   userId: string,
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 *   data: { ...serialized session state }
 * }
 */

import { db } from "./firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeReportingMetadata(reportingMetadata = {}) {
  const normalized = {};

  if (
    typeof reportingMetadata.organizationId === "string" &&
    reportingMetadata.organizationId.trim()
  ) {
    normalized.organizationId = reportingMetadata.organizationId.trim();
  }

  if (typeof reportingMetadata.isSimulation === "boolean") {
    normalized.isSimulation = reportingMetadata.isSimulation;
  }

  return normalized;
}

/**
 * Save session to Firestore
 * 
 * @param {string} sessionId - Session ID (will be generated if null)
 * @param {Object} sessionData - Serialized session data from serializeSession()
 * @param {string} userId - User ID who owns this session
 * @param {Object} reportingMetadata - Organization/reporting context
 * @returns {Promise<string>} The session ID (generated or provided)
 */
export async function saveSession(
  sessionId,
  sessionData,
  userId,
  reportingMetadata = {},
) {
  if (!userId) {
    throw new Error('userId is required to save session');
  }

  if (!sessionData) {
    throw new Error('sessionData is required');
  }

  // Generate ID if not provided
  const id = sessionId || generateSessionId();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const metadata = normalizeReportingMetadata(reportingMetadata);
  const sessionRef = db.collection("chartmind").doc(id);

  try {
    const sessionDoc = {
      id,
      userId,
      timestamp: now, // Document-level timestamp (not in data object)
      updatedAt: now,
      data: sessionData, // Session data without timestamp
      ...metadata,
    };

    // If creating new session, add createdAt
    if (!sessionId) {
      sessionDoc.createdAt = now;
    }

    const existingDoc = sessionId ? await sessionRef.get() : null;

    if (!sessionId || !existingDoc?.exists) {
      if (!sessionDoc.createdAt) {
        sessionDoc.createdAt = now;
      }
      await sessionRef.set(sessionDoc);
    } else {
      // Replace the nested data payload wholesale so schema changes can
      // remove or reshape ChartMind fields without leaving stale keys behind.
      await sessionRef.update(sessionDoc);
    }

    console.log('[chartMindSessionService] Session saved:', id);
    return id;
  } catch (error) {
    console.error('[chartMindSessionService] Error saving session:', error);
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

/**
 * Load session from Firestore
 * 
 * @param {string} sessionId - Session ID to load
 * @returns {Promise<Object|null>} Session document or null if not found
 */
export async function loadSession(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId is required to load session');
  }

  try {
    const doc = await db.collection('chartmind').doc(sessionId).get();

    if (!doc.exists) {
      console.log('[chartMindSessionService] Session not found:', sessionId);
      return null;
    }

    const session = doc.data();
    console.log('[chartMindSessionService] Session loaded:', sessionId);
    return session;
  } catch (error) {
    console.error('[chartMindSessionService] Error loading session:', error);
    throw new Error(`Failed to load session: ${error.message}`);
  }
}

/**
 * Get user's active session ID from their profile
 * 
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Active session ID or null
 */
export async function getActiveSessionId(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const profileDoc = await db.collection('users').doc(userId).collection('profile').doc('settings').get();

    if (!profileDoc.exists) {
      console.log('[chartMindSessionService] No profile found for user:', userId);
      return null;
    }

    const activeSessionId = profileDoc.data()?.activeChartMindSession || null;
    console.log('[chartMindSessionService] Active session ID:', activeSessionId);
    return activeSessionId;
  } catch (error) {
    console.error('[chartMindSessionService] Error getting active session ID:', error);
    throw new Error(`Failed to get active session ID: ${error.message}`);
  }
}

/**
 * Set user's active session ID in their profile
 * 
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID to set as active
 * @returns {Promise<void>}
 */
export async function setActiveSessionId(userId, sessionId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('profile')
      .doc('settings')
      .set(
        {
          activeChartMindSession: sessionId,
          activeChartMindSessionUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log('[chartMindSessionService] Active session ID set:', sessionId);
  } catch (error) {
    console.error('[chartMindSessionService] Error setting active session ID:', error);
    throw new Error(`Failed to set active session ID: ${error.message}`);
  }
}

/**
 * Create a new session for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} reportingMetadata - Organization/reporting context
 * @returns {Promise<string>} New session ID
 */
export async function createNewSession(userId, reportingMetadata = {}) {
  if (!userId) {
    throw new Error("userId is required to create session");
  }

  const sessionId = generateSessionId();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const metadata = normalizeReportingMetadata(reportingMetadata);

  try {
    // Create empty session document (minimal structure - no empty sections)
    await db
      .collection("chartmind")
      .doc(sessionId)
      .set({
        id: sessionId,
        userId,
        createdAt: now,
        updatedAt: now,
        data: {
          timestamp: new Date().toISOString(),
        },
        ...metadata,
      });

    console.log('[chartMindSessionService] New session created:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('[chartMindSessionService] Error creating session:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

/**
 * Delete a session
 * 
 * @param {string} sessionId - Session ID to delete
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  console.log('[chartMindSessionService] 🗑️ deleteSession called with:', sessionId);
  
  if (!sessionId) {
    console.error('[chartMindSessionService] ❌ No sessionId provided');
    throw new Error('sessionId is required to delete session');
  }

  try {
    console.log('[chartMindSessionService] 🔄 Deleting Firestore document...');
    await db.collection('chartmind').doc(sessionId).delete();
    console.log('[chartMindSessionService] ✅ Session deleted:', sessionId);
  } catch (error) {
    console.error('[chartMindSessionService] ❌ Error deleting session:', error);
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

/**
 * List all sessions for a user
 * 
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of sessions to return (default: 10)
 * @returns {Promise<Array>} Array of session documents
 */
export async function listUserSessions(userId, limit = 10) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const snapshot = await db
      .collection('chartmind')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push(doc.data());
    });

    console.log('[chartMindSessionService] Found', sessions.length, 'sessions for user:', userId);
    return sessions;
  } catch (error) {
    console.error('[chartMindSessionService] Error listing sessions:', error);
    throw new Error(`Failed to list sessions: ${error.message}`);
  }
}

/**
 * Generate AI title for a session (non-blocking)
 * Called after first save to create a descriptive title
 * 
 * @param {string} sessionId - Session ID
 * @param {string} transcript - Patient encounter transcript
 * @returns {Promise<void>}
 */
export async function generateSessionTitle(sessionId, transcript) {
  if (!sessionId || !transcript) {
    throw new Error('sessionId and transcript are required');
  }

  try {
    console.log('[chartMindSessionService] Generating title for session:', sessionId);
    
    const summarizeText = firebase.functions().httpsCallable('summarizeText');
    
    const result = await summarizeText({
      text: transcript,
      type: 'chartmind',
    });
    
    const title = result.data?.summary;
    
    if (title) {
      // Update session with title (document level, not in data)
      await db.collection('chartmind').doc(sessionId).update({
        title: title,
      });
      
      console.log('[chartMindSessionService] Title generated:', title);
    }
  } catch (error) {
    console.error('[chartMindSessionService] Error generating title:', error);
    // Don't throw - title generation is non-critical
  }
}

/**
 * Update session title (for manual rename)
 * 
 * @param {string} sessionId - Session ID
 * @param {string} newTitle - New title for the session
 * @returns {Promise<void>}
 */
export async function updateSessionTitle(sessionId, newTitle) {
  console.log('[chartMindSessionService] 🔄 updateSessionTitle called with:', { sessionId, newTitle });
  
  if (!sessionId || !newTitle) {
    console.error('[chartMindSessionService] ❌ Missing required params');
    throw new Error('sessionId and newTitle are required');
  }

  try {
    console.log('[chartMindSessionService] 🔄 Updating Firestore document...');
    await db.collection('chartmind').doc(sessionId).update({
      title: newTitle,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('[chartMindSessionService] ✅ Title updated for session:', sessionId);
  } catch (error) {
    console.error('[chartMindSessionService] ❌ Error updating title:', error);
    throw error;
  }
}

export default {
  saveSession,
  loadSession,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  deleteSession,
  listUserSessions,
  generateSessionTitle,
  updateSessionTitle,
};
