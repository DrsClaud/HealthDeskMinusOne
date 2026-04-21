import React from "react";
import styled from "styled-components";

const InputWrapper = styled.div`
  border-top: ${(props) => (props.top ? "0.55px solid #c8c7cc" : "none")};
  padding-top: ${(props) => (props.top ? "10px" : "0")};
  border-bottom: 0.55px solid #c8c7cc;
  margin-bottom: 10px;
  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const Input = styled.input`
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
`;

const ControlledInputField = ({
  name,
  label,
  type,
  top,
  placeholder,
  autocomplete,
  defaultValue,
  onChange,
}) => {
  return (
    <InputWrapper top={top}>
      <Label htmlFor="name">{label}</Label>
      <Input
        type={type || "text"}
        id={name}
        placeholder={placeholder}
        autocomplete={autocomplete}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    </InputWrapper>
  );
};

export default ControlledInputField;
