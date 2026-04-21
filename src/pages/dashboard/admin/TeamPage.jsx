import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import { MoreVertRounded, PersonAdd } from "@mui/icons-material";
import { useAuth } from "hooks/useAuth";
import InviteTeamDialog from "components/dashboard/admin/InviteTeamDialog";
import ConfirmDialog from "components/common/ConfirmDialog";
import DashboardPageHeader from "components/common/DashboardPageHeader";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import { useNavigate } from "react-router-dom";

/**
 * TeamPage - Manage team members
 *
 * Allows ChartMind Managers (admins) to:
 * - Invite providers (professionals) via email
 * - View pending invitations
 * - View current team members
 */
const TeamPage = () => {
  const {
    user,
    userData,
    subscriptionData,
    organization,
    organizationMembers: members,
    organizationInvitations: invitations,
    organizationLoading: loadingData,
    refreshOrganizationTeamData,
  } = useAuth();
  const navigate = useNavigate();

  // Dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmCancelInviteOpen, setConfirmCancelInviteOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [keepMenuItemOnClose, setKeepMenuItemOnClose] = useState(false);

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  // Track when both members and invitations have loaded at least once
  const [dataInitialized, setDataInitialized] = useState(false);
  const [initialMembersCount, setInitialMembersCount] = useState(null);
  const [initialInvitationsCount, setInitialInvitationsCount] = useState(null);

  // Wait for both members and invitations to have loaded at least once
  useEffect(() => {
    // Only proceed if organizationLoading has completed
    if (loadingData !== false) return;

    // Track the first load of each collection
    if (initialMembersCount === null) {
      setInitialMembersCount(members.length);
    }
    if (initialInvitationsCount === null) {
      setInitialInvitationsCount(invitations.length);
    }

    // Once both have been set, we know both snapshots have arrived
    if (initialMembersCount !== null && initialInvitationsCount !== null) {
      setDataInitialized(true);
    }
  }, [
    loadingData,
    members,
    invitations,
    initialMembersCount,
    initialInvitationsCount,
  ]);

  const totalSeats = organization?.seats?.total || 0;
  const usedSeats = organization?.seats?.used || 0;
  const availableSeats = totalSeats - usedSeats;
  const hasSeatsAvailable = availableSeats > 0;

  const handleMenuOpen = (event, item) => {
    setMenuAnchor(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // Don't clear menuItem here - let the Menu's onExited callback handle it
  };

  const handleCancelInviteClick = () => {
    if (!menuItem) return;
    setKeepMenuItemOnClose(true);
    setMenuAnchor(null);
    setConfirmCancelInviteOpen(true);
  };

  const handleCancelInviteConfirm = async () => {
    if (!menuItem) return;
    setCancelling(true);
    try {
      await db.collection("invitations").doc(menuItem.id).update({
        status: "revoked",
        revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
        revokedBy: user.uid,
      });
      await refreshOrganizationTeamData();
      setSuccessMessage(`Invitation to ${menuItem.displayEmail} has been cancelled.`);
      setConfirmCancelInviteOpen(false);
    } catch (err) {
      console.error("Error canceling invitation:", err);
      alert(err.message || "Failed to cancel invitation");
    } finally {
      setCancelling(false);
    }
  };

  const handleRemoveMember = () => {
    if (!menuItem) return;
    setKeepMenuItemOnClose(true); // Don't clear menuItem when menu closes
    setMenuAnchor(null); // Close menu but keep menuItem
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!menuItem) return;
    setRemoving(true);

    try {
      // Call cloud function to remove member
      const removeMember = firebase.functions().httpsCallable("removeMember");
      await removeMember({ memberId: menuItem.id });
      await refreshOrganizationTeamData();

      // Show success message
      const memberName =
        menuItem.displayName !== "—"
          ? menuItem.displayName
          : menuItem.displayEmail;
      setSuccessMessage(`${memberName} has been removed from the team.`);
      setConfirmRemoveOpen(false);
    } catch (err) {
      console.error("Error removing member:", err);
      alert(err.message || "Failed to remove member");
    } finally {
      setRemoving(false);
      // Don't clear menuItem here - let the Dialog's onExited callback handle it
    }
  };

  // Combine and sort members + pending invitations
  const allTeamMembers = [
    ...members.map((m) => ({
      ...m,
      type: "member",
      sortOrder: 1,
      displayName: `${m.name || ""} ${m.lastName || ""}`.trim() || "—",
      displayEmail: m.email || m.phone || "—",
    })),
    ...invitations
      .filter((i) => i.status === "pending")
      .map((i) => ({
        ...i,
        type: "invitation",
        sortOrder: 2,
        displayName: "—",
        displayEmail: i.email,
      })),
  ].sort((a, b) => {
    // Active members first, then pending
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    // Then alphabetically by name/email
    const aName = a.displayName !== "—" ? a.displayName : a.displayEmail;
    const bName = b.displayName !== "—" ? b.displayName : b.displayEmail;
    return aName.localeCompare(bName);
  });

  return (
    <Box>
      <DashboardPageHeader
        title="Team"
        subtitle="Manage your ChartMind team members."
        actions={
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Team Member
          </Button>
        }
      />

      {/* Loading state for dynamic content (null = not initialized, true = loading) */}
      {!dataInitialized ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Team Table */}
          {allTeamMembers.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allTeamMembers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box>
                          {item.displayName !== "—" && (
                            <Typography variant="body2" fontWeight={600}>
                              {item.displayName}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: item.displayName !== "—" ? 0.5 : 0,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {item.displayEmail}
                            </Typography>
                            {item.type === "invitation" && (
                              <Chip
                                label="Pending"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            item.type === "invitation"
                              ? "text.secondary"
                              : "text.primary"
                          }
                        >
                          {item.role === "admin" ? "Admin" : "Member"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.id !== user.uid && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, item)}
                          >
                            <MoreVertRounded fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                No team members yet. Click "Add Member" to invite someone.
              </Typography>
            </Paper>
          )}

          {/* Actions Menu */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            TransitionProps={{
              onExited: () => {
                // Only clear menuItem if not opening remove dialog
                if (!keepMenuItemOnClose) {
                  setMenuItem(null);
                }
              },
            }}
          >
            {menuItem?.type === "invitation" ? (
              <MenuItem onClick={handleCancelInviteClick}>
                Cancel Invitation
              </MenuItem>
            ) : (
              <MenuItem onClick={handleRemoveMember}>Remove from Team</MenuItem>
            )}
          </Menu>

          {/* Remove Member Confirmation */}
          <ConfirmDialog
            open={confirmRemoveOpen}
            onClose={() => !removing && setConfirmRemoveOpen(false)}
            title="Remove Team Member"
            message={
              <>
                Are you sure you want to remove{" "}
                {menuItem?.displayName !== "—"
                  ? menuItem?.displayName
                  : menuItem?.displayEmail}{" "}
                from the team? This will revoke their access to the
                organization.
              </>
            }
            confirmLabel="Remove"
            confirmColor="error"
            loading={removing}
            onConfirm={confirmRemoveMember}
            onExited={() => {
              setMenuItem(null);
              setKeepMenuItemOnClose(false);
            }}
          />

          {/* Cancel Invitation Confirmation */}
          <ConfirmDialog
            open={confirmCancelInviteOpen}
            onClose={() => !cancelling && setConfirmCancelInviteOpen(false)}
            title="Cancel Invitation"
            message={
              <>
                Are you sure you want to cancel the invitation to{" "}
                <strong>{menuItem?.displayEmail}</strong>? They will not be able
                to join with this link.
              </>
            }
            confirmLabel="Cancel Invitation"
            loading={cancelling}
            onConfirm={handleCancelInviteConfirm}
            onExited={() => {
              setMenuItem(null);
              setKeepMenuItemOnClose(false);
            }}
          />

          {/* Success Snackbar */}
          <Snackbar
            open={!!successMessage}
            autoHideDuration={4000}
            onClose={() => setSuccessMessage("")}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSuccessMessage("")}
              severity="success"
              sx={{ width: "100%" }}
            >
              {successMessage}
            </Alert>
          </Snackbar>

          {/* Invite Dialog */}
          <InviteTeamDialog
            open={inviteDialogOpen}
            onClose={() => setInviteDialogOpen(false)}
            onInvitationsSent={refreshOrganizationTeamData}
            totalSeats={totalSeats}
            usedSeats={usedSeats}
            members={members}
            invitations={invitations}
            subscriptionData={subscriptionData}
          />
        </>
      )}
    </Box>
  );
};

export default TeamPage;
