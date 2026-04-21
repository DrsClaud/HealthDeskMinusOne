import React from "react";
import styled from "styled-components";

const IconWrapper = styled.span`
  border: none;
  background: none;
  font-size: ${({ $small }) => ($small ? "18px" : "24px")};
  cursor: pointer;
  padding: 1px 4px;

  svg {
    display: block;
    fill: ${(props) => props.theme.colors.darkgray};
  }
`;

const Icon = ({ icon, small, onClick }) => (
  <IconWrapper $small={small} onClick={onClick}>
    {icon}
  </IconWrapper>
);

export default Icon;
