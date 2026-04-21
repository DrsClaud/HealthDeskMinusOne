import styled, { css } from "styled-components";

const Columns = styled.div`
  display: flex;

  > * {
    flex: 1;
    flex-basis: 50%;
  }

  > *:first-child {
    flex-grow: 1;
    margin-right: 6px;
  }

  > *:last-child {
    text-align: ${({ $main }) => ($main ? "right" : "center")};
    margin-left: 6px;

    ${({ $main }) =>
      $main &&
      css`
        display: flex;
        justify-content: flex-end;
        align-items: center;
      `}
  }
`;

export default Columns;
