import React from "react";
import styled from "styled-components";

const InnerWrapper = styled.div`
  margin-top: 55px;
  margin-bottom: 75px;
  padding: 10px;
`;

const DashboardInner = ({ children }) => (
  <InnerWrapper>{children}</InnerWrapper>
);

export default DashboardInner;
