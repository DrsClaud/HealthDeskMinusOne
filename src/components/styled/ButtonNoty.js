import React, { Children, Component, useState } from "react";
import styled from "styled-components";
import Button from "./Button";
import ModalSlideUp from "../ModalSlideUp";
const ButtonNoty = (props) => {
  const [showPopup, setShowPopup] = useState(false);
  let newProps = {};

  Object.assign(newProps, props);
  newProps.__defaultOnClick = props.onClick;
  newProps.onClick = () => {
    console.log("Showing Noty");
    newProps.__defaultOnClick();
    setShowPopup(true);
    setTimeout(
      () => {
        setShowPopup(false);
      },
      props.time ? props.time : 3000
    );
  };
  newProps.modalVisible = showPopup;

  return (
    <>
      <ModalSlideUp modalVisible={showPopup} time={2000}>
        {props.modalContent}
      </ModalSlideUp>
      <Button {...newProps}></Button>
    </>
  );
};

export default ButtonNoty;
