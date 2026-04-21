import React, { useState, useContext, useEffect } from "react";
import Loading from "../Loading";
import firebase from "firebase/compat/app";
import "firebase/compat/functions";
import firebaseApp, { db } from "services/firebase";
import { useForm } from "react-hook-form";
import PlacesAutocomplete from "../PlacesAutocomplete";
import { useStripe } from "@stripe/react-stripe-js";
import ModalGeneric from "../ModalGeneric";
import ModalSlideUp from "../ModalSlideUp";
import { CreateNewApiToken } from "../../API";
import Pricing from "./upgrade/Pricing";
import { Navigate } from "react-router-dom";
import { AuthContext } from "context/Auth";
import MarketingSettings from "./advertising/MarketingSettings";
import ZipSettings from "./advertising/ZipSettings";
import capitalize from "../../utils/helpers/capitalize";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  CampaignRounded,
  LocalHospitalRounded,
  PersonRounded,
} from "@mui/icons-material";
import InfoBox from "components/common/InfoBox";
import AddressSettings from "./AddressSettings";
import { LocationContext } from "context/Location";

const Billing = ({ uid, role }) => {
  const { user, userData, subscription, userLoading } = useContext(AuthContext);

  const { location, locationLoaded } = useContext(LocationContext);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState();
  const [submitted, setSubmitted] = useState();

  const [apiOpen, setApiOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  // const [marketingOpen, setMarketingOpen] = useState(false);
  // const [zipOpen, setZipOpen] = useState(false);
  // const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleLogout = async () => {
    setLoading("logout");
    await firebase.auth().signOut();
    return <Navigate to="/auth" />;
  };

  const sendToPortal = async () => {
    setLoading("portal");

    const functionRef = firebase
      .app()
      .functions("us-central1")
      .httpsCallable("ext-firestore-stripe-payments-createPortalLink");
    const { data } = await functionRef({
      returnUrl: window.location.href,
    });
    window.location.assign(data.url);
  };

  // const switchToBranding = () => {
  //   setMarketingOpen(true);
  // };

  const ApiInfoForm = (showConfirm) => {
    const [confirmingTokenChange, setConfirmingTokenChange] = useState(
      showConfirm === true
    );
    return (
      <ModalGeneric width="60%" visible={apiOpen}>
        <h3>API Token (For Developers)</h3>
        <input
          style={{ width: "100%" }}
          readOnly
          value={userData?.apiToken}
        ></input>
        <Button onClick={() => setConfirmingTokenChange(true)}>
          Create New Token
        </Button>
        <br></br>

        <p>
          In order to query our API, you will need to set the Authorization
          header of the request to this API token.
        </p>
        <p>
          {process.env.REACT_APP_ENV === "production"
            ? "URL Production: https://us-central1-hlthdsk.cloudfunctions.net/api"
            : "URL Staging: https://us-central1-caremap2020.cloudfunctions.net/api/"}{" "}
        </p>
        <label>Endpoints: </label>
        <ul>
          <li>
            GET "/api/registrations/" to return a list of all your facilities
            registrations )
            <p>
              Example Return:
              {`{
"registrations": [
{
"email": "support@hlthdsk.com",
"photoId": "registrations/14mHwvkpXUbblONqlA6S.jpg",
"location": "131313",
"submitted": true,
"id": "14mHwvkpXUbblONqlA6S",
"name": "RDC",
"patient": 1
}
]
}`}
            </p>
          </li>
        </ul>
        <p></p>
        <Button
          onClick={() => {
            setApiOpen(false);
          }}
        >
          Okay
        </Button>

        <ModalSlideUp modalVisible={confirmingTokenChange}>
          <h2>Are you sure you want to update your API Token?</h2>
          <Button
            onClick={() => {
              CreateNewApiToken().then((data) => {
                window.location.reload();
              });
              setConfirmingTokenChange(false);
            }}
          >
            Yes
          </Button>
          <Button onClick={() => setConfirmingTokenChange(false)}>No</Button>
        </ModalSlideUp>
      </ModalGeneric>
    );
  };

  // const AddressForm = () => {
  //   const updateLocation = (latlng, address) => {
  //     location.address = address;
  //     location.lat = latlng.lat;
  //     location.lng = latlng.lng;
  //     db.collection("locations")
  //       .doc(location.id)
  //       .update({ address: address, lat: latlng.lat, lng: latlng.lng })
  //       .then((l) => {
  //         setLocation(l);
  //         window.location.reload();
  //       });
  //   };
  //   return (
  //     <ModalGeneric width="80%" visible={true}>
  //       <label>Address:</label>
  //       <p>{location?.address}</p>

  //       <Search updateLocation={updateLocation} addressField />
  //       <Button onClick={() => setViweingAddressForm(false)}>Close</Button>
  //     </ModalGeneric>
  //   );
  // };

  return (
    <div>
      {subscription ? (
        <Typography variant="h3" sx={{ mt: { xs: 1, sm: 5 }, mb: 4 }}>
          Account
        </Typography>
      ) : (
        <Typography variant="h4" sx={{ mt: { xs: 4, sm: 10 }, mb: 2 }}>
          Subscribe
        </Typography>
      )}

      {submitted ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          {submitted}
        </Alert>
      ) : null}

      {subscription ? (
        <>
          {subscription === "facility" ? (
            <>
              <Typography variant="body1" sx={{ pb: 4, pt: 0 }}>
                {location?.title ? (
                  <span>
                    You're using the{" "}
                    <strong>{capitalize(location.title)}</strong> facility
                    account.
                  </span>
                ) : (
                  <Skeleton />
                )}
              </Typography>

              {/* Advertise section */}
              {/* <InfoBox
                icon={
                  <CampaignRounded fontSize="large" sx={{ color: "#117aca" }} />
                }
                title="Advertise"
                description={
                  <>
                    Promote your facility on HealthDesk in certain ZIP codes.{" "}
                    <Link
                      sx={{ cursor: "pointer" }}
                      onClick={() => setLearnMoreOpen(true)}
                    >
                      Learn more.
                    </Link>
                  </>
                }
                links={[
                  {
                    title: "Edit Branding",
                    onClick: () => {
                      setMarketingOpen(true);
                    },
                  },
                  {
                    title: "Choose ZIP Codes",
                    onClick: () => {
                      setZipOpen(true);
                    },
                  },
                ]}
              /> */}

              {/* Popup for previous section */}
              {/* <MarketingSettings
                user={user}
                data={userData}
                location={location}
                visible={marketingOpen}
                close={() => setMarketingOpen(false)}
                setSubmitted={setSubmitted}
              />

              <ZipSettings
                user={userData}
                location={location}
                switchToBranding={switchToBranding}
                open={zipOpen}
                close={() => setZipOpen(false)}
              /> */}

              {/* <LearnMore
                branding={location?.branding}
                open={learnMoreOpen}
                close={() => setLearnMoreOpen(false)}
              /> */}

              {/* Facility section */}
              <InfoBox
                icon={
                  <LocalHospitalRounded
                    fontSize="large"
                    sx={{ color: "#117aca" }}
                  />
                }
                title="Your Facility"
                description="Edit your facility's information."
                links={[
                  {
                    title: "Manage Your Facility",
                    onClick: () => {
                      setAddressOpen(true);
                    },
                  },
                  // {
                  //   title: "View API Info",
                  //   onClick: () => {
                  //     setApiOpen(true);
                  //   },
                  // },
                ]}
              />
            </>
          ) : null}

          {/* Account section */}
          <InfoBox
            icon={<PersonRounded fontSize="large" sx={{ color: "#117aca" }} />}
            title="Your Account"
            description="Manage your account and subscription."
            links={[
              {
                title: "Manage Subscription",
                onClick: sendToPortal,
                loading: loading,
                loadingCondition: loading === "portal",
              },
              {
                title: "Log Out",
                onClick: handleLogout,
                loading: loading,
                loadingCondition: loading === "logout",
              },
            ]}
          />

          <AddressSettings
            user={user}
            data={userData}
            location={location}
            visible={addressOpen}
            close={() => setAddressOpen(false)}
            setSubmitted={setSubmitted}
          />
          {/* {apiOpen ? <ApiInfoForm /> : null} */}
          {/* {addressOpen ? <AddressSettings location={location} /> : null} */}
        </>
      ) : (
        <Pricing uid={uid} role={userData?.role} subscription={subscription} />
      )}
    </div>
  );
};

const LearnMore = ({ branding, open, close }) => {
  return (
    <Dialog open={open} onClose={close}>
      <DialogTitle>Advertising with HealthDesk</DialogTitle>

      <DialogContent>
        <DialogContentText variant="body2" sx={{ mb: 2 }}>
          Your branding will appear whenever users are in your ZIP code. Your
          facility's logo and a link to your facility's website will be placed
          at the top of the{" "}
          <Link href="/" target="_blank">
            facility map
          </Link>{" "}
          and the <Link href="/dashboard">Medical SuperIntelligence</Link>.
        </DialogContentText>

        {branding ? (
          <DialogContentText variant="body2" sx={{ mb: 2 }}>
            Your branding will appear like this:
          </DialogContentText>
        ) : null}

        {branding ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              mt: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: 12, mb: 1 }}
            >
              Health Care's Help Desk is sponsored by
            </Typography>
            <a href={branding?.website} target="_blank" rel="noopener">
              <img
                src={branding?.logo}
                style={{ maxHeight: "90px", maxWidth: "100%" }}
              />
            </a>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Billing;
