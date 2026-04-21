/**
 * LLM Manager Context
 * 
 * Provides state and utilities for LLM Manager roles including:
 * - Role checking (Global, Regional, ChartMind Admin)
 * - Permission checking for query editing
 * - View mode switching (view as Patient/Professional)
 * - Manage button visibility toggle
 * 
 * ROLE HIERARCHY:
 * - llm-manager-global: Full access to all prompts (Position 1, 2, 3)
 * - llm-manager-regional: Position 2 prompts in assigned regions
 * - chartmind-admin: Position 3 ChartMind prompts for their designees only
 * 
 * NOTE: llm-manager-local role has been deprecated. Position 3 (local) management
 * is handled by chartmind-admin for ChartMind features. Patient symptom checker
 * features do not have Position 3 prompts.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

// ============================================
// LLM MANAGER ROLE CONSTANTS
// ============================================

export const LLM_MANAGER_LEVELS = {
  GLOBAL: 'llm-manager-global',
  REGIONAL: 'llm-manager-regional',
  // LOCAL removed - use CHARTMIND_ADMIN for Position 3
};

export const LLM_MANAGER_ROLES = [
  LLM_MANAGER_LEVELS.GLOBAL,
  LLM_MANAGER_LEVELS.REGIONAL,
];

// ChartMind admin is a separate role that has implicit local LLM management
export const CHARTMIND_ADMIN_ROLE = 'chartmind-admin';

// ChartMind supervisor: clinic-scoped Position 3 only (same Query Manager UI, P1/P2 read-only, P3 editable per clinic)
export const CHARTMIND_SUPERVISOR_ROLE = 'chartmind-supervisor';

// Chain positions map to manager levels
export const CHAIN_POSITIONS = {
  GLOBAL: 1,    // Position 1 = Global queries
  REGIONAL: 2,  // Position 2 = Regional queries  
  LOCAL: 3,     // Position 3 = Local queries (ChartMind admin for ChartMind prompts)
};

// Query categories
export const QUERY_CATEGORIES = {
  SYMPTOM_CHECKER: 'symptom_checker',
  CHARTMIND: 'chartmind',
  VOICE_CONVERSATION: 'voice_conversation',
  DSCR: 'dscr',
};

export const DSCR_ADMIN_ROLE = 'dscr-admin';

// ============================================
// ROLE CHECKING UTILITIES
// ============================================

/**
 * Check if a user has an LLM manager role (global or regional)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isLLMManager = (user) => {
  if (!user?.role) return false;
  return LLM_MANAGER_ROLES.includes(user.role);
};

/**
 * Check if a user is a ChartMind supervisor (clinic-scoped Position 3)
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isChartmindSupervisor = (user) => {
  if (!user?.role) return false;
  return user.role === CHARTMIND_SUPERVISOR_ROLE;
};

/**
 * Check if a user is a ChartMind admin
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export const isChartmindAdmin = (user) => {
  if (!user?.role) return false;
  return user.role === CHARTMIND_ADMIN_ROLE;
};

/**
 * Check if a user can manage any LLM prompts (LLM Manager OR ChartMind Admin OR Clinic Manager)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const isDscrAdmin = (user) => {
  if (!user) return false;
  return user.role === DSCR_ADMIN_ROLE || user.admin === true;
};

export const canManagePrompts = (user) => {
  return (
    isLLMManager(user) ||
    isChartmindAdmin(user) ||
    isChartmindSupervisor(user) ||
    isDscrAdmin(user) ||
    user?.role === "admin" ||
    (user?.role === "regional_admin" &&
      Boolean(String(user?.region || "").trim()))
  );
};

/**
 * Get the LLM manager level from a user
 * @param {Object} user - User object
 * @returns {string|null} 'global', 'regional', 'chartmind-admin', or null
 */
export const getLLMManagerLevel = (user) => {
  if (!user?.role) return null;
  
  switch (user.role) {
    case LLM_MANAGER_LEVELS.GLOBAL:
      return 'global';
    case LLM_MANAGER_LEVELS.REGIONAL:
      return 'regional';
    case CHARTMIND_ADMIN_ROLE:
      return 'chartmind-admin';
    case CHARTMIND_SUPERVISOR_ROLE:
      return 'chartmind-supervisor';
    case 'admin':
      return 'chartmind-admin';
    case DSCR_ADMIN_ROLE:
      return 'dscr-admin';
    default:
      if (user?.admin === true) return 'dscr-admin';
      return null;
  }
};

/**
 * Get the chain positions a manager can edit
 * @param {string} level - Manager level ('global', 'regional', 'chartmind-admin')
 * @param {string} category - Query category (optional, for context)
 * @returns {number[]} Array of chain positions
 */
export const getEditableChainPositions = (level, category = null) => {
  switch (level) {
    case 'global':
      return [1, 2, 3]; // Can edit all positions
    case 'regional':
      return [2]; // Only position 2
    case 'chartmind-admin':
      // ChartMind admin can only edit position 3 for ChartMind prompts
      return category === QUERY_CATEGORIES.CHARTMIND ? [3] : [];
    case 'chartmind-supervisor':
      // ChartMind supervisor: Position 3 only, clinic-scoped (ChartMind base query IDs only)
      return category === QUERY_CATEGORIES.CHARTMIND ? [3] : [];
    case 'dscr-admin':
      return category === QUERY_CATEGORIES.DSCR ? [1] : [];
    default:
      return [];
  }
};

/**
 * Get the chain positions a manager can view
 * @param {string} level - Manager level
 * @param {string} category - Query category
 * @returns {number[]} Array of viewable chain positions
 */
export const getViewableChainPositions = (level, category = null) => {
  switch (level) {
    case 'global':
      return [1, 2, 3]; // Can view all
    case 'regional':
      return [1, 2, 3]; // Can view all (edit only position 2)
    case 'chartmind-admin':
      // ChartMind admin can view position 1 and 2 for ChartMind prompts
      return category === QUERY_CATEGORIES.CHARTMIND ? [1, 2, 3] : [];
    case 'chartmind-supervisor':
      return category === QUERY_CATEGORIES.CHARTMIND ? [1, 2, 3] : [];
    case 'dscr-admin':
      return category === QUERY_CATEGORIES.DSCR ? [1] : [];
    default:
      return [];
  }
};

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if a user can edit a specific query
 * @param {Object} user - User object with role and scope
 * @param {Object} query - Query object with chainConfig, category, and geographic scope
 * @returns {boolean}
 */
export const canEditQuery = (user, query) => {
  if (!user || !query) return false;
  
  const level = getLLMManagerLevel(user);
  if (!level) return false;
  
  // Global managers can edit everything
  if (level === 'global') {
    return true;
  }
  
  // ChartMind admin: Can only edit Position 3 ChartMind prompts
  if (level === 'chartmind-admin') {
    // Must be a ChartMind category prompt
    if (query.category !== QUERY_CATEGORIES.CHARTMIND) {
      return false;
    }
    
    // Must be Position 3 (or their custom prompt in chartmindAdmins collection)
    const chainPosition = query.chainConfig?.chainPosition;
    if (chainPosition !== CHAIN_POSITIONS.LOCAL) {
      return false;
    }
    
    // Note: Actual designee scope checking happens in the service layer
    // where we have access to the chartmindAdmins collection
    return true;
  }

  // ChartMind supervisor: Can only edit Position 3 for ChartMind (clinic-scoped in UI)
  if (level === 'chartmind-supervisor') {
    if (query.category !== QUERY_CATEGORIES.CHARTMIND) return false;
    const chainPosition = query.chainConfig?.chainPosition;
    return chainPosition === CHAIN_POSITIONS.LOCAL;
  }
  
  // Regional managers: Can only edit Position 2 queries
  if (level === 'regional') {
    // Standalone queries: Only global can edit
    if (!query.chainConfig?.isPartOfChain) {
      return false;
    }
    
    const chainPosition = query.chainConfig?.chainPosition;
    if (chainPosition !== CHAIN_POSITIONS.REGIONAL) {
      return false;
    }
    
    // Check geographic scope
    if (query.regions && query.regions.length > 0 && user.scope?.regions) {
      return user.scope.regions.some(r => query.regions.includes(r));
    }
    return false;
  }
  
  return false;
};

/**
 * Check if a user can view a specific query
 * @param {Object} user - User object
 * @param {Object} query - Query object
 * @returns {boolean}
 */
export const canViewQuery = (user, query) => {
  if (!user || !query) return false;
  
  const level = getLLMManagerLevel(user);
  if (!level) return false;
  
  // Global and regional can view everything
  if (level === 'global' || level === 'regional') {
    return true;
  }
  
  // ChartMind admin and supervisor can view ChartMind prompts (Position 1, 2, 3)
  if (level === 'chartmind-admin' || level === 'chartmind-supervisor') {
    return query.category === QUERY_CATEGORIES.CHARTMIND;
  }
  
  return false;
};

/**
 * Check if a user can create new query chains
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canCreateChains = (user) => {
  return getLLMManagerLevel(user) === 'global';
};

/**
 * Check if a user can edit standalone queries
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canEditStandaloneQueries = (user) => {
  return getLLMManagerLevel(user) === 'global';
};

/**
 * Get the scope description for a user
 * @param {Object} user - User object
 * @returns {string} Human-readable scope description
 */
export const getScopeDescription = (user) => {
  const level = getLLMManagerLevel(user);
  
  if (!level) return '';
  
  if (level === 'global') {
    return 'All prompts across the system';
  }
  
  if (level === 'regional' && user.scope?.regions?.length > 0) {
    const regions = user.scope.regions.map(r => r.replace(/_/g, ' ')).join(', ');
    return `Position 2 prompts for: ${regions}`;
  }
  
  if (level === 'chartmind-admin') {
    return 'Position 3 ChartMind prompts for your designees';
  }
  
  if (level === 'chartmind-supervisor') {
    return 'Position 3 ChartMind prompts per clinic (select clinic)';
  }
  
  return 'No scope defined';
};

// ============================================
// CONTEXT
// ============================================

const LLMManagerContext = createContext(null);

/**
 * LLM Manager Provider
 * Wraps the app to provide LLM manager state and utilities
 */
export const LLMManagerProvider = ({ children, user }) => {
  // Whether to show manage buttons on LLM components
  const [showManageButtons, setShowManageButtons] = useState(false);
  
  // Current viewing mode (null = normal, 'patient' or 'professional-chartmind' = impersonating)
  // Persist to sessionStorage so it survives navigation
  const [viewingAs, setViewingAs] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('llmManagerViewingAs') || null;
    }
    return null;
  });
  
  // Toggle manage buttons visibility
  const toggleManageButtons = useCallback(() => {
    setShowManageButtons(prev => !prev);
  }, []);
  
  // Enable manage mode
  const enableManageMode = useCallback(() => {
    setShowManageButtons(true);
  }, []);
  
  // Disable manage mode
  const disableManageMode = useCallback(() => {
    setShowManageButtons(false);
  }, []);
  
  // Switch viewing role
  const switchViewingRole = useCallback((role) => {
    if (!user) return;
    
    const allowedRoles = user.allowedViewingRoles || ['patient', 'p2', 'professional-chartmind', 'pro2'];
    
    if (role === null || allowedRoles.includes(role)) {
      setViewingAs(role);
      // Persist to sessionStorage
      if (typeof window !== 'undefined') {
        if (role) {
          sessionStorage.setItem('llmManagerViewingAs', role);
        } else {
          sessionStorage.removeItem('llmManagerViewingAs');
        }
      }
    }
  }, [user]);
  
  // Reset to normal view
  const resetView = useCallback(() => {
    setViewingAs(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('llmManagerViewingAs');
    }
  }, []);
  
  // Computed values
  const isManager = useMemo(() => canManagePrompts(user), [user]);
  const isGlobalManager = useMemo(() => getLLMManagerLevel(user) === 'global', [user]);
  const isRegionalManager = useMemo(() => getLLMManagerLevel(user) === 'regional', [user]);
  const isChartmindAdminUser = useMemo(() => isChartmindAdmin(user), [user]);
  const isChartmindSupervisorUser = useMemo(() => isChartmindSupervisor(user), [user]);
  const managerLevel = useMemo(() => getLLMManagerLevel(user), [user]);
  const scopeDescription = useMemo(() => getScopeDescription(user), [user]);
  const editablePositions = useMemo(() => getEditableChainPositions(managerLevel), [managerLevel]);
  
  // Get effective role (for UI rendering when viewing as different role)
  const effectiveRole = useMemo(() => {
    if (viewingAs) return viewingAs;
    return user?.role;
  }, [viewingAs, user]);
  
  // Auto-enable manage buttons when viewing as another role (so LLM managers can test prompts)
  useEffect(() => {
    if (viewingAs && isManager) {
      setShowManageButtons(true);
    }
  }, [viewingAs, isManager]);
  
  const value = useMemo(() => ({
    // State
    showManageButtons,
    viewingAs,
    effectiveRole,
    
    // Computed
    isManager,
    isGlobalManager,
    isRegionalManager,
    isChartmindAdmin: isChartmindAdminUser,
    isChartmindSupervisor: isChartmindSupervisorUser,
    managerLevel,
    scopeDescription,
    editablePositions,
    
    // Actions
    toggleManageButtons,
    enableManageMode,
    disableManageMode,
    switchViewingRole,
    resetView,
    
    // Permission utilities (bound to current user)
    canEditQuery: (query) => canEditQuery(user, query),
    canViewQuery: (query) => canViewQuery(user, query),
    canCreateChains: () => canCreateChains(user),
    canEditStandaloneQueries: () => canEditStandaloneQueries(user),
    
    // ChartMind-specific
    canEditChartmindPrompts: () => isChartmindAdminUser || isChartmindSupervisorUser || getLLMManagerLevel(user) === 'global',
  }), [
    showManageButtons,
    viewingAs,
    effectiveRole,
    isManager,
    isGlobalManager,
    isRegionalManager,
    isChartmindAdminUser,
    isChartmindSupervisorUser,
    managerLevel,
    scopeDescription,
    editablePositions,
    toggleManageButtons,
    enableManageMode,
    disableManageMode,
    switchViewingRole,
    resetView,
    user,
  ]);
  
  return (
    <LLMManagerContext.Provider value={value}>
      {children}
    </LLMManagerContext.Provider>
  );
};

/**
 * Hook to use LLM Manager context
 * @returns {Object} LLM Manager context value
 */
export const useLLMManager = () => {
  const context = useContext(LLMManagerContext);
  
  if (!context) {
    // Return a default object when not wrapped in provider
    // This allows components to work without the provider
    return {
      showManageButtons: false,
      viewingAs: null,
      effectiveRole: null,
      isManager: false,
      isGlobalManager: false,
      isRegionalManager: false,
      isChartmindAdmin: false,
      isChartmindSupervisor: false,
      managerLevel: null,
      scopeDescription: '',
      editablePositions: [],
      toggleManageButtons: () => {},
      enableManageMode: () => {},
      disableManageMode: () => {},
      switchViewingRole: () => {},
      resetView: () => {},
      canEditQuery: () => false,
      canViewQuery: () => false,
      canCreateChains: () => false,
      canEditStandaloneQueries: () => false,
      canEditChartmindPrompts: () => false,
    };
  }
  
  return context;
};

export default LLMManagerContext;
