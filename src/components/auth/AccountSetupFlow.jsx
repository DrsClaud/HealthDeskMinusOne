import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import firebaseApp, { db } from "services/firebase";
import { useForm, Controller } from "react-hook-form";
import { Box, Typography, TextField, Alert } from "@mui/material";
import SelectableChoiceCard from "components/common/SelectableChoiceCard";
import { LoadingButton } from "@mui/lab";
import {
  ChatRounded,
  MedicalServicesRounded,
  LocalHospitalRounded,
  MedicalInformationRounded,
  AdminPanelSettingsRounded,
} from "@mui/icons-material";
import EmergencySearch from "components/EmergencySearch";
import AddressSearch from "components/AddressSearch";
import { getAddress } from "utils/helpers/getAddress";
import { getStateCode } from "utils/helpers/getStateCode";
import * as geohash from "ngeohash";

const STEPS = {
  ACCOUNT_TYPE: 0,
  FACILITY_TYPE: 1,
  FACILITY_INFO: 2,
};

const fallbackOrganizationName = (email) => {
  const seed = (email || "").split("@")[0].trim();
  if (!seed) return "New Organization";
  return `${seed}'s Organization`;
};

const buildBaseUserDoc = ({ user, email, role, extra = {} }) => ({
  uid: user.uid,
  email: email || user.email || null,
  name: "",
  lastName: "",
  role,
  registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
  onboarding: false,
  ...extra,
});

const AccountSetupFlow = ({
  prefilledEmail = null,
  onComplete,
  onStepChange,
  backHandlerRef,
  onBackFromFirstStep,
  preselectedRole = null,
  onSignupStart,
  /** Called after signup batch completes or fails (pair with onSignupStart). */
  onSignupEnd,
}) => {
  const initialStep = preselectedRole
    ? preselectedRole === "facility"
      ? STEPS.FACILITY_TYPE
      : STEPS.ACCOUNT_TYPE
    : STEPS.ACCOUNT_TYPE;
  const [step, setStepInternal] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(preselectedRole || "");

  // Wrapper to notify parent of step changes
  const setStep = (newStep) => {
    setStepInternal(newStep);
    onStepChange?.(newStep);
  };

  // Sync preselectedRole on mount - ensures step is correct even with React quirks
  useEffect(() => {
    if (preselectedRole) {
      const expectedStep =
        preselectedRole === "facility"
          ? STEPS.FACILITY_TYPE
          : STEPS.ACCOUNT_TYPE;
      if (selectedRole !== preselectedRole) {
        setSelectedRole(preselectedRole);
      }
      if (step === STEPS.ACCOUNT_TYPE) {
        setStepInternal(expectedStep);
        onStepChange?.(expectedStep);
        return;
      }
    }
    onStepChange?.(step);
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    mode: "onBlur",
    defaultValues: {
      facilityType: "",
      facilityName: "",
      address: null,
      emergency_location: null,
    },
  });

  const watchFacilityType = watch("facilityType");

  const createUserProfile = async (role, email) => {
    setLoading(true);
    setError("");
    onSignupStart?.();

    try {
      const user = firebaseApp.auth().currentUser;
      if (!user) throw new Error("No authenticated user found.");
      const roleToSave = role === "provider" ? "professional" : role;

      if (roleToSave === "admin") {
        const orgName = fallbackOrganizationName(email || user.email);
        const batch = db.batch();
        const userRef = db.collection("users").doc(user.uid);
        const orgRef = db.collection("organizations").doc();

        batch.set(orgRef, {
          id: orgRef.id,
          name: orgName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: user.uid,
          seats: { total: 0, used: 0 },
          subscriptionOwnerId: user.uid,
        });

        batch.set(userRef, {
          ...buildBaseUserDoc({
            user,
            email,
            role: "admin",
          }),
          organizationId: orgRef.id,
          isOrganizationOwner: true,
          joinedOrganizationAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
      } else {
        await db
          .collection("users")
          .doc(user.uid)
          .set(buildBaseUserDoc({ user, email, role: roleToSave }));
      }

      await onComplete?.(user);
    } catch (err) {
      console.error("Error creating profile:", err);
      setError(err.message || "Failed to create profile.");
    } finally {
      setLoading(false);
      onSignupEnd?.();
    }
  };

  const handleAccountTypeContinue = async () => {
    if (!selectedRole) {
      setError("Please choose an account type.");
      return;
    }
    if (selectedRole === "facility") {
      setStep(STEPS.FACILITY_TYPE);
      return;
    }
    const email = prefilledEmail || firebaseApp.auth().currentUser?.email || "";
    await createUserProfile(selectedRole, email);
  };

  const handleFacilityInfoSubmit = async (data) => {
    setLoading(true);
    setError("");
    onSignupStart?.();

    try {
      const user = firebaseApp.auth().currentUser;
      if (!user) throw new Error("No authenticated user found.");

      const facilityType = data.facilityType;
      const locationId =
        facilityType === "hospital"
          ? String(data.emergency_location?.id)
          : db.collection("locations").doc().id;

      const batch = db.batch();
      const userRef = db.collection("users").doc(user.uid);
      batch.set(
        userRef,
        buildBaseUserDoc({
          user,
          email: prefilledEmail || user.email,
          role: "facility",
          extra: { location: locationId },
        }),
      );

      const locationsRef = db.collection("locations").doc(locationId);
      if (facilityType === "hospital") {
        batch.set(
          locationsRef,
          { users: firebase.firestore.FieldValue.arrayUnion(user.uid) },
          { merge: true },
        );
      } else {
        const addressData = data.address;
        const lookup = (name) =>
          addressData.context.find((a) => a?.id.startsWith(name))?.text;
        const formattedAddress = getAddress(addressData);
        const latitude = addressData.center[1];
        const longitude = addressData.center[0];
        const geopoint = new firebase.firestore.GeoPoint(latitude, longitude);
        const hash = geohash.encode(latitude, longitude);

        batch.set(locationsRef, {
          id: locationId,
          title: data.facilityName,
          lat: latitude,
          lng: longitude,
          address: formattedAddress,
          city: lookup("place"),
          state: getStateCode(addressData),
          zip: lookup("postcode"),
          type: "Clinic",
          users: firebase.firestore.FieldValue.arrayUnion(user.uid),
          status: "pending",
          coordinates: geopoint,
          g: { geohash: hash, geopoint },
        });
      }

      await batch.commit();
      await onComplete?.(user);
    } catch (err) {
      console.error("Error creating facility:", err);
      setError(err.message || "Failed to create facility.");
    } finally {
      setLoading(false);
      onSignupEnd?.();
    }
  };

  const handleBack = () => {
    if (step === STEPS.ACCOUNT_TYPE) {
      onBackFromFirstStep?.();
      return;
    }
    if (step === STEPS.FACILITY_TYPE) {
      if (preselectedRole) {
        onBackFromFirstStep?.();
      } else {
        setStep(STEPS.ACCOUNT_TYPE);
        setSelectedRole("");
        setError("");
      }
      return;
    }
    if (step === STEPS.FACILITY_INFO) {
      setStep(STEPS.FACILITY_TYPE);
      setError("");
    }
  };

  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = handleBack;
  });

  return (
    <Box sx={{ width: "100%" }}>
      {step === STEPS.ACCOUNT_TYPE && (
        <>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Choose your account type
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select how you&apos;ll use HealthDesk.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SelectableChoiceCard
              icon={<ChatRounded fontSize="large" />}
              title="Patient"
              description="Get symptom insights, find care, and manage your health journey."
              onClick={() => {
                setSelectedRole("patient");
                setError("");
              }}
              selected={selectedRole === "patient"}
            />
            <SelectableChoiceCard
              icon={<MedicalServicesRounded fontSize="large" />}
              title="Healthcare Provider"
              description="Access clinical decision support and patient management tools."
              onClick={() => {
                setSelectedRole("provider");
                setError("");
              }}
              selected={selectedRole === "provider"}
            />
            <SelectableChoiceCard
              icon={<LocalHospitalRounded fontSize="large" />}
              title="Healthcare Organization"
              description="Manage your facility, staff, and streamline patient flow."
              onClick={() => {
                setSelectedRole("facility");
                setError("");
              }}
              selected={selectedRole === "facility"}
            />
            <SelectableChoiceCard
              icon={<AdminPanelSettingsRounded fontSize="large" />}
              title="ChartMind Admin"
              description="Manage prompts, billing, and user access for your organization."
              onClick={() => {
                setSelectedRole("admin");
                setError("");
              }}
              selected={selectedRole === "admin"}
            />
          </Box>
          <LoadingButton
            variant="contained"
            size="large"
            fullWidth
            loading={loading}
            disabled={!selectedRole}
            onClick={handleAccountTypeContinue}
            sx={{ py: 1.5, mt: 3 }}
          >
            Continue
          </LoadingButton>
        </>
      )}

      {step === STEPS.FACILITY_TYPE && (
        <>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            What type of facility?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select the type of healthcare facility you&apos;re registering.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SelectableChoiceCard
              orientation="vertical"
              icon={<LocalHospitalRounded sx={{ fontSize: 40 }} />}
              title="Emergency Department"
              description="24-hour emergency care"
              onClick={() => {
                setValue("facilityType", "hospital", { shouldDirty: true });
                setStep(STEPS.FACILITY_INFO);
              }}
            />
            <SelectableChoiceCard
              orientation="vertical"
              icon={<MedicalInformationRounded sx={{ fontSize: 40 }} />}
              title="Clinic"
              description="Urgent/immediate care"
              onClick={() => {
                setValue("facilityType", "urgent-care", { shouldDirty: true });
                setStep(STEPS.FACILITY_INFO);
              }}
            />
          </Box>
        </>
      )}

      {step === STEPS.FACILITY_INFO && (
        <>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Facility details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {watchFacilityType === "hospital"
              ? "Search for your emergency department."
              : "Enter your facility name and address."}
          </Typography>
          <form onSubmit={handleSubmit(handleFacilityInfoSubmit)}>
            {watchFacilityType === "hospital" ? (
              <EmergencySearch control={control} errors={errors} />
            ) : (
              <>
                <Controller
                  name="facilityName"
                  control={control}
                  rules={{ required: "Facility name is required." }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Facility Name"
                      fullWidth
                      variant="outlined"
                      error={!!errors.facilityName}
                      helperText={errors.facilityName?.message}
                      sx={{ mb: 2 }}
                    />
                  )}
                />
                <AddressSearch control={control} errors={errors} />
              </>
            )}
            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={loading}
              sx={{ py: 1.5, mt: 3 }}
            >
              Complete registration
            </LoadingButton>
          </form>
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export { STEPS as ACCOUNT_SETUP_STEPS };
export default AccountSetupFlow;
