import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import firebaseApp, { db } from "services/firebase";
import { AuthContext } from "context/Auth";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormHelperText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useNavigate } from "react-router-dom";
import DashboardPageHeader from "components/common/DashboardPageHeader";

const ApprovalTable = ({ rows, selected, onSelectAll, onSelectOne }) => (
  <TableContainer component={Paper} sx={{ mb: 4 }}>
    <Table sx={{ minWidth: 650 }} aria-label="approval table">
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={
                selected.length > 0 && selected.length < rows.length
              }
              checked={rows.length > 0 && selected.length === rows.length}
              onChange={onSelectAll}
              inputProps={{ "aria-label": "select all locations" }}
            />
          </TableCell>
          <TableCell>Clinic Name</TableCell>
          <TableCell>Address</TableCell>
          <TableCell>City</TableCell>
          <TableCell>State</TableCell>
          <TableCell>ZIP</TableCell>
          <TableCell>Map</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Registration Date</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
          >
            <TableCell padding="checkbox">
              <Checkbox
                color="primary"
                checked={selected.includes(row.id)}
                onClick={(event) => onSelectOne(event, row.id)}
              />
            </TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>{row.address}</TableCell>
            <TableCell>{row.city}</TableCell>
            <TableCell>{row.state}</TableCell>
            <TableCell>{row.zip}</TableCell>
            <TableCell>
              <a
                target="_blank"
                href={`https://www.google.com/maps/place/${row.lat},${row.lng}`}
              >
                Link
              </a>
            </TableCell>
            <TableCell>{row.email || "No email"}</TableCell>
            <TableCell>
              {row.registrationDate
                ? row.registrationDate.toDate().toLocaleDateString()
                : "No date"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const ActionButtons = ({ selected, error, loading, onApprove, onReject }) => (
  <>
    <LoadingButton
      disabled={!selected.length || !!error || !!loading}
      variant="contained"
      loading={loading === "approve"}
      onClick={onApprove}
      size="large"
      sx={{ display: "block", mb: 3 }}
    >
      Approve Selected Locations
    </LoadingButton>

    <LoadingButton
      disabled={!selected.length || !!error || !!loading}
      variant="contained"
      color="error"
      loading={loading === "reject"}
      onClick={onReject}
      size="large"
      sx={{ display: "block" }}
    >
      Reject Selected Locations
    </LoadingButton>
  </>
);

const ApprovalPage = () => {
  const { user, userData, subscription, userLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (!a.registrationDate) return 1;
        if (!b.registrationDate) return -1;
        return b.registrationDate.toDate() - a.registrationDate.toDate();
      }),
    [rows]
  );

  const handleSelectAllClick = useCallback(
    (event) => {
      setSelected(event.target.checked ? rows.map((n) => n.id) : []);
    },
    [rows]
  );

  const handleClick = useCallback(
    (event, id) => {
      const selectedIndex = selected.indexOf(id);
      let newSelected = [];

      if (selectedIndex === -1) {
        newSelected = [...selected, id];
      } else {
        newSelected = selected.filter((itemId) => itemId !== id);
      }
      setSelected(newSelected);
    },
    [selected]
  );

  useEffect(() => {
    const fetchData = async () => {
      const locationsSnapshot = await db
        .collection("locations")
        .where("status", "==", "pending")
        .get();

      const locations = [];
      const userIds = new Set();

      locationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          locations.push({ ...data, id: doc.id });
          if (data.users) {
            data.users.forEach((userId) => userIds.add(userId));
          }
        }
      });

      if (userIds.size > 0) {
        const usersSnapshot = await db
          .collection("users")
          .where("uid", "in", Array.from(userIds))
          .get();

        const userData = {};
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          userData[data.uid] = {
            email: data.email,
            registrationDate: data.registrationDate,
          };
        });

        locations.forEach((location) => {
          if (location.users && location.users.length > 0) {
            const firstUser = userData[location.users[0]];
            location.email = location.users
              .map((userId) => userData[userId]?.email)
              .join(", ");
            location.registrationDate = firstUser?.registrationDate || null;
          }
        });
      }

      setRows(locations);
      setDataLoaded(true);
    };

    fetchData();
  }, []);

  const getUserEmails = async (ids) => {
    let userIds = [];
    let userEmails = [];

    ids.forEach((id) => {
      const users = rows.find((row) => row.id === id).users;
      userIds.push(...users);
    });

    await db
      .collection("users")
      .where("uid", "in", userIds)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          userEmails.push(doc.data().email);
        });
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });

    return userEmails;
  };

  const approveLocations = async () => {
    try {
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) throw new Error("Authentication required");

      const userDoc = await db.collection("users").doc(currentUser.uid).get();
      const userData = userDoc.data();

      if (!userData?.admin) throw new Error("Insufficient permissions");
      if (!selected.length || selected.length > 30)
        throw new Error("Invalid selection count");

      setLoading("approve");
      setSubmitted();

      await db.runTransaction(async (transaction) => {
        const locationRefs = selected.map((id) =>
          db.collection("locations").doc(id)
        );
        const docs = await Promise.all(
          locationRefs.map((ref) => transaction.get(ref))
        );

        if (
          docs.some((doc) => !doc.exists || doc.data().status !== "pending")
        ) {
          throw new Error("Invalid location selection");
        }

        locationRefs.forEach((ref) => {
          transaction.update(ref, {
            status: "approved",
            approvedBy: currentUser.uid,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        });
      });

      const emails = await getUserEmails(selected);
      const batch = db.batch();

      emails.forEach((email) => {
        batch.set(db.collection("emails").doc(), {
          to: [email],
          message: {
            subject: "Your HealthDesk Listing Has Been Approved",
            html: `<p>Your HealthDesk listing has been approved and is now visible for patients to see on the map.</p>
            <p>You can update the current estimated waiting time for your clinic and more from the <a href="https://${window.location.host}/dashboard">HealthDesk dashboard</a>.</p>
            <p>Best, <br />
            The HealthDesk Team</p>`,
          },
        });
      });

      batch.commit().then(() => {
        setRows(rows.filter((row) => !selected.includes(row.id)));
        setSelected([]);
        setLoading(false);
        setSubmitted("The selected locations have been approved.");
      });
    } catch (error) {
      console.error("Approval error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const rejectLocations = async () => {
    if (!selected.length) return;

    setLoading("reject");
    setSubmitted();

    let batch = db.batch();

    selected.forEach((id) => {
      batch.set(
        db.collection("locations").doc(id),
        { status: "rejected" },
        { merge: true }
      );
    });

    const emails = await getUserEmails(selected);

    emails.forEach((email) => {
      batch.set(db.collection("emails").doc(), {
        to: [email],
        message: {
          subject: "Your My HealthDesk Listing Has Been Rejected",
          html: `<p>Your My HealthDesk listing has been rejected and will not be visible for patients to see on the map.</p><p>If you think this decision has been made in error, please contact us at support@hlthdsk.com.</p>`,
        },
      });
    });

    batch.commit().then(() => {
      setRows(rows.filter((row) => !selected.includes(row.id)));
      setSelected([]);
      setLoading(false);
      setSubmitted("The selected locations have been rejected.");
    });
  };

  // Cap of 30 due to Firebase `in` query limit
  useEffect(() => {
    if (selected.length > 30) {
      setError("A maximum of 30 locations can be approved at once.");
    } else {
      if (error) setError();
    }
  }, [selected]);

  if (userData && !userData?.admin) navigate("/dashboard");

  if (userData?.admin)
    return (
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <DashboardPageHeader
            title="Approval"
            subtitle="Approve Urgent Care locations and allow them to appear on the map."
          />

          {submitted ? (
            <Alert severity="success" sx={{ mt: 3, mb: 4 }}>
              {submitted}
            </Alert>
          ) : null}
        </Box>

        {rows.length > 0 ? (
          <Box>
            <ApprovalTable
              rows={sortedRows}
              selected={selected}
              onSelectAll={handleSelectAllClick}
              onSelectOne={handleClick}
            />
            <ActionButtons
              selected={selected}
              error={error}
              loading={loading}
              onApprove={approveLocations}
              onReject={rejectLocations}
            />
            {error && (
              <FormHelperText error sx={{ mt: 2 }}>
                {error}
              </FormHelperText>
            )}
          </Box>
        ) : dataLoaded ? (
          <Alert severity="info">You're all caught up!</Alert>
        ) : (
          <CircularProgress size={30} />
        )}
      </Box>
    );
};

export default ApprovalPage;
