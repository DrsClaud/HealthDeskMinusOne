/**
 * PETManagementModal - Full-featured modal for managing Patient Encounter Templates
 *
 * Opened from the Query Registry's PET section.  Provides five tabs:
 *   1. Form Fields   – drag-and-drop field editor with PatientDataSidebar
 *   2. Welcome Message – multiline text editor with reset-to-default
 *   3. Conversation  – browse system defaults, CRUD custom templates, assign/remove
 *   4. Settings      – name, description, specialties, active/default toggles
 *   5. Patient ID    – require photo ID and/or insurance card capture during check-in
 *
 * Reuses checkInFormService (CRUD) and conversationTemplateService from
 * @healthdesk/shared-services, so no data migration is needed.
 */

import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Paper,
  TextField,
  Chip,
  List,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Slider,
  Autocomplete,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { contentCardSx } from '../../styles/standaloneLayoutTokens';
import {
  Save,
  Add,
  Edit,
  Delete,
  DragIndicator,
  ArrowUpward,
  ArrowDownward,
  Star,
  StarBorder,
  Message,
  ChatOutlined,
  RestartAlt,
  Close,
  CheckBoxOutlineBlank,
  CheckBox as CheckBoxIcon,
  Link as LinkIcon,
  LinkOff,
  MedicationRounded,
  PlayArrow,
  Badge,
  CreditCard,
} from '@mui/icons-material';
import { AuthContext } from '@healthdesk/shared-hooks';
import {
  updateCheckInTemplate,
  generateFieldId,
  reorderCheckInFields,
  setDefaultTemplate as setDefaultTemplateSvc,
  AAMC_SPECIALTIES,
  COMMON_CLINIC_SPECIALTIES,
  getSpecialtyLabel,
  getAllDefaultConversationTemplates,
  getDefaultConversationTemplateById,
  getConversationTemplates,
  createConversationTemplate,
  updateConversationTemplate,
  deleteConversationTemplate,
} from '@healthdesk/shared-services';
import PatientDataSidebar from '../../features/chartmind/components/supervision/PatientDataSidebar';
import CheckInConversation from '../../pages/checkin/CheckInConversation';

const DEFAULT_WELCOME_MESSAGE = `Welcome to our clinic!

Please review and confirm your information below. This helps us provide you with the best possible care.

If any information is incorrect, please update it before submitting.`;

const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

const icon = <CheckBoxOutlineBlank fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

/* ────────── tiny sub-component: single form field row ────────── */
const FormFieldRow = ({ field, index, total, onMoveUp, onMoveDown, onToggleRequired, onEdit, onDelete }) => {
  const isPD = field.type === 'patientData';
  return (
    <Paper
      elevation={0}
      sx={{
        ...contentCardSx,
        p: 1.5, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: isPD ? 'primary.50' : 'background.paper',
        borderColor: isPD ? 'primary.200' : 'divider',
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <IconButton size="small" onClick={() => onMoveUp(index)} disabled={index === 0}><ArrowUpward fontSize="small" /></IconButton>
        <DragIndicator sx={{ color: 'text.secondary', fontSize: 18 }} />
        <IconButton size="small" onClick={() => onMoveDown(index)} disabled={index === total - 1}><ArrowDownward fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <Typography variant="body2" fontWeight="medium" noWrap>{field.label}</Typography>
          <Chip label={isPD ? 'Patient Data' : 'Custom'} size="small" color={isPD ? 'primary' : 'default'} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
          {field.required && <Chip label="Req" size="small" color="error" sx={{ height: 18, fontSize: '0.6rem' }} />}
        </Box>
        <Typography variant="caption" color="text.secondary">{isPD ? field.dataPath : `Type: ${field.fieldType}`}</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        <Tooltip title={field.required ? 'Make optional' : 'Make required'}>
          <IconButton size="small" onClick={() => onToggleRequired(index)} color={field.required ? 'error' : 'default'}>
            {field.required ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
        {!isPD && (
          <Tooltip title="Edit field"><IconButton size="small" onClick={() => onEdit(index)}><Edit fontSize="small" /></IconButton></Tooltip>
        )}
        <Tooltip title="Remove"><IconButton size="small" onClick={() => onDelete(index)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
      </Box>
    </Paper>
  );
};

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function PETManagementModal({
  open,
  onClose,
  clinicId,
  templateData,      // existing PET object (null for create mode)
  onSaved,           // callback after successful save
  isCreateMode = false,
  adminId: adminIdProp = null, // chartmindAdmins doc ID (NOT user.uid) — needed for conversation template CRUD
}) {
  const { user, userData } = useContext(AuthContext);

  // ── Active tab ──
  const [tab, setTab] = useState(0);

  // ── Core PET fields ──
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [fields, setFields] = useState([]);
  const [conversationTemplateRef, setConversationTemplateRef] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [medicationsReview, setMedicationsReview] = useState('none'); // 'none' | 'medications' | 'full_cmr'
  const [requirePhotoID, setRequirePhotoID] = useState(false);
  const [requireInsuranceCard, setRequireInsuranceCard] = useState(false);

  // ── Dirty tracking ──
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ── Drag-and-drop ──
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Custom field dialog state ──
  const [cfOpen, setCfOpen] = useState(false);
  const [cfEditIndex, setCfEditIndex] = useState(null);
  const [cfLabel, setCfLabel] = useState('');
  const [cfType, setCfType] = useState('text');
  const [cfOptions, setCfOptions] = useState('');
  const [cfRequired, setCfRequired] = useState(false);
  const [cfPlaceholder, setCfPlaceholder] = useState('');

  // ── Conversation template state ──
  const [convoDialogOpen, setConvoDialogOpen] = useState(false);
  const [convoDialogTab, setConvoDialogTab] = useState(0);
  const [customConvoTemplates, setCustomConvoTemplates] = useState([]);
  const [customConvoLoading, setCustomConvoLoading] = useState(false);
  const [convoEditOpen, setConvoEditOpen] = useState(false);
  const [editingConvo, setEditingConvo] = useState(null);
  const [ceditName, setCeditName] = useState('');
  const [ceditTitle, setCeditTitle] = useState('');
  const [ceditGoals, setCeditGoals] = useState('');
  const [ceditMaxQ, setCeditMaxQ] = useState(10);
  const [ceditBasedOn, setCeditBasedOn] = useState(null);

  // ── Conversation preview ──
  const [previewOpen, setPreviewOpen] = useState(false);

  /* ── Initialise from templateData whenever modal (re)opens ── */
  useEffect(() => {
    if (!open) return;
    if (templateData) {
      setTemplateName(templateData.name || '');
      setTemplateDescription(templateData.description || '');
      setWelcomeMessage(templateData.welcomeMessage || DEFAULT_WELCOME_MESSAGE);
      setFields(templateData.fields || []);
      setConversationTemplateRef(templateData.conversationTemplateRef || null);
      setSpecialties(templateData.specialties || []);
      setIsDefault(templateData.isDefault || false);
      setIsActive(templateData.active !== false);
      setMedicationsReview(templateData.medicationsReview || 'none');
      setRequirePhotoID(templateData.requirePhotoID || false);
      setRequireInsuranceCard(templateData.requireInsuranceCard || false);
    } else {
      setTemplateName('');
      setTemplateDescription('');
      setWelcomeMessage(DEFAULT_WELCOME_MESSAGE);
      setFields([]);
      setConversationTemplateRef(null);
      setSpecialties([]);
      setIsDefault(false);
      setIsActive(true);
      setMedicationsReview('none');
      setRequirePhotoID(false);
      setRequireInsuranceCard(false);
    }
    setHasChanges(false);
    setError(null);
    setSuccess(null);
    setTab(isCreateMode ? 3 : 0); // start on Settings tab when creating
  }, [open, templateData, isCreateMode]);

  /* ── Load custom conversation templates when that tab is active ── */
  const loadCustomConvos = useCallback(async () => {
    if (!adminIdProp) return;
    setCustomConvoLoading(true);
    try {
      const t = await getConversationTemplates(adminIdProp);
      setCustomConvoTemplates(t);
    } catch (e) {
      console.error('[PETModal] load convo templates:', e);
    } finally {
      setCustomConvoLoading(false);
    }
  }, [adminIdProp]);

  /* ── Resolve displayed conversation template ── */
  const resolvedConvo = useMemo(() => {
    if (!conversationTemplateRef) return null;
    if (conversationTemplateRef.source === 'system') {
      return getDefaultConversationTemplateById(conversationTemplateRef.templateId);
    }
    if (conversationTemplateRef.source === 'custom') {
      return customConvoTemplates.find(t => t.id === conversationTemplateRef.templateId) || null;
    }
    return null;
  }, [conversationTemplateRef, customConvoTemplates]);

  /* ────────── SAVE ────────── */
  const handleSave = async () => {
    if (!clinicId || (!templateData && !isCreateMode)) return;
    if (!templateName.trim()) { setError('Template name is required'); return; }

    setSaving(true);
    setError(null);
    try {
      await updateCheckInTemplate(clinicId, templateData.id, {
        name: templateName.trim(),
        description: templateDescription.trim(),
        welcomeMessage,
        fields,
        conversationTemplateRef,
        specialties,
        active: isActive,
        medicationsReview,
        requirePhotoID,
        requireInsuranceCard,
      });

      if (isDefault) {
        await setDefaultTemplateSvc(clinicId, templateData.id);
      }

      setSuccess('Saved');
      setHasChanges(false);
      if (onSaved) onSaved();
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      console.error('[PETModal] save error:', e);
      setError('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ────────── Field helpers ────────── */
  const markDirty = () => setHasChanges(true);

  const handleMoveUp = (i) => { if (i > 0) { setFields(reorderCheckInFields(fields, i, i - 1)); markDirty(); } };
  const handleMoveDown = (i) => { if (i < fields.length - 1) { setFields(reorderCheckInFields(fields, i, i + 1)); markDirty(); } };
  const handleToggleReq = (i) => { const f = [...fields]; f[i] = { ...f[i], required: !f[i].required }; setFields(f); markDirty(); };
  const handleDeleteField = (i) => { setFields(fields.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx }))); markDirty(); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (fields.some(f => f.type === 'patientData' && f.dataPath === d.path)) return;
      setFields([...fields, {
        id: generateFieldId(), type: 'patientData', dataPath: d.path,
        label: d.label, dataType: d.type, description: d.description,
        required: false, order: fields.length,
      }]);
      markDirty();
    } catch (err) { console.error('[PETModal] drop error:', err); }
  };

  /* ── custom field dialog ── */
  const openCF = (idx = null) => {
    if (idx !== null) {
      const f = fields[idx];
      setCfEditIndex(idx); setCfLabel(f.label || ''); setCfType(f.fieldType || 'text');
      setCfOptions(f.options?.join('\n') || ''); setCfRequired(f.required || false);
      setCfPlaceholder(f.placeholder || '');
    } else {
      setCfEditIndex(null); setCfLabel(''); setCfType('text');
      setCfOptions(''); setCfRequired(false); setCfPlaceholder('');
    }
    setCfOpen(true);
  };
  const saveCF = () => {
    if (!cfLabel.trim()) return;
    const fd = {
      id: cfEditIndex !== null ? fields[cfEditIndex].id : generateFieldId(),
      type: 'custom', fieldType: cfType, label: cfLabel.trim(),
      options: cfType === 'dropdown' ? cfOptions.split('\n').filter(o => o.trim()).map(o => o.trim()) : null,
      required: cfRequired, placeholder: cfPlaceholder.trim() || null,
      order: cfEditIndex !== null ? fields[cfEditIndex].order : fields.length,
    };
    if (cfEditIndex !== null) { const nf = [...fields]; nf[cfEditIndex] = fd; setFields(nf); }
    else { setFields([...fields, fd]); }
    setCfOpen(false); markDirty();
  };

  /* ────────── Conversation handlers ────────── */
  const assignConvo = (source, templateId, adminId = null) => {
    setConversationTemplateRef({ source, templateId, adminId }); markDirty(); setConvoDialogOpen(false);
  };
  const removeConvo = () => { setConversationTemplateRef(null); markDirty(); };
  const openConvoDialog = () => { setConvoDialogOpen(true); loadCustomConvos(); };
  const cloneDefault = (d) => {
    setEditingConvo(null); setCeditName(`${d.title} (Custom)`); setCeditTitle(d.title);
    setCeditGoals(d.goals); setCeditMaxQ(d.maxQuestions || 10); setCeditBasedOn(d.id);
    setConvoEditOpen(true);
  };
  const editCustomConvo = (t) => {
    setEditingConvo(t); setCeditName(t.name || ''); setCeditTitle(t.title || '');
    setCeditGoals(t.goals || ''); setCeditMaxQ(t.maxQuestions || 10); setCeditBasedOn(t.basedOn || null);
    setConvoEditOpen(true);
  };
  const createNewConvo = () => {
    setEditingConvo(null); setCeditName(''); setCeditTitle(''); setCeditGoals('');
    setCeditMaxQ(10); setCeditBasedOn(null); setConvoEditOpen(true);
  };
  const saveConvo = async () => {
    if (!ceditName.trim() || !ceditGoals.trim()) { setError('Name and goals required'); return; }
    try {
      const data = { name: ceditName, title: ceditTitle || ceditName, goals: ceditGoals, maxQuestions: ceditMaxQ, basedOn: ceditBasedOn };
      if (editingConvo) { await updateConversationTemplate(adminIdProp, editingConvo.id, data); }
      else { const nid = await createConversationTemplate(adminIdProp, data); assignConvo('custom', nid, adminIdProp); }
      setConvoEditOpen(false); await loadCustomConvos();
    } catch (e) { setError('Failed to save conversation: ' + e.message); }
  };
  const deleteCustomConvo = async (id) => {
    if (!window.confirm('Delete this conversation template?')) return;
    try {
      await deleteConversationTemplate(adminIdProp, id);
      if (conversationTemplateRef?.source === 'custom' && conversationTemplateRef?.templateId === id) removeConvo();
      await loadCustomConvos();
    } catch (e) { setError('Failed to delete: ' + e.message); }
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '85vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Box>
            <Typography variant="h6" component="span">
              {isCreateMode ? 'Create Patient Encounter Template' : (templateName || 'Patient Encounter Template')}
            </Typography>
            {templateData?.isDefault && <Chip label="Default" size="small" color="primary" sx={{ ml: 1, height: 20 }} />}
          </Box>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </DialogTitle>

        {/* Tab bar */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" scrollButtons="auto">
          <Tab label="Form Fields" />
          <Tab label="Welcome Message" />
          <Tab label="Conversation" />
          <Tab label="Settings" />
          <Tab label="Patient ID" />
        </Tabs>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {error && <Alert severity="error" sx={{ mx: 3, mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mx: 3, mt: 1 }} onClose={() => setSuccess(null)}>{success}</Alert>}

          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {/* ───────── TAB 0: Form Fields ───────── */}
            {tab === 0 && (
              <Box sx={{ display: 'flex', gap: 2, minHeight: 400 }}>
                <Paper elevation={0} sx={{ ...contentCardSx, width: 280, flexShrink: 0, overflow: 'auto', maxHeight: '60vh' }}>
                  <PatientDataSidebar />
                </Paper>
                <Box
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={handleDrop}
                  sx={{
                    flex: 1, border: '2px dashed', borderColor: isDragOver ? 'primary.main' : 'divider',
                    borderRadius: 2, p: 2, bgcolor: isDragOver ? 'primary.50' : 'background.paper',
                    transition: 'all 0.2s', minHeight: 300,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>Form Fields ({fields.length})</Typography>
                  {fields.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <DragIndicator sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                      <Typography variant="body2">Drag patient data fields here</Typography>
                      <Button variant="outlined" size="small" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => openCF()}>Add Custom Field</Button>
                    </Box>
                  ) : (
                    <>
                      {fields.map((f, i) => (
                        <FormFieldRow key={f.id} field={f} index={i} total={fields.length}
                          onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
                          onToggleRequired={handleToggleReq} onEdit={openCF} onDelete={handleDeleteField}
                        />
                      ))}
                      <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => openCF()} fullWidth sx={{ mt: 1 }}>
                        Add Custom Field
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* ───────── TAB 1: Welcome Message ───────── */}
            {tab === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Customise the message patients see when they begin the check-in process.
                </Typography>
                <TextField
                  fullWidth multiline rows={6} value={welcomeMessage}
                  onChange={(e) => { setWelcomeMessage(e.target.value); markDirty(); }}
                  placeholder="Enter a welcome message…"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button size="small" startIcon={<RestartAlt />}
                    disabled={welcomeMessage === DEFAULT_WELCOME_MESSAGE}
                    onClick={() => { setWelcomeMessage(DEFAULT_WELCOME_MESSAGE); markDirty(); }}>
                    Reset to Default
                  </Button>
                </Box>
              </Box>
            )}

            {/* ───────── TAB 2: Conversation ───────── */}
            {tab === 2 && (
              <Box>
                {/* ── Built-in Medications / CMR Review ── */}
                <Paper elevation={0} sx={{ ...contentCardSx, p: 2, mb: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <MedicationRounded color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Medications / CMR Review During Check-in
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    This built-in voice conversation guides the patient through reviewing and updating
                    their medical records. It runs <strong>in addition to</strong> any custom intake
                    conversation defined below and does not need to be authored — it is provided automatically.
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Medications Review</InputLabel>
                    <Select
                      value={medicationsReview}
                      onChange={(e) => { setMedicationsReview(e.target.value); markDirty(); }}
                      label="Medications Review"
                    >
                      <MenuItem value="none">None — no review during check-in</MenuItem>
                      <MenuItem value="medications">Medications only — patient reviews their medications list</MenuItem>
                      <MenuItem value="full_cmr">Full CMR review — medications, allergies, past medical/surgical history</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>

                <Divider sx={{ mb: 2 }}>
                  <Chip label="Intake Conversation Prompt" size="small" />
                </Divider>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Assign an AI-driven intake conversation that patients complete after filling out their check-in form.
                  The conversation results appear as a Card in ChartMind for the provider.
                </Typography>

                {conversationTemplateRef && resolvedConvo ? (
                  <Paper elevation={0} sx={{ ...contentCardSx, p: 2, mb: 2, bgcolor: 'info.50', borderColor: 'info.main' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{resolvedConvo.title || resolvedConvo.name}</Typography>
                        <Chip label={conversationTemplateRef.source === 'system' ? 'System Default' : 'Custom'} size="small" variant="outlined" sx={{ mt: 0.5, mb: 1, height: 20, fontSize: '0.6rem' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {resolvedConvo.goals}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Max questions: {resolvedConvo.maxQuestions || 10}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexShrink: 0, alignSelf: 'flex-start' }}>
                        <Button size="small" variant="outlined" onClick={openConvoDialog}>Change</Button>
                        <Button size="small" color="error" onClick={removeConvo}>Remove</Button>
                      </Box>
                    </Box>
                  </Paper>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No conversation assigned. Patients will complete the check-in form only.
                    </Typography>
                    <Button variant="outlined" color="info" startIcon={<ChatOutlined />} onClick={openConvoDialog}>
                      Choose Conversation
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* ───────── TAB 3: Settings ───────── */}
            {tab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                {/* Linked Encounter Template (read-only) */}
                {templateData?.encounterTemplateRef ? (
                  <Paper elevation={0} sx={{ ...contentCardSx, p: 2, bgcolor: 'success.50', borderColor: 'success.200' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinkIcon fontSize="small" color="success" />
                      <Typography variant="body2" fontWeight="medium">
                        Linked to Encounter Template
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 3.5 }}>
                      Admin ID: {templateData.encounterTemplateRef.adminId}
                      {' · '}Template ID: {templateData.encounterTemplateRef.templateId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3.5 }}>
                      Manage the link from the Encounter Template dropdown on the Query Registry page.
                    </Typography>
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ ...contentCardSx, p: 2, bgcolor: 'grey.50' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinkOff fontSize="small" color="disabled" />
                      <Typography variant="body2" color="text.secondary">
                        Not linked to an Encounter Template. You can link it from the Query Registry page.
                      </Typography>
                    </Box>
                  </Paper>
                )}

                <TextField label="Template Name" fullWidth required value={templateName}
                  onChange={(e) => { setTemplateName(e.target.value); markDirty(); }}
                  placeholder="e.g. Cardiology Clinic"
                />
                <TextField label="Description" fullWidth multiline rows={2} value={templateDescription}
                  onChange={(e) => { setTemplateDescription(e.target.value); markDirty(); }}
                  placeholder="Optional description…"
                />
                <Autocomplete
                  multiple disableCloseOnSelect
                  options={AAMC_SPECIALTIES.map(s => s.value)}
                  value={specialties}
                  onChange={(_, v) => { setSpecialties(v); markDirty(); }}
                  getOptionLabel={(opt) => getSpecialtyLabel(opt)}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}><Checkbox icon={icon} checkedIcon={checkedIcon} checked={selected} sx={{ mr: 1 }} />{getSpecialtyLabel(option)}</li>
                  )}
                  renderInput={(params) => <TextField {...params} label="Specialties" placeholder="Search specialties…" />}
                />
                {/* Quick-add common specialties */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {COMMON_CLINIC_SPECIALTIES.filter(s => !specialties.includes(s)).slice(0, 8).map(s => (
                    <Chip key={s} label={getSpecialtyLabel(s)} size="small" variant="outlined"
                      onClick={() => { setSpecialties([...specialties, s]); markDirty(); }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
                <Divider />
                <FormControlLabel control={<Switch checked={isActive} onChange={(e) => { setIsActive(e.target.checked); markDirty(); }} />}
                  label="Active (patients can use this template for check-in)"
                />
                <FormControlLabel control={<Switch checked={isDefault} onChange={(e) => { setIsDefault(e.target.checked); markDirty(); }} />}
                  label="Set as default template for this clinic"
                />

              </Box>
            )}

            {/* ───────── TAB 4: Patient ID ───────── */}
            {tab === 4 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
                <Typography variant="body2" color="text.secondary">
                  Configure what identification documents patients must provide during check-in.
                  Captured images and extracted information are stored with the visit and displayed
                  to providers as a ChartMind card.
                </Typography>

                <Paper elevation={0} sx={{ ...contentCardSx, p: 2, bgcolor: requirePhotoID ? 'info.50' : 'grey.50', borderColor: requirePhotoID ? 'info.main' : 'grey.300' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={requirePhotoID}
                        onChange={(e) => { setRequirePhotoID(e.target.checked); markDirty(); }}
                        color="info"
                      />
                    }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Badge fontSize="small" color={requirePhotoID ? 'info' : 'action'} />
                          <Typography variant="body1" fontWeight={500}>Require Photo ID</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Patients must photograph their government-issued ID before completing check-in.
                          Name and date of birth are extracted automatically and pre-fill the form.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', ml: 0, width: '100%' }}
                  />
                </Paper>

                <Paper elevation={0} sx={{ ...contentCardSx, p: 2, bgcolor: requireInsuranceCard ? 'info.50' : 'grey.50', borderColor: requireInsuranceCard ? 'info.main' : 'grey.300' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={requireInsuranceCard}
                        onChange={(e) => { setRequireInsuranceCard(e.target.checked); markDirty(); }}
                        color="info"
                      />
                    }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard fontSize="small" color={requireInsuranceCard ? 'info' : 'action'} />
                          <Typography variant="body1" fontWeight={500}>Require Insurance Card</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Patients must photograph their insurance card during check-in.
                          Plan name, member ID, and group number are extracted automatically.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', ml: 0, width: '100%' }}
                  />
                </Paper>

                {(requirePhotoID || requireInsuranceCard) && (
                  <Alert severity="info">
                    When enabled, the ID/insurance capture step appears <strong>before</strong> the check-in form.
                    Extracted data is stored with the visit and displayed to the provider in ChartMind.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Tooltip title={resolvedConvo ? 'Experience the conversation as a patient would' : 'Assign a conversation template first'}>
            <span>
              <Button
                startIcon={<PlayArrow />}
                onClick={() => setPreviewOpen(true)}
                disabled={!resolvedConvo}
              >
                Preview Conversation
              </Button>
            </span>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={saving || !hasChanges}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Conversation Preview Dialog ── */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'grey.100' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <PlayArrow color="primary" />
            <Typography variant="h6">Conversation Preview (Admin)</Typography>
            <Chip label="Preview Mode" size="small" color="warning" variant="outlined" />
          </Box>
          <Button variant="outlined" onClick={() => setPreviewOpen(false)} startIcon={<Close />}>
            Close Preview
          </Button>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', py: 4, px: 2 }}>
          {previewOpen && resolvedConvo && (
            <CheckInConversation
              conversationTemplate={resolvedConvo}
              patientCMR={null}
              onComplete={() => setPreviewOpen(false)}
              onSkip={() => setPreviewOpen(false)}
            />
          )}
        </Box>
      </Dialog>

      {/* ── Custom Field Sub-Dialog ── */}
      <Dialog open={cfOpen} onClose={() => setCfOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{cfEditIndex !== null ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Field Label" value={cfLabel} onChange={(e) => setCfLabel(e.target.value)} fullWidth required placeholder="e.g. Insurance Provider" />
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select value={cfType} onChange={(e) => setCfType(e.target.value)} label="Field Type">
                {CUSTOM_FIELD_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            {cfType === 'dropdown' && (
              <TextField label="Options (one per line)" value={cfOptions} onChange={(e) => setCfOptions(e.target.value)} fullWidth multiline rows={4} required placeholder={"Option 1\nOption 2\nOption 3"} />
            )}
            <TextField label="Placeholder (optional)" value={cfPlaceholder} onChange={(e) => setCfPlaceholder(e.target.value)} fullWidth />
            <FormControlLabel control={<Switch checked={cfRequired} onChange={(e) => setCfRequired(e.target.checked)} />} label="Required field" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCF} disabled={!cfLabel.trim()}>{cfEditIndex !== null ? 'Update' : 'Add Field'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Conversation Browser Sub-Dialog ── */}
      <Dialog open={convoDialogOpen} onClose={() => setConvoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatOutlined color="info" /> Choose Intake Conversation
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
            <Button size="small" variant={convoDialogTab === 0 ? 'contained' : 'text'} onClick={() => setConvoDialogTab(0)}>
              System Defaults ({getAllDefaultConversationTemplates().length})
            </Button>
            <Button size="small" variant={convoDialogTab === 1 ? 'contained' : 'text'} onClick={() => setConvoDialogTab(1)}>
              My Templates ({customConvoTemplates.length})
            </Button>
          </Box>

          {convoDialogTab === 0 && (
            <List disablePadding>
              {getAllDefaultConversationTemplates().map((t) => (
                <Paper key={t.id} elevation={0} sx={{ ...contentCardSx, mb: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{t.title}</Typography>
                        <Chip label={getSpecialtyLabel(t.specialty)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.goals}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Button size="small" variant="contained" color="info" onClick={() => assignConvo('system', t.id)}>Use</Button>
                      <Button size="small" variant="outlined" onClick={() => cloneDefault(t)}>Clone & Edit</Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          )}

          {convoDialogTab === 1 && (
            <>
              {customConvoLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : customConvoTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No custom conversation templates yet.</Typography>
                  <Button variant="outlined" startIcon={<Add />} onClick={createNewConvo}>Create New</Button>
                </Box>
              ) : (
                <List disablePadding>
                  {customConvoTemplates.map((t) => (
                    <Paper key={t.id} elevation={0} sx={{ ...contentCardSx, mb: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1, mr: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600}>{t.name}</Typography>
                          {t.basedOn && <Chip label="Customized" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }} />}
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.goals}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Button size="small" variant="contained" color="info" onClick={() => assignConvo('custom', t.id, adminIdProp)}>Use</Button>
                          <IconButton size="small" onClick={() => editCustomConvo(t)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteCustomConvo(t.id)}><Delete fontSize="small" /></IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                  <Button variant="outlined" startIcon={<Add />} onClick={createNewConvo} sx={{ mt: 1 }} fullWidth>Create New</Button>
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setConvoDialogOpen(false)}>Cancel</Button></DialogActions>
      </Dialog>

      {/* ── Conversation Edit Sub-Dialog ── */}
      <Dialog open={convoEditOpen} onClose={() => setConvoEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingConvo ? 'Edit Conversation Template' : 'Create Conversation Template'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Template Name" value={ceditName} onChange={(e) => setCeditName(e.target.value)} fullWidth required placeholder="e.g. Vision & Glaucoma Screening" helperText="Internal name for organizing your templates" />
            <TextField label="Card Title" value={ceditTitle} onChange={(e) => setCeditTitle(e.target.value)} fullWidth placeholder="e.g. Vision Intake" helperText="Title shown on the ChartMind card (defaults to template name)" />
            <TextField label="Conversation Goals" value={ceditGoals} onChange={(e) => setCeditGoals(e.target.value)} fullWidth multiline rows={6} required
              placeholder="Describe in plain English what the conversation should cover…" helperText="The AI will use these goals to guide the patient interview" />
            <Box>
              <Typography variant="body2" gutterBottom>Max Questions: {ceditMaxQ}</Typography>
              <Slider value={ceditMaxQ} onChange={(_, v) => setCeditMaxQ(v)} min={3} max={48} step={1}
                marks={[{ value: 3, label: '3' }, { value: 10, label: '10' }, { value: 24, label: '24' }, { value: 48, label: '48' }]} valueLabelDisplay="auto" />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvoEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveConvo} disabled={!ceditName.trim() || !ceditGoals.trim()}>
            {editingConvo ? 'Update' : 'Create & Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
