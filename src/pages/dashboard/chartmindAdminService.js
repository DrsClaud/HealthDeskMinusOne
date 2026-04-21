/**
 * ChartMind Admin Service
 * 
 * Manages ChartMind admin data including:
 * - Custom prompts (Position 3) for designees
 * - Designee management
 * - Invite links
 * - Facility/organization settings
 */

import { db, createCheckInTemplate, updateCheckInTemplate, generateCheckInQR } from '@healthdesk/shared-services';
import firebase from 'firebase/compat/app';
import { INPUT_MODES } from '../llm/chainExecutionService';

const COLLECTION = 'chartmindAdmins';

// ChartMind card IDs — maps to query IDs via `chartmind-{cardId}`
export const CHARTMIND_CARDS = {
  DDX: 'ddx',
  DDX_FINAL: 'ddx-final',
  DIAGNOSTIC_TESTS: 'diagnostic-tests',
  TREATMENT_OPTIONS: 'treatment-options',
  DISCHARGE_PLAN: 'discharge-plan',
  CLARIFYING_QUESTIONS: 'clarifying-questions',
  CHART_GENERATION: 'chart-generation',
  REQUIRED_SECTIONS_TRACKER: 'required-sections-tracker',
  TEST_SMART_CHOICES: 'test-smart-choices',
  CLINICAL_GUIDANCE: 'clinical-guidance',
  TRANSLATE: 'translate',
  PEERVIEW_CONSULTATION: 'peerview-consultation',
};

export const CHARTMIND_CARD_LIST = Object.values(CHARTMIND_CARDS);

/**
 * Default prompt configuration template
 */
const createDefaultPromptConfig = () => ({
  prompt: '',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  inputMode: INPUT_MODES.PREVIOUS_PLUS_ORIGINAL, // Default to Mode B
  enabled: false,
  lastModified: null,
  modifiedBy: null,
  version: 0,
});

class ChartmindAdminService {
  constructor() {
    this.collection = COLLECTION;
  }

  // ============================================
  // ADMIN CRUD
  // ============================================

  /**
   * Get or create admin record for a user
   * @param {string} userId - Firebase user ID
   * @param {Object} userData - User data (email, name)
   * @returns {Promise<Object>} Admin document
   */
  async getOrCreateAdmin(userId, userData = {}) {
    // Check if admin record exists
    const existingQuery = await db.collection(this.collection)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const doc = existingQuery.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // Create new admin record
    const newAdmin = {
      userId,
      email: userData.email || null,
      name: userData.name || null,
      facilityName: '',
      organizationName: '',
      designeeEmails: [],
      pendingDesignees: [],
      inviteLinks: [],
      customPrompts: {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(this.collection).add(newAdmin);
    return { id: docRef.id, ...newAdmin };
  }

  /**
   * Get admin by ID
   * @param {string} adminId - Admin document ID
   * @returns {Promise<Object|null>}
   */
  async getAdminById(adminId) {
    const doc = await db.collection(this.collection).doc(adminId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get admin by user ID
   * @param {string} userId - Firebase user ID
   * @returns {Promise<Object|null>}
   */
  async getAdminByUserId(userId) {
    const query = await db.collection(this.collection)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (query.empty) return null;
    const doc = query.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update admin facility settings
   * @param {string} adminId - Admin document ID
   * @param {Object} settings - { facilityName, organizationName }
   * @returns {Promise<void>}
   */
  async updateFacilitySettings(adminId, settings) {
    await db.collection(this.collection).doc(adminId).update({
      facilityName: settings.facilityName || '',
      organizationName: settings.organizationName || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Update allowed email domains for invitees (TLD restriction per plan).
   * When set, only emails from these domains can join via invite link.
   * @param {string} adminId - Admin document ID
   * @param {string[]} allowedDomains - e.g. ['hospital.org'] or [] for no restriction
   * @returns {Promise<void>}
   */
  async updateAllowedDomains(adminId, allowedDomains) {
    const normalized = (allowedDomains || []).map(d => d.toLowerCase().trim()).filter(Boolean);
    await db.collection(this.collection).doc(adminId).update({
      allowedDomains: normalized,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ============================================
  // CUSTOM PROMPTS
  // ============================================

  /**
   * Get custom prompt for a card
   * @param {string} adminId - Admin document ID
   * @param {string} cardId - Card ID (ddx, tests, etc.)
   * @returns {Promise<Object|null>}
   */
  async getCustomPrompt(adminId, cardId) {
    const admin = await this.getAdminById(adminId);
    if (!admin) return null;
    return admin.customPrompts?.[cardId] || null;
  }

  /**
   * Update custom prompt for a card
   * @param {string} adminId - Admin document ID
   * @param {string} cardId - Card ID
   * @param {Object} promptConfig - Prompt configuration
   * @param {string} modifiedBy - Email of person making change
   * @returns {Promise<void>}
   */
  async updateCustomPrompt(adminId, cardId, promptConfig, modifiedBy) {
    if (!CHARTMIND_CARD_LIST.includes(cardId)) {
      throw new Error(`Invalid card ID: ${cardId}`);
    }

    const admin = await this.getAdminById(adminId);
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }

    const currentPrompt = admin.customPrompts?.[cardId] || createDefaultPromptConfig();
    const newVersion = (currentPrompt.version || 0) + 1;

    const updatedPrompt = {
      ...currentPrompt,
      ...promptConfig,
      lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      modifiedBy,
      version: newVersion,
    };

    await db.collection(this.collection).doc(adminId).update({
      [`customPrompts.${cardId}`]: updatedPrompt,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Enable/disable a custom prompt
   * @param {string} adminId - Admin document ID
   * @param {string} cardId - Card ID
   * @param {boolean} enabled - Whether to enable the prompt
   * @returns {Promise<void>}
   */
  async toggleCustomPrompt(adminId, cardId, enabled) {
    await db.collection(this.collection).doc(adminId).update({
      [`customPrompts.${cardId}.enabled`]: enabled,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get all custom prompts for an admin
   * @param {string} adminId - Admin document ID
   * @returns {Promise<Object>}
   */
  async getAllCustomPrompts(adminId) {
    const admin = await this.getAdminById(adminId);
    if (!admin) return {};
    return admin.customPrompts || {};
  }

  // ============================================
  // DESIGNEE MANAGEMENT
  // ============================================

  /**
   * Add a designee by email
   * @param {string} adminId - Admin document ID
   * @param {string} email - Designee email
   * @returns {Promise<void>}
   */
  async addDesignee(adminId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    
    await db.collection(this.collection).doc(adminId).update({
      designeeEmails: firebase.firestore.FieldValue.arrayUnion(normalizedEmail),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Remove a designee by email
   * @param {string} adminId - Admin document ID
   * @param {string} email - Designee email
   * @returns {Promise<void>}
   */
  async removeDesignee(adminId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    
    await db.collection(this.collection).doc(adminId).update({
      designeeEmails: firebase.firestore.FieldValue.arrayRemove(normalizedEmail),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get all admins that have a user as designee
   * @param {string} userEmail - User email
   * @returns {Promise<Array>} Array of admin documents
   */
  async getAdminsForDesignee(userEmail) {
    const normalizedEmail = userEmail.trim().toLowerCase();
    
    const query = await db.collection(this.collection)
      .where('designeeEmails', 'array-contains', normalizedEmail)
      .get();

    return query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Check if user is a designee of any admin
   * @param {string} userEmail - User email
   * @returns {Promise<boolean>}
   */
  async isDesignee(userEmail) {
    const admins = await this.getAdminsForDesignee(userEmail);
    return admins.length > 0;
  }

  // ============================================
  // PENDING DESIGNEES (Approval Flow)
  // ============================================

  /**
   * Add a pending designee (awaiting approval)
   * @param {string} adminId - Admin document ID
   * @param {string} email - Designee email
   * @param {string} inviteCode - The invite code used
   * @returns {Promise<void>}
   */
  async addPendingDesignee(adminId, email, inviteCode) {
    const normalizedEmail = email.trim().toLowerCase();
    
    const pendingEntry = {
      email: normalizedEmail,
      requestedAt: new Date().toISOString(),
      inviteCode,
    };

    await db.collection(this.collection).doc(adminId).update({
      pendingDesignees: firebase.firestore.FieldValue.arrayUnion(pendingEntry),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Approve a pending designee
   * @param {string} adminId - Admin document ID
   * @param {string} email - Designee email
   * @returns {Promise<void>}
   */
  async approvePendingDesignee(adminId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.getAdminById(adminId);
    
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }

    // Find and remove from pending
    const pendingDesignees = (admin.pendingDesignees || [])
      .filter(p => p.email !== normalizedEmail);

    // Add to approved designees
    const designeeEmails = [...new Set([...(admin.designeeEmails || []), normalizedEmail])];

    await db.collection(this.collection).doc(adminId).update({
      pendingDesignees,
      designeeEmails,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Reject a pending designee
   * @param {string} adminId - Admin document ID
   * @param {string} email - Designee email
   * @returns {Promise<void>}
   */
  async rejectPendingDesignee(adminId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.getAdminById(adminId);
    
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }

    const pendingDesignees = (admin.pendingDesignees || [])
      .filter(p => p.email !== normalizedEmail);

    await db.collection(this.collection).doc(adminId).update({
      pendingDesignees,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ============================================
  // INVITE LINKS
  // ============================================

  /**
   * Generate a unique invite code
   * @returns {string}
   */
  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create an invite link
   * @param {string} adminId - Admin document ID
   * @param {Object} options - { requiresApproval, expiresInDays, maxUses }
   * @returns {Promise<Object>} The created invite link
   */
  async createInviteLink(adminId, options = {}) {
    const {
      requiresApproval = true,
      expiresInDays = null,
      maxUses = null,
    } = options;

    const code = this.generateInviteCode();
    const createdAt = new Date().toISOString();
    
    const inviteLink = {
      code,
      createdAt,
      expiresAt: expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      requiresApproval,
      maxUses,
      usedCount: 0,
    };

    await db.collection(this.collection).doc(adminId).update({
      inviteLinks: firebase.firestore.FieldValue.arrayUnion(inviteLink),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    return inviteLink;
  }

  /**
   * Find admin by invite code
   * @param {string} code - Invite code
   * @returns {Promise<Object|null>} { admin, inviteLink } or null
   */
  async findAdminByInviteCode(code) {
    // Query all admins and filter (Firestore doesn't support array-contains on nested objects)
    const allAdmins = await db.collection(this.collection).get();
    
    for (const doc of allAdmins.docs) {
      const admin = { id: doc.id, ...doc.data() };
      const inviteLink = (admin.inviteLinks || []).find(link => link.code === code);
      
      if (inviteLink) {
        return { admin, inviteLink };
      }
    }
    
    return null;
  }

  /**
   * Use an invite link (process a join request)
   * @param {string} code - Invite code
   * @param {string} userEmail - User email
   * @returns {Promise<Object>} { success, message, requiresApproval, adminId }
   */
  async useInviteLink(code, userEmail) {
    const result = await this.findAdminByInviteCode(code);
    
    if (!result) {
      return { success: false, message: 'Invalid invite code' };
    }

    const { admin, inviteLink } = result;
    const normalizedEmail = userEmail.trim().toLowerCase();

    // Invitee email domain (TLD) restriction at accept/request time (per plan)
    const allowedDomains = admin.allowedDomains;
    if (Array.isArray(allowedDomains) && allowedDomains.length > 0) {
      const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase();
      const isAllowed = allowedDomains.some(d => d.toLowerCase().trim() === emailDomain);
      if (!isAllowed) {
        return {
          success: false,
          message: `This invite is only valid for email addresses from: ${allowedDomains.join(', ')}`,
        };
      }
    }

    // Check if already a designee
    if (admin.designeeEmails?.includes(normalizedEmail)) {
      return { success: false, message: 'You are already a member of this organization' };
    }

    // Check if already pending
    if (admin.pendingDesignees?.some(p => p.email === normalizedEmail)) {
      return { success: false, message: 'Your request is already pending approval' };
    }

    // Check expiration
    if (inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date()) {
      return { success: false, message: 'This invite link has expired' };
    }

    // Check max uses
    if (inviteLink.maxUses !== null && inviteLink.usedCount >= inviteLink.maxUses) {
      return { success: false, message: 'This invite link has reached its usage limit' };
    }

    // Update usage count
    const updatedLinks = admin.inviteLinks.map(link => {
      if (link.code === code) {
        return { ...link, usedCount: (link.usedCount || 0) + 1 };
      }
      return link;
    });

    await db.collection(this.collection).doc(admin.id).update({
      inviteLinks: updatedLinks,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Add as designee or pending based on approval requirement
    if (inviteLink.requiresApproval) {
      await this.addPendingDesignee(admin.id, normalizedEmail, code);
      return {
        success: true,
        message: 'Request submitted. Awaiting admin approval.',
        requiresApproval: true,
        adminId: admin.id,
        facilityName: admin.facilityName,
      };
    } else {
      await this.addDesignee(admin.id, normalizedEmail);
      return {
        success: true,
        message: 'Successfully joined organization.',
        requiresApproval: false,
        adminId: admin.id,
        facilityName: admin.facilityName,
      };
    }
  }

  /**
   * Delete an invite link
   * @param {string} adminId - Admin document ID
   * @param {string} code - Invite code
   * @returns {Promise<void>}
   */
  async deleteInviteLink(adminId, code) {
    const admin = await this.getAdminById(adminId);
    if (!admin) {
      throw new Error(`Admin not found: ${adminId}`);
    }

    const updatedLinks = (admin.inviteLinks || []).filter(link => link.code !== code);

    await db.collection(this.collection).doc(adminId).update({
      inviteLinks: updatedLinks,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ============================================
  // CHARTMIND TEMPLATES (Named Prompt Collections)
  // ============================================

  /**
   * Get all templates for an admin
   * @param {string} adminId - Admin document ID
   * @returns {Promise<Array>} Array of template documents
   */
  async getTemplates(adminId) {
    const snapshot = await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get a single template by ID
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @returns {Promise<Object|null>}
   */
  async getTemplate(adminId, templateId) {
    const doc = await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Create a new template.
   * When clinicId and userId are provided, also creates a check-in template and links it to this PET
   * (one check-in template per PET); stores bidirectional refs in clinics/{clinicId}/checkInTemplates.
   *
   * @param {string} adminId - Admin document ID
   * @param {Object|string} templateData - { name, createdByEmail, clinicId?, userId? } or name string (legacy)
   * @returns {Promise<Object>} Created template with id (and checkInLink if a check-in template was created)
   */
  async createTemplate(adminId, templateData) {
    const inviteCode = this.generateInviteCode();

    // Support both string (legacy) and object formats
    const name = typeof templateData === 'string'
      ? templateData
      : (templateData?.name || 'Untitled Template');
    const createdByEmail = typeof templateData === 'object'
      ? (templateData?.createdByEmail || null)
      : null;
    const clinicId = typeof templateData === 'object' ? templateData?.clinicId : null;
    const userId = typeof templateData === 'object' ? templateData?.userId : null;

    // Build default prompts map
    const prompts = {};
    for (const cardId of CHARTMIND_CARD_LIST) {
      prompts[cardId] = createDefaultPromptConfig();
    }

    // Store admin display info on template so professional-chartmind can resolve by invite without reading chartmindAdmins
    const admin = await this.getAdminById(adminId);
    const adminDisplayName = admin?.name || admin?.facilityName || admin?.email || 'Unknown';
    const adminEmail = admin?.email || '';

    const newTemplate = {
      name,
      prompts,
      inviteCode,
      createdByEmail,
      adminDisplayName,
      adminEmail,
      checkInLink: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .add(newTemplate);

    const createdTemplate = { id: docRef.id, ...newTemplate };

    // Auto-create a check-in template (one per PET) and link it if clinicId is provided
    if (clinicId && userId) {
      try {
        const checkInTemplateId = await createCheckInTemplate(clinicId, {
          name,
          description: '',
          welcomeMessage: `Welcome to our clinic!\n\nPlease review and confirm your information below. This helps us provide you with the best possible care.\n\nIf any information is incorrect, please update it before submitting.`,
          fields: [],
          specialties: [],
          medicationsReview: 'none',
          encounterTemplateRef: { adminId, templateId: docRef.id },
        }, userId);

        const checkInLink = { clinicId, templateId: checkInTemplateId };
        await db.collection(this.collection)
          .doc(adminId)
          .collection('templates')
          .doc(docRef.id)
          .update({ checkInLink });

        // Store ref + inviteCode on the check-in template so facility role can show QR/link without reading chartmindAdmins/templates
        await updateCheckInTemplate(clinicId, checkInTemplateId, {
          encounterTemplateRef: { adminId, templateId: docRef.id },
          inviteCode: inviteCode,
        });

        createdTemplate.checkInLink = checkInLink;

        // Auto-generate a QR code for the new check-in template so facility users see it immediately
        try {
          await generateCheckInQR(clinicId, checkInTemplateId, userId);
        } catch (qrErr) {
          console.warn('[chartmindAdminService] Auto-generate QR code failed (check-in template still created):', qrErr);
        }
      } catch (err) {
        console.warn('[chartmindAdminService] Auto-create check-in template failed (PET still created):', err);
      }
    }

    return createdTemplate;
  }

  /**
   * Update a template's name
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @param {string} name - New template name
   * @returns {Promise<void>}
   */
  async updateTemplateName(adminId, templateId, name) {
    const updates = {
      name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    // Backfill admin display info so invite-code resolution shows correct creator (e.g. for professional-chartmind)
    const admin = await this.getAdminById(adminId);
    if (admin) {
      updates.adminDisplayName = admin.name || admin.facilityName || admin.email || 'Unknown';
      updates.adminEmail = admin.email || '';
    }
    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update(updates);
  }

  /**
   * Update a prompt within a template
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @param {string} cardId - Card ID (ddx, tests, etc.)
   * @param {Object} promptConfig - Prompt configuration
   * @param {string} modifiedBy - Email of person making change
   * @returns {Promise<void>}
   */
  async updateTemplatePrompt(adminId, templateId, cardId, promptConfig, modifiedBy) {
    if (!CHARTMIND_CARD_LIST.includes(cardId)) {
      throw new Error(`Invalid card ID: ${cardId}`);
    }

    const template = await this.getTemplate(adminId, templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const currentPrompt = template.prompts?.[cardId] || createDefaultPromptConfig();
    const newVersion = (currentPrompt.version || 0) + 1;

    const updatedPrompt = {
      ...currentPrompt,
      ...promptConfig,
      lastModified: firebase.firestore.FieldValue.serverTimestamp(),
      modifiedBy,
      version: newVersion,
    };

    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update({
        [`prompts.${cardId}`]: updatedPrompt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  /**
   * Toggle a prompt within a template
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @param {string} cardId - Card ID
   * @param {boolean} enabled - Whether to enable the prompt
   * @returns {Promise<void>}
   */
  async toggleTemplatePrompt(adminId, templateId, cardId, enabled) {
    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update({
        [`prompts.${cardId}.enabled`]: enabled,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  /**
   * Delete a template (PET).
   * If the PET has a linked check-in template, clears the check-in template's encounterTemplateRef first.
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - PET (template) document ID
   * @returns {Promise<void>}
   */
  async deleteTemplate(adminId, templateId) {
    const template = await this.getTemplate(adminId, templateId);
    if (template?.checkInLink) {
      try {
        const { clinicId, templateId: checkInTemplateId } = template.checkInLink;
        await updateCheckInTemplate(clinicId, checkInTemplateId, { encounterTemplateRef: null });
      } catch (err) {
        console.warn('[chartmindAdminService] Failed to unlink check-in template during PET delete:', err);
      }
    }

    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .delete();
  }

  /**
   * Regenerate a template's invite code
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @returns {Promise<string>} The new invite code
   */
  async regenerateTemplateInviteCode(adminId, templateId) {
    const template = await this.getTemplate(adminId, templateId);
    const newCode = this.generateInviteCode();
    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update({
        inviteCode: newCode,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    // Keep linked check-in template in sync so facility role sees the new code
    if (template?.checkInLink?.clinicId && template?.checkInLink?.templateId) {
      try {
        await updateCheckInTemplate(template.checkInLink.clinicId, template.checkInLink.templateId, {
          inviteCode: newCode,
        });
      } catch (err) {
        console.warn('[chartmindAdminService] Failed to update check-in template inviteCode after regenerate:', err);
      }
    }
    return newCode;
  }

  /**
   * Find admin + template by template invite code.
   * Uses only the template document (and path) so professional-chartmind users can resolve
   * without needing read access to chartmindAdmins. Admin display info is stored on the template.
   * @param {string} code - Template invite code
   * @returns {Promise<Object|null>} { admin, template } or null
   */
  async findTemplateByInviteCode(code) {
    if (!code) return null;

    const snapshot = await db.collectionGroup('templates')
      .where('inviteCode', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const templateDoc = snapshot.docs[0];
    const templateData = templateDoc.data();
    const template = { id: templateDoc.id, ...templateData };

    const pathParts = templateDoc.ref.path.split('/');
    const adminId = pathParts[1];

    // Build admin from template-stored display info so we never read chartmindAdmins (avoids permission error for professional-chartmind)
    const admin = {
      id: adminId,
      name: templateData.adminDisplayName || 'Unknown',
      facilityName: templateData.adminDisplayName || '',
      email: templateData.adminEmail || '',
    };

    return { admin, template };
  }

  /**
   * Get all prompts from a specific template (for chain execution)
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - Template document ID
   * @returns {Promise<Object>} Prompts map keyed by cardId
   */
  async getTemplatePrompts(adminId, templateId) {
    const template = await this.getTemplate(adminId, templateId);
    if (!template) return {};
    return template.prompts || {};
  }

  // ============================================
  // CHECK-IN TEMPLATE LINKING
  // ============================================

  /**
   * Link a PET (Patient Encounter Template) to a check-in template.
   * There is one check-in template per PET. Sets checkInLink on the PET and encounterTemplateRef + inviteCode on the check-in template.
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - PET (MSI template) document ID
   * @param {string} clinicId - Clinic / facility ID
   * @param {string} checkInTemplateId - Check-in template document ID
   * @returns {Promise<void>}
   */
  async linkCheckInTemplate(adminId, templateId, clinicId, checkInTemplateId) {
    const template = await this.getTemplate(adminId, templateId);
    const inviteCode = template?.inviteCode || null;

    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update({
        checkInLink: { clinicId, templateId: checkInTemplateId },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    await updateCheckInTemplate(clinicId, checkInTemplateId, {
      encounterTemplateRef: { adminId, templateId },
      inviteCode,
    });
  }

  /**
   * Unlink a PET from its check-in template.
   * Clears checkInLink on the PET and encounterTemplateRef + inviteCode on the check-in template.
   * @param {string} adminId - Admin document ID
   * @param {string} templateId - PET (MSI template) document ID
   * @returns {Promise<void>}
   */
  async unlinkCheckInTemplate(adminId, templateId) {
    const template = await this.getTemplate(adminId, templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const link = template.checkInLink;

    await db.collection(this.collection)
      .doc(adminId)
      .collection('templates')
      .doc(templateId)
      .update({
        checkInLink: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    if (link?.clinicId && link?.templateId) {
      try {
        await updateCheckInTemplate(link.clinicId, link.templateId, {
          encounterTemplateRef: null,
          inviteCode: null,
        });
      } catch (err) {
        console.warn('[chartmindAdminService] Failed to clear check-in template encounterTemplateRef during unlink:', err);
      }
    }
  }
}

// Export singleton instance
export const chartmindAdminService = new ChartmindAdminService();

export default chartmindAdminService;
