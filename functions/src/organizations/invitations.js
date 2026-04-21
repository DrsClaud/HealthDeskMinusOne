const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../config/firebase");
const crypto = require("crypto");
const { runtimeConfigSecret, getRuntimeConfig } = require("../runtimeConfig");

/**
 * Remove a member from an organization
 * Called by admin users to remove members from their organization
 */
exports.removeMember = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to remove members.",
    );
  }

  const adminUid = context.auth.uid;
  const { memberId } = data;

  // Validate input
  if (!memberId || typeof memberId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Member ID is required.",
    );
  }

  // Prevent self-removal
  if (memberId === adminUid) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "You cannot remove yourself from the organization.",
    );
  }

  try {
    // Get admin user data
    const adminDoc = await db.collection("users").doc(adminUid).get();

    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Admin user not found.",
      );
    }

    const adminData = adminDoc.data();

    // Verify user is admin
    if (adminData.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can remove members.",
      );
    }

    // Verify admin has an organization
    if (!adminData.organizationId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Admin does not have an organization.",
      );
    }

    // Get member data
    const memberDoc = await db.collection("users").doc(memberId).get();

    if (!memberDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Member not found.");
    }

    const memberData = memberDoc.data();

    // Verify member is in the same organization
    if (memberData.organizationId !== adminData.organizationId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This member is not in your organization.",
      );
    }

    // Prevent removing admin users (they don't count as seats anyway)
    if (memberData.role === "admin") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cannot remove admin users from the organization.",
      );
    }

    // Remove member from organization
    await db.collection("users").doc(memberId).update({
      organizationId: admin.firestore.FieldValue.delete(),
      isOrganizationOwner: admin.firestore.FieldValue.delete(),
      joinedOrganizationAt: admin.firestore.FieldValue.delete(),
    });

    // Decrement used seats (only professionals count as seats)
    // Note: Admins never count toward seats.used, only invited professionals do
    if (memberData.role === "professional") {
      await db
        .collection("organizations")
        .doc(adminData.organizationId)
        .update({
          "seats.used": admin.firestore.FieldValue.increment(-1),
        });
    }

    functions.logger.info(
      `Admin ${adminUid} removed member ${memberId} from organization ${adminData.organizationId}`,
    );

    return {
      success: true,
      message: "Member removed from organization",
    };
  } catch (error) {
    functions.logger.error("Error removing member:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", "Error removing member");
  }
});

/**
 * Return sanitized team data for the caller's organization.
 * This keeps PHI/extra user fields off the client by avoiding direct users queries.
 */
exports.getOrganizationTeamData = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be logged in to load team data.",
      );
    }

    const requesterUid = context.auth.uid;

    try {
      const requesterDoc = await db.collection("users").doc(requesterUid).get();
      if (!requesterDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found.");
      }

      const requester = requesterDoc.data();
      if (requester.role !== "admin" || !requester.organizationId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only organization admins can load team data.",
        );
      }

      const orgId = requester.organizationId;

      const [membersSnap, invitationsSnap] = await Promise.all([
        db
          .collection("users")
          .where("organizationId", "==", orgId)
          .where("role", "==", "professional")
          .get(),
        db
          .collection("invitations")
          .where("organizationId", "==", orgId)
          .where("status", "in", ["pending", "accepted"])
          .get(),
      ]);

      // Explicit allowlist: only fields needed by Team UI
      const members = membersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || "",
          lastName: d.lastName || "",
          email: d.email || "",
          role: d.role || "",
          joinedOrganizationAt: d.joinedOrganizationAt?.toMillis?.() || null,
        };
      });

      const invitations = invitationsSnap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            email: d.email || "",
            status: d.status || "",
            role: d.role || "",
            createdAt: d.createdAt?.toMillis?.() || null,
            expiresAt: d.expiresAt?.toMillis?.() || null,
            acceptedAt: d.acceptedAt?.toMillis?.() || null,
          };
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      return {
        success: true,
        organizationId: orgId,
        members,
        invitations,
      };
    } catch (error) {
      functions.logger.error("Error loading organization team data:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Error loading organization team data",
      );
    }
  },
);

/**
 * Send invitation to join organization
 * Called by admin users to invite professionals to their organization
 */
exports.sendInvitation = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to send invitations.",
    );
  }

  const adminUid = context.auth.uid;
  const { email } = data;

  // Validate input
  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email is required.",
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
  if (!emailRegex.test(normalizedEmail)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid email address.",
    );
  }

  try {
    // Get admin user data
    const adminDoc = await db.collection("users").doc(adminUid).get();

    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Admin user not found.",
      );
    }

    const adminData = adminDoc.data();

    // Verify user is admin
    if (adminData.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can send invitations.",
      );
    }

    // Verify admin has an organization
    if (!adminData.organizationId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Admin does not have an organization set up.",
      );
    }

    // Get organization details
    const orgDoc = await db
      .collection("organizations")
      .doc(adminData.organizationId)
      .get();

    if (!orgDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Organization not found.",
      );
    }

    const organizationData = orgDoc.data();
    const organizationName = organizationData.name || "An Organization";

    // Check if user already exists and is already part of an organization
    const existingUserQuery = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      const existingUser = existingUserQuery.docs[0].data();

      // Check if already in an organization
      if (existingUser.organizationId) {
        if (existingUser.organizationId === adminData.organizationId) {
          throw new functions.https.HttpsError(
            "already-exists",
            "This user is already a member of your organization.",
          );
        } else {
          throw new functions.https.HttpsError(
            "already-exists",
            "This user is already part of another organization.",
          );
        }
      }

      // Check if user has correct role (we're only inviting professionals for now)
      if (existingUser.role !== "professional") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "This user is not a healthcare provider (professional account).",
        );
      }
    }

    // Check for existing pending invitation
    const existingInviteQuery = await db
      .collection("invitations")
      .where("organizationId", "==", adminData.organizationId)
      .where("email", "==", normalizedEmail)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingInviteQuery.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        "A pending invitation already exists for this email.",
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation (no organizationName stored - fetch from org doc when needed)
    const invitationData = {
      organizationId: adminData.organizationId,
      email: normalizedEmail,
      role: "professional", // Role to assign when invitation is accepted
      invitedBy: adminUid,
      invitedByName: `${adminData.name} ${adminData.lastName}`,
      token,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ),
    };

    const invitationRef = await db
      .collection("invitations")
      .add(invitationData);

    // Increment used seats (pending invitation reserves a seat)
    // Note: Only professionals count toward seats - admins don't use ChartMind
    await db
      .collection("organizations")
      .doc(adminData.organizationId)
      .update({
        "seats.used": admin.firestore.FieldValue.increment(1),
      });

    // Send invitation email
    const appUrl = getRuntimeConfig().app?.url || "https://myhealthdesk.com";
    const inviteUrl = `${appUrl}/join/${token}`;

    const emailRef = await db.collection("emails").add({
      to: [normalizedEmail],
      message: {
        subject: `You've been invited to join ${organizationName} on ChartMind`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to ChartMind!</h2>
            
            <p>Hello,</p>
            
            <p><strong>${adminData.name} ${adminData.lastName}</strong> from <strong>${organizationName}</strong> has invited you to join their ChartMind organization.</p>
            
            <p>ChartMind is an AI-powered medical scribing platform that helps healthcare providers quickly generate clinical notes.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${inviteUrl}" 
                 style="background: #1976d2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br/>
              <a href="${inviteUrl}">${inviteUrl}</a>
            </p>
          </div>
        `,
      },
    });

    functions.logger.info(
      `Invitation sent from ${adminUid} to ${normalizedEmail}`,
      {
        invitationId: invitationRef.id,
        organizationId: adminData.organizationId,
        emailDocId: emailRef.id,
        inviteUrl,
      },
    );

    return {
      success: true,
      message: `Invitation sent to ${normalizedEmail}`,
      invitationId: invitationRef.id,
    };
  } catch (error) {
    functions.logger.error("Error sending invitation:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error sending invitation",
    );
  }
  });

/**
 * Get invitation details by token (public - no auth required)
 * Used to display invitation info before user logs in
 */
exports.getInvitation = functions.https.onCall(async (data, context) => {
  const { token } = data;

  if (!token || typeof token !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invitation token is required.",
    );
  }

  try {
    // Find invitation by token
    const invitationQuery = await db
      .collection("invitations")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (invitationQuery.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "Invitation not found.",
      );
    }

    const invitationDoc = invitationQuery.docs[0];
    const invitation = invitationDoc.data();

    // Check status
    if (invitation.status !== "pending") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invitation has already been ${invitation.status}.`,
      );
    }

    // Check if expired
    const now = admin.firestore.Timestamp.now();
    if (invitation.expiresAt.seconds < now.seconds) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This invitation has expired.",
      );
    }

    // Fetch organization name
    const orgDoc = await db
      .collection("organizations")
      .doc(invitation.organizationId)
      .get();

    const organizationName = orgDoc.exists
      ? orgDoc.data().name
      : "An Organization";

    // Return public invitation info (no sensitive data)
    return {
      success: true,
      invitation: {
        organizationName,
        invitedByName: invitation.invitedByName,
        email: invitation.email,
      },
    };
  } catch (error) {
    functions.logger.error("Error getting invitation:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error loading invitation",
    );
  }
});

/**
 * Accept invitation to join organization
 * Called when user clicks invitation link
 */
exports.acceptInvitation = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to accept invitations.",
    );
  }

  const uid = context.auth.uid;
  const { token } = data;

  if (!token || typeof token !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invitation token is required.",
    );
  }

  try {
    // Find invitation by token
    const invitationQuery = await db
      .collection("invitations")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (invitationQuery.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "Invitation not found or invalid.",
      );
    }

    const invitationDoc = invitationQuery.docs[0];
    const invitation = invitationDoc.data();

    // Verify invitation status
    if (invitation.status !== "pending") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invitation has already been ${invitation.status}.`,
      );
    }

    // Check if expired
    const now = admin.firestore.Timestamp.now();
    if (invitation.expiresAt.seconds < now.seconds) {
      // Update invitation status to expired
      await invitationDoc.ref.update({
        status: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError(
        "failed-precondition",
        "This invitation has expired.",
      );
    }

    // Get user data
    functions.logger.info(`Attempting to get user document for uid: ${uid}`);
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      functions.logger.error(
        `User document not found for uid: ${uid}. User may have just signed up but profile not created yet.`,
      );
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found. Please complete your account setup first, then try accepting the invitation again.",
      );
    }

    functions.logger.info(
      `User document found for uid: ${uid}, email: ${
        userDoc.data().email
      }, role: ${userDoc.data().role}`,
    );

    const userData = userDoc.data();

    // Verify user email matches invitation
    if (userData.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This invitation was sent to a different email address.",
      );
    }

    // Verify user has the correct role for this invitation
    const invitedRole = invitation.role || "professional"; // Default to professional for backwards compatibility
    if (userData.role !== invitedRole) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `This invitation is for ${
          invitedRole === "admin" ? "an admin" : "a professional"
        } account.`,
      );
    }

    // Check if already in an organization
    if (userData.organizationId) {
      throw new functions.https.HttpsError(
        "already-exists",
        "You are already part of an organization.",
      );
    }

    // Accept invitation: Add user to organization
    const batch = db.batch();

    // Update user with organization ID (no organizationName - fetch from org doc)
    batch.update(userDoc.ref, {
      organizationId: invitation.organizationId,
      isOrganizationOwner: false,
      joinedOrganizationAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update invitation status
    batch.update(invitationDoc.ref, {
      status: "accepted",
      acceptedBy: uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Invitation email + token acceptance is enough proof for this flow.
    // Best-effort mark as verified to avoid redundant email verification friction.
    try {
      await admin.auth().updateUser(uid, { emailVerified: true });
    } catch (verifyErr) {
      functions.logger.warn(
        `Accepted invite but failed to mark email verified for ${uid}`,
        { error: verifyErr?.message || verifyErr },
      );
    }

    functions.logger.info(
      `User ${uid} accepted invitation ${invitationDoc.id}`,
      {
        userId: uid,
        invitationId: invitationDoc.id,
        organizationId: invitation.organizationId,
      },
    );

    return {
      success: true,
      message: "Successfully joined organization",
    };
  } catch (error) {
    functions.logger.error("Error accepting invitation:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error accepting invitation",
    );
  }
});

/**
 * Firestore trigger: Update organization seat count when invitations change
 * Watches: invitations/{invitationId}
 * Updates: organizations/{orgId}.seats.used based on invitation status changes
 */
exports.syncInvitationSeats = functions.firestore
  .document("invitations/{invitationId}")
  .onWrite(async (change, context) => {
    try {
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;

      // Invitation deleted
      if (before && !after) {
        // Only decrement if invitation was pending (reserved a seat)
        if (before.status === "pending" && before.organizationId) {
          await db
            .collection("organizations")
            .doc(before.organizationId)
            .update({
              "seats.used": admin.firestore.FieldValue.increment(-1),
            });

          functions.logger.info(
            `Decremented seats.used for org ${before.organizationId} (invitation ${context.params.invitationId} deleted)`,
          );
        }
        return;
      }

      // Invitation created - handled by sendInvitation function
      if (!before && after) {
        return;
      }

      // Invitation updated - check status changes
      if (before && after) {
        const statusChanged = before.status !== after.status;

        if (statusChanged) {
          const wasPending = before.status === "pending";

          // If invitation moved from pending to expired/declined/revoked, free the seat
          // For "accepted": seat stays reserved (becomes member, no change needed)
          if (
            wasPending &&
            (after.status === "expired" ||
              after.status === "declined" ||
              after.status === "revoked")
          ) {
            await db
              .collection("organizations")
              .doc(after.organizationId)
              .update({
                "seats.used": admin.firestore.FieldValue.increment(-1),
              });

            functions.logger.info(
              `Decremented seats.used for org ${after.organizationId} (invitation ${context.params.invitationId} ${after.status})`,
            );
          }
        }
      }
    } catch (error) {
      functions.logger.error(
        `Error syncing invitation seats for ${context.params.invitationId}:`,
        error,
      );
      // Don't throw - allow invitation operations to continue
    }
  });
