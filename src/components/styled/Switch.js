import React from "react";
import styled from "styled-components";

const InputWrapper = styled.div`
  display: flex;
  align-items: center;

  & > label {
    color: ${(props) => props.theme.colors.primary};
  }
`;

const SwitchWrapper = styled.div`
  margin-left: auto;

  input {
    position: absolute;
    height: 0;
    width: 0;
    visibility: hidden;

    &:checked + label span {
      left: calc(100% - 2px);
      transform: translateX(-100%);
    }
  }

  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    width: 50px;
    height: 25px;
    background: ${(props) => (props.$on ? props.theme.colors.primary : "grey")};
    border-radius: 100px;
    position: relative;
    transition: background-color 0.2s;

    &:active span {
      width: 30px;
    }
  }

  span {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 21px;
    height: 21px;
    border-radius: 45px;
    transition: 0.2s;
    background: #fff;
    box-shadow: 0 0 2px 0 rgba(10, 10, 10, 0.29);
  }
`;

const Switch = ({ label, onChange, defaultValue }) => {
  return (
    <InputWrapper>
      <label htmlFor="switch">{label}</label>
      <SwitchWrapper $on={defaultValue}>
        <input
          id="switch"
          type="checkbox"
          onChange={onChange}
          checked={defaultValue}
        />
        <label htmlFor="switch">
          <span />
        </label>
      </SwitchWrapper>
    </InputWrapper>
  );
};

export default Switch;
