import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const TextLink = styled(({ $center, ...props }) => <Link {...props} />)`
  font-weight: bold;
  padding-top: 10px;
  padding-bottom: 10px;
  display: block;
  text-align: ${({ $center }) => ($center ? "center" : "initial")};
`;

export default TextLink;
