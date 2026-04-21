import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Divider,
  MenuItem,
  Select,
  TextField,
  Typography,
  FormControl,
  InputLabel,
} from "@mui/material";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { LoadingButton } from "@mui/lab";

/**
 * PromptsPage - Manage AI prompts for ChartMind
 *
 * This page will allow ChartMind Managers to:
 * - View and edit system prompts
 * - Configure AI behavior for clinical note generation
 * - Manage prompt templates
 */
const PromptsPage = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchingPrompt, setFetchingPrompt] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      clinicalNotesPrompt: "",
      clinicalNotesModel: "gpt-4o-mini",
    },
  });

  // Fetch current prompt on page load
  useEffect(() => {
    const fetchCurrentPrompt = async () => {
      try {
        // Hardcoded API endpoint for demo
        const response = await fetch(
          "https://core-ai-service-225336522280.us-central1.run.app/v1/query/Adman/info",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "clinical-notes",
              professional_id: "", // TODO: Replace with actual professional_id
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `API call failed: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        console.log("Fetched workflow info:", result);

        // Pre-populate the form with the current admin_prompt
        if (result.admin_prompt) {
          reset({
            clinicalNotesPrompt: result.admin_prompt,
            clinicalNotesModel: "gpt-4o-mini",
          });
        }
      } catch (error) {
        console.error("Error fetching prompt:", error);
        // Silently fail - user can still enter a new prompt
      } finally {
        setFetchingPrompt(false);
      }
    };

    fetchCurrentPrompt();
  }, [reset]);

  const promptFields = [
    {
      id: "clinicalNotes",
      label: "Clinical Notes Generation",
    },
    {
      id: "diagnosis",
      label: "Diagnosis Assistance",
    },
    {
      id: "treatmentPlan",
      label: "Treatment Plan Recommendations",
    },
  ];

  const aiModels = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    setSubmitted(false);

    try {
      // Hardcoded API endpoint for demo
      const response = await fetch(
        "https://core-ai-service-225336522280.us-central1.run.app/v1/query/Adman/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "clinical-notes",
            updates: {
              admin_prompt: data.clinicalNotesPrompt,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Prompt updated successfully:", result);

      setSubmitted(true);
    } catch (error) {
      console.error("Error updating prompt:", error);
      // TODO: Add error handling UI
      alert(`Failed to update prompt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <DashboardPageHeader
        title="Prompts"
        subtitle="Control the ChartMind prompts for the team members in your organization to provide additional instructions for physicians."
      />

      <Divider sx={{ mb: 4 }} />

      <Box
        sx={{
          maxWidth: 520,
          width: "100%",
        }}
      >
        {submitted && (
          <Alert severity="success" sx={{ mb: 3 }}>
            The prompts have been saved successfully.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {promptFields.map((field) => {
            const promptId = `${field.id}Prompt`;
            const modelId = `${field.id}Model`;

            return (
              <Box key={field.id} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {field.label}
                </Typography>

                <Controller
                  name={promptId}
                  control={control}
                  rules={{
                    required: "This field is required.",
                  }}
                  render={({ field: controllerField }) => (
                    <TextField
                      label="Prompt Instructions"
                      type="text"
                      multiline
                      rows={4}
                      InputLabelProps={{ shrink: true }}
                      variant="standard"
                      fullWidth
                      disabled={fetchingPrompt}
                      error={!!errors?.[promptId]}
                      helperText={errors?.[promptId]?.message}
                      sx={{ pb: 2, display: "block" }}
                      {...controllerField}
                    />
                  )}
                />

                <Controller
                  name={modelId}
                  control={control}
                  render={({ field: controllerField }) => (
                    <FormControl variant="standard" fullWidth sx={{ pb: 2 }}>
                      <InputLabel id={`${modelId}-label`}>AI Model</InputLabel>
                      <Select labelId={`${modelId}-label`} {...controllerField}>
                        {aiModels.map((model) => (
                          <MenuItem key={model.value} value={model.value}>
                            {model.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>
            );
          })}

          <LoadingButton
            loading={loading}
            disabled={fetchingPrompt}
            type="submit"
            variant="contained"
            size="large"
            sx={{ mb: 2 }}
          >
            Save Prompts
          </LoadingButton>
        </form>
      </Box>
    </Box>
  );
};

export default PromptsPage;
