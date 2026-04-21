import React, { useState, useEffect, useContext } from "react";
import firebaseApp, { db } from "services/firebase";
import firebase from "firebase/compat/app";
import { AuthContext } from "context/Auth";
import usePosition from "hooks/usePosition";

export const LocationContext = React.createContext();

export const LocationProvider = ({ children }) => {
  const { user, userData, subscription, userLoading } = useContext(AuthContext);

  const [location, setLocation] = useState();
  const [locationLoaded, setLocationLoaded] = useState(false);

  const getLocation = (id) => {
    return db
      .collection("locations")
      .where("users", "array-contains", id)
      .onSnapshot((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          setLocation(doc.data());
        });

        setLocationLoaded(true);
      });
  };

  useEffect(() => {
    if (user) getLocation(user.uid);
  }, [user]);

  return (
    <LocationContext.Provider
      value={{
        location,
        locationLoaded,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
