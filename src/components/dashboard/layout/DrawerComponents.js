import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  List,
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import ChatRounded from "@mui/icons-material/ChatRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MapRounded from "@mui/icons-material/MapRounded";
import MedicalInformationRounded from "@mui/icons-material/MedicalInformationRounded";
import PeopleRounded from "@mui/icons-material/PeopleRounded";
import PersonSearch from "@mui/icons-material/PersonSearch";
import QuestionAnswerRounded from "@mui/icons-material/QuestionAnswerRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SmsRounded from "@mui/icons-material/SmsRounded";
import VerifiedRounded from "@mui/icons-material/VerifiedRounded";
import FlashOnRounded from "@mui/icons-material/FlashOnRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ForumRounded from "@mui/icons-material/ForumRounded";
import ExitToAppRounded from "@mui/icons-material/ExitToAppRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import LibraryBooksRounded from "@mui/icons-material/LibraryBooksRounded";
import MedicalServicesRounded from "@mui/icons-material/MedicalServicesRounded";
import HealthAndSafetyRounded from "@mui/icons-material/HealthAndSafetyRounded";
import MedicationRounded from "@mui/icons-material/MedicationRounded";
import SmartToyRounded from "@mui/icons-material/SmartToyRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import NoteAltRounded from "@mui/icons-material/NoteAltRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import NavListItem from "components/common/NavListItem";
import { ChatContext } from "context/Chat";
import { useChat } from "components/chatbot/ContextBox/useChat";
import { useAuth } from "hooks/useAuth";
import { getTrialLengthForRole } from "constants/trials";

export const OnboardingDrawer = ({ logout }) => (
  <List>
    <NavListItem icon={<MapRounded />} text="CareMap" link="/" />
    <NavListItem icon={<LogoutRounded />} text="Log Out" onClick={logout} />
  </List>
);

export const PatientDrawer = ({ subscription, userData }) => {
  const navigate = useNavigate();
  const { newThread } = useContext(ChatContext);
  const { messages } = useChat();
  const { canStartTrial, hasActiveTrial, hasActiveDailyPass } = useAuth();
  const disabled = !messages || messages?.length < 1;
  const [showNoEmail, setShowNoEmail] = useState(false);
  const trialLengthDays = getTrialLengthForRole(userData?.role);

  const handleClose = () => setShowNoEmail(false);

  const copyChat = async () => {
    try {
      const messagesArray = messages.map(
        (message) =>
          `${message.sender === "user" ? "You" : "My HealthDesk"}:\n${
            message.message
          }`
      );
      await navigator.clipboard.writeText(messagesArray.join("\n\n"));
      console.log("Content copied to clipboard");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const sendEmail = () => {
    if (disabled) return;

    const messagesArray = messages.map(
      (message) =>
        `${message.sender === "user" ? "You" : "My HealthDesk"}:\n${
          message.message
        }`
    );

    window.open(
      "mailto:?subject=HealthDesk Medical SuperIntelligence Transcript&body=" +
        encodeURIComponent(messagesArray.join("\n\n"))
    );

    let t = setTimeout(() => setShowNoEmail(true), 500);
    window.addEventListener("blur", () => clearTimeout(t));
  };

  const navigateNewThread = () => {
    if (disabled) return;
    navigate("/dashboard");
    newThread();
  };

  return (
    <>
      <EmailDialog open={showNoEmail} onClose={handleClose} onCopy={copyChat} />
      <List>
        {userData?.role === "p4" && (
          <NavListItem
            icon={<ExitToAppRounded />}
            text="P4 Workspace"
            secondary="Patient Home"
            link="/dashboard/p4"
          />
        )}
        <NavListItem
          icon={<SchoolRounded />}
          text="Basic Medical Library"
          secondary="Simple medical education"
          link="/dashboard"
        />
        <NavListItem
          icon={<LibraryBooksRounded />}
          text="Advanced Medical Library"
          secondary="Detailed medical education"
          link="/dashboard/advanced-library"
        />
        <NavListItem
          icon={<MedicalServicesRounded />}
          text="Virtual MD"
          secondary="Interactive medical education"
          link="/dashboard/virtual-md"
        />
      </List>
      <Divider />
      <List>
        <NavListItem
          icon={<HealthAndSafetyRounded />}
          text="My HealthRecords"
          link="/dashboard/health-records"
        />
        <NavListItem
          icon={<MedicationRounded />}
          text="My Medications"
          link="/dashboard/medications"
        />
        {/* TODO: Medication Tracking disabled until Twilio BAA is in place */}
        {/* <NavListItem
          icon={<TrendingUpRounded />}
          text="Medication Tracking"
          link="/dashboard/medication-tracking"
        /> */}

        {!subscription && !hasActiveTrial && !hasActiveDailyPass && (
          <NavListItem
            icon={<PersonSearch />}
            text={
              canStartTrial ? "Start Free Trial" : "Upgrade to Commercial Free"
            }
            secondary={
              canStartTrial
                ? `Get full access for ${trialLengthDays} days`
                : undefined
            }
            noSelect
            link="/dashboard/upgrade"
            sx={
              canStartTrial
                ? {
                    "& .MuiListItemText-primary": {
                      color: "primary.main",
                      fontWeight: "medium",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "primary.main",
                    },
                  }
                : undefined
            }
          />
        )}
      </List>
      <Divider />
    </>
  );
};

export const ProfessionalDrawer = ({ subscription, userData }) => {
  const navigate = useNavigate();
  const { canStartTrial, hasActiveTrial, hasActiveDailyPass } = useAuth();
  const trialLengthDays = getTrialLengthForRole(userData?.role);

  return (
    <>
      <List>
        <NavListItem
          icon={<FlashOnRounded />}
          text="BrainFlash"
          secondary="Rapid clinical facts"
          link="/dashboard"
        />
        <NavListItem
          icon={<MenuBookRounded />}
          text="DeepDive"
          secondary="Medical reference"
          link="/dashboard/deepdive"
        />
        <NavListItem
          icon={<ForumRounded />}
          text="PeerView Case Consultation"
          secondary="Virtual consultation"
          link="/dashboard/peerview"
        />
      </List>
      <Divider />
      <List>
        <NavListItem
          icon={<NoteAltRounded />}
          text="New ChartMind Encounter"
          secondary="Start patient encounter"
          link="/dashboard/chartmind"
          noSelect
          onClick={(e) => {
            // Check if we're currently on a saved session (URL has session ID)
            const currentPath = window.location.pathname;
            const isOnSavedSession = currentPath.match(/\/dashboard\/chartmind\/[^/]+$/);
            
            if (isOnSavedSession) {
              // Force component remount by navigating with key state
              e.preventDefault();
              navigate('/dashboard/chartmind', { 
                state: { key: Date.now() },
                replace: true 
              });
            }
            // Otherwise, let the link handle normal navigation
          }}
        />
        <NavListItem
          icon={<HistoryRounded />}
          text="My Charts"
          secondary="View saved encounters"
          link="/dashboard/chartmind/sessions"
        />
      </List>
      <Divider />
      {!subscription && !hasActiveTrial && !hasActiveDailyPass && (
        <>
          <List>
            <NavListItem
              icon={<PersonSearch />}
              text={
                canStartTrial
                  ? "Start Free Trial"
                  : "Upgrade to Commercial Free"
              }
              secondary={
                canStartTrial
                  ? `Get full access for ${trialLengthDays} days`
                  : undefined
              }
              noSelect
              link="/dashboard/upgrade"
              sx={
                canStartTrial
                  ? {
                      "& .MuiListItemText-primary": {
                        color: "primary.main",
                        fontWeight: "medium",
                      },
                      "& .MuiListItemIcon-root": {
                        color: "primary.main",
                      },
                    }
                  : undefined
              }
            />
          </List>
          <Divider />
        </>
      )}
    </>
  );
};

export const SettingsDrawer = ({ activeSubscriptionRole, userData }) => (
  <>
    <List>
      <NavListItem
        icon={<SettingsRounded />}
        text="Settings"
        link="/dashboard/settings"
      />
    </List>
    <Divider />
  </>
);

export const AdminDrawer = ({ isGlobalAdmin }) => (
  <>
    {isGlobalAdmin && (
      <>
        <List>
          <NavListItem
            icon={<PsychologyRounded />}
            text="Prompts"
            link="/dashboard/prompts"
          />
          <NavListItem
            icon={<VerifiedRounded />}
            text="Location Approval"
            link="/dashboard/admin/approval"
          />
          <NavListItem
            icon={<SmartToyRounded />}
            text="Assistant Manager"
            link="/dashboard/admin/assistants"
          />
          <NavListItem
            icon={<BarChartRounded />}
            text="Usage Monitor"
            link="/dashboard/admin/usage"
          />
        </List>
        <Divider />
      </>
    )}
  </>
);

/** Platform super-admin: JWT admin claim only (see isGlobalAdmin). Regional admins UI is exclusive to this drawer. */
export const GlobalAdminDrawer = ({ onLogout }) => {
  return (
  <>
    <List>
      <NavListItem
        icon={<PsychologyRounded />}
        text="Prompts"
        link="/dashboard/prompts"
      />
      <NavListItem
        icon={<VerifiedRounded />}
        text="Location Approval"
        link="/dashboard/admin/approval"
      />
      <NavListItem
        icon={<PeopleRounded />}
        text="Regional admins"
        link="/dashboard/admin/regional-admins"
      />
      <NavListItem
        icon={<FactCheckRounded />}
        text="HIPAA Compliance"
        link="/dashboard/admin/hipaa-compliance"
      />
      <NavListItem
        icon={<SmartToyRounded />}
        text="Assistant Manager"
        link="/dashboard/admin/assistants"
      />
      <NavListItem
        icon={<BarChartRounded />}
        text="Usage Monitor"
        link="/dashboard/admin/usage"
      />
    </List>
    <Divider />
    <List>
      <NavListItem
        icon={<SettingsRounded />}
        text="Settings"
        link="/dashboard/settings"
      />
      <NavListItem icon={<MapRounded />} text="CareMap" link="/" />
    </List>
    <Divider />
    <List>
      <NavListItem
        icon={<LogoutRounded />}
        text="Log Out"
        onClick={onLogout}
      />
    </List>
  </>
  );
};

/** Regional prompt editor: prompts + shared nav only (no platform admin tools). */
export const RegionalAdminDrawer = ({ onLogout }) => (
  <>
    <List>
      <NavListItem
        icon={<PsychologyRounded />}
        text="Prompts"
        link="/dashboard/prompts"
      />
    </List>
    <Divider />
    <List>
      <NavListItem
        icon={<SettingsRounded />}
        text="Settings"
        link="/dashboard/settings"
      />
      <NavListItem icon={<MapRounded />} text="CareMap" link="/" />
    </List>
    <Divider />
    <List>
      <NavListItem
        icon={<LogoutRounded />}
        text="Log Out"
        onClick={onLogout}
      />
    </List>
  </>
);

export const ChartMindManagerDrawer = () => (
  <>
    <List>
      <NavListItem
        icon={<PsychologyRounded />}
        text="Prompts"
        secondary="Manage AI prompts"
        link="/dashboard/prompts"
      />
      <NavListItem
        icon={<BusinessRounded />}
        text="Team"
        secondary="Manage your team"
        link="/dashboard/team"
      />
      <NavListItem
        icon={<BarChartRounded />}
        text="Usage"
        secondary="Monitor token usage"
        link="/dashboard/usage"
      />
    </List>
    <Divider />
  </>
);

export const FacilityDrawer = ({ activeSubscriptionRole, userData }) => (
  <>
    <List>
      <NavListItem
        icon={<ScheduleRounded />}
        text="Status Board"
        link="/dashboard"
      />
      <NavListItem
        icon={<CalendarMonthRounded />}
        text="Schedule"
        link="/dashboard/schedule"
      />
      {/* TODO: Virtual Queue + Virtual Registration disabled until Twilio BAA is in place */}
      {/* <NavListItem
        icon={<PeopleRounded />}
        text="Virtual Queue"
        link="/dashboard/queue"
      />
      <NavListItem
        icon={<SmsRounded />}
        text="Virtual Registration"
        link="/dashboard/virtual-registration"
      /> */}
      <NavListItem
        icon={<CampaignRounded />}
        text="Advertise"
        link="/dashboard/advertising"
      />
    </List>
    <Divider />
    {!activeSubscriptionRole && userData?.role === "facility" && (
      <>
        <List>
          <NavListItem
            icon={<MedicalInformationRounded />}
            text="Upgrade to CareMap Plus"
            link="/dashboard/upgrade"
          />
        </List>
        <Divider />
      </>
    )}
  </>
);

const EmailDialog = ({ open, onClose, onCopy }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>We weren't able to open your email client.</DialogTitle>
    <DialogContent>
      <DialogContentText>
        It looks like you don't have a default email client selected. If you'd
        like to send your chat transcript by email, please copy it to your
        clipboard using the button below.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button variant="contained" onClick={onCopy}>
        Copy Chat Transcript
      </Button>
      <Button onClick={onClose} autoFocus>
        Close
      </Button>
    </DialogActions>
  </Dialog>
);
