import React from "react";
import Loading from "components/Loading";
import ContextBox from "components/chatbot/ContextBox";
import { useAuth } from "hooks/useAuth";

const DiscussSymptomsPage = ({ branding, boxRef }) => {
  const { user, userData } = useAuth();

  if (!user) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Loading page />
      </div>
    );
  }

  return (
    <ContextBox
      branding={branding}
      user={user}
      userData={userData}
      boxRef={boxRef}
    />
  );
};

export default DiscussSymptomsPage;
