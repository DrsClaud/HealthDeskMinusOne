import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import MedicationSearch from "./MedicationSearch";
import { useAuth } from "../../../hooks/useAuth";

const MedicationForm = ({
  open,
  onClose,
  onSave,
  medication = null,
  isEdit = false,
}) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(
    medication?.name || null
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      rxcui: "",
      dosage: "",
      frequency: "",
      prescribedBy: "",
      pharmacy: "",
      notes: "",
    },
  });

  // Watch for changes in medication name
  const medicationName = watch("name");

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (medication) {
        // Ensure all fields have default values (never undefined)
        reset({
          name: medication.name || "",
          rxcui: medication.rxcui || "",
          dosage: medication.dosage || "",
          frequency: medication.frequency || "",
          prescribedBy: medication.prescribedBy || "",
          pharmacy: medication.pharmacy || "",
          notes: medication.notes || "",
        });
        setSelectedMedication(medication.name);
      } else {
        reset({
          name: "",
          rxcui: "",
          dosage: "",
          frequency: "",
          prescribedBy: "",
          pharmacy: "",
          notes: "",
        });
        setSelectedMedication(null);
      }
    }
  }, [open, medication, reset]);

  // Parse medication name to extract clean name without brackets
  const parseMedicationName = (name) => {
    if (!name) return { cleanName: "", brandName: "" };

    const brandMatch = name.match(/^(.+?)\s*\[([^\]]+)\]$/);
    if (brandMatch) {
      return {
        cleanName: brandMatch[1].trim(),
        brandName: brandMatch[2].trim(),
      };
    }
    return { cleanName: name, brandName: "" };
  };

  // Handle medication selection from search
  const handleMedicationSelect = (selectedMed) => {
    if (selectedMed && typeof selectedMed === "object") {
      // Verified medication selected - store clean name only
      const { cleanName } = parseMedicationName(
        selectedMed.displayName || selectedMed.name
      );
      setValue("name", cleanName);
      setValue("rxcui", selectedMed.rxcui); // Store RxCUI for allergy checking
      setSelectedMedication(selectedMed);
    } else if (typeof selectedMed === "string") {
      // Manual entry or user modified RxNorm medication
      setValue("name", selectedMed);
      setValue("rxcui", ""); // No RxCUI for manual entries
      setSelectedMedication(selectedMed); // Store as string, clearing RxNorm data
    } else {
      // Null/undefined - clear everything
      setValue("name", "");
      setValue("rxcui", "");
      setSelectedMedication(null);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    setSaveError(null);

    try {
      // Prepare medication data - only include non-empty fields
      const medicationData = {
        name: data.name.trim(),
        dosage: data.dosage.trim(),
        frequency: data.frequency.trim(),
      };

      // Only include optional fields if they have actual content
      if (data.rxcui && data.rxcui.trim()) {
        medicationData.rxcui = data.rxcui.trim();
      }

      if (data.prescribedBy && data.prescribedBy.trim()) {
        medicationData.prescribedBy = data.prescribedBy.trim();
      }

      if (data.pharmacy && data.pharmacy.trim()) {
        medicationData.pharmacy = data.pharmacy.trim();
      }

      if (data.notes && data.notes.trim()) {
        medicationData.notes = data.notes.trim();
      }

      // Additional safety check: if we have an rxcui, make sure the medication name
      // actually corresponds to a currently selected verified medication
      if (medicationData.rxcui && typeof selectedMedication === "string") {
        // User manually edited the name after selecting verified medication
        // Clear the rxcui since it's no longer accurate
        delete medicationData.rxcui;
      }

      // Include medication ID when editing
      const dataToSave =
        isEdit && medication?.id
          ? { ...medicationData, id: medication.id }
          : medicationData;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Error saving medication:", error);
      setSaveError(
        error.message || "Failed to save medication. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog maxWidth="sm" fullWidth open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {isEdit ? "Edit Medication" : "Add New Medication"}
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3}>
            {/* Medication Name Search */}
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Medication name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                }}
                render={({ field }) => (
                  <>
                    <InputLabel shrink sx={{ mb: "-5px" }}>
                      Medication Name
                    </InputLabel>
                    <MedicationSearch
                      value={selectedMedication}
                      onChange={field.onChange}
                      onSelect={handleMedicationSelect}
                      error={errors.name}
                      helperText={errors.name?.message}
                      placeholder="Start typing medication name..."
                    />
                  </>
                )}
              />
            </Grid>

            {/* Dosage and Frequency */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="dosage"
                control={control}
                rules={{
                  required: "Dosage is required",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Dosage"
                    type="text"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    placeholder="e.g., 10mg, 1 tablet"
                    error={!!errors.dosage}
                    helperText={errors.dosage?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="frequency"
                control={control}
                rules={{
                  required: "Frequency is required",
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Frequency"
                    type="text"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    placeholder="e.g., Once daily, Twice daily"
                    error={!!errors.frequency}
                    helperText={errors.frequency?.message}
                  />
                )}
              />
            </Grid>

            {/* Prescriber and Pharmacy */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="prescribedBy"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Prescribed By"
                    type="text"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    placeholder="Doctor or prescriber name"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="pharmacy"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Pharmacy"
                    type="text"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    placeholder="Enter pharmacy name"
                  />
                )}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Additional Notes"
                    type="text"
                    InputLabelProps={{ shrink: true }}
                    variant="standard"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Any additional information about this medication..."
                  />
                )}
              />
            </Grid>
          </Grid>

          {saveError && (
            <FormHelperText error sx={{ mt: 1 }}>
              {saveError}
            </FormHelperText>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading}
            variant="contained"
            autoFocus
            sx={{ bgcolor: "#1b4584", "&:hover": { bgcolor: "#153a6d" } }}
          >
            {isEdit ? "Update" : "Save"}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MedicationForm;
