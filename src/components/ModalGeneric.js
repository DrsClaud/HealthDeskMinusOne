import React, { useState } from "react";
import styled from "styled-components";

const Background = styled.div`
  z-index: 999999;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 200ms ease-in-out;
  pointer-events: ${(props) => (props.$visible ? "initial" : "none")};
`;

const PopupWrapper = styled.div`
  text-align: left;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: auto;

  max-height: 80%;
  max-width: 90%;
  width: ${(props) => (props.width ? props.width : "unset")};
  min-width: 300px;
  z-index: 9999999;
  padding: ${(props) => (props.$close ? "40px" : "10px")} 10px 5px;
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.white};
  font-size: 14px;
  color: ${(props) => props.theme.colors.primary};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  pointer-events: ${(props) => (props.$visible ? "initial" : "none")};
  transition: opacity 200ms ease-in-out;
  max-height: 90%;
  overflow-y: auto;
  img {
    max-width: 175px;
    margin-bottom: -10px;
  }

  h1 {
    text-align: center;
    font-weight: 500;
    font-size: 20px;
    margin-bottom: 0;
  }

  label {
    display: block;
  }

  .warning {
    color: rgb(223, 32, 32);
  }

  @media (max-width: 480px) {
    overflow-y: scroll;
    max-height: 70vh;
  }
`;

export default ({ children, visible, toggleModal, width, close }) => {
  return (
    <>
      <Background $visible={visible} />
      <PopupWrapper $visible={visible} width={width} $close={close}>
        {children}
      </PopupWrapper>
    </>
  );
};
