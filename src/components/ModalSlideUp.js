import React, { useState } from "react";
import styled from "styled-components";

const Background = styled.div`
  z-index: 99999;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  height: 100vh;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 200ms ease-in-out;
  pointer-events: ${(props) => (props.visible ? "auto" : "none")};

  @media (min-width: 479px) {
    display: none;
  }
`;

const ModalWrapperSlideUp = styled.div`
    position: fixed;
    color: white;
    z-index: 999999;
    height: auto;
    padding: 2px;
    padding-left: 10px;
    padding-right: 10px;
    font-size: 20px;
    left: 0;
    right: 0;
    bottom: ${(props) => (props.visible ? "0" : "-100vh")};
    margin: 0 auto;
    width: 100%;
    border: 1px   single black
    box-sizing: border-box;
    background: ${(props) => props.theme.colors.secondary};;
    transition: 400ms ease-in-out bottom, 200ms ease-in-out opacity;

    h3 {
        text-align: center;
        color: ${(props) => props.theme.colors.primary};
        font-weight: 600;
        font-size: 1rem;
    }

    p {
        font-size: 14px;
    }

    @media only screen and (max-width: 768px) {
        max-width: 90%;
        z-index: 99999;
        bottom: ${(props) =>
          props.visible ? "50px" : "-100vh"} !important;         
        border-radius: 5px;
    }
`;

const ModalSlideUp = ({ children, modalVisible, toggleModal }) => {
  return (
    <>
      <Background visible={modalVisible} />
      <ModalWrapperSlideUp visible={modalVisible}>
        <div>
          <div>{children}</div>
        </div>
      </ModalWrapperSlideUp>
    </>
  );
};

export default ModalSlideUp;
