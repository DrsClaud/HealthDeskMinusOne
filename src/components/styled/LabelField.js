import React from "react";
import styled from "styled-components";

const LabelWrapper = styled.div`
  border-top: ${(props) => (props.top ? "0.55px solid #c8c7cc" : "none")};
  padding-top: ${(props) => (props.top ? "10px" : "0")};
  border-bottom: 0.55px solid #c8c7cc;
  margin-bottom: 10px;
`;

const LabelValue = styled.label`
  display: block;
  width: 100%;
  background: transparent;
  border: 0;
  height: 40px;
  font-size: 17px;
  font-weight: 400;
`;

const Label = styled.label`
  text-align: left;
  display: block;
  width: 100%;
  font-size: ${({ $large }) => ($large ? "14px" : "12px")};
  display: flex;
`;

const LabelField = ({
  name,
  label,
  type,
  register,
  top,
  placeholder,
  autocomplete,
  defaultValue,
  value,
  onChange,
}) => {
  return (
    <LabelWrapper top={top}>
      <Label htmlFor="name">{label}</Label>
      <LabelValue>{value}</LabelValue>
    </LabelWrapper>
  );
};

export default LabelField;
