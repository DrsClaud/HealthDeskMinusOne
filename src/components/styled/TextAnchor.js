import styled from "styled-components";

const TextAnchor = styled.a`
  padding-top: 10px;
  padding-bottom: 10px;
  display: block;
  font-weight: bold;
  text-align: ${({ $center }) => ($center ? "center" : "initial")};
`;

export default TextAnchor;
