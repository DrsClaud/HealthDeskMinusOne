/**
 * QueryManagementModal
 * 
 * Modal for editing LLM query configurations including:
 * - Prompt text editing
 * - Model selection and parameters
 * - Version history with rollback
 * - Test execution
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tooltip,
  Grow,
  Slide,
  Fade,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close,
  Save,
  History,
  Restore,
  Code,
  Settings as SettingsIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  Description,
  LocalLibrary,
  Download,
} from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@healthdesk/shared-hooks';
import { useLLMManager } from '../../contexts/LLMManagerContext';
import { queryRegistryService, getQueryMetadata } from '../../services/llm';
import { CHAIN_MODE } from '../../services/llm/llmConstants';
import { chartmindAdminService } from '../../services/chartmind';
import regionalTemplateService from '../../services/llm/regionalTemplateService';
import { ChartMindDataProvider } from '../../contexts/ChartMindDataContext';
import DraggableDataSidebar from './DraggableDataSidebar';
import DocumentManagementPanel from './DocumentManagementPanel';
import ClinicalReferencesPanel from './ClinicalReferencesPanel';
import { EmbeddedDocumentsUploadProvider, useEmbeddedDocumentsUpload } from './EmbeddedDocumentsUploadContext';
import { serializeP1QueryFile } from '../../services/llm/p1QueryFileFormat';

/** Base URL for P1 local writer server (run: node functions/functions/scripts/p1LocalWriterServer.js). */
const P1_LOCAL_WRITER_URL = 'http://127.0.0.1:3765';

// Default model - fast, low-latency, used when no model is selected
const DEFAULT_MODEL = 'gemini-2.0-flash';

// Available models - organized by provider, default (Gemini) first
const AVAILABLE_MODELS = [
  // Google - requires GOOGLE_AI_API_KEY in Firebase config (Gemini API)
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Default — fast, 1M context, low latency' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Google lightweight — lower cost' },
  // OpenAI - requires OPENAI_API_KEY in Firebase config
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'OpenAI cheapest — $0.20/$0.80 per 1M tokens' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'OpenAI fast — $0.15/$0.60 per 1M tokens' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'OpenAI mid-tier — $0.80/$3.20 per 1M tokens' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'OpenAI best — $3/$12 per 1M tokens' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Legacy high quality — ~$10/$30 per 1M tokens' },
  // Anthropic - requires ANTHROPIC_API_KEY in Firebase config
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', description: 'Anthropic fast — $1/$5 per 1M tokens' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: 'Anthropic balanced — $3/$15 per 1M tokens' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5', description: 'Anthropic flagship — $5/$25 per 1M tokens' },
];

// ---------- Position 2 / Position 3 enforced defaults ----------
// These settings are NOT user-adjustable for P2/P3 queries.
const P2P3_MODEL = 'gemini-2.0-flash';
const P2P3_MODEL_LABEL = 'Gemini 2.0 Flash';
const P2P3_TEMPERATURE = 0.1;

// Per-query max token recommendations for P2/P3
// Sized to fit the expected output volume of each query type.
const P2P3_MAX_TOKENS = {
  'chartmind-ddx': 4000,
  'chartmind-ddx-final': 4000,
  'chartmind-diagnostic-tests': 4000,
  'chartmind-treatment-options': 4000,
  'chartmind-discharge-plan': 4000,
  'chartmind-clarifying-questions': 2000,
  'chartmind-chart-generation': 8000,
  'chartmind-required-sections-tracker': 2000,
  'chartmind-test-smart-choices': 2000,
  'chartmind-clinical-guidance': 4000,
  'chartmind-translate': 4000,
  'chartmind-peerview-consultation': 4000,
};
const P2P3_MAX_TOKENS_DEFAULT = 4000;

// Tab panel component with animation support
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`query-tabpanel-${index}`}
    aria-labelledby={`query-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ py: 2 }}>{children}</Box>
    )}
  </div>
);

// Persistent upload indicator (shown when user switches away from Embedded Documents tab during upload)
function EmbeddedDocumentsUploadIndicator() {
  const { activeUpload } = useEmbeddedDocumentsUpload() || {};
  if (!activeUpload || activeUpload.phase !== 'uploading') return null;
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
      <LinearProgress variant="determinate" value={activeUpload.progress} sx={{ height: 6 }} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
        {activeUpload.batchTotal > 1
          ? `Document ${activeUpload.batchCurrent} of ${activeUpload.batchTotal} · ${Math.round(activeUpload.progress)}%`
          : `${Math.round(activeUpload.progress)}%`}
        {activeUpload.batchTotal > 1 && (activeUpload.uploadedCountSoFar ?? 0) > 0 &&
          ` · ${activeUpload.uploadedCountSoFar} embedded (saved)`}
        {activeUpload.status && ` · ${activeUpload.status}`}
      </Typography>
    </Box>
  );
}

const QueryManagementModal = ({ open, onClose, queryId, onSave, templateAdminId, templateId, templateData }) => {
  const { userData } = useAuth();
  const { managerLevel, canEditQuery, isChartmindAdmin: isChartmindAdminUser, isChartmindSupervisor, isRegionalManager, isGlobalManager } = useLLMManager();
  
  // State
  const [selectedPosition, setSelectedPosition] = useState(isChartmindAdminUser ? 3 : isRegionalManager ? 2 : 1); // Default to P3 for chartmind-admin, P2 for regional
  const [position1Query, setPosition1Query] = useState(null); // Base query (global)
  const [position2Query, setPosition2Query] = useState(null); // Regional
  const [position3Query, setPosition3Query] = useState(null); // Local (ChartMind admin)
  const [editedQuery, setEditedQuery] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [changeReason, setChangeReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [draggedPath, setDraggedPath] = useState(null);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [contentKey, setContentKey] = useState(0); // Force remount on position change
  const [chainMode, setChainMode] = useState(CHAIN_MODE.SEQUENTIAL); // sequential | substitutionary (global LLM manager only)
  const [selectedClinicId, setSelectedClinicId] = useState(null); // chartmind-supervisor: clinic for P3
  const promptTextareaRef = useRef(null);
  // P1 prompt Secret Manager versions (Global LLM Manager only)
  const [p1SecretVersions, setP1SecretVersions] = useState([]);
  const [p1SecretVersionsLoading, setP1SecretVersionsLoading] = useState(false);
  const [p1SecretRestoring, setP1SecretRestoring] = useState(null);
  /** When P1 save falls back to download, this is the path the user should save to (relative). Enables "Copy path" in the success alert. */
  const [p1DownloadPath, setP1DownloadPath] = useState(null);
  /** Set when getP1Prompt fails so we can show a hint and still fall back to metadata. */
  const [p1LoadError, setP1LoadError] = useState(null);

  // Define helper functions first (before loadAllPositionQueries)
  const updateEditedQueryForPosition = useCallback((position, pos1, pos2, pos3) => {
    let queryForPosition = null;
    
    if (position === 1) {
      queryForPosition = pos1;
    } else if (position === 2) {
      queryForPosition = pos2;
    } else if (position === 3) {
      queryForPosition = pos3;
    }
    
    // If query doesn't exist, create empty template
    if (!queryForPosition) {
      const baseQuery = pos1 || {};
      queryForPosition = {
        baseQueryId: queryId,
        featureName: baseQuery.featureName || queryId,
        featureDescription: baseQuery.featureDescription,
        category: baseQuery.category,
        prompt: '',
        model: baseQuery.model || DEFAULT_MODEL,
        temperature: baseQuery.temperature || 0.7,
        maxTokens: baseQuery.maxTokens || 2000,
        chainConfig: {
          isPartOfChain: true,
          chainPosition: position,
        },
        isEmpty: true, // Flag to indicate this is an empty position
      };
    }
    
    setEditedQuery({ ...queryForPosition });
  }, [queryId]);

  const loadVersionHistory = useCallback(async (position, pos1, pos2, pos3) => {
    let queryForPosition = null;
    if (position === 1) queryForPosition = pos1;
    else if (position === 2) queryForPosition = pos2;
    else if (position === 3) queryForPosition = pos3;
    
    // Clinic-scoped P3 has no version history in llmQueryVersions
    if (queryForPosition?.source === 'clinic') {
      setVersions([]);
      return;
    }
    if (queryForPosition?.id) {
      try {
        const versionHistory = await queryRegistryService.getVersionHistory(queryForPosition.id);
        setVersions(versionHistory);
      } catch (err) {
        console.warn('[QueryManagementModal] Failed to load version history:', err);
        setVersions([]);
      }
    } else {
      setVersions([]);
    }
  }, []);

  // Load queries for all positions
  const loadAllPositionQueries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load Position 1 (base query)
      let pos1Query = await queryRegistryService.getQuery(queryId);
      const isBaseP1 = queryId && !queryId.includes('-regional-');
      // P1 prompt text lives in Secret Manager; fetch it for the Prompt tab when user is Global LLM Manager
      setP1LoadError(null);
      if (isBaseP1 && isGlobalManager) {
        try {
          const fn = httpsCallable(getFunctions(), 'getP1Prompt');
          const res = await fn({ queryId });
          const data = res?.data ?? {};
          const fromSecret = {
            prompt: (data.prompt ?? '').toString(),
            contextProvided: (data.contextProvided ?? '').toString(),
            responseFormat: (data.responseFormat ?? '').toString(),
          };
          const hasAnyFromSecret = fromSecret.prompt !== '' || fromSecret.contextProvided !== '' || fromSecret.responseFormat !== '';
          if (pos1Query) {
            const meta = getQueryMetadata(queryId) || {};
            pos1Query = {
              ...pos1Query,
              prompt: hasAnyFromSecret ? fromSecret.prompt : (pos1Query.prompt ?? ''),
              contextProvided: hasAnyFromSecret ? fromSecret.contextProvided : ((pos1Query.contextProvided && pos1Query.contextProvided.trim() !== '') ? pos1Query.contextProvided : (meta.contextProvided ?? '')),
              responseFormat: hasAnyFromSecret ? fromSecret.responseFormat : ((pos1Query.responseFormat && pos1Query.responseFormat.trim() !== '') ? pos1Query.responseFormat : (meta.responseFormat ?? '')),
            };
          } else {
            const meta = getQueryMetadata(queryId) || {};
            pos1Query = {
              id: queryId,
              prompt: fromSecret.prompt,
              contextProvided: fromSecret.contextProvided || (meta.contextProvided ?? ''),
              responseFormat: fromSecret.responseFormat || (meta.responseFormat ?? ''),
              model: meta.model || DEFAULT_MODEL,
              temperature: meta.temperature !== undefined ? meta.temperature : 0.7,
              maxTokens: meta.maxTokens !== undefined ? meta.maxTokens : 2000,
              source: 'secret-manager',
            };
          }
        } catch (err) {
          const rawCode = err?.code || err?.details?.code;
          const errCode = typeof rawCode === 'string' ? rawCode.replace(/^functions\//, '') : rawCode;
          const serverMsg = err?.details?.serverMessage || err?.details?.message;
          const errMsg = err?.message || err?.details?.message || String(err);
          console.warn('[QueryManagementModal] getP1Prompt failed:', errCode || errMsg, err);
          let displayMsg = errMsg;
          if (errCode === 'permission-denied') {
            displayMsg = 'Only Global LLM Manager can load prompts from Secret Manager. Check your role in Firestore.';
          } else if (errCode === 'internal') {
            displayMsg = serverMsg || errMsg;
            if (!displayMsg || displayMsg === 'internal') {
              displayMsg = 'Server error (internal). Check Firebase Console → Functions → Logs for getP1Prompt — often Secret Manager permissions or missing project ID.';
            }
          }
          setP1LoadError(displayMsg);
          if (!pos1Query && isBaseP1) {
            const meta = getQueryMetadata(queryId) || {};
            pos1Query = {
              id: queryId,
              prompt: '',
              contextProvided: meta.contextProvided ?? '',
              responseFormat: meta.responseFormat ?? '',
              model: meta.model || DEFAULT_MODEL,
              temperature: meta.temperature !== undefined ? meta.temperature : 0.7,
              maxTokens: meta.maxTokens !== undefined ? meta.maxTokens : 2000,
            };
          } else if (pos1Query) {
            // Fall back to metadata for contextProvided/responseFormat so the user sees something
            const meta = getQueryMetadata(queryId) || {};
            pos1Query = {
              ...pos1Query,
              contextProvided: (pos1Query.contextProvided && pos1Query.contextProvided.trim() !== '') ? pos1Query.contextProvided : (meta.contextProvided ?? ''),
              responseFormat: (pos1Query.responseFormat && pos1Query.responseFormat.trim() !== '') ? pos1Query.responseFormat : (meta.responseFormat ?? ''),
            };
          }
        }
      }
      setPosition1Query(pos1Query);
      setChainMode(pos1Query?.chainMode === CHAIN_MODE.SUBSTITUTIONARY ? CHAIN_MODE.SUBSTITUTIONARY : CHAIN_MODE.SEQUENTIAL);
      
      // Load Position 2 (regional) - from active regional template for regional managers, or legacy lookup
      let pos2Query = null;
      if (isRegionalManager) {
        const activeTemplateRaw = typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('regional_active_template')
          : null;
        if (activeTemplateRaw) {
          try {
            const { managerId, templateId: rtTemplateId } = JSON.parse(activeTemplateRaw);
            const tmpl = await regionalTemplateService.getTemplate(managerId, rtTemplateId);
            const cardId = queryId?.startsWith('chartmind-') ? queryId.replace(/^chartmind-/, '') : queryId;
            const promptData = tmpl?.prompts?.[cardId];
            if (promptData && promptData.prompt && promptData.prompt.trim().length > 0) {
              pos2Query = {
                ...promptData,
                id: `regional-template-${rtTemplateId}-${cardId}`,
                source: 'regional-template',
                baseQueryId: queryId,
                chainConfig: { isPartOfChain: true, chainPosition: 2 },
              };
            }
          } catch (err) {
            console.warn('[QueryManagementModal] Failed to load regional template P2:', err);
          }
        }
      }
      if (!pos2Query) {
        pos2Query = await queryRegistryService.getQueryByPosition(queryId, 2, {
          regions: userData?.scope?.regions || [],
        });
      }
      setPosition2Query(pos2Query);
      
      // Load Position 3: chartmind-supervisor uses clinic-scoped P3; chartmind-admin uses designee P3
      let pos3Query = null;
      if (templateAdminId && templateId) {
        // Template mode: load P3 from the template's prompts
        const cardId = queryId?.startsWith('chartmind-') ? queryId.replace(/^chartmind-/, '') : queryId;
        const templatePrompt = templateData?.prompts?.[cardId];
        if (templatePrompt && templatePrompt.prompt && templatePrompt.prompt.trim().length > 0) {
          pos3Query = {
            ...templatePrompt,
            id: `template-${templateId}-${cardId}`,
            source: 'chartmind-template',
            baseQueryId: queryId,
            chainConfig: { isPartOfChain: true, chainPosition: 3 },
          };
        } else {
          pos3Query = {
            isEmpty: true,
            prompt: '',
            model: pos1Query?.model || DEFAULT_MODEL,
            temperature: 0.7,
            maxTokens: 2000,
            source: 'chartmind-template',
            baseQueryId: queryId,
            category: pos1Query?.category,
            chainConfig: { isPartOfChain: true, chainPosition: 3 },
          };
        }
      } else if (isChartmindSupervisor && selectedClinicId) {
        pos3Query = await queryRegistryService.getClinicPosition3(selectedClinicId, queryId);
        if (!pos3Query) {
          pos3Query = {
            isEmpty: true,
            category: pos1Query?.category,
            chainConfig: { isPartOfChain: true, chainPosition: 3 },
          };
        }
      } else if (isChartmindAdminUser && userData?.uid) {
        pos3Query = await queryRegistryService.getQueryByPosition(queryId, 3, { adminId: userData.uid });
        
        // If Position 3 query doesn't exist, get designeeEmails from chartmindAdmins
        if (!pos3Query) {
          try {
            const admin = await chartmindAdminService.getAdminByUserId(userData.uid);
            if (admin) {
              // Store designeeEmails for later use when creating Position 3 query
              pos3Query = {
                isEmpty: true,
                designeeEmails: admin.designeeEmails || [],
                category: pos1Query?.category,
                chainConfig: { isPartOfChain: true, chainPosition: 3 },
              };
            }
          } catch (err) {
            console.warn('[QueryManagementModal] Failed to load admin data:', err);
          }
        }
      }
      setPosition3Query(pos3Query);
      
      // Set initial edited query based on selected position
      updateEditedQueryForPosition(selectedPosition, pos1Query, pos2Query, pos3Query);
      
      // Load version history for current position
      await loadVersionHistory(selectedPosition, pos1Query, pos2Query, pos3Query);
    } catch (err) {
      console.error('[QueryManagementModal] Load error:', err);
      setError('Failed to load query data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId, userData?.scope?.regions, userData?.uid, isChartmindAdminUser, isChartmindSupervisor, isGlobalManager, selectedClinicId, selectedPosition, updateEditedQueryForPosition, loadVersionHistory, templateAdminId, templateId, templateData]);

  // When modal opens as chartmind-supervisor, set selected clinic from facilityId
  useEffect(() => {
    if (open && isChartmindSupervisor && userData?.facilityId && selectedClinicId !== userData.facilityId) {
      setSelectedClinicId(userData.facilityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isChartmindSupervisor, userData?.facilityId]);

  // Reset position to role default when modal opens: P3 for chartmind-admin, P2 for regional, P1 otherwise
  useEffect(() => {
    if (open) {
      setSelectedPosition(isChartmindAdminUser ? 3 : isRegionalManager ? 2 : 1);
    }
  }, [open, isChartmindAdminUser, isRegionalManager]);

  const loadP1SecretVersions = useCallback(async () => {
    if (!queryId || queryId.includes('-regional-')) return;
    setP1SecretVersionsLoading(true);
    try {
      const fn = httpsCallable(getFunctions(), 'listP1PromptVersions');
      const res = await fn({ queryId });
      const data = res.data || {};
      setP1SecretVersions(data.versions || []);
    } catch (err) {
      console.warn('[QueryManagementModal] listP1PromptVersions failed:', err);
      setP1SecretVersions([]);
    } finally {
      setP1SecretVersionsLoading(false);
    }
  }, [queryId]);

  // Load P1 Secret Manager versions when History tab is active and this is a base P1 query (Global LLM Manager only)
  const isBaseP1Query = queryId && !queryId.includes('-regional-');
  useEffect(() => {
    if (open && activeTab === 4 && selectedPosition === 1 && isGlobalManager && isBaseP1Query) {
      loadP1SecretVersions();
    }
  }, [open, activeTab, selectedPosition, isGlobalManager, isBaseP1Query, loadP1SecretVersions]);

  // Load queries for all positions (reload when supervisor changes clinic)
  useEffect(() => {
    if (open && queryId) {
      loadAllPositionQueries();
      // Trigger chip animation after a short delay
      const timer = setTimeout(() => setChipsVisible(true), 100);
      return () => clearTimeout(timer); // Cleanup on unmount
    } else {
      setChipsVisible(false);
    }
  }, [open, queryId, selectedClinicId, loadAllPositionQueries]);

  // Update content key when position changes to trigger fade animation
  // Only update when position actually changes and we have query data
  useEffect(() => {
    if (editedQuery && (position1Query !== null || position2Query !== null || position3Query !== null)) {
      setContentKey(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPosition]);

  // Global drag end handler
  useEffect(() => {
    const handleDragEnd = () => {
      setDraggedPath(null);
    };
    
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Handle drag start from sidebar
  const handleDragStart = useCallback((path) => {
    setDraggedPath(path);
  }, []);

  // Handle drop with type validation
  const handleDrop = useCallback((path, type) => {
    // Type validation is handled in DraggableDataSidebar
    // This is called after successful validation
    setDraggedPath(null);
  }, []);

  // Update edited query when position changes
  useEffect(() => {
    if (position1Query !== null) {
      updateEditedQueryForPosition(selectedPosition, position1Query, position2Query, position3Query);
      loadVersionHistory(selectedPosition, position1Query, position2Query, position3Query);
    }
  }, [selectedPosition, position1Query, position2Query, position3Query, updateEditedQueryForPosition, loadVersionHistory]);

  const handlePositionChange = (position) => {
    setSelectedPosition(position);
    setChangeReason('');
    setHasChanges(false);
    setDraggedPath(null);
  };


  // Track changes
  useEffect(() => {
    if (editedQuery) {
      const currentQuery = selectedPosition === 1 ? position1Query :
                          selectedPosition === 2 ? position2Query :
                          position3Query;
      const chainModeChanged = selectedPosition === 1 && (position1Query?.chainMode ?? CHAIN_MODE.SEQUENTIAL) !== chainMode;

      if (currentQuery && !currentQuery.isEmpty) {
        const p1FieldsChanged = selectedPosition === 1 && (
          (currentQuery.contextProvided ?? '') !== (editedQuery.contextProvided ?? '') ||
          (currentQuery.responseFormat ?? '') !== (editedQuery.responseFormat ?? '')
        );
        const changed =
          currentQuery.prompt !== editedQuery.prompt ||
          currentQuery.model !== editedQuery.model ||
          currentQuery.temperature !== editedQuery.temperature ||
          currentQuery.maxTokens !== editedQuery.maxTokens ||
          chainModeChanged ||
          p1FieldsChanged;
        setHasChanges(changed);
      } else {
        // New position query - check if any fields are filled
        const changed = 
          (editedQuery.prompt && editedQuery.prompt.trim() !== '') ||
          editedQuery.model !== DEFAULT_MODEL ||
          editedQuery.temperature !== 0.7 ||
          editedQuery.maxTokens !== 2000 ||
          chainModeChanged;
        setHasChanges(changed);
      }
    }
  }, [selectedPosition, position1Query, position2Query, position3Query, editedQuery, chainMode]);

  // Handlers
  const handleFieldChange = useCallback((field, value) => {
    setEditedQuery(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;
    // Template mode, supervisor P3, and regional P2 don't require a change reason
    const skipChangeReason = (templateAdminId && templateId && selectedPosition === 3) || (isChartmindSupervisor && selectedPosition === 3) || (isRegionalManager && selectedPosition === 2);
    if (!changeReason.trim() && !skipChangeReason) {
      setError('Please provide a reason for the change');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Template mode: save P3 prompt to the template
      if (templateAdminId && templateId && selectedPosition === 3) {
        const cardId = queryId?.startsWith('chartmind-') ? queryId.replace(/^chartmind-/, '') : queryId;
        await chartmindAdminService.updateTemplatePrompt(
          templateAdminId,
          templateId,
          cardId,
          {
            prompt: editedQuery.prompt,
            model: editedQuery.model,
            temperature: editedQuery.temperature,
            maxTokens: editedQuery.maxTokens,
            inputMode: editedQuery.inputMode || 'B',
            enabled: !!(editedQuery.prompt && editedQuery.prompt.trim().length > 0),
          },
          userData?.email || 'unknown'
        );
        setSuccess('Patient Encounter Template prompt saved successfully');
        setHasChanges(false);
        if (onSave) onSave();
        return;
      }

      let successMessage = 'Query updated successfully';
      if (selectedPosition === 1) {
        // Position 1: Update base query (global manager only). Applies to every P1 query.
        const updateData = {
          prompt: editedQuery.prompt,
          model: editedQuery.model,
          temperature: editedQuery.temperature,
          maxTokens: editedQuery.maxTokens,
          chainMode,
        };
        if (editedQuery.responseFormat !== undefined) {
          updateData.responseFormat = editedQuery.responseFormat;
        }
        if (editedQuery.contextProvided !== undefined) {
          updateData.contextProvided = editedQuery.contextProvided;
        }
        await queryRegistryService.updateQuery(
          queryId,
          updateData,
          userData?.uid || 'unknown',
          changeReason
        );
        // Write P1 prompt (and optional contextProvided/responseFormat) to Secret Manager via Cloud Function
        try {
          const updateP1 = httpsCallable(getFunctions(), 'updateP1Prompt');
          await updateP1({
            queryId,
            prompt: editedQuery.prompt ?? '',
            contextProvided: editedQuery.contextProvided ?? '',
            responseFormat: editedQuery.responseFormat ?? '',
          });
        } catch (p1Err) {
          console.error('[QueryManagementModal] updateP1Prompt failed:', p1Err);
          const detail = p1Err?.details ?? p1Err?.message ?? p1Err?.code ?? 'Unknown error';
          const msg = typeof detail === 'string' ? detail : (detail?.message || detail?.toString?.() || 'Unknown error');
          setError('Firestore saved, but Secret Manager update failed: ' + msg);
          setSaving(false);
          // Still trigger download so user has a local copy
          triggerP1QueryFileDownload(queryId, editedQuery);
          return;
        }
        // Always download a copy to the user's Downloads folder
        triggerP1QueryFileDownload(queryId, editedQuery);
        successMessage = 'Saved to Firestore and Secret Manager. A copy was downloaded to your Downloads folder.';
        setP1DownloadPath(null);
      } else if (selectedPosition === 3 && isChartmindSupervisor && selectedClinicId) {
        // Position 3: ChartMind supervisor — clinic-scoped save
        await queryRegistryService.saveClinicPosition3(
          selectedClinicId,
          queryId,
          {
            prompt: editedQuery.prompt,
            model: editedQuery.model,
            temperature: editedQuery.temperature,
            maxTokens: editedQuery.maxTokens,
            inputMode: editedQuery.inputMode || 'B',
            enabled: true,
          },
          userData?.uid || 'unknown'
        );
        const updated = await queryRegistryService.getClinicPosition3(selectedClinicId, queryId);
        setPosition3Query(updated || { isEmpty: true });
        try {
          const fn = httpsCallable(getFunctions(), 'writeClinicAuditEvent');
          await fn({ action: 'position3_update', resourceId: selectedClinicId, metadata: { baseQueryId: queryId } });
        } catch (e) { /* ignore */ }
      } else if (isRegionalManager && selectedPosition === 2) {
        // Regional manager: save P2 prompt to the active regional template
        const activeTemplateRaw = sessionStorage.getItem('regional_active_template');
        if (!activeTemplateRaw) {
          setError('No active regional template selected. Please select a template on the dashboard first.');
          setSaving(false);
          return;
        }
        const { managerId, templateId: rtTemplateId } = JSON.parse(activeTemplateRaw);
        const cardId = queryId?.startsWith('chartmind-') ? queryId.replace(/^chartmind-/, '') : queryId;
        await regionalTemplateService.updateTemplatePrompt(
          managerId,
          rtTemplateId,
          cardId,
          {
            prompt: editedQuery.prompt,
            enabled: !!(editedQuery.prompt && editedQuery.prompt.trim().length > 0),
            inputMode: editedQuery.inputMode || 'previous_plus_original',
            modifiedBy: userData?.email || 'unknown',
            version: (editedQuery.version || 0) + 1,
          }
        );
        setSuccess('Regional Template P2 prompt saved successfully');
        setHasChanges(false);
        if (onSave) onSave();
      } else if (selectedPosition === 2 || selectedPosition === 3) {
        // Position 2 or 3: Create or update position query (non-supervisor, non-regional)
        const queryData = {
          prompt: editedQuery.prompt,
          model: editedQuery.model,
          temperature: editedQuery.temperature,
          maxTokens: editedQuery.maxTokens,
          changeReason,
        };
        
        if (selectedPosition === 2) {
          queryData.regions = userData?.scope?.regions || [];
          queryData.localities = userData?.scope?.localities || [];
        } else if (selectedPosition === 3) {
          queryData.adminId = userData?.uid;
          if (position3Query?.designeeEmails) {
            queryData.designeeEmails = position3Query.designeeEmails;
          } else {
            try {
              const admin = await chartmindAdminService.getAdminByUserId(userData.uid);
              queryData.designeeEmails = admin?.designeeEmails || [];
            } catch (err) {
              console.warn('[QueryManagementModal] Failed to get designee emails:', err);
              queryData.designeeEmails = [];
            }
          }
        }
        
        const savedQuery = await queryRegistryService.createOrUpdatePositionQuery(
          queryId,
          selectedPosition,
          queryData,
          userData?.uid || 'unknown'
        );
        
        if (selectedPosition === 2) {
          setPosition2Query(savedQuery);
        } else if (selectedPosition === 3) {
          setPosition3Query(savedQuery);
        }
      }

      setSuccess(successMessage);
      setChangeReason('');

      await loadAllPositionQueries();
      onSave?.();
      setTimeout(() => { setSuccess(null); setP1DownloadPath(null); }, 3000);
    } catch (err) {
      console.error('[QueryManagementModal] Save error:', err);
      setError('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreP1PromptVersion = useCallback(async (versionId) => {
    if (!queryId || !versionId || !window.confirm('Restore this version as the current P1 prompt? This adds a new Secret Manager version.')) return;
    setP1SecretRestoring(versionId);
    try {
      const fn = httpsCallable(getFunctions(), 'restoreP1PromptVersion');
      await fn({ queryId, versionId });
      setSuccess('P1 prompt restored from Secret Manager');
      await loadP1SecretVersions();
    } catch (err) {
      console.error('[QueryManagementModal] restoreP1PromptVersion failed:', err);
      setError(err.message || 'Failed to restore version');
    } finally {
      setP1SecretRestoring(null);
    }
  }, [queryId, loadP1SecretVersions]);

  /** Try to write P1 content to local file via p1LocalWriterServer. Returns true if written, false otherwise. */
  const tryWriteP1ToLocalFile = useCallback(async (id, data) => {
    if (!id || !data) return false;
    const content = serializeP1QueryFile(data);
    try {
      const res = await fetch(`${P1_LOCAL_WRITER_URL}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: id, content }),
      });
      const json = await res.json().catch(() => ({}));
      return res.ok && json?.ok === true;
    } catch (e) {
      return false;
    }
  }, []);

  /** Trigger download of P1 query file. Used when local writer is not running or for Download button. */
  const triggerP1QueryFileDownload = useCallback((id, data) => {
    if (!id || !data) return;
    const content = serializeP1QueryFile(data);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadP1QueryFile = useCallback(() => {
    if (!editedQuery || !queryId) return;
    triggerP1QueryFileDownload(queryId, editedQuery);
    setP1DownloadPath(`functions/functions/p1-prompts-export/${queryId}.txt`);
    setSuccess('Downloaded query file. Save it to the path below (use Copy path), then run "Save This" to update Secret Manager.');
  }, [editedQuery, queryId, triggerP1QueryFileDownload]);

  const handleRollback = async (versionNumber) => {
    if (!window.confirm(`Rollback to version ${versionNumber}? This will create a new version.`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const currentQuery = selectedPosition === 1 ? position1Query :
                          selectedPosition === 2 ? position2Query :
                          position3Query;
      
      if (!currentQuery?.id) {
        throw new Error('Cannot rollback: query not found');
      }

      await queryRegistryService.rollbackToVersion(
        currentQuery.id,
        versionNumber,
        userData?.uid || 'unknown'
      );

      setSuccess(`Rolled back to version ${versionNumber}`);
      await loadAllPositionQueries();
      onSave?.();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[QueryManagementModal] Rollback error:', err);
      setError('Failed to rollback: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedPosition(1);
    setPosition1Query(null);
    setPosition2Query(null);
    setPosition3Query(null);
    setEditedQuery(null);
    setChangeReason('');
    setHasChanges(false);
    setError(null);
    setSuccess(null);
    setVersions([]);
    setChipsVisible(false); // Reset chip animation state
    setContentKey(0); // Reset content key
    onClose();
  };

  // Get chain position label
  const getChainPositionLabel = (position) => {
    const labels = { 1: 'Global', 2: 'Regional', 3: 'Local' };
    return labels[position] || 'Unknown';
  };

  // Render loading state
  if (loading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: { 
          height: '90vh', 
          maxHeight: '900px',
          transition: 'all 0.3s ease-in-out',
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            {isChartmindSupervisor && (
              <FormControl size="small" sx={{ minWidth: 220, mb: 1 }}>
                <InputLabel id="clinic-select-label">Clinic (Position 3)</InputLabel>
                <Select
                  labelId="clinic-select-label"
                  value={selectedClinicId || ''}
                  label="Clinic (Position 3)"
                  onChange={(e) => setSelectedClinicId(e.target.value || null)}
                >
                  {userData?.facilityId ? (
                    <MenuItem value={userData.facilityId}>
                      This clinic ({userData.facilityId})
                    </MenuItem>
                  ) : (
                    <MenuItem value="" disabled>No clinic assigned</MenuItem>
                  )}
                </Select>
              </FormControl>
            )}
            {/* Query ID badge */}
            {queryId && (
              <Chip
                label={queryId}
                size="small"
                variant="outlined"
                sx={{
                  mb: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#1B4584',
                  borderColor: '#1B4584',
                  bgcolor: 'rgba(27, 69, 132, 0.06)',
                }}
              />
            )}
            <Typography variant="h6" component="div">
              {editedQuery?.featureName || queryId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editedQuery?.featureDescription}
            </Typography>

            {/* Patient Encounter Template context indicator */}
            {templateId && templateData && (
              <Chip
                icon={<Description sx={{ fontSize: 16 }} />}
                label={`Template: ${templateData.name || templateId}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            )}
            
            {/* Position Selector Chips with Staggered Animation */}
            <Box display="flex" gap={1} mt={2} mb={1}>
              <Grow in={chipsVisible} timeout={300} style={{ transitionDelay: chipsVisible ? '0ms' : '0ms' }}>
                <Chip
                  label="Position 1: Global"
                  onClick={() => handlePositionChange(1)}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#1B4584',
                    borderColor: '#1B4584',
                    borderWidth: selectedPosition === 1 ? 2 : 1,
                    fontWeight: selectedPosition === 1 ? 'bold' : 'normal',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(27, 69, 132, 0.04)',
                    },
                  }}
                />
              </Grow>
              <Grow in={chipsVisible} timeout={300} style={{ transitionDelay: chipsVisible ? '100ms' : '0ms' }}>
                <Chip
                  label="Position 2: Regional"
                  onClick={() => handlePositionChange(2)}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#1B4584',
                    borderColor: '#1B4584',
                    borderWidth: selectedPosition === 2 ? 2 : 1,
                    fontWeight: selectedPosition === 2 ? 'bold' : 'normal',
                    opacity: position2Query || managerLevel === 'global' || managerLevel === 'regional' ? 1 : 0.5,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(27, 69, 132, 0.04)',
                    },
                  }}
                />
              </Grow>
              <Grow in={chipsVisible} timeout={300} style={{ transitionDelay: chipsVisible ? '200ms' : '0ms' }}>
                <Chip
                  label="Position 3: Local"
                  onClick={() => handlePositionChange(3)}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#1B4584',
                    borderColor: '#1B4584',
                    borderWidth: selectedPosition === 3 ? 2 : 1,
                    fontWeight: selectedPosition === 3 ? 'bold' : 'normal',
                    opacity: position3Query || isChartmindAdminUser || managerLevel === 'global' ? 1 : 0.5,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(27, 69, 132, 0.04)',
                    },
                  }}
                />
              </Grow>
            </Box>

            {/* Chain mode indicator for chartmind-admin (read-only) */}
            {isChartmindAdminUser && queryId?.startsWith('chartmind-') && (
              <Box sx={{
                mt: 1,
                mb: 1,
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: chainMode === CHAIN_MODE.SUBSTITUTIONARY ? 'warning.main' : 'info.main',
                bgcolor: chainMode === CHAIN_MODE.SUBSTITUTIONARY
                  ? 'rgba(237, 108, 2, 0.08)'
                  : 'rgba(2, 136, 209, 0.08)',
              }}>
                <Typography variant="caption" fontWeight="bold" sx={{ color: chainMode === CHAIN_MODE.SUBSTITUTIONARY ? 'warning.dark' : 'info.dark' }}>
                  Chain Mode: {chainMode === CHAIN_MODE.SUBSTITUTIONARY ? 'Substitutionary' : 'Sequential'}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  {chainMode === CHAIN_MODE.SEQUENTIAL
                    ? 'Your P3 prompt refines the output of P1/P2 (each step builds on the previous).'
                    : 'Your P3 prompt replaces P1/P2 entirely (only your P3 prompt runs).'}
                </Typography>
              </Box>
            )}

            {/* Chain mode (Global LLM Manager only): Sequential vs Substitutionary */}
            {managerLevel === 'global' && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="chain-mode-label">Chain mode</InputLabel>
                  <Select
                    labelId="chain-mode-label"
                    id="chain-mode-select"
                    value={chainMode}
                    label="Chain mode"
                    onChange={(e) => setChainMode(e.target.value)}
                  >
                    <MenuItem value={CHAIN_MODE.SEQUENTIAL}>
                      Sequential — P1 → P2 → P3 (each step refines the previous)
                    </MenuItem>
                    <MenuItem value={CHAIN_MODE.SUBSTITUTIONARY}>
                      Substitutionary — use highest position only (P3 else P2 else P1)
                    </MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  {chainMode === CHAIN_MODE.SEQUENTIAL
                    ? 'Position 1 runs first; its output is refined by Position 2, then optionally by Position 3.'
                    : 'If a query exists for Position 3, only that runs. Otherwise Position 2, else Position 1.'}
                </Typography>
              </Box>
            )}
            
            {/* Metadata chips */}
            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
              {editedQuery?.isStaticContent && (
                <Tooltip title="Static content - used verbatim, not processed by LLM">
                  <Chip 
                    label="Static Content" 
                    size="small" 
                    color="info"
                  />
                </Tooltip>
              )}
              <Chip 
                label={editedQuery?.category?.replace(/_/g, ' ').toUpperCase()} 
                size="small" 
                color="primary"
                variant="outlined"
              />
              {editedQuery?.id && (
                <Chip 
                  label={`v${editedQuery?.currentVersion || 1}`} 
                  size="small" 
                  variant="outlined"
                />
              )}
              {editedQuery?.isEmpty && (
                <Chip 
                  label="Empty Position" 
                  size="small" 
                  color="warning"
                />
              )}
              <Chip 
                label={`Your Level: ${managerLevel}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>
              <IconButton onClick={() => setShowSidebar(!showSidebar)} size="small">
                {showSidebar ? <ChevronLeft /> : <ChevronRight />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <EmbeddedDocumentsUploadProvider>
        <EmbeddedDocumentsUploadIndicator />
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          TabIndicatorProps={{ sx: { display: 'none' } }}
        >
          {[
            { icon: <Code />, label: 'Prompt' },
            { icon: <SettingsIcon />, label: 'Settings' },
            { icon: <Description />, label: 'Embedded Documents' },
            { icon: <LocalLibrary />, label: 'Clinical References' },
            { icon: <History />, label: 'History' },
            { icon: <Info />, label: 'Info' },
          ].map((tab, idx) => (
            <Tab
              key={tab.label}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{
                color: '#1B4584',
                fontWeight: activeTab === idx ? 'bold' : 'normal',
                opacity: 1,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#1B4584',
                  fontWeight: 'bold',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Content */}
      <DialogContent sx={{ pt: 0, p: 0, display: 'flex', flexDirection: 'row', height: 'calc(90vh - 200px)', position: 'relative', overflow: 'hidden' }}>
        {/* Sidebar with Slide Animation */}
        <Slide 
          direction="right" 
          in={showSidebar} 
          mountOnEnter 
          unmountOnExit 
          timeout={300}
          appear={false}
        >
          <Box sx={{ width: 320, borderRight: 1, borderColor: 'divider', flexShrink: 0, height: '100%', overflow: 'auto' }}>
            <ChartMindDataProvider encounterData={null}>
              <DraggableDataSidebar
                position={selectedPosition}
                promptText={editedQuery?.prompt || ''}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </ChartMindDataProvider>
          </Box>
        </Slide>
        
        {/* Main content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => { setSuccess(null); setP1DownloadPath(null); }}
            action={p1DownloadPath ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  navigator.clipboard.writeText(p1DownloadPath).then(() => {
                    setSuccess('Path copied to clipboard. Paste it when saving the file.');
                    setP1DownloadPath(null);
                    setTimeout(() => setSuccess(null), 4000);
                  }).catch(() => {});
                }}
              >
                Copy path
              </Button>
            ) : null}
          >
            {success}
            {p1DownloadPath && (
              <Box component="div" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                {p1DownloadPath}
              </Box>
            )}
          </Alert>
        )}
        {p1LoadError && selectedPosition === 1 && isGlobalManager && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setP1LoadError(null)}>
            Prompt not loaded from Secret Manager: {p1LoadError}
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              Context Provided and Response Format show defaults from code. Check the browser console for details. Ensure you are signed in as a Global LLM Manager and that the getP1Prompt Cloud Function is deployed.
            </Typography>
          </Alert>
        )}

        {/* Prompt Tab with Fade Animation */}
        <TabPanel value={activeTab} index={0}>
          <Fade in={activeTab === 0} timeout={300} key={`prompt-${contentKey}`}>
            <Box>
              {/* Check if user can edit this position */}
              {(() => {
                const _currentQuery = selectedPosition === 1 ? position1Query :
                                    selectedPosition === 2 ? position2Query :
                                    position3Query;
                const canEdit = canEditQuery(editedQuery);
                const isEmpty = editedQuery?.isEmpty;
                
                return (
                  <>
                    {/* Read-only P1/P2 previews for chartmind-admin when editing P3 */}
                    {isChartmindAdminUser && selectedPosition === 3 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                              Position 1 (Global) — Read-only
                            </Typography>
                            <Chip label="Read-only" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          </Box>
                          <Box sx={{
                            maxHeight: 80,
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}>
                            {position1Query?.prompt
                              ? (position1Query.prompt.length > 300
                                  ? position1Query.prompt.substring(0, 300) + '...'
                                  : position1Query.prompt)
                              : 'No global prompt configured'}
                          </Box>
                        </Box>
                        <Box sx={{ mb: 1.5 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                              Position 2 (Regional) — Read-only
                            </Typography>
                            <Chip label="Read-only" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          </Box>
                          <Box sx={{
                            maxHeight: 80,
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}>
                            {position2Query?.prompt
                              ? (position2Query.prompt.length > 300
                                  ? position2Query.prompt.substring(0, 300) + '...'
                                  : position2Query.prompt)
                              : 'No regional prompt configured'}
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                      </Box>
                    )}

                    {/* Read-only P1/P3 previews for regional manager when editing P2 */}
                    {isRegionalManager && selectedPosition === 2 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                              Position 1 (Global) — Read-only
                            </Typography>
                            <Chip label="Read-only" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          </Box>
                          <Box sx={{
                            maxHeight: 80,
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}>
                            {position1Query?.prompt
                              ? (position1Query.prompt.length > 300
                                  ? position1Query.prompt.substring(0, 300) + '...'
                                  : position1Query.prompt)
                              : 'No global prompt configured'}
                          </Box>
                        </Box>
                        <Box sx={{ mb: 1.5 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                              Position 3 (Local) — Read-only
                            </Typography>
                            <Chip label="Read-only" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          </Box>
                          <Box sx={{
                            maxHeight: 80,
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            color: 'text.secondary',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}>
                            {position3Query?.prompt
                              ? (position3Query.prompt.length > 300
                                  ? position3Query.prompt.substring(0, 300) + '...'
                                  : position3Query.prompt)
                              : 'No local prompt configured'}
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                      </Box>
                    )}

                    {/* P1: Download query file (optional backup); Save writes to Firestore + Secret Manager and downloads a copy. */}
                    {selectedPosition === 1 && managerLevel === 'global' && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Download />}
                          onClick={handleDownloadP1QueryFile}
                        >
                          Download query file
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          Save writes to Firestore and Secret Manager and downloads a copy to your Downloads folder. Download here to get another local copy.
                        </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Context Provided — editable for global manager on Position 1 */}
                    {selectedPosition === 1 && managerLevel === 'global' && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Context Provided
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          Describes what input/context the LLM will receive. Auto-prepended to all positions (P1, P2, P3) at execution time.
                        </Typography>
                        <TextField
                          label="Context Provided"
                          multiline
                          rows={8}
                          fullWidth
                          value={editedQuery?.contextProvided || ''}
                          onChange={(e) => handleFieldChange('contextProvided', e.target.value)}
                          variant="outlined"
                          sx={{
                            '& .MuiInputBase-input': {
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                            },
                          }}
                          helperText="Context description prepended to every position's system prompt. P2/P3 authors do not need to include it — it is injected automatically."
                        />
                        <Divider sx={{ mt: 2, mb: 1 }} />
                      </Box>
                    )}

                    {/* Context Provided — read-only preview for regional manager on Position 2 */}
                    {isRegionalManager && selectedPosition === 2 && position1Query?.contextProvided && (
                      <Box sx={{ mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Context Provided (auto-applied to your P2 prompt)
                          </Typography>
                          <Chip label="Auto-injected" size="small" color="info" sx={{ height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Box sx={{
                          maxHeight: 120,
                          overflow: 'hidden',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          bgcolor: 'grey.50',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {position1Query.contextProvided.length > 500
                            ? position1Query.contextProvided.substring(0, 500) + '...'
                            : position1Query.contextProvided}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          This context description is prepended automatically — you do not need to include it in your prompt.
                        </Typography>
                        <Divider sx={{ mt: 1.5, mb: 1 }} />
                      </Box>
                    )}

                    {/* Context Provided — read-only preview for chartmind-admin on Position 3 */}
                    {isChartmindAdminUser && selectedPosition === 3 && position1Query?.contextProvided && (
                      <Box sx={{ mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Context Provided (auto-applied to your P3 prompt)
                          </Typography>
                          <Chip label="Auto-injected" size="small" color="info" sx={{ height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Box sx={{
                          maxHeight: 120,
                          overflow: 'hidden',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          bgcolor: 'grey.50',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {position1Query.contextProvided.length > 500
                            ? position1Query.contextProvided.substring(0, 500) + '...'
                            : position1Query.contextProvided}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          This context description is prepended automatically — you do not need to include it in your prompt.
                        </Typography>
                        <Divider sx={{ mt: 1.5, mb: 1 }} />
                      </Box>
                    )}

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Query
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Defines the actual question or questions posed to the LLM
                      </Typography>
                    </Box>
                    <TextField
                  label="Prompt"
                  multiline
                  rows={16}
                  fullWidth
                  value={editedQuery?.prompt || ''}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  variant="outlined"
                  disabled={!canEdit}
                  placeholder={isEmpty ? "No prompt configured - will use previous position's output" : ''}
                  inputRef={(input) => {
                    if (input) {
                      promptTextareaRef.current = input;
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Try to get path from both text/plain and application/json
                    let path = e.dataTransfer.getData('text/plain');
                    
                    // If text/plain is empty, try application/json
                    if (!path || path.trim() === '') {
                      try {
                        const jsonData = e.dataTransfer.getData('application/json');
                        if (jsonData) {
                          const parsed = JSON.parse(jsonData);
                          path = parsed.path;
                        }
                      } catch (err) {
                        console.warn('[QueryManagementModal] Failed to parse drop data:', err);
                      }
                    }
                    
                    
                    if (path && path.trim() && canEdit) {
                      // For Material-UI multiline TextField, the inputRef points to the textarea
                      // But we need to find it in the DOM structure
                      let textarea = null;
                      
                      // Try ref first (should work for multiline TextField)
                      if (promptTextareaRef.current) {
                        // For multiline, inputRef might point to the textarea directly or the input wrapper
                        textarea = promptTextareaRef.current.tagName === 'TEXTAREA' 
                          ? promptTextareaRef.current 
                          : promptTextareaRef.current.querySelector('textarea');
                      }
                      
                      // Fallback: search in the DOM
                      if (!textarea) {
                        textarea = e.currentTarget.querySelector('textarea') || 
                                  e.target.closest('.MuiInputBase-root')?.querySelector('textarea') ||
                                  (e.target.tagName === 'TEXTAREA' ? e.target : null);
                      }
                      
                      if (textarea) {
                        const start = textarea.selectionStart || 0;
                        const end = textarea.selectionEnd || 0;
                        const currentPrompt = editedQuery?.prompt || '';
                        const newPrompt = 
                          currentPrompt.substring(0, start) + 
                          path + 
                          currentPrompt.substring(end);
                        handleFieldChange('prompt', newPrompt);
                        // Set cursor position after inserted text (guard: node may be unmounted)
                        const node = textarea;
                        setTimeout(() => {
                          if (node && typeof node.focus === 'function') {
                            node.focus();
                            const newCursorPos = start + path.length;
                            node.setSelectionRange(newCursorPos, newCursorPos);
                          }
                        }, 0);
                      } else {
                        // Fallback: append to end if we can't find textarea
                        console.warn('[QueryManagementModal] Could not find textarea, appending to end');
                        const currentPrompt = editedQuery?.prompt || '';
                        handleFieldChange('prompt', currentPrompt + (currentPrompt ? ' ' : '') + path);
                      }
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                    '& .MuiInputBase-input::placeholder': {
                      fontStyle: 'italic',
                      opacity: 0.6,
                    },
                    '& .MuiInputBase-root': {
                      '&:hover': {
                        '&:not(.Mui-disabled)': {
                          borderColor: draggedPath ? 'primary.main' : undefined,
                        },
                      },
                    },
                  }}
                  helperText={
                    !canEdit 
                      ? `You don't have permission to edit Position ${selectedPosition} prompts`
                      : isEmpty
                        ? "This position is empty. Configure a prompt to override the previous position's output."
                        : draggedPath
                          ? `Drop ${draggedPath} here to insert`
                          : 'Drag data elements from the sidebar to insert placeholders'
                  }
                />
                
                <Box display="flex" gap={2} mt={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {(editedQuery?.prompt || '').length} characters
                  </Typography>
                  {hasChanges && (
                    <Chip label="Unsaved changes" size="small" color="warning" />
                  )}
                  {!canEdit && (
                    <>
                      <Chip label="Read-only" size="small" color="default" />
                      {(isChartmindAdminUser || isChartmindSupervisor) && (selectedPosition === 1 || selectedPosition === 2) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          View only. You can edit Position 3 prompts.
                        </Typography>
                      )}
                      {isRegionalManager && (selectedPosition === 1 || selectedPosition === 3) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          View only. You can edit Position 2 prompts.
                        </Typography>
                      )}
                    </>
                  )}
                </Box>

                    {/* Response Format section */}
                    {selectedPosition === 1 && managerLevel === 'global' && (
                      <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="subtitle2" gutterBottom>
                          Response Format Specification
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          This format is automatically appended to Position 2 and Position 3 prompts to ensure consistent output structure.
                        </Typography>
                        <TextField
                          label="Response Format"
                          multiline
                          rows={8}
                          fullWidth
                          value={editedQuery?.responseFormat || ''}
                          onChange={(e) => handleFieldChange('responseFormat', e.target.value)}
                          variant="outlined"
                          sx={{
                            '& .MuiInputBase-input': {
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                            },
                          }}
                          helperText="JSON schema and format directives extracted from Position 1. Edited here, auto-injected into P2/P3 at execution time."
                        />
                      </Box>
                    )}

                    {/* Response Format read-only preview for regional manager */}
                    {isRegionalManager && selectedPosition === 2 && position1Query?.responseFormat && (
                      <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Response Format (auto-applied to your P2 prompt)
                          </Typography>
                          <Chip label="Auto-injected" size="small" color="info" sx={{ height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Box sx={{
                          maxHeight: 120,
                          overflow: 'hidden',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          bgcolor: 'grey.50',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {position1Query.responseFormat.length > 500
                            ? position1Query.responseFormat.substring(0, 500) + '...'
                            : position1Query.responseFormat}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          This format specification ensures your P2 output matches the expected structure. It is appended automatically — you do not need to include it in your prompt.
                        </Typography>
                      </Box>
                    )}

                    {/* Response Format read-only preview for chartmind-admin */}
                    {isChartmindAdminUser && selectedPosition === 3 && position1Query?.responseFormat && (
                      <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Response Format (auto-applied to your P3 prompt)
                          </Typography>
                          <Chip label="Auto-injected" size="small" color="info" sx={{ height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Box sx={{
                          maxHeight: 120,
                          overflow: 'hidden',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          bgcolor: 'grey.50',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {position1Query.responseFormat.length > 500
                            ? position1Query.responseFormat.substring(0, 500) + '...'
                            : position1Query.responseFormat}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          This format specification ensures your P3 output matches the expected structure. It is appended automatically — you do not need to include it in your prompt.
                        </Typography>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          </Fade>
        </TabPanel>

        {/* Settings Tab with Fade Animation */}
        <TabPanel value={activeTab} index={1}>
          <Fade in={activeTab === 1} timeout={300}>
            <Box>
              {(() => {
                const canEdit = canEditQuery(editedQuery);
                const isStaticContent = editedQuery?.isStaticContent || false;
                // P2/P3 settings are system-enforced and not user-adjustable
                const isP2P3 = selectedPosition >= 2;
                const p2p3MaxTokens = P2P3_MAX_TOKENS[queryId] || P2P3_MAX_TOKENS_DEFAULT;
                
                return (
                  <Box display="flex" flexDirection="column" gap={3}>
                {/* Static Content Toggle — only for P1 */}
                {!isP2P3 && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: isStaticContent ? 'action.hover' : 'transparent' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isStaticContent}
                        onChange={(e) => handleFieldChange('isStaticContent', e.target.checked)}
                        disabled={!canEdit}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          Static Content
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          This is verbatim text (not processed by an LLM). The prompt text will be used exactly as written.
                        </Typography>
                      </Box>
                    }
                  />
                  {isStaticContent && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      LLM settings below are disabled for static content. The prompt text will be displayed/spoken verbatim without any AI processing.
                    </Alert>
                  )}
                </Paper>
                )}

                {/* P2/P3 enforced settings notice */}
                {isP2P3 && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Position {selectedPosition} model, temperature, and max tokens are system-managed defaults and cannot be changed.
                  </Alert>
                )}

                <FormControl fullWidth disabled={isP2P3 || !canEdit || isStaticContent}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={isP2P3 ? P2P3_MODEL : (editedQuery?.model || DEFAULT_MODEL)}
                    label="Model"
                    onChange={(e) => !isP2P3 && handleFieldChange('model', e.target.value)}
                    readOnly={isP2P3}
                  >
                    {isP2P3 ? (
                      <MenuItem value={P2P3_MODEL}>
                        <Box>
                          <Typography variant="body2">{P2P3_MODEL_LABEL}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            System default for Position {selectedPosition}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ) : (
                    AVAILABLE_MODELS.map(model => (
                      <MenuItem key={model.value} value={model.value}>
                        <Box>
                          <Typography variant="body2">{model.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {model.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                    )}
                  </Select>
                </FormControl>

                <Box sx={{ opacity: (isStaticContent && !isP2P3) ? 0.5 : 1 }}>
                  <Typography gutterBottom>
                    Temperature: {isP2P3 ? P2P3_TEMPERATURE : (editedQuery?.temperature || 0.7)}
                  </Typography>
                  <Slider
                    value={isP2P3 ? P2P3_TEMPERATURE : (editedQuery?.temperature || 0.7)}
                    onChange={(e, v) => !isP2P3 && handleFieldChange('temperature', v)}
                    min={0}
                    max={2}
                    step={0.1}
                    disabled={isP2P3 || !canEdit || isStaticContent}
                    marks={[
                      { value: 0, label: '0 (Deterministic)' },
                      { value: 1, label: '1 (Balanced)' },
                      { value: 2, label: '2 (Creative)' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>

                <TextField
                  label="Max Tokens"
                  type="number"
                  value={isP2P3 ? p2p3MaxTokens : (editedQuery?.maxTokens || 2000)}
                  onChange={(e) => !isP2P3 && handleFieldChange('maxTokens', parseInt(e.target.value) || 2000)}
                  inputProps={{ min: 100, max: 128000, step: 100 }}
                  helperText={
                    isP2P3
                      ? `System default: ${p2p3MaxTokens.toLocaleString()} tokens for this query`
                      : isStaticContent
                        ? "Not applicable for static content"
                        : "Maximum tokens in the response"
                  }
                  disabled={isP2P3 || !canEdit || isStaticContent}
                />
                
                {!canEdit && !isP2P3 && (
                  <Alert severity="info">
                    You don't have permission to edit Position {selectedPosition} settings
                  </Alert>
                )}
                  </Box>
                );
              })()}
            </Box>
          </Fade>
        </TabPanel>

        {/* Documents Tab with Fade Animation */}
        <TabPanel value={activeTab} index={2}>
          <Fade in={activeTab === 2} timeout={300}>
            <Box>
              <DocumentManagementPanel
                baseQueryId={queryId}
                position={isChartmindAdminUser ? 3 : selectedPosition}
                options={{
                  adminId: isChartmindAdminUser ? userData?.uid : null,
                }}
              />
            </Box>
          </Fade>
        </TabPanel>

        {/* Clinical References Tab with Fade Animation */}
        <TabPanel value={activeTab} index={3}>
          <Fade in={activeTab === 3} timeout={300}>
            <Box>
              <ClinicalReferencesPanel
                baseQueryId={queryId}
                position={isChartmindAdminUser ? 3 : isRegionalManager ? 2 : selectedPosition}
                options={{
                  adminId: (isChartmindAdminUser || isRegionalManager) ? userData?.uid : null,
                }}
              />
            </Box>
          </Fade>
        </TabPanel>

        {/* History Tab with Fade Animation */}
        <TabPanel value={activeTab} index={4}>
          <Fade in={activeTab === 4} timeout={300}>
            <Box>
              {isGlobalManager && selectedPosition === 1 && queryId && !queryId.includes('-regional-') && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Position 1 prompt (Secret Manager)</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    P1 prompt is stored in Google Cloud Secret Manager. Restore a prior version to make it the current prompt.{' '}
                    <a
                      href="https://console.cloud.google.com/security/secret-manager?project=hlthdsk-experimental"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 500 }}
                    >
                      Open Secret Manager →
                    </a>
                  </Typography>
                  {p1SecretVersionsLoading ? (
                    <Typography color="text.secondary">Loading versions…</Typography>
                  ) : p1SecretVersions.length === 0 ? (
                    <Typography color="text.secondary">No Secret Manager versions found for this query.</Typography>
                  ) : (
                    <List dense>
                      {p1SecretVersions.map((v) => (
                        <ListItem key={v.versionId}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">Version {v.versionId}</Typography>
                                {v.isLatest && <Chip label="Current" size="small" color="primary" />}
                              </Box>
                            }
                            secondary={v.createTime ? new Date(v.createTime).toLocaleString() : null}
                          />
                          {!v.isLatest && (
                            <ListItemSecondaryAction>
                              <Tooltip title="Restore this version as current">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRestoreP1PromptVersion(v.versionId)}
                                    disabled={p1SecretRestoring === v.versionId}
                                  >
                                    {p1SecretRestoring === v.versionId ? <CircularProgress size={20} /> : <Restore />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
              <Typography variant="subtitle2" gutterBottom>Query version history (Firestore)</Typography>
              {versions.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No version history available
                </Typography>
              ) : (
                <List>
              {versions.map((version, index) => (
                <Paper key={version.id} variant="outlined" sx={{ mb: 1 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            Version {version.versionNumber}
                          </Typography>
                          {index === 0 && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {version.changeReason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {version.changedAt?.toLocaleString?.() || 'Unknown date'} 
                            {' by '} 
                            {version.changedBy || 'Unknown'}
                          </Typography>
                        </>
                      }
                    />
                    {index > 0 && (
                      <ListItemSecondaryAction>
                        <Tooltip title="Rollback to this version">
                          <span>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleRollback(version.versionNumber)}
                              disabled={saving}
                            >
                              <Restore />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                </Paper>
              ))}
                </List>
              )}
            </Box>
          </Fade>
        </TabPanel>

        {/* Info Tab with Fade Animation */}
        <TabPanel value={activeTab} index={5}>
          <Fade in={activeTab === 5} timeout={300}>
            <Box display="flex" flexDirection="column" gap={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Query Information</Typography>
              <Box display="grid" gridTemplateColumns="1fr 2fr" gap={1}>
                <Typography variant="body2" color="text.secondary">Base Query ID:</Typography>
                <Typography variant="body2" fontFamily="monospace">{queryId}</Typography>
                
                <Typography variant="body2" color="text.secondary">Position:</Typography>
                <Typography variant="body2">Position {selectedPosition} ({getChainPositionLabel(selectedPosition)})</Typography>
                
                <Typography variant="body2" color="text.secondary">Query ID:</Typography>
                <Typography variant="body2" fontFamily="monospace">{editedQuery?.id || 'N/A (Empty position)'}</Typography>
                
                <Typography variant="body2" color="text.secondary">Category:</Typography>
                <Typography variant="body2">{editedQuery?.category || 'N/A'}</Typography>
                
                <Typography variant="body2" color="text.secondary">Created:</Typography>
                <Typography variant="body2">
                  {editedQuery?.createdAt?.toDate?.()?.toLocaleString?.() || 'N/A'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">Last Updated:</Typography>
                <Typography variant="body2">
                  {editedQuery?.updatedAt?.toDate?.()?.toLocaleString?.() || 'N/A'}
                </Typography>
              </Box>
            </Paper>

            {editedQuery?.uiLocation && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>UI Location</Typography>
                <Box display="grid" gridTemplateColumns="1fr 2fr" gap={1}>
                  <Typography variant="body2" color="text.secondary">Component:</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {editedQuery.uiLocation.component}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">File:</Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {editedQuery.uiLocation.file}
                  </Typography>
                </Box>
              </Paper>
            )}

            {editedQuery?.stats && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Usage Statistics</Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr 1fr 1fr" gap={2}>
                  <Box textAlign="center">
                    <Typography variant="h6">{editedQuery.stats.totalCalls || 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Total Calls</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6">
                      {editedQuery.stats.avgResponseTime?.toFixed(0) || 0}ms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg Response</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6">
                      ${editedQuery.stats.avgCost?.toFixed(4) || '0.0000'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg Cost</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6">
                      {((editedQuery.stats.successRate || 0) * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                  </Box>
                </Box>
              </Paper>
            )}
            </Box>
          </Fade>
        </TabPanel>
        </Box>
      </DialogContent>

      {/* Footer */}
      <Divider />
      <DialogActions sx={{ p: 2, gap: 2 }}>
        {hasChanges && (
          <TextField
            placeholder={isChartmindSupervisor && selectedPosition === 3 ? 'Reason for change (optional)' : 'Reason for change (required)'}
            size="small"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            sx={{ flexGrow: 1 }}
            error={hasChanges && !changeReason.trim() && !(isChartmindSupervisor && selectedPosition === 3)}
          />
        )}
        
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={!hasChanges || saving || (!(isChartmindSupervisor && selectedPosition === 3) && !changeReason.trim())}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
      </EmbeddedDocumentsUploadProvider>
    </Dialog>
  );
};

export default QueryManagementModal;
