import styled from "styled-components";

const Label = styled.label`
  flex: 1;
  margin-right: 2px;
  margin-bottom: 10px;
  text-align: center;
  font-size: 14px;

  div {
    display: block;
    height: ${({ $schedule }) => ($schedule ? "40px" : "50px")};
    width: 38px;

    cursor: pointer;
  }

  img {
    width: 100%;
    padding: 2px;
  }

  input {
    visibility: hidden;
  }

  &:last-child {
    margin-top: 0;
  }
`;

export default Label;
