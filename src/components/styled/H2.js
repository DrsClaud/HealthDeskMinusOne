import styled from "styled-components";

const H2 = styled.h2`
  display: flex;
  justify-content: center;
  font-size: 28px;
  text-align: center;

  color: ${(props) =>
    props.$secondary
      ? props.theme.colors.secondary
      : props.gray
      ? props.theme.colors.gray
      : props.theme.colors.primary};
  margin: ${({ $noMargin }) => ($noMargin ? 0 : "0.4rem 0")};
  padding: 0 ${({ $small }) => ($small ? "0.5em" : "1em")};

  &::after {
    content: "\\a";
    white-space: pre;
  }
`;

export default H2;
