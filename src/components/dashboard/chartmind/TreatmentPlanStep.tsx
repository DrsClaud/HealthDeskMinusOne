import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import SelectableCard from "./SelectableCard";

// ============================================================================
// Types
// ============================================================================

export interface Treatment {
  id: string;
  name: string;
  category:
    | "medication"
    | "procedure"
    | "therapy"
    | "lifestyle"
    | "referral"
    | "other";
  priority: "first-line" | "alternative" | "adjunct";
  urgency?: "stat" | "urgent" | "routine";
  rationale: string;
  diagnosis?: string | string[];
  route?: string; // For medications
  contraindications?: string[];
  mutuallyRedundantGroup?: string; // Group ID for "Pick N" groups
  pickCount?: number; // How many to pick from the group
  linkedDiagnoses: string[];
}

export interface TreatmentPlanData {
  treatments: Treatment[];
  treatmentStrategy?: string;
  considerations?: string[];
}

interface TreatmentPlanStepProps {
  selectedDiagnoses: any[];
  planData: TreatmentPlanData | null;
  loading: boolean;
  error: string | null;
  hasTreatments: boolean;
  retry: () => void;
  disabledTreatmentIds: Set<string>;
  onToggleTreatmentDisabled: (id: string) => void;
  selectedTreatments: Set<string>;
  onToggleTreatmentSelected: (id: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  medication: "Medications",
  procedure: "Procedures",
  therapy: "Therapies",
  lifestyle: "Lifestyle & Supportive Care",
  referral: "Referrals & Consultations",
  other: "Other Treatments",
};

// ============================================================================
// Treatment Card Component
// ============================================================================

interface TreatmentCardProps {
  treatment: Treatment;
  disabled: boolean;
  selected: boolean;
  onToggleDisabled: () => void;
  onToggleSelected: () => void;
  groupIsFull?: boolean;
}

const TreatmentCard: React.FC<TreatmentCardProps> = ({
  treatment,
  disabled,
  selected,
  onToggleDisabled,
  onToggleSelected,
  groupIsFull = false,
}) => {
  const chips: Array<{
    label: string;
    color?:
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning";
    variant?: "filled" | "outlined";
  }> = [];

  if (treatment.category === "medication" && treatment.route) {
    chips.push({
      label: treatment.route,
      color: "default",
      variant: "outlined",
    });
  }
  if (treatment.urgency && treatment.urgency !== "routine") {
    chips.push({
      label: treatment.urgency === "stat" ? "STAT" : "Urgent",
      color: treatment.urgency === "stat" ? "error" : "warning",
      variant: "filled",
    });
  }

  const contraindications =
    treatment.contraindications && treatment.contraindications.length > 0 ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
        <WarningAmberRounded sx={{ fontSize: 16, color: "warning.main" }} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          Contraindications: {treatment.contraindications.join(", ")}
        </Typography>
      </Box>
    ) : null;

  return (
    <SelectableCard
      title={treatment.name}
      rationale={treatment.rationale}
      selectionVariant="checkbox"
      selected={selected}
      disabled={disabled}
      dimmed={groupIsFull && !selected}
      onClick={onToggleSelected}
      onToggleDisabled={onToggleDisabled}
      hideTooltip="Hide"
      chips={chips}
      additionalContent={contraindications}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

const TreatmentPlanStep: React.FC<TreatmentPlanStepProps> = ({
  selectedDiagnoses,
  planData,
  loading,
  error,
  hasTreatments,
  retry,
  disabledTreatmentIds,
  onToggleTreatmentDisabled,
  selectedTreatments,
  onToggleTreatmentSelected,
}) => {
  // Group treatments by category
  const treatmentsByCategory = useMemo(() => {
    if (!planData?.treatments) return new Map<string, Treatment[]>();

    const grouped = new Map<string, Treatment[]>();
    for (const treatment of planData.treatments) {
      const category = treatment.category || "other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(treatment);
    }
    return grouped;
  }, [planData?.treatments]);

  // Get mutually redundant group info with selection counts
  const mutuallyRedundantGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        treatments: Treatment[];
        pickCount: number;
        selectedCount: number;
      }
    > = {};

    planData?.treatments.forEach((treatment) => {
      if (treatment.mutuallyRedundantGroup) {
        const groupId = treatment.mutuallyRedundantGroup;
        if (!groups[groupId]) {
          groups[groupId] = {
            treatments: [],
            pickCount: treatment.pickCount || 1,
            selectedCount: 0,
          };
        }
        groups[groupId].treatments.push(treatment);
        if (selectedTreatments.has(treatment.id)) {
          groups[groupId].selectedCount++;
        }
      }
    });
    return groups;
  }, [planData?.treatments, selectedTreatments]);

  // No diagnoses selected
  if (selectedDiagnoses.length === 0) {
    return (
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Treatment Plan
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Select a diagnosis first to generate a treatment plan.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1.5, fontWeight: 600 }}>
          Treatment Plan
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Click treatments to select them for your plan. Use the hide button to
          exclude treatments from documentation.
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ width: "100%", mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={retry}
              startIcon={<RefreshRounded />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 4,
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Generating treatment plan...
          </Typography>
        </Box>
      )}

      {/* Treatments */}
      {!loading && hasTreatments && planData && (
        <Box sx={{ width: "100%" }}>
          {/* Treatment strategy */}
          {planData.treatmentStrategy && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: (theme: any) =>
                  theme.palette.primary.main + "08",
                borderColor: "primary.light",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Treatment Strategy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {planData.treatmentStrategy}
              </Typography>
            </Paper>
          )}

          {/* Treatments by category */}
          {Array.from(treatmentsByCategory.entries()).map(
            ([category, treatments]) => {
              const label = CATEGORY_LABELS[category] || "Other";

              // Build ordered list of segments: ungrouped treatments and group clusters
              const segments: React.ReactNode[] = [];
              const renderedGroups = new Set<string>();

              treatments.forEach((treatment) => {
                const groupId = treatment.mutuallyRedundantGroup;

                if (groupId) {
                  if (renderedGroups.has(groupId)) return;
                  renderedGroups.add(groupId);

                  const groupInfo = mutuallyRedundantGroups[groupId];
                  const groupTreatments = treatments.filter(
                    (t) => t.mutuallyRedundantGroup === groupId,
                  );
                  const groupIsFull =
                    groupInfo.selectedCount >= groupInfo.pickCount;

                  segments.push(
                    <Box
                      key={`group-${groupId}`}
                      sx={{
                        mb: 2,
                        pl: 1.5,
                        borderLeft: "3px solid",
                        borderColor: "warning.main",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: "warning.dark",
                          display: "block",
                          mb: 1,
                        }}
                      >
                        Choose {groupInfo.pickCount}
                      </Typography>
                      {groupTreatments.map((t) => (
                        <TreatmentCard
                          key={t.id}
                          treatment={t}
                          disabled={disabledTreatmentIds.has(t.id)}
                          selected={selectedTreatments.has(t.id)}
                          onToggleDisabled={() =>
                            onToggleTreatmentDisabled(t.id)
                          }
                          onToggleSelected={() =>
                            onToggleTreatmentSelected(t.id)
                          }
                          groupIsFull={groupIsFull}
                        />
                      ))}
                    </Box>,
                  );
                } else {
                  segments.push(
                    <TreatmentCard
                      key={treatment.id}
                      treatment={treatment}
                      disabled={disabledTreatmentIds.has(treatment.id)}
                      selected={selectedTreatments.has(treatment.id)}
                      onToggleDisabled={() =>
                        onToggleTreatmentDisabled(treatment.id)
                      }
                      onToggleSelected={() =>
                        onToggleTreatmentSelected(treatment.id)
                      }
                    />,
                  );
                }
              });

              return (
                <Box key={category} sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    {label}
                  </Typography>
                  {segments}
                </Box>
              );
            },
          )}

          {/* Considerations */}
          {planData.considerations && planData.considerations.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Clinical Considerations
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, pl: 2.5, color: "text.secondary" }}
              >
                {planData.considerations.map((item, idx) => (
                  <li key={idx}>
                    <Typography variant="body2">{item}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Empty state */}
      {!loading && !hasTreatments && !error && (
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", textAlign: "center", py: 2 }}
        >
          No treatments generated.
        </Typography>
      )}
    </Box>
  );
};

export default TreatmentPlanStep;
