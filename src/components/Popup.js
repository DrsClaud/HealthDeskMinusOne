import React, { useState } from "react";
import styled from "styled-components";

const Background = styled.div`
  z-index: 9999;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  position: fixed;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 200ms ease-in-out;
  pointer-events: ${(props) => (props.visible ? "auto" : "none")};
`;

const ClosePopup = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  padding: 12px;
  font-size: 30px;
  line-height: 20px;
  cursor: pointer;
`;

const PopupWrapper = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: auto;
  width: 90%;
  max-width: 400px;
  text-align: center;
  z-index: 99999;
  padding: 10px 10px 5px;
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.white};
  font-size: 14px;
  color: ${(props) => props.theme.colors.primary};
  opacity: ${(props) => (props.visible ? 1 : 0)};
  transition: opacity 200ms ease-in-out;
  pointer-events: ${(props) => (props.visible ? "auto" : "none")};
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

  .warning {
    color: rgb(223, 32, 32);
  }
`;

export default ({ children }) => {
  const [visible, setVisible] = useState(true);

  return (
    <>
      <Background visible={visible} />
      <PopupWrapper visible={visible}>
        <ClosePopup onClick={() => setVisible(false)}>&times;</ClosePopup>
        {children}
      </PopupWrapper>
    </>
  );
};
