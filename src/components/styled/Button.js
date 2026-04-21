import styled from "styled-components";

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${({ $noMargin }) => ($noMargin ? "auto" : "100%")};
  border-radius: 4px;
  height: ${({ $small }) => ($small ? "2.4em" : "2.8em")};
  font-size: ${({ $small }) => ($small ? "14px" : "16px")};
  border: 0;
  color: ${({ $gray, theme }) =>
    $gray ? theme.colors.darkgray : theme.colors.white};
  background-color: ${({ $gray, $secondary, theme }) =>
    $secondary
      ? theme.colors.secondary
      : $gray
      ? theme.colors.gray
      : theme.colors.primary};
  margin: ${({ $noMargin }) => ($noMargin ? 0 : "0.4rem 0")};
  padding: 0 ${({ $small }) => ($small ? "0.5em" : "1em")};
  cursor: pointer;
`;

export default Button;
