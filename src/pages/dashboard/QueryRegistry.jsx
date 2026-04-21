/**
 * Query Registry Page
 *
 * Displays all LLM queries the current user has permission to edit.
 * Provides filtering, searching, and quick access to query management.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { contentCardSx } from "../../styles/standaloneLayoutTokens";
import {
  Search,
  Edit,
  Add,
  TrendingUp,
  Link as LinkIcon,
  LinkOff,
  Refresh,
  Code,
  DeleteOutlineRounded,
  SwapHoriz,
  ContentCopy,
  QrCode2,
  Assignment,
  ChatOutlined,
  ListAlt,
  MedicationRounded,
  CheckCircle,
  Print,
  Close,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@healthdesk/shared-hooks";
import {
  db,
  getCheckInTemplates,
  createCheckInTemplate,
  deleteCheckInTemplate,
  updateCheckInTemplate,
  getSpecialtyLabel,
} from "@healthdesk/shared-services";
import { useLLMManager } from "../../contexts/LLMManagerContext";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { QUERY_CATEGORIES } from "../../contexts/LLMManagerContext";
import { queryRegistryService } from "../../services/llm";
import {
  QueryManagementModal,
  PETManagementModal,
} from "../../components/llmManager";
import { chartmindAdminService } from "../../services/chartmind";
import { CHAIN_MODE, DEFAULT_MODEL } from "../../services/llm/llmConstants";

const QueryRegistry = () => {
  const { userData, user } = useAuth();
  const {
    isManager,
    isChartmindAdmin,
    isGlobalManager,
    managerLevel,
    scopeDescription,
    canCreateChains,
  } = useLLMManager();

  // State
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // MSI Template state (chartmind-admin only)
  const [adminId, setAdminId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [createTemplateSource, setCreateTemplateSource] = useState("button"); // 'button' or 'manage'
  const [pendingQueryIdForNewTemplate, setPendingQueryIdForNewTemplate] =
    useState(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQR, setCopiedQR] = useState(false);
  const qrRef = useRef(null);

  // New Query (Global LLM Manager only): create a base query with same access architecture (P1 off Firestore)
  const [newQueryDialogOpen, setNewQueryDialogOpen] = useState(false);
  const [newQueryForm, setNewQueryForm] = useState({
    id: "",
    category: QUERY_CATEGORIES.CHARTMIND,
    model: DEFAULT_MODEL,
    maxTokens: 4000,
    responseFormat: "",
    contextProvided: "",
    chainMode: CHAIN_MODE.SEQUENTIAL,
    featureName: "",
    featureDescription: "",
  });
  const [creatingQuery, setCreatingQuery] = useState(false);
  const [createdQueryId, setCreatedQueryId] = useState(null);
  const [newQueryError, setNewQueryError] = useState(null);

  // Linked regional template indicator for chartmind-admin
  const [linkedRegionalTemplate, setLinkedRegionalTemplate] = useState(null);

  // ── PET (Patient Encounter Template) state ──
  const [petTemplates, setPetTemplates] = useState([]);
  const [petLoading, setPetLoading] = useState(false);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [petModalData, setPetModalData] = useState(null);
  const [petCreateMode, setPetCreateMode] = useState(false);
  const [showPetCreateDialog, setShowPetCreateDialog] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [showPetDeleteConfirm, setShowPetDeleteConfirm] = useState(null); // holds check-in template id to delete
  const [showLinkExistingDialog, setShowLinkExistingDialog] = useState(false);

  // Load linked regional template for chartmind-admin
  useEffect(() => {
    if (!isChartmindAdmin || !user?.uid) return;
    const loadLinked = async () => {
      try {
        const adminDoc = await db
          .collection("chartmindAdmins")
          .doc(user.uid)
          .get();
        const linked = adminDoc.exists
          ? adminDoc.data()?.linkedRegionalTemplate
          : null;
        setLinkedRegionalTemplate(linked || null);
      } catch (err) {
        console.warn(
          "[QueryRegistry] Failed to load linked regional template:",
          err,
        );
      }
    };
    loadLinked();
  }, [isChartmindAdmin, user?.uid]);

  // Load admin data and templates for chartmind-admin users
  useEffect(() => {
    if (!isChartmindAdmin || !user?.uid) return;
    const loadAdminAndTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const admin = await chartmindAdminService.getAdminByUserId(user.uid);
        if (admin) {
          setAdminId(admin.id);
          const tpls = await chartmindAdminService.getTemplates(admin.id);
          setTemplates(tpls);
        }
      } catch (err) {
        console.error("[QueryRegistry] Failed to load admin/templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadAdminAndTemplates();
  }, [isChartmindAdmin, user?.uid]);

  // Reload templates
  const reloadTemplates = useCallback(async () => {
    if (!adminId) return;
    try {
      const tpls = await chartmindAdminService.getTemplates(adminId);
      setTemplates(tpls);
      // Update selected template data if one is selected
      if (selectedTemplateId) {
        const updated = tpls.find((t) => t.id === selectedTemplateId);
        if (updated) setSelectedTemplateData(updated);
      }
    } catch (err) {
      console.error("[QueryRegistry] Failed to reload templates:", err);
    }
  }, [adminId, selectedTemplateId]);

  // Clinic ID (used by PET loading and template creation)
  const clinicId =
    userData?.facilityId || userData?.location || userData?.clinicId;

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (templateId) => {
      setSelectedTemplateId(templateId);
      if (!templateId) {
        setSelectedTemplateData(null);
      } else {
        const tpl = templates.find((t) => t.id === templateId);
        setSelectedTemplateData(tpl || null);
      }
    },
    [templates],
  );

  // ── PET loading (declared early so other callbacks can reference it) ──
  const loadPetTemplates = useCallback(async () => {
    if (!clinicId) return;
    setPetLoading(true);
    try {
      const tpls = await getCheckInTemplates(clinicId);
      setPetTemplates(tpls);
    } catch (err) {
      console.error("[QueryRegistry] Failed to load PETs:", err);
    } finally {
      setPetLoading(false);
    }
  }, [clinicId]);

  // Create new template (unified: handles both '+ Create Template' button and manage-intercept)
  // Passes clinicId + userId so createTemplate can auto-create a linked PET
  const handleCreateTemplate = useCallback(async () => {
    if (!adminId || !newTemplateName.trim()) return;
    const trimmedName = newTemplateName.trim();
    const source = createTemplateSource;
    const pendingQueryId = pendingQueryIdForNewTemplate;
    try {
      const createdTemplate = await chartmindAdminService.createTemplate(
        adminId,
        {
          name: trimmedName,
          createdByEmail: userData?.email || "unknown",
          clinicId: clinicId || undefined,
          userId: user?.uid || undefined,
        },
      );
      setNewTemplateName("");
      setShowCreateDialog(false);
      setPendingQueryIdForNewTemplate(null);
      setCreateTemplateSource("button");
      // Reload and auto-select the new template
      const tpls = await chartmindAdminService.getTemplates(adminId);
      setTemplates(tpls);
      const created =
        tpls.find((t) => t.name === trimmedName) || tpls[tpls.length - 1];
      if (created) {
        setSelectedTemplateId(created.id);
        setSelectedTemplateData(created);
      }
      // Reload PETs since a linked PET was auto-created
      let newPetData = null;
      if (clinicId) {
        await loadPetTemplates();
        // Find the auto-created PET to open its management modal
        if (createdTemplate?.checkInLink?.templateId) {
          const updatedPets = await getCheckInTemplates(clinicId);
          newPetData =
            updatedPets.find(
              (p) => p.id === createdTemplate.checkInLink.templateId,
            ) || null;
        }
      }
      // If triggered from 'Manage' click, open the modal for the pending query
      if (source === "manage" && pendingQueryId) {
        setSelectedQueryId(pendingQueryId);
        setModalOpen(true);
      } else if (newPetData) {
        // Auto-open the PET management modal so the user can immediately customize the check-in process
        setPetModalData(newPetData);
        setPetCreateMode(false);
        setPetModalOpen(true);
      }
    } catch (err) {
      console.error("[QueryRegistry] Failed to create template:", err);
    }
  }, [
    adminId,
    newTemplateName,
    createTemplateSource,
    pendingQueryIdForNewTemplate,
    userData?.email,
    clinicId,
    user?.uid,
    loadPetTemplates,
  ]);

  // Delete selected template
  const handleDeleteTemplate = useCallback(async () => {
    if (!adminId || !selectedTemplateId) return;
    try {
      await chartmindAdminService.deleteTemplate(adminId, selectedTemplateId);
      setSelectedTemplateId("");
      setSelectedTemplateData(null);
      setShowDeleteConfirm(false);
      await reloadTemplates();
    } catch (err) {
      console.error("[QueryRegistry] Failed to delete template:", err);
    }
  }, [adminId, selectedTemplateId, reloadTemplates]);

  // Helper: build shareable template URL from invite code
  const getTemplateUrl = (code) => `${window.location.origin}/join/t_${code}`;

  // Copy template link to clipboard
  const handleCopyTemplateLink = useCallback(async () => {
    if (!selectedTemplateData?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(
        getTemplateUrl(selectedTemplateData.inviteCode),
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("[QueryRegistry] Copy link failed:", err);
    }
  }, [selectedTemplateData?.inviteCode]);

  // Print QR code
  const handlePrintQR = useCallback(() => {
    if (!qrRef.current) return;
    const svgEl = qrRef.current.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const templateName =
      selectedTemplateData?.name || "Patient Encounter Template";
    const templateUrl = selectedTemplateData?.inviteCode
      ? getTemplateUrl(selectedTemplateData.inviteCode)
      : "";

    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${templateName}</title>
          <style>
            body { 
              display: flex; flex-direction: column; align-items: center; 
              justify-content: center; min-height: 100vh; margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            h2 { margin-bottom: 8px; color: #1b4584; }
            .url { font-size: 12px; color: #666; word-break: break-all; max-width: 400px; text-align: center; margin-top: 16px; }
            svg { margin: 24px 0; }
            @media print { body { justify-content: flex-start; padding-top: 80px; } }
          </style>
        </head>
        <body>
          <h2>${templateName}</h2>
          <p style="color:#666; margin:0;">Scan to check in</p>
          ${svgData}
          <p class="url">${templateUrl}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, [selectedTemplateData]);

  // Copy QR code image to clipboard
  const handleCopyQR = useCallback(async () => {
    if (!qrRef.current) return;
    const svgEl = qrRef.current.querySelector("svg");
    if (!svgEl) return;

    try {
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const padding = 40;
      ctx.drawImage(
        img,
        padding,
        padding,
        size - padding * 2,
        size - padding * 2,
      );
      URL.revokeObjectURL(url);

      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setCopiedQR(true);
      setTimeout(() => setCopiedQR(false), 2000);
    } catch (err) {
      console.error("[QueryRegistry] Copy QR failed:", err);
    }
  }, []);

  // Regenerate template invite code (invalidates old QR/link)
  const handleRegenerateCode = useCallback(async () => {
    if (!adminId || !selectedTemplateId) return;
    try {
      await chartmindAdminService.regenerateTemplateInviteCode(
        adminId,
        selectedTemplateId,
      );
      await reloadTemplates();
      // Refresh the selected template data to get the new code
      const tpls = await chartmindAdminService.getTemplates(adminId);
      setTemplates(tpls);
      const refreshed = tpls.find((t) => t.id === selectedTemplateId);
      if (refreshed) setSelectedTemplateData(refreshed);
    } catch (err) {
      console.error("[QueryRegistry] Regenerate code failed:", err);
    }
  }, [adminId, selectedTemplateId, reloadTemplates]);

  useEffect(() => {
    if (clinicId) loadPetTemplates();
  }, [clinicId, loadPetTemplates]);

  const handleManagePET = useCallback((pet) => {
    setPetModalData(pet);
    setPetCreateMode(false);
    setPetModalOpen(true);
  }, []);

  const handlePetSaved = useCallback(() => {
    loadPetTemplates();
  }, [loadPetTemplates]);

  const handleCreatePET = useCallback(async () => {
    if (!clinicId || !user?.uid || !newPetName.trim()) return;
    try {
      await createCheckInTemplate(
        clinicId,
        { name: newPetName.trim() },
        user.uid,
      );
      setNewPetName("");
      setShowPetCreateDialog(false);
      await loadPetTemplates();
    } catch (err) {
      console.error("[QueryRegistry] Failed to create PET:", err);
    }
  }, [clinicId, user?.uid, newPetName, loadPetTemplates]);

  const handleDeletePET = useCallback(
    async (checkInTemplateId) => {
      if (!clinicId || !checkInTemplateId) return;
      try {
        await deleteCheckInTemplate(clinicId, checkInTemplateId);
        setShowPetDeleteConfirm(null);
        await loadPetTemplates();
      } catch (err) {
        console.error("[QueryRegistry] Failed to delete PET:", err);
      }
    },
    [clinicId, loadPetTemplates],
  );

  // Quick-toggle medications review on a check-in template card
  const handleToggleMedsReview = useCallback(
    async (checkInTemplateId, newValue) => {
      if (!clinicId || !checkInTemplateId) return;
      try {
        await updateCheckInTemplate(clinicId, checkInTemplateId, {
          medicationsReview: newValue,
        });
        await loadPetTemplates();
      } catch (err) {
        console.error(
          "[QueryRegistry] Failed to update medications review:",
          err,
        );
      }
    },
    [clinicId, loadPetTemplates],
  );

  // ── Linking helpers ──

  // Derive linked check-in template ID for visual highlighting
  const linkedCheckInTemplateId = useMemo(() => {
    if (!selectedTemplateId || !selectedTemplateData) return null;
    return selectedTemplateData.checkInLink?.templateId || null;
  }, [selectedTemplateId, selectedTemplateData]);

  // Show all check-in templates, with the linked/active one sorted to the front
  const filteredPetTemplates = useMemo(() => {
    if (!linkedCheckInTemplateId) return petTemplates;
    return [...petTemplates].sort((a, b) => {
      if (a.id === linkedCheckInTemplateId) return -1;
      if (b.id === linkedCheckInTemplateId) return 1;
      return 0;
    });
  }, [petTemplates, linkedCheckInTemplateId]);

  // Unlinked check-in templates (for "Link Existing" dialog)
  const unlinkedPetTemplates = useMemo(() => {
    return petTemplates.filter((p) => !p.encounterTemplateRef);
  }, [petTemplates]);

  // Unlink the check-in template from the selected Encounter Template (PET)
  const handleUnlinkPET = useCallback(async () => {
    if (!adminId || !selectedTemplateId) return;
    try {
      await chartmindAdminService.unlinkCheckInTemplate(
        adminId,
        selectedTemplateId,
      );
      // Refresh both sides
      await reloadTemplates();
      await loadPetTemplates();
    } catch (err) {
      console.error("[QueryRegistry] Failed to unlink PET:", err);
    }
  }, [adminId, selectedTemplateId, reloadTemplates, loadPetTemplates]);

  // Create a new check-in template and link it to the selected Encounter Template (PET)
  const handleCreateAndLinkPET = useCallback(async () => {
    if (
      !adminId ||
      !selectedTemplateId ||
      !clinicId ||
      !user?.uid ||
      !newPetName.trim()
    )
      return;
    try {
      const checkInTemplateId = await createCheckInTemplate(
        clinicId,
        { name: newPetName.trim() },
        user.uid,
      );
      await chartmindAdminService.linkCheckInTemplate(
        adminId,
        selectedTemplateId,
        clinicId,
        checkInTemplateId,
      );
      setNewPetName("");
      setShowPetCreateDialog(false);
      await reloadTemplates();
      await loadPetTemplates();
    } catch (err) {
      console.error("[QueryRegistry] Failed to create & link PET:", err);
    }
  }, [
    adminId,
    selectedTemplateId,
    clinicId,
    user?.uid,
    newPetName,
    reloadTemplates,
    loadPetTemplates,
  ]);

  // Link an existing unlinked check-in template to the selected Encounter Template (PET)
  const handleLinkExistingPET = useCallback(
    async (checkInTemplateId) => {
      if (!adminId || !selectedTemplateId || !clinicId || !checkInTemplateId)
        return;
      try {
        await chartmindAdminService.linkCheckInTemplate(
          adminId,
          selectedTemplateId,
          clinicId,
          checkInTemplateId,
        );
        setShowLinkExistingDialog(false);
        await reloadTemplates();
        await loadPetTemplates();
      } catch (err) {
        console.error("[QueryRegistry] Failed to link existing PET:", err);
      }
    },
    [adminId, selectedTemplateId, clinicId, reloadTemplates, loadPetTemplates],
  );

  // Assign a check-in template as the active check-in for the selected Encounter Template (PET)
  // Unlinks the currently linked check-in template first (if any), then links the new one
  const handleAssignPET = useCallback(
    async (checkInTemplateId) => {
      if (!adminId || !selectedTemplateId || !clinicId || !checkInTemplateId)
        return;
      try {
        // Unlink the currently linked check-in template (if any)
        if (selectedTemplateData?.checkInLink?.templateId) {
          await chartmindAdminService.unlinkCheckInTemplate(
            adminId,
            selectedTemplateId,
          );
        }
        // Link the new check-in template
        await chartmindAdminService.linkCheckInTemplate(
          adminId,
          selectedTemplateId,
          clinicId,
          checkInTemplateId,
        );
        await reloadTemplates();
        await loadPetTemplates();
      } catch (err) {
        console.error("[QueryRegistry] Failed to assign PET:", err);
      }
    },
    [
      adminId,
      selectedTemplateId,
      selectedTemplateData,
      clinicId,
      reloadTemplates,
      loadPetTemplates,
    ],
  );

  // Load queries (user?.uid used when global manager to seed missing Firestore queries)
  useEffect(() => {
    loadQueries();
  }, [userData, user]);

  const loadQueries = async () => {
    if (!userData) return;

    setLoading(true);
    setError(null);

    try {
      const data = await queryRegistryService.getQueriesForUser(
        userData,
        user?.uid,
      );
      setQueries(data);
    } catch (err) {
      console.error("[QueryRegistry] Load error:", err);
      setError("Failed to load queries");
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(queries.map((q) => q.category).filter(Boolean))];
  }, [queries]);

  // IDs of queries that have dedicated editors or are deprecated (not shown in Query Registry)
  const HIDDEN_QUERY_IDS = [
    "symptom-checker-voice-prompts", // Edited via VoicePromptsEditor in Dashboard
    "voice-conversation-opening", // Legacy - replaced by symptom-checker-voice-prompts
    "voice-conversation-closing", // Legacy - replaced by symptom-checker-voice-prompts
  ];

  // Filter queries
  const filteredQueries = useMemo(() => {
    let filtered = queries;

    // Exclude queries with dedicated editors or deprecated queries
    filtered = filtered.filter(
      (q) => !HIDDEN_QUERY_IDS.some((id) => q.id?.startsWith(id)),
    );

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.featureName?.toLowerCase().includes(term) ||
          q.featureDescription?.toLowerCase().includes(term) ||
          q.id?.toLowerCase().includes(term),
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((q) => q.source === sourceFilter);
    }

    return filtered;
  }, [queries, searchTerm, categoryFilter, sourceFilter]);

  // Group by category
  const groupedQueries = useMemo(() => {
    const groups = {};
    filteredQueries.forEach((query) => {
      const cat = query.category || "uncategorized";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(query);
    });
    return groups;
  }, [filteredQueries]);

  // Helper: extract card ID from query ID (e.g. "chartmind-ddx-final" -> "ddx-final")
  const extractCardId = (queryId) => {
    if (!queryId || !queryId.startsWith("chartmind-")) return null;
    return queryId.replace(/^chartmind-/, "");
  };

  // Helper: check if a template has a P3 prompt for a given query
  const getTemplateP3Status = (queryId) => {
    if (!selectedTemplateData?.prompts) return null;
    const cardId = extractCardId(queryId);
    if (!cardId) return null;
    const prompt = selectedTemplateData.prompts[cardId];
    if (!prompt) return "none";
    if (prompt.enabled && prompt.prompt && prompt.prompt.trim().length > 0)
      return "active";
    return "empty";
  };

  // Handlers
  const handleEditQuery = (queryId) => {
    // Intercept: if chartmind-admin with no template selected, prompt to create one first
    if (isChartmindAdmin && adminId && !selectedTemplateId) {
      setPendingQueryIdForNewTemplate(queryId);
      setCreateTemplateSource("manage");
      setShowCreateDialog(true);
      return;
    }
    setSelectedQueryId(queryId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedQueryId(null);
  };

  const handleModalSave = async () => {
    loadQueries();
    // Reload template data if we were editing in template mode
    if (selectedTemplateId && adminId) {
      await reloadTemplates();
      // Re-select the same template to refresh its data
      const tpls = await chartmindAdminService.getTemplates(adminId);
      const refreshed = tpls.find((t) => t.id === selectedTemplateId);
      if (refreshed) setSelectedTemplateData(refreshed);
    }
    // Keep modal open on the same tab so user can continue editing
  };

  // New Query: create base query (metadata only; P1 prompt lives in Secret Manager / local file)
  const handleCreateNewQuery = async () => {
    const slug = newQueryForm.id
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
    if (!slug) {
      setNewQueryError(
        "Query ID is required (use lowercase letters, numbers, hyphens).",
      );
      return;
    }
    const existing = queries.some((q) => q.id === slug);
    if (existing) {
      setNewQueryError(`A query with ID "${slug}" already exists.`);
      return;
    }
    setNewQueryError(null);
    setCreatingQuery(true);
    try {
      await queryRegistryService.createQuery(
        {
          id: slug,
          category: newQueryForm.category,
          model: newQueryForm.model || DEFAULT_MODEL,
          maxTokens: newQueryForm.maxTokens || 4000,
          responseFormat: newQueryForm.responseFormat || "",
          contextProvided: newQueryForm.contextProvided || "",
          chainConfig: {
            chainMode: newQueryForm.chainMode || CHAIN_MODE.SEQUENTIAL,
          },
          featureName: newQueryForm.featureName || "",
          featureDescription: newQueryForm.featureDescription || "",
          // P1 prompt is NOT stored in Firestore; add via Secret Manager (llm-p1-{id}) or P1_PROMPTS_DIR
        },
        userData?.uid,
      );
      setCreatedQueryId(slug);
      await loadQueries();
    } catch (err) {
      console.error("[QueryRegistry] Create query failed:", err);
      setNewQueryError(err.message || "Failed to create query");
    } finally {
      setCreatingQuery(false);
    }
  };

  const handleCloseNewQueryDialog = () => {
    setNewQueryDialogOpen(false);
    setCreatedQueryId(null);
    setNewQueryError(null);
    setNewQueryForm({
      id: "",
      category: QUERY_CATEGORIES.CHARTMIND,
      model: DEFAULT_MODEL,
      maxTokens: 4000,
      responseFormat: "",
      contextProvided: "",
      chainMode: CHAIN_MODE.SEQUENTIAL,
      featureName: "",
      featureDescription: "",
    });
  };

  const handleCopyQueryId = async () => {
    if (!createdQueryId) return;
    try {
      await navigator.clipboard.writeText(createdQueryId);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  const handleCopyCodeSnippet = async () => {
    if (!createdQueryId) return;
    const snippet = `llmProviderService.callLLMWithQuery('${createdQueryId}', userInput, options)`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  // Chain position label
  const getChainPositionLabel = (position) => {
    const labels = { 1: "Global", 2: "Regional", 3: "Local" };
    return labels[position] || "Unknown";
  };

  // Geographic label
  const getGeographicLabel = (query) => {
    if (query.regions?.length > 0) {
      return query.regions.map((r) => r.replace(/_/g, " ")).join(", ");
    }
    if (query.localities?.length > 0) {
      return query.localities.map((l) => l.replace(/_/g, " ")).join(", ");
    }
    return "Global";
  };

  // Not a manager
  if (!isManager) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access Clinic ChartMind Management.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <DashboardPageHeader
        title="Clinic ChartMinad Management"
        subtitle={
          <Typography color="text.secondary">
            {managerLevel === "global"
              ? "Global Manager - You can edit all queries"
              : `${managerLevel?.charAt(0).toUpperCase()}${managerLevel?.slice(1)} Manager - ${scopeDescription}`}
          </Typography>
        }
        actions={
          <Box sx={{ display: "flex", gap: 2 }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={loadQueries} disabled={loading}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>

            {isGlobalManager ? (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setNewQueryDialogOpen(true)}
              >
                New Query
              </Button>
            ) : null}
          </Box>
        }
      />

      {/* New Query dialog (Global LLM Manager): creates base query with same access architecture — P1 prompt off Firestore */}
      <Dialog
        open={newQueryDialogOpen}
        onClose={handleCloseNewQueryDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {createdQueryId ? "Query created" : "New Query"}
        </DialogTitle>
        <DialogContent>
          {createdQueryId ? (
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Query <strong>{createdQueryId}</strong> was created. Add your
                Position 1 prompt via Secret Manager or local file, then use the
                code below in the app.
              </Alert>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Query ID (use this in the app)
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Code sx={{ mr: 1 }} />
                <Typography fontFamily="monospace">{createdQueryId}</Typography>
                <IconButton
                  size="small"
                  onClick={handleCopyQueryId}
                  title="Copy"
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Paper>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Use in application
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 1.5, mb: 2, bgcolor: "grey.50" }}
              >
                <Typography
                  component="pre"
                  fontFamily="monospace"
                  fontSize="0.85rem"
                  sx={{ wordBreak: "break-all" }}
                >
                  {`llmProviderService.callLLMWithQuery('${createdQueryId}', userInput, options)`}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopyCodeSnippet}
                  title="Copy snippet"
                  sx={{ mt: 0.5 }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Paper>
              <Typography variant="body2" color="text.secondary">
                <strong>Position 1 prompt:</strong> Not stored in Firestore. Add
                it via Google Cloud Secret Manager (secret name{" "}
                <code>llm-p1-{createdQueryId}</code>) or, for local dev, a file
                at <code>P1_PROMPTS_DIR/{createdQueryId}.txt</code>.
              </Typography>
            </Box>
          ) : (
            <>
              {newQueryError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {newQueryError}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Creates a new base query. The query ID is the code you use in
                the app to run this query. Position 1 prompt is added via Secret
                Manager or local file (not in Firestore).
              </Typography>
              <TextField
                fullWidth
                label="Query ID"
                placeholder="e.g. chartmind-my-feature or ehr-report-intent"
                value={newQueryForm.id}
                onChange={(e) =>
                  setNewQueryForm((f) => ({ ...f, id: e.target.value }))
                }
                helperText="Lowercase letters, numbers, hyphens only. This is the code used in the app."
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newQueryForm.category}
                  label="Category"
                  onChange={(e) =>
                    setNewQueryForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  <MenuItem value={QUERY_CATEGORIES.CHARTMIND}>
                    ChartMind
                  </MenuItem>
                  <MenuItem value={QUERY_CATEGORIES.SYMPTOM_CHECKER}>
                    Symptom Checker
                  </MenuItem>
                  <MenuItem value={QUERY_CATEGORIES.DSCR}>DSCR</MenuItem>
                  <MenuItem value={QUERY_CATEGORIES.VOICE_CONVERSATION}>
                    Voice
                  </MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Model"
                value={newQueryForm.model}
                onChange={(e) =>
                  setNewQueryForm((f) => ({ ...f, model: e.target.value }))
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Max tokens"
                value={newQueryForm.maxTokens}
                onChange={(e) =>
                  setNewQueryForm((f) => ({
                    ...f,
                    maxTokens: parseInt(e.target.value, 10) || 4000,
                  }))
                }
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chain mode</InputLabel>
                <Select
                  value={newQueryForm.chainMode}
                  label="Chain mode"
                  onChange={(e) =>
                    setNewQueryForm((f) => ({
                      ...f,
                      chainMode: e.target.value,
                    }))
                  }
                >
                  <MenuItem value={CHAIN_MODE.SEQUENTIAL}>
                    Sequential (P1 → P2 → P3)
                  </MenuItem>
                  <MenuItem value={CHAIN_MODE.SUBSTITUTIONARY}>
                    Substitutionary (highest only)
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Feature name (optional)"
                value={newQueryForm.featureName}
                onChange={(e) =>
                  setNewQueryForm((f) => ({
                    ...f,
                    featureName: e.target.value,
                  }))
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Feature description (optional)"
                value={newQueryForm.featureDescription}
                onChange={(e) =>
                  setNewQueryForm((f) => ({
                    ...f,
                    featureDescription: e.target.value,
                  }))
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {createdQueryId ? (
            <Button onClick={handleCloseNewQueryDialog}>Done</Button>
          ) : (
            <>
              <Button onClick={handleCloseNewQueryDialog}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleCreateNewQuery}
                disabled={creatingQuery}
              >
                {creatingQuery ? "Creating…" : "Create"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Permission Notice */}
      {managerLevel === "regional" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {`You can only edit Position-2 (Regional) queries for: ${userData?.scope?.regions?.map((r) => r.replace(/_/g, " ")).join(", ")}`}
        </Alert>
      )}

      {/* Linked Regional Template indicator for chartmind-admin */}
      {isChartmindAdmin && (
        <Paper
          elevation={0}
          sx={{
            ...contentCardSx,
            p: 2,
            mb: 3,
            bgcolor: linkedRegionalTemplate ? "primary.50" : "grey.50",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon
              fontSize="small"
              color={linkedRegionalTemplate ? "primary" : "disabled"}
            />
            <Typography variant="body2" fontWeight="medium">
              Regional Template:
            </Typography>
            {linkedRegionalTemplate ? (
              <Typography variant="body2" color="primary.main">
                {linkedRegionalTemplate.templateName} (by{" "}
                {linkedRegionalTemplate.managerName})
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No regional template linked. Use &quot;Create an
                affiliation&quot; to link one.
              </Typography>
            )}
          </Box>
          {linkedRegionalTemplate && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 3.5, display: "block" }}
            >
              Position 2 prompts from this regional template are applied to all
              your Patient Encounter Templates at execution time.
            </Typography>
          )}
        </Paper>
      )}

      {/* Filters - hidden when template is selected */}
      {!selectedTemplateId && (
        <Paper elevation={0} sx={{ ...contentCardSx, p: 2, mb: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300, flexGrow: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat.replace(/_/g, " ").toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                label="Source"
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="firestore">Firestore</MenuItem>
                <MenuItem value="hardcoded">Hardcoded</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary">
              {filteredQueries.length} of {queries.length} queries
            </Typography>
          </Box>
        </Paper>
      )}

      {/* MSI Template Selector - visible for chartmind-admin users */}
      {isChartmindAdmin && adminId && (
        <Paper elevation={0} sx={{ ...contentCardSx, p: 2, mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Creating a Patient Encounter Template (PET) automatically generates
            an invite code. A check-in template for a clinic is only created and
            linked when you use &quot;Create & Link&quot; with a clinic
            selected; otherwise you can link an existing check-in template later
            from the clinic cards below.
          </Alert>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" sx={{ mr: 1 }}>
              Encounter Template
            </Typography>
            <FormControl
              size="small"
              sx={{ minWidth: 280, flex: 1, maxWidth: 500 }}
            >
              <Select
                value={selectedTemplateId}
                displayEmpty
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={loadingTemplates}
                renderValue={(selected) => {
                  if (!selected) return "Global Queries (Default)";
                  const tpl = templates.find((t) => t.id === selected);
                  return tpl ? tpl.name : selected;
                }}
              >
                <MenuItem value="">Global Queries (Default)</MenuItem>
                {templates.map((tpl) => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                    {tpl.prompts && (
                      <Chip
                        label={`${Object.values(tpl.prompts).filter((p) => p.enabled !== false).length} prompts`}
                        size="small"
                        sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => {
                setCreateTemplateSource("button");
                setPendingQueryIdForNewTemplate(null);
                setShowCreateDialog(true);
              }}
            >
              Create Encounter Template
            </Button>
            {selectedTemplateId && (
              <Tooltip title="Delete this Patient Encounter Template">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {selectedTemplateData && (
            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Template: <strong>{selectedTemplateData.name}</strong>
              </Typography>
              {selectedTemplateData.inviteCode && (
                <>
                  <Chip
                    label={`Code: ${selectedTemplateData.inviteCode}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.75rem" }}
                  />
                  <Tooltip
                    title={copiedLink ? "Copied!" : "Copy shareable link"}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopy fontSize="small" />}
                      onClick={handleCopyTemplateLink}
                      sx={{ textTransform: "none", minWidth: 0 }}
                    >
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </Button>
                  </Tooltip>
                  <Tooltip title="Show QR Code for this Patient Encounter Template">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<QrCode2 fontSize="small" />}
                      onClick={() => setShowQRDialog(true)}
                      sx={{ textTransform: "none", minWidth: 0 }}
                    >
                      QR Code
                    </Button>
                  </Tooltip>
                </>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Create Patient Encounter Template Dialog (unified: used by both '+ Create Encounter Template' button and manage-intercept) */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setNewTemplateName("");
          setPendingQueryIdForNewTemplate(null);
          setCreateTemplateSource("button");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Patient Encounter Template</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            A <strong>Patient Encounter Template</strong> represents a single,
            unified approach to conducting patient encounters with ChartMind.
            Each template encompasses all 12 ChartMind queries, allowing you to
            customize the input that controls the final step for any or all
            queries—this adapts global best practice recommendations to your
            specific clinical environment, available resources, and protocols.
            Queries without customization use their global defaults.
          </Alert>
          {createTemplateSource === "manage" && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              To edit a Position 3 prompt, you first need to create a Patient
              Encounter Template. After creating it, the query editor will open
              so you can begin customizing.
            </Typography>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Template Name"
            placeholder="e.g. Kijabe Hospital MSI, Pediatrics Encounter Template..."
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTemplateName.trim())
                handleCreateTemplate();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateDialog(false);
              setNewTemplateName("");
              setPendingQueryIdForNewTemplate(null);
              setCreateTemplateSource("button");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTemplate}
            disabled={!newTemplateName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Delete Patient Encounter Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "
            <strong>{selectedTemplateData?.name}</strong>"? This will remove all
            prompts in this Patient Encounter Template. Users who have linked
            this template will no longer be able to use it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteTemplate}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={showQRDialog}
        onClose={() => setShowQRDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          <span>Patient Encounter Template QR Code</span>
          <IconButton
            aria-label="Close"
            onClick={() => setShowQRDialog(false)}
            sx={{ color: "#000", "&:hover": { bgcolor: "action.hover" } }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ overflowY: "auto" }}>
          {selectedTemplateData?.inviteCode && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {selectedTemplateData.name}
              </Typography>
              <Box
                ref={qrRef}
                sx={{
                  display: "inline-block",
                  p: 2,
                  bgcolor: "white",
                  borderRadius: 1,
                }}
              >
                <QRCodeSVG
                  value={getTemplateUrl(selectedTemplateData.inviteCode)}
                  size={200}
                  level="M"
                />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, wordBreak: "break-all", userSelect: "all" }}
              >
                {getTemplateUrl(selectedTemplateData.inviteCode)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
            px: 2,
            pb: 2,
          }}
        >
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrintQR}
            sx={{
              textTransform: "none",
              bgcolor: "#1b4584",
              "&:hover": { bgcolor: "#153a6b" },
            }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleCopyQR}
            sx={{
              textTransform: "none",
              bgcolor: "#1b4584",
              "&:hover": { bgcolor: "#153a6b" },
            }}
          >
            {copiedQR ? "Copied!" : "Copy QR Code"}
          </Button>
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleCopyTemplateLink}
            sx={{
              textTransform: "none",
              bgcolor: "#1b4584",
              "&:hover": { bgcolor: "#153a6b" },
            }}
          >
            {copiedLink ? "Copied!" : "Copy Link"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ════════ Check-in Process Section ════════ */}
      {clinicId && (
        <Box mb={4}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Assignment color="primary" />
              <Typography variant="h6">Check-in Process</Typography>
              <Chip
                label={filteredPetTemplates.length}
                size="small"
                sx={{ ml: 0.5 }}
              />
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => {
                setNewPetName("");
                setShowPetCreateDialog(true);
              }}
            >
              Create Template
            </Button>
          </Box>

          {petLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : petTemplates.length === 0 ? (
            /* No encounter template selected and no PETs at all */
            <Paper
              elevation={0}
              sx={{ ...contentCardSx, p: 4, textAlign: "center" }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No check-in templates yet. Create one to define check-in forms
                and intake conversations.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setNewPetName("");
                  setShowPetCreateDialog(true);
                }}
              >
                Create First Template
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredPetTemplates.map((checkInTemplate) => {
                const linkedEncounter = checkInTemplate.encounterTemplateRef
                  ? templates.find(
                      (t) =>
                        t.id ===
                        checkInTemplate.encounterTemplateRef?.templateId,
                    )
                  : null;
                const isLinkedToSelected =
                  selectedTemplateId &&
                  checkInTemplate.id === linkedCheckInTemplateId;
                return (
                  <Grid item xs={12} md={6} lg={4} key={checkInTemplate.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        border: isLinkedToSelected
                          ? "2px solid #1b4584"
                          : undefined,
                        borderLeft:
                          !isLinkedToSelected && checkInTemplate.isDefault
                            ? "4px solid"
                            : undefined,
                        borderLeftColor:
                          !isLinkedToSelected && checkInTemplate.isDefault
                            ? "primary.main"
                            : undefined,
                        boxShadow: isLinkedToSelected
                          ? "0 0 0 1px #1b4584"
                          : undefined,
                        "&:hover": {
                          boxShadow: isLinkedToSelected
                            ? "0 0 8px rgba(27,69,132,0.3)"
                            : 2,
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="start"
                          mb={1}
                        >
                          <Typography
                            variant="subtitle1"
                            fontWeight="medium"
                            noWrap
                            sx={{ flex: 1 }}
                          >
                            {checkInTemplate.name || "Unnamed Template"}
                          </Typography>
                          <Box display="flex" gap={0.5}>
                            {isLinkedToSelected && (
                              <Chip
                                label="Active"
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  bgcolor: "#1b4584",
                                  color: "white",
                                }}
                              />
                            )}
                            {checkInTemplate.isDefault && (
                              <Chip
                                label="Default"
                                size="small"
                                color="primary"
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            )}
                            {checkInTemplate.active === false && (
                              <Chip
                                label="Inactive"
                                size="small"
                                color="default"
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            )}
                          </Box>
                        </Box>

                        {checkInTemplate.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 1.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {checkInTemplate.description}
                          </Typography>
                        )}

                        {/* Linked Encounter Template indicator */}
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                          mb={1}
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {linkedEncounter ? (
                            <Tooltip
                              title={`Linked to Encounter Template: ${linkedEncounter.name}`}
                            >
                              <Chip
                                icon={
                                  <LinkIcon
                                    sx={{ fontSize: "14px !important" }}
                                  />
                                }
                                label={linkedEncounter.name}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 22, fontSize: "0.7rem" }}
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              icon={
                                <LinkOff sx={{ fontSize: "14px !important" }} />
                              }
                              label="Unlinked"
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                color: "text.secondary",
                              }}
                            />
                          )}
                        </Box>

                        <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                          {(checkInTemplate.specialties || [])
                            .slice(0, 2)
                            .map((s) => (
                              <Chip
                                key={s}
                                label={getSpecialtyLabel(s)}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                            ))}
                          {(checkInTemplate.specialties || []).length > 2 && (
                            <Chip
                              label={`+${checkInTemplate.specialties.length - 2}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          )}
                        </Box>

                        <Box
                          display="flex"
                          gap={1.5}
                          sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                        >
                          <Tooltip title="Form fields">
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <ListAlt sx={{ fontSize: 14 }} />
                              {(checkInTemplate.fields || []).length} fields
                            </Box>
                          </Tooltip>
                          <Tooltip
                            title={
                              checkInTemplate.conversationTemplateRef
                                ? "Conversation assigned"
                                : "No conversation"
                            }
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <ChatOutlined
                                sx={{
                                  fontSize: 14,
                                  color: checkInTemplate.conversationTemplateRef
                                    ? "info.main"
                                    : "text.disabled",
                                }}
                              />
                              {checkInTemplate.conversationTemplateRef ? (
                                <Typography variant="caption" color="info.main">
                                  Active
                                </Typography>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                >
                                  None
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                          <Tooltip
                            title={
                              checkInTemplate.medicationsReview === "full_cmr"
                                ? "Full CMR review required"
                                : checkInTemplate.medicationsReview ===
                                    "medications"
                                  ? "Medications review required"
                                  : "No medications review"
                            }
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <MedicationRounded
                                sx={{
                                  fontSize: 14,
                                  color:
                                    checkInTemplate.medicationsReview &&
                                    checkInTemplate.medicationsReview !== "none"
                                      ? "success.main"
                                      : "text.disabled",
                                }}
                              />
                              {checkInTemplate.medicationsReview ===
                              "full_cmr" ? (
                                <Typography
                                  variant="caption"
                                  color="success.main"
                                >
                                  Full CMR
                                </Typography>
                              ) : checkInTemplate.medicationsReview ===
                                "medications" ? (
                                <Typography
                                  variant="caption"
                                  color="success.main"
                                >
                                  Meds
                                </Typography>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                >
                                  No review
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        </Box>

                        {/* Quick toggle for medications review */}
                        <FormControl size="small" sx={{ mt: 1, minWidth: 180 }}>
                          <Select
                            value={checkInTemplate.medicationsReview || "none"}
                            onChange={(e) =>
                              handleToggleMedsReview(
                                checkInTemplate.id,
                                e.target.value,
                              )
                            }
                            variant="outlined"
                            sx={{
                              fontSize: "0.75rem",
                              height: 28,
                              "& .MuiSelect-select": {
                                py: 0.25,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              },
                            }}
                          >
                            <MenuItem value="none" sx={{ fontSize: "0.75rem" }}>
                              No meds review
                            </MenuItem>
                            <MenuItem
                              value="medications"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              Meds only
                            </MenuItem>
                            <MenuItem
                              value="full_cmr"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              Full CMR review
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </CardContent>

                      <Divider />

                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleManagePET(checkInTemplate)}
                        >
                          Manage
                        </Button>
                        {/* Assign button for non-active cards when an Encounter Template is selected */}
                        {selectedTemplateId && !isLinkedToSelected && (
                          <Button
                            size="small"
                            startIcon={<CheckCircle />}
                            onClick={() => handleAssignPET(checkInTemplate.id)}
                            sx={{ color: "#1b4584" }}
                          >
                            Assign
                          </Button>
                        )}
                        <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
                          {/* Unlink button (only when this PET is linked to the selected encounter template) */}
                          {isLinkedToSelected && (
                            <Tooltip title="Unlink from Encounter Template">
                              <IconButton
                                size="small"
                                onClick={handleUnlinkPET}
                              >
                                <LinkOff fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete template">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setShowPetDeleteConfirm(checkInTemplate.id)
                              }
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* PET Create Dialog (doubles as "Create & Link" when encounter template is selected) */}
      <Dialog
        open={showPetCreateDialog}
        onClose={() => setShowPetCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplateId
            ? "Create & Link Check-in Template"
            : "Create New Check-in Template"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            {selectedTemplateId ? (
              <>
                This will create a new check-in template and automatically link
                it to <strong>{selectedTemplateData?.name}</strong>.
              </>
            ) : (
              <>
                A check-in template defines the check-in form fields, welcome
                message, and optional intake conversation for a clinic. After
                creating it, you can configure all of these from the
                &quot;Manage&quot; button.
              </>
            )}
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label="Template Name"
            placeholder="e.g. Cardiology Clinic, Family Medicine Intake…"
            value={newPetName}
            onChange={(e) => setNewPetName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPetName.trim()) {
                selectedTemplateId
                  ? handleCreateAndLinkPET()
                  : handleCreatePET();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPetCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={
              selectedTemplateId ? handleCreateAndLinkPET : handleCreatePET
            }
            disabled={!newPetName.trim()}
          >
            {selectedTemplateId ? "Create & Link" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-in template delete confirmation */}
      <Dialog
        open={!!showPetDeleteConfirm}
        onClose={() => setShowPetDeleteConfirm(null)}
      >
        <DialogTitle>Delete Check-in Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;
            <strong>
              {petTemplates.find((p) => p.id === showPetDeleteConfirm)?.name}
            </strong>
            &quot;? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPetDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeletePET(showPetDeleteConfirm)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Link Existing PET Dialog */}
      <Dialog
        open={showLinkExistingDialog}
        onClose={() => setShowLinkExistingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Link Existing Check-in Template</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, mt: 1 }}
          >
            Select an unlinked check-in template to associate with &quot;
            <strong>{selectedTemplateData?.name}</strong>&quot;.
          </Typography>
          {unlinkedPetTemplates.length === 0 ? (
            <Alert severity="info">
              No unlinked check-in templates available.
            </Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {unlinkedPetTemplates.map((checkInTemplate) => (
                <Paper
                  key={checkInTemplate.id}
                  elevation={0}
                  sx={{
                    ...contentCardSx,
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => handleLinkExistingPET(checkInTemplate.id)}
                >
                  <Box>
                    <Typography variant="subtitle2">
                      {checkInTemplate.name || "Unnamed Template"}
                    </Typography>
                    <Box display="flex" gap={1} mt={0.5}>
                      {checkInTemplate.isDefault && (
                        <Chip
                          label="Default"
                          size="small"
                          color="primary"
                          sx={{ height: 18, fontSize: "0.65rem" }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {(checkInTemplate.fields || []).length} fields
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LinkIcon />}
                  >
                    Link
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLinkExistingDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* PET Management Modal */}
      <PETManagementModal
        open={petModalOpen}
        onClose={() => {
          setPetModalOpen(false);
          setPetModalData(null);
        }}
        clinicId={clinicId}
        templateData={petModalData}
        onSaved={handlePetSaved}
        isCreateMode={petCreateMode}
        adminId={adminId}
      />

      <Divider sx={{ mb: 3 }} />

      {/* Query Cards - always visible (template-aware when a template is selected) */}
      {!loading && !error && (
        <>
          {Object.entries(groupedQueries).map(([category, categoryQueries]) => (
            <Box key={category} mb={4}>
              <Typography
                variant="h6"
                sx={{ mb: 2, textTransform: "capitalize" }}
              >
                {category.replace(/_/g, " ")}
                <Chip
                  label={categoryQueries.length}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>

              <Grid container spacing={3}>
                {categoryQueries.map((query) => (
                  <Grid item xs={12} md={6} lg={4} key={query.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        "&:hover": {
                          boxShadow: 2,
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="start"
                          mb={1}
                        >
                          <Typography variant="subtitle1" fontWeight="medium">
                            {query.featureName}
                          </Typography>
                          <Box display="flex" gap={0.5}>
                            {query.isStaticContent && (
                              <Tooltip title="Static content - used verbatim, not processed by LLM">
                                <Chip
                                  label="Static"
                                  size="small"
                                  color="info"
                                  sx={{ height: 20, fontSize: "0.7rem" }}
                                />
                              </Tooltip>
                            )}
                            {query.source === "hardcoded" && (
                              <Tooltip title="Using hardcoded fallback">
                                <Chip
                                  label="H"
                                  size="small"
                                  color="warning"
                                  sx={{ minWidth: 24, height: 20 }}
                                />
                              </Tooltip>
                            )}
                            {/* Template P3 status indicator */}
                            {selectedTemplateId &&
                              (() => {
                                const status = getTemplateP3Status(query.id);
                                if (status === "active")
                                  return (
                                    <Tooltip title="Template has an active P3 prompt for this query">
                                      <Chip
                                        label="P3"
                                        size="small"
                                        color="success"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.7rem",
                                          fontWeight: "bold",
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                if (status === "empty" || status === "none")
                                  return (
                                    <Tooltip title="No template P3 prompt configured">
                                      <Chip
                                        label="P3"
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.7rem",
                                          bgcolor: "grey.300",
                                          color: "grey.600",
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                return null;
                              })()}
                          </Box>
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {query.featureDescription}
                        </Typography>

                        {/* Metadata chips */}
                        <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                          <Chip
                            label={query.model || "gpt-4-turbo"}
                            size="small"
                            variant="outlined"
                            icon={<Code fontSize="small" />}
                          />
                          <Chip
                            label={`v${query.currentVersion || 1}`}
                            size="small"
                            variant="outlined"
                          />

                          {query.chainConfig?.isPartOfChain && (
                            <Chip
                              icon={<LinkIcon fontSize="small" />}
                              label={`P${query.chainConfig.chainPosition}: ${getChainPositionLabel(query.chainConfig.chainPosition)}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}

                          {!query.chainConfig?.isPartOfChain && (
                            <Chip
                              label="Standalone"
                              size="small"
                              variant="outlined"
                            />
                          )}

                          {/* Chain mode indicator */}
                          {query.id?.startsWith("chartmind-") && (
                            <Tooltip
                              title={
                                query.chainMode === CHAIN_MODE.SUBSTITUTIONARY
                                  ? "Substitutionary: highest position prompt runs alone"
                                  : "Sequential: each position refines the previous output"
                              }
                            >
                              <Chip
                                icon={
                                  query.chainMode ===
                                  CHAIN_MODE.SUBSTITUTIONARY ? (
                                    <SwapHoriz sx={{ fontSize: 14 }} />
                                  ) : (
                                    <LinkIcon sx={{ fontSize: 14 }} />
                                  )
                                }
                                label={
                                  query.chainMode === CHAIN_MODE.SUBSTITUTIONARY
                                    ? "Subst."
                                    : "Seq."
                                }
                                size="small"
                                variant="outlined"
                                color={
                                  query.chainMode === CHAIN_MODE.SUBSTITUTIONARY
                                    ? "warning"
                                    : "info"
                                }
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                            </Tooltip>
                          )}
                        </Box>

                        {/* Stats */}
                        {query.stats && (
                          <Box
                            display="flex"
                            gap={2}
                            sx={{
                              fontSize: "0.75rem",
                              color: "text.secondary",
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <TrendingUp sx={{ fontSize: 14 }} />
                              {query.stats.totalCalls || 0} calls
                            </Box>
                            {query.stats.avgCost > 0 && (
                              <Box>${query.stats.avgCost.toFixed(4)} avg</Box>
                            )}
                          </Box>
                        )}
                      </CardContent>

                      <Divider />

                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditQuery(query.id)}
                        >
                          Manage
                        </Button>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: "auto" }}
                        >
                          {query.id}
                        </Typography>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}

          {/* Empty state */}
          {filteredQueries.length === 0 && (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                No queries found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchTerm ||
                categoryFilter !== "all" ||
                sourceFilter !== "all"
                  ? "Try adjusting your filters"
                  : managerLevel !== "global"
                    ? "No queries available for your permission level"
                    : "No queries have been created yet"}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Management Modal */}
      <QueryManagementModal
        open={modalOpen}
        onClose={handleModalClose}
        queryId={selectedQueryId}
        onSave={handleModalSave}
        templateAdminId={selectedTemplateId ? adminId : undefined}
        templateId={selectedTemplateId || undefined}
        templateData={selectedTemplateId ? selectedTemplateData : undefined}
      />
    </Container>
  );
};

export default QueryRegistry;
