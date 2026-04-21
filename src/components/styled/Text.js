import styled from "styled-components";

const Text = styled.span`
  padding-top: 10px;
  padding-bottom: 10px;
  display: block;
  color: ${(props) => props.theme.colors.primary};
  font-size: 14px;
  text-align: ${({ $center }) => ($center ? "center" : "initial")};

  a {
    font-weight: 700;
  }
`;

export default Text;
