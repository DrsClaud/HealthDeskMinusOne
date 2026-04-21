import React from "react";
import styled from "styled-components";

const InputWrapper = styled.div`
  border-bottom: 0.55px solid #c8c7cc;
  margin-bottom: 10px;
`;

const Input = styled.textarea`
  display: block;
  width: 100%;
  background: transparent;
  border: 0;
  font-size: 17px;
  font-weight: 400;
`;

const Label = styled.label`
  display: block;
  width: 100%;
`;

const Textarea = ({ name, label, register, rows, defaultValue, onChange }) => {
  return (
    <InputWrapper>
      <Label htmlFor="name">{label}</Label>
      <Input
        id={name}
        rows={rows}
        {...(register &&
          register(name, {
            onChange: onChange,
          }))}
        defaultValue={defaultValue}
      />
    </InputWrapper>
  );
};

export default Textarea;
