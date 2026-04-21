import React from "react";
import styled from "styled-components";

const CloseWrapper = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  padding: 12px;
  font-size: 30px;
  line-height: 20px;
  cursor: pointer;
  z-index: 999;
`;

export default ({ onClick }) => (
  <CloseWrapper onClick={onClick}>&times;</CloseWrapper>
);
