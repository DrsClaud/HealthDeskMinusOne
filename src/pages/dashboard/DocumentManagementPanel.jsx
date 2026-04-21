/**
 * Document Management Panel
 * 
 * UI for managing vector documents (upload, list, delete) for each position.
 * Integrated into QueryManagementModal as a new tab section.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  Upload,
  Delete,
  Description,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { 
  documentProcessingService,
  detectPHI,
  validateMedicalTerminology,
  queryRegistryService,
} from '../../services/llm';
import { useAuth } from '@healthdesk/shared-hooks';
import SourceMetadataDialog from './SourceMetadataDialog';
import { useEmbeddedDocumentsUpload } from './EmbeddedDocumentsUploadContext';
import { Warning, Schedule, Security } from '@mui/icons-material';
import JSZip from 'jszip';

/**
 * File upload area with drag-and-drop
 */
const FileUploadArea = ({ onFilesSelected, disabled, position }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    setError(null);
    
    // Validate file types
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/zip',
                         'application/x-zip-compressed'];
    const allowedExtensions = ['txt', 'md', 'pdf', 'docx', 'zip'];
    
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
    });
    
    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Supported: TXT, MD, PDF, DOCX, ZIP');
    }
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          border: isDragging ? '2px dashed' : '1px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Upload Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag and drop files here, or click to select
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Supported: TXT, MD, PDF, DOCX, ZIP (max 200MB per file, 250MB total per query)
        </Typography>
        <input
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx,.zip,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed"
          onChange={handleFileInput}
          disabled={disabled}
          style={{ display: 'none' }}
          id={`file-upload-${position}`}
        />
        <label htmlFor={`file-upload-${position}`}>
          <Button
            variant="outlined"
            component="span"
            disabled={disabled}
            startIcon={<Upload />}
          >
            Select Files
          </Button>
        </label>
        {error && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

/**
 * Document list item with enhanced metadata display
 */
const DocumentItem = ({ document, onDelete, deleting, onPreview }) => {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const metadata = document.metadata || {};
  const isStale = metadata.isStale || false;
  const monthsOld = metadata.monthsSincePublication || 0;
  const containsPHI = metadata.containsPHI || false;
  const source = metadata.source || 'Unknown source';
  const author = metadata.author || 'Unknown author';
  const publicationDate = metadata.publicationDate || null;

  return (
    <ListItem>
      <ListItemText
        secondaryTypographyProps={{ component: 'div' }}
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Description color="action" />
            <Typography variant="subtitle2">{document.fileName}</Typography>
            
            {/* PHI Indicator */}
            {containsPHI && (
              <Tooltip title="Contains Protected Health Information">
                <Chip
                  icon={<Security fontSize="small" />}
                  label="PHI"
                  size="small"
                  color="warning"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              </Tooltip>
            )}
            
            {/* Staleness Indicator */}
            {isStale && (
              <Tooltip title={`Document is ${monthsOld} months old. Consider updating.`}>
                <Chip
                  icon={<Schedule fontSize="small" />}
                  label={`${monthsOld}m old`}
                  size="small"
                  color="error"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              </Tooltip>
            )}
            
            {metadata.fileType && (
              <Chip
                label={metadata.fileType.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
            
            {metadata.documentType && (
              <Chip
                label={metadata.documentType}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(metadata.fileSize || 0)} • {' '}
              {metadata.wordCount || 0} words • {' '}
              {document.chunkCount || 0} chunks
            </Typography>
            
            {/* Source Metadata */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              <strong>Source:</strong> {source}
              {author && ` • ${author}`}
              {publicationDate && ` • ${new Date(publicationDate).toLocaleDateString()}`}
            </Typography>
            
            {/* Staleness Warning */}
            {isStale && metadata.stalenessWarning && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Warning fontSize="inherit" color="error" sx={{ fontSize: '0.75rem' }} />
                <Typography variant="caption" color="error">
                  {metadata.stalenessWarning}
                </Typography>
              </Box>
            )}
            
            {document.createdAt && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Uploaded: {document.createdAt.toLocaleString()}
              </Typography>
            )}
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onPreview && (
            <Tooltip title="Preview document">
              <span>
                <IconButton
                  edge="end"
                  onClick={() => onPreview(document)}
                  size="small"
                >
                  <Info fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Delete document">
            <span>
              <IconButton
                edge="end"
                onClick={() => onDelete(document.id)}
                disabled={deleting === document.id}
                color="error"
                size="small"
              >
                {deleting === document.id ? (
                  <CircularProgress size={20} />
                ) : (
                  <Delete />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

/**
 * Main Document Management Panel component
 */
const DocumentManagementPanel = ({ baseQueryId, position, options = {} }) => {
  const { userData } = useAuth();
  const uploadContext = useEmbeddedDocumentsUpload();
  const activeUpload = uploadContext?.activeUpload;
  const uploadMatchesPanel = activeUpload && activeUpload.baseQueryId === baseQueryId && activeUpload.position === position && (activeUpload.options?.adminId === options?.adminId);
  const uploadingFromContext = uploadMatchesPanel && activeUpload.phase === 'uploading';

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadBatchCurrent, setUploadBatchCurrent] = useState(0);
  const [uploadBatchTotal, setUploadBatchTotal] = useState(0);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [phiDetection, setPhiDetection] = useState(null);
  const [medicalValidation, setMedicalValidation] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteAllConfirmStep, setDeleteAllConfirmStep] = useState(1);
  const [deleteAllInProgress, setDeleteAllInProgress] = useState(false);
  const [expandingZip, setExpandingZip] = useState(false);

  // Document settings for LLM behavior
  const [documentSettings, setDocumentSettings] = useState({
    limitToVectorStore: false, // Only use documents from this vector store (exclusive mode)
    supplementAuthoritativeResources: false, // Supplement authoritative medical resources with vector store content
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load documents
  const loadDocuments = useCallback(async () => {
    // Don't attempt to load if baseQueryId is missing
    if (!baseQueryId || !position) {
      setLoading(false);
      setError(null);
      setDocuments([]);
      return;
    }

    // Check if user is authenticated
    if (!userData?.uid) {
      setLoading(false);
      setError('You must be logged in to view documents.');
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const docs = await documentProcessingService.getDocumentsForPosition(
        baseQueryId,
        position,
        options
      );
      setDocuments(docs);
      setError(null); // Clear any previous errors on success
    } catch (err) {
      console.error('[DocumentManagementPanel] Load error:', err);
      
      // Handle specific error types
      const errorMessage = err.message || '';
      const errorCode = err.code || '';
      
      // Check for Firestore permission errors
      if (errorCode === 'permission-denied' || errorCode === 'PERMISSION_DENIED' || 
          errorMessage.includes('permission') || errorMessage.includes('Permission') ||
          errorMessage.includes('Missing or insufficient permissions')) {
        // For permission errors, show empty state instead of error
        // This is likely a Firestore security rules issue that needs to be fixed server-side
        setDocuments([]);
        setError('Document access is restricted. Please contact your administrator to configure Firestore security rules for the llmDocumentVectors collection.');
      } else if (!baseQueryId) {
        setError('No query selected. Please select a query to view its documents.');
        setDocuments([]);
      } else {
        setError('Failed to load documents: ' + (errorMessage || 'Unknown error'));
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [baseQueryId, position, options, userData?.uid]);

  // Load document settings from position query
  const loadDocumentSettings = useCallback(async () => {
    if (!baseQueryId || !position) return;
    
    try {
      let query = null;
      
      if (position === 1) {
        // Position 1: Get base query
        query = await queryRegistryService.getQuery(baseQueryId);
      } else if (position === 2) {
        // Get Position 2 query
        const queries = await queryRegistryService.getAllQueries();
        query = queries.find(q => 
          q.baseQueryId === baseQueryId && 
          q.chainConfig?.chainPosition === 2
        );
      } else if (position === 3 && options.adminId) {
        // Get Position 3 query
        const queries = await queryRegistryService.getAllQueries();
        query = queries.find(q => 
          q.baseQueryId === baseQueryId && 
          q.chainConfig?.chainPosition === 3 &&
          q.adminId === options.adminId
        );
      }
      
      if (query?.documentSettings) {
        setDocumentSettings({
          limitToVectorStore: query.documentSettings.limitToVectorStore || false,
          supplementAuthoritativeResources: query.documentSettings.supplementAuthoritativeResources || 
                                           query.documentSettings.equalPreferenceAsAuthoritative || false, // Support old name for backward compatibility
        });
      }
    } catch (err) {
      console.warn('[DocumentManagementPanel] Failed to load document settings:', err);
      // Don't show error - just use defaults
    }
  }, [baseQueryId, position, options.adminId]);

  // Save document settings to position query
  const saveDocumentSettings = useCallback(async () => {
    if (!baseQueryId || !position || !userData?.uid) return;
    
    setSavingSettings(true);
    setError(null);
    
    try {
      const documentSettingsData = {
        limitToVectorStore: documentSettings.limitToVectorStore,
        supplementAuthoritativeResources: documentSettings.supplementAuthoritativeResources,
      };
      
      if (position === 1) {
        // Position 1: Update base query directly
        await queryRegistryService.updateQuery(
          baseQueryId,
          {
            documentSettings: documentSettingsData,
          },
          userData.uid,
          'Updated document settings'
        );
      } else {
        // Position 2 or 3: Create or update position query
        const queryData = {
          documentSettings: documentSettingsData,
          changeReason: 'Updated document settings',
        };
        
        if (position === 2) {
          queryData.regions = userData?.scope?.regions || [];
          queryData.localities = userData?.scope?.localities || [];
        } else if (position === 3) {
          queryData.adminId = userData.uid;
        }
        
        await queryRegistryService.createOrUpdatePositionQuery(
          baseQueryId,
          position,
          queryData,
          userData.uid
        );
      }
      
      setSuccess('Document settings saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[DocumentManagementPanel] Failed to save document settings:', err);
      setError('Failed to save document settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  }, [baseQueryId, position, documentSettings, userData]);

  useEffect(() => {
    if (baseQueryId && position && userData?.uid) {
      loadDocuments();
      loadDocumentSettings();
    } else {
      // Reset state if baseQueryId, position, or user is missing
      setLoading(false);
      if (!userData?.uid) {
        setError('You must be logged in to view documents.');
      } else {
        setError(null);
      }
      setDocuments([]);
    }
  }, [baseQueryId, position, userData?.uid, loadDocuments, loadDocumentSettings]);

  // When background upload (context) completes for this panel: refresh list, show result, clear context state
  useEffect(() => {
    if (!uploadMatchesPanel || !uploadContext || activeUpload.phase === 'uploading') return;
    const phase = activeUpload.phase;
    if (phase === 'done' || phase === 'error') {
      if (activeUpload.success) setSuccess(activeUpload.success);
      if (activeUpload.error) setError(activeUpload.error);
      let cancelled = false;
      (async () => {
        await loadDocuments();
        if (cancelled) return;
        uploadContext.clearUpload();
        // Second refresh after a short delay so count is correct (eventual consistency)
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;
        await loadDocuments();
      })();
      const t = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [uploadMatchesPanel, activeUpload?.phase, activeUpload?.success, activeUpload?.error, uploadContext, loadDocuments]);

  // Max documents per position (match documentProcessingService)
  const MAX_DOCUMENTS_PER_POSITION = 200;

  // Handle file selection - check for duplicates, expand ZIP to one PDF per document, extract text for preview
  const handleFilesSelected = async (files) => {
    setError(null);
    setSuccess(null);
    setDuplicateWarning(null);
    if (!files?.length) return;

    let resolvedFiles = Array.from(files);
    const singleZip = files.length === 1 && files[0].name.toLowerCase().endsWith('.zip');

    if (singleZip) {
      setExpandingZip(true);
      try {
        const zip = await JSZip.loadAsync(files[0]);
        const pdfEntries = Object.entries(zip.files).filter(
          ([path, entry]) => !entry.dir && path.toLowerCase().endsWith('.pdf')
        );
        if (pdfEntries.length === 0) {
          setError('ZIP contains no PDF files.');
          setExpandingZip(false);
          return;
        }
        const capped = pdfEntries.slice(0, MAX_DOCUMENTS_PER_POSITION);
        if (pdfEntries.length > MAX_DOCUMENTS_PER_POSITION) {
          setSuccess(`ZIP has ${pdfEntries.length} PDFs; using first ${MAX_DOCUMENTS_PER_POSITION}.`);
          setTimeout(() => setSuccess(null), 5000);
        }
        const pdfFiles = await Promise.all(
          capped.map(async ([path, entry]) => {
            const blob = await entry.async('blob');
            const name = path.split('/').pop() || path;
            return new File([blob], name, { type: 'application/pdf' });
          })
        );
        resolvedFiles = pdfFiles;
      } catch (err) {
        console.error('[DocumentManagementPanel] ZIP expand error:', err);
        setError('Failed to read ZIP: ' + (err.message || 'Unknown error'));
        setExpandingZip(false);
        return;
      } finally {
        setExpandingZip(false);
      }
    }

    const file = resolvedFiles[0];
    const isBatch = resolvedFiles.length > 1;

    try {
      if (!isBatch) {
        const duplicate = await documentProcessingService.checkForDuplicate(
          baseQueryId,
          position,
          file.name,
          file.size,
          options
        );
        if (duplicate) {
          setDuplicateWarning({
            type: duplicate.type,
            document: duplicate.document,
            fileName: file.name,
          });
        }
      }

      if (!isBatch) {
        let text = '';
        try {
          if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            text = await file.text();
          }
        } catch (err) {
          console.warn('[DocumentManagementPanel] Could not extract text for preview:', err);
        }
        if (text) {
          setPhiDetection(detectPHI(text));
          setMedicalValidation(validateMedicalTerminology(text));
        }
      } else {
        setPhiDetection(null);
        setMedicalValidation(null);
      }

      setPendingFile(resolvedFiles[0]);
      setPendingFiles(resolvedFiles);
      setMetadataDialogOpen(true);
    } catch (err) {
      console.error('[DocumentManagementPanel] File processing error:', err);
      setError('Failed to process file: ' + err.message);
    }
  };

  // Normalize document from processDocument return for list display (createdAt/updatedAt as Date; serverTimestamp() is not yet resolved on return)
  const toListDocument = (doc) => {
    const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v instanceof Date ? v : new Date());
    return {
      ...doc,
      createdAt: toDate(doc.createdAt),
      updatedAt: toDate(doc.updatedAt),
    };
  };

  // During batch upload, show partial list from server so completed docs are visible and user sees progress is saved
  const displayDocuments = React.useMemo(() => {
    if (uploadingFromContext && activeUpload?.latestDocs?.length) {
      return activeUpload.latestDocs.map(toListDocument);
    }
    return documents;
  }, [uploadingFromContext, activeUpload?.latestDocs, documents]);

  // Handle metadata submission and actual upload (single or batch). When context is available, upload runs in context so it continues if user switches tabs.
  const handleMetadataSave = async (sourceMetadata) => {
    const filesToUpload = pendingFiles.length > 0 ? pendingFiles : (pendingFile ? [pendingFile] : []);
    if (!filesToUpload.length) return;

    setMetadataDialogOpen(false);
    setPendingFile(null);
    setPendingFiles([]);
    setPhiDetection(null);
    setMedicalValidation(null);
    setDuplicateWarning(null);

    if (uploadContext) {
      uploadContext.startUpload({
        baseQueryId,
        position,
        options,
        files: filesToUpload,
        sourceMetadata,
        uid: userData?.uid || 'unknown',
        allowDuplicate: filesToUpload.length > 1 || duplicateWarning !== null,
        duplicateWarning,
      });
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    setUploadStatus('Starting…');

    const uid = userData?.uid || 'unknown';
    const isBatch = filesToUpload.length > 1;
    const allowDuplicate = isBatch || duplicateWarning !== null;
    const uploadedDocs = []; // collected from processDocument for optimistic list update

    try {
      if (isBatch) {
        const total = filesToUpload.length;
        setUploadBatchTotal(total);
        let completed = 0;
        const errors = [];
        const skipped = []; // duplicates skipped (by filename or size)
        for (const file of filesToUpload) {
          setUploadBatchCurrent(completed + 1);
          try {
            const duplicate = await documentProcessingService.checkForDuplicate(
              baseQueryId,
              position,
              file.name,
              file.size,
              options
            );
            if (duplicate) {
              setUploadStatus(`Skipped duplicate: ${file.name}`);
              skipped.push({ fileName: file.name, type: duplicate.type });
              completed += 1;
              setUploadProgress((completed / total) * 100);
              continue;
            }
            setUploadStatus(`Processing ${file.name}…`);
            const result = await documentProcessingService.processDocument(
              file,
              baseQueryId,
              position,
              uid,
              {
                ...options,
                sourceMetadata,
                redactPHI: false,
                allowDuplicate: false,
                onProgress: (percent, status) => {
                  setUploadProgress((completed / total) * 100 + (percent / total));
                  if (status != null) setUploadStatus(status);
                },
              }
            );
            if (result) uploadedDocs.push(result);
          } catch (err) {
            console.warn('[DocumentManagementPanel] Batch item failed:', file.name, err);
            errors.push({ fileName: file.name, message: err.message });
          }
          completed += 1;
          setUploadProgress((completed / total) * 100);
        }
        setUploadBatchCurrent(0);
        setUploadBatchTotal(0);
        if (errors.length > 0) {
          setError(`${errors.length} of ${total} failed: ${errors.map(e => e.fileName).join(', ')}`);
        }
        const uploaded = total - errors.length - skipped.length;
        const parts = [];
        if (uploaded > 0) parts.push(`Uploaded ${uploaded} document${uploaded !== 1 ? 's' : ''}`);
        if (skipped.length > 0) {
          parts.push(`Skipped ${skipped.length} duplicate${skipped.length !== 1 ? 's' : ''} (already embedded)`);
          if (skipped.length <= 10) {
            parts.push(`: ${skipped.map(s => s.fileName).join(', ')}`);
          } else {
            parts.push(`: ${skipped.slice(0, 5).map(s => s.fileName).join(', ')} and ${skipped.length - 5} more`);
          }
        }
        if (errors.length > 0 && parts.length > 0) parts.push(`${errors.length} failed`);
        setSuccess(parts.length > 0 ? parts.join('. ') : 'No new documents to upload');
      } else {
        const result = await documentProcessingService.processDocument(
          filesToUpload[0],
          baseQueryId,
          position,
          uid,
          {
            ...options,
            sourceMetadata,
            redactPHI: false,
            allowDuplicate,
            onProgress: (percent, status) => {
              setUploadProgress(percent);
              if (status != null) setUploadStatus(status);
            },
          }
        );
        if (result) uploadedDocs.push(result);
        setSuccess('Document uploaded successfully');
      }

      // Optimistic update: show uploaded docs in the list immediately so they appear even if the next read is empty (e.g. eventual consistency)
      if (uploadedDocs.length > 0) {
        const normalized = uploadedDocs.map(toListDocument);
        setDocuments((prev) => [...normalized, ...prev]);
      }

      // Refresh from server. Only replace the list when the server returns at least one doc, so we never overwrite with empty right after upload.
      const safeRefresh = async () => {
        try {
          const docs = await documentProcessingService.getDocumentsForPosition(baseQueryId, position, options);
          if (docs.length > 0) {
            setDocuments(docs);
          }
        } catch (err) {
          console.warn('[DocumentManagementPanel] Refresh after upload failed:', err);
        }
      };
      await safeRefresh(); // immediate refresh
      await new Promise((r) => setTimeout(r, 1200));
      await safeRefresh(); // delayed refresh to catch eventual consistency

      setPendingFile(null);
      setPendingFiles([]);
      setPhiDetection(null);
      setMedicalValidation(null);
      setDuplicateWarning(null);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('[DocumentManagementPanel] Upload error:', err);
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      setUploadBatchCurrent(0);
      setUploadBatchTotal(0);
    }
  };

  // Handle document preview
  const handlePreview = async (document) => {
    try {
      // Fetch document text (would need to be stored or extracted)
      // For now, show basic metadata
      setPreviewDocument(document);
    } catch (err) {
      console.error('[DocumentManagementPanel] Preview error:', err);
      setError('Failed to preview document: ' + err.message);
    }
  };

  // Handle delete
  const handleDelete = async (documentId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) {
      return;
    }

    setDeleting(documentId);
    setError(null);

    try {
      await documentProcessingService.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      await loadDocuments();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[DocumentManagementPanel] Delete error:', err);
      setError('Delete failed: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Delete all: open dialog (step 1)
  const handleDeleteAllClick = () => {
    setDeleteAllConfirmStep(1);
    setDeleteAllDialogOpen(true);
  };

  // Delete all: step 1 -> step 2, or step 2 -> execute
  const handleDeleteAllConfirm = async () => {
    if (deleteAllConfirmStep === 1) {
      setDeleteAllConfirmStep(2);
      return;
    }
    setDeleteAllInProgress(true);
    setError(null);
    try {
      for (const doc of documents) {
        await documentProcessingService.deleteDocument(doc.id);
      }
      setSuccess(`All ${documents.length} document(s) deleted.`);
      setDeleteAllDialogOpen(false);
      setDeleteAllConfirmStep(1);
      await loadDocuments();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('[DocumentManagementPanel] Delete all error:', err);
      setError('Delete all failed: ' + err.message);
    } finally {
      setDeleteAllInProgress(false);
    }
  };

  const handleDeleteAllDialogClose = () => {
    if (!deleteAllInProgress) {
      setDeleteAllDialogOpen(false);
      setDeleteAllConfirmStep(1);
    }
  };

  return (
    <Box>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {duplicateWarning && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }} 
          onClose={() => setDuplicateWarning(null)}
          action={
            <Button 
              size="small" 
              onClick={() => setDuplicateWarning(null)}
            >
              Continue Anyway
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            Duplicate Document Detected
          </Typography>
          <Typography variant="caption">
            A document with the same {duplicateWarning.type === 'filename' ? 'filename' : 'size'} already exists: 
            <strong> {duplicateWarning.document.fileName}</strong>
          </Typography>
        </Alert>
      )}

      {/* Document Settings Controls */}
      {baseQueryId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info fontSize="small" />
            LLM Document Usage Settings
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Control how the LLM uses uploaded documents when generating responses. Only documents uploaded in this tab (Embedded Documents) are sent to the LLM; Clinical References in the other tab are for display and tagging—upload the same file here if the LLM should answer from it. ZIP uploads create one combined document; if a ZIP you uploaded earlier appears in the list but never shows in chat answers, delete it and re-upload so all chunks are stored.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={documentSettings.limitToVectorStore}
                  onChange={(e) => {
                    setDocumentSettings(prev => ({
                      ...prev,
                      limitToVectorStore: e.target.checked,
                      // If enabling this, disable the other option
                      supplementAuthoritativeResources: e.target.checked ? false : prev.supplementAuthoritativeResources,
                    }));
                  }}
                  disabled={savingSettings}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Use This Vector Store Exclusively
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    When enabled, the LLM will ONLY use information from uploaded documents and will not reference other medical sources (e.g., UpToDate, general medical knowledge). This is mutually exclusive with the supplement option below.
                  </Typography>
                </Box>
              }
            />
            
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={documentSettings.supplementAuthoritativeResources}
                  onChange={(e) => {
                    setDocumentSettings(prev => ({
                      ...prev,
                      supplementAuthoritativeResources: e.target.checked,
                      // If enabling this, disable the other option
                      limitToVectorStore: e.target.checked ? false : prev.limitToVectorStore,
                    }));
                  }}
                  disabled={savingSettings || documentSettings.limitToVectorStore}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Supplement Authoritative Medical Resources
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    When enabled, use the vector store documents to supplement authoritative medical resources (guidelines, peer-reviewed sources, UpToDate, etc.) in the relevant medical specialty. The LLM will combine information from both sources. This is mutually exclusive with the exclusive option above.
                  </Typography>
                </Box>
              }
            />
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Click &quot;Save document settings&quot; to apply. When either option is on, the LLM uses your uploaded documents: &quot;Exclusive&quot; = answer only from these documents; &quot;Supplement&quot; = combine them with general medical knowledge. Each position&apos;s settings apply when that position runs (P2/P3 fall back to the previous position if not set).
          </Typography>
          
          <Button
            variant="outlined"
            size="small"
            onClick={saveDocumentSettings}
            disabled={savingSettings}
            startIcon={savingSettings ? <CircularProgress size={16} /> : null}
            sx={{ mt: 2 }}
          >
            {savingSettings ? 'Saving...' : 'Save document settings'}
          </Button>
          {success && success.includes('document settings') && (
            <Typography variant="caption" color="success.main" sx={{ ml: 1, display: 'inline-block' }}>
              Saved
            </Typography>
          )}
        </Paper>
      )}

      {/* Upload Area */}
      <FileUploadArea
        onFilesSelected={handleFilesSelected}
        disabled={uploading || uploadingFromContext || expandingZip}
        position={position}
      />

      {expandingZip && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Reading ZIP and extracting PDFs…
        </Alert>
      )}

      {(uploading || uploadingFromContext) && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={uploadingFromContext ? activeUpload.progress : uploadProgress}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {uploadingFromContext
              ? (activeUpload.batchTotal > 1
                  ? `Document ${activeUpload.batchCurrent} of ${activeUpload.batchTotal} · ${Math.round(activeUpload.progress)}%`
                  : `${Math.round(activeUpload.progress)}%`)
              : (uploadBatchTotal > 1
                  ? `Document ${uploadBatchCurrent} of ${uploadBatchTotal} · ${Math.round(uploadProgress)}%`
                  : `${Math.round(uploadProgress)}%`)}
          </Typography>
          {(uploadingFromContext ? activeUpload.batchTotal : uploadBatchTotal) > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
              You can switch tabs — upload continues in the background until it completes.
            </Typography>
          )}
          {(uploadingFromContext ? activeUpload.status : uploadStatus) && (
            <Typography
              variant="caption"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, color: 'text.secondary' }}
            >
              <CircularProgress size={10} sx={{ flexShrink: 0 }} />
              {uploadingFromContext ? activeUpload.status : uploadStatus}
            </Typography>
          )}
          {uploadingFromContext && activeUpload.batchTotal > 1 && (activeUpload.uploadedCountSoFar ?? 0) > 0 && (
            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
              {activeUpload.uploadedCountSoFar} document{activeUpload.uploadedCountSoFar !== 1 ? 's' : ''} already embedded and saved. If you leave the page, they will remain.
            </Typography>
          )}
        </Box>
      )}

      {/* Documents List: show partial list from server during batch upload so progress is visible */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description fontSize="small" />
            Uploaded Documents ({displayDocuments.length})
          </Typography>
          {displayDocuments.length > 0 && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<Delete />}
              onClick={handleDeleteAllClick}
              disabled={loading || uploading || uploadingFromContext}
            >
              Delete all
            </Button>
          )}
        </Box>

        {!baseQueryId || !position ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Please select a query to view its documents
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Documents are associated with specific queries and positions
            </Typography>
          </Paper>
        ) : loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error && error.includes('Firestore security rules') ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <ErrorIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Document Access Restricted
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {error}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, fontStyle: 'italic' }}>
              Note: This is a configuration issue that requires updating Firestore security rules. Documents may still be uploaded, but viewing requires proper permissions.
            </Typography>
          </Paper>
        ) : displayDocuments.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No documents uploaded for Position {position}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Upload documents to provide context for LLM queries
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined">
            <List>
              {displayDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDelete={handleDelete}
                  deleting={deleting}
                  onPreview={handlePreview}
                />
              ))}
            </List>
          </Paper>
        )}
      </Box>

      {/* Info */}
      <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
        <Typography variant="body2">
          Documents are processed, chunked, and embedded. Relevant chunks are automatically
          retrieved and injected into prompts during query execution based on similarity.
          Documents older than 6 months will show staleness warnings.
        </Typography>
      </Alert>

      {/* Delete all confirmation (double confirm) */}
      <Dialog open={deleteAllDialogOpen} onClose={handleDeleteAllDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          {deleteAllConfirmStep === 1 ? 'Delete all documents?' : 'Final confirmation'}
        </DialogTitle>
        <DialogContent>
          {deleteAllConfirmStep === 1 ? (
            <Typography variant="body2">
              You are about to delete all <strong>{documents.length}</strong> document{documents.length !== 1 ? 's' : ''} in this list. This cannot be undone.
            </Typography>
          ) : (
            <Typography variant="body2">
              Click &quot;Delete all&quot; below to permanently remove all {documents.length} document{documents.length !== 1 ? 's' : ''}.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteAllDialogClose} disabled={deleteAllInProgress}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteAllConfirm}
            disabled={deleteAllInProgress}
            startIcon={deleteAllInProgress ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {deleteAllConfirmStep === 1 ? 'Continue' : deleteAllInProgress ? 'Deleting…' : 'Delete all'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Source Metadata Dialog (single or batch) */}
      {(pendingFile || pendingFiles.length > 0) && (
        <SourceMetadataDialog
          open={metadataDialogOpen}
          onClose={() => {
            setMetadataDialogOpen(false);
            setPendingFile(null);
            setPendingFiles([]);
            setPhiDetection(null);
            setMedicalValidation(null);
          }}
          onSave={handleMetadataSave}
          fileName={
            pendingFiles.length > 1
              ? `${pendingFiles.length} files (batch — same metadata for all)`
              : (pendingFiles[0] || pendingFile)?.name
          }
          fileCount={pendingFiles.length > 1 ? pendingFiles.length : undefined}
          phiDetection={phiDetection}
          medicalValidation={medicalValidation}
        />
      )}

      {/* Document Preview Dialog */}
      {previewDocument && (
        <Dialog
          open={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Document Preview: {previewDocument.fileName}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2">Metadata</Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2">
                  <strong>Source:</strong> {previewDocument.metadata?.source || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Author:</strong> {previewDocument.metadata?.author || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Publication Date:</strong> {previewDocument.metadata?.publicationDate || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Document Type:</strong> {previewDocument.metadata?.documentType || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Evidence Level:</strong> {previewDocument.metadata?.evidenceLevel || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Specialty:</strong> {previewDocument.metadata?.specialty || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Chunks:</strong> {previewDocument.chunkCount || 0}
                </Typography>
                {previewDocument.metadata?.containsPHI && (
                  <Typography variant="body2" color="warning.main">
                    <strong>⚠ Contains PHI:</strong> {previewDocument.metadata.phiTypes?.join(', ')}
                  </Typography>
                )}
                {previewDocument.metadata?.isStale && (
                  <Typography variant="body2" color="error.main">
                    <strong>⚠ Stale:</strong> {previewDocument.metadata.stalenessWarning}
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDocument(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default DocumentManagementPanel;
