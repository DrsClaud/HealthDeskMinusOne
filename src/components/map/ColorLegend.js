import React from "react";
import styled from "styled-components";
import Wrapper from "../styled/Wrapper";

const LegendWrapper = styled.div`
  margin: 0 auto;
  max-width: 95%;
  display: flex;
  align-items: center;
`;

const LegendText = styled.span`
  padding: 0 5px;
  color: ${(props) =>
    `hsl(${props.color}, ${props.selected ? `100%` : `75%`}, 50%)}`};
`;

const Label = styled.div`
  display: block;
  height: 37px;
  width: 37px;
  background-color: white;
  border: 5px solid white;
  border-radius: 50%;
  z-index: 9;
  position: relative;

  &:after {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
    content: "";
    height: 23px;
    width: 23px;
    border-radius: 50%;
    z-index: 99;
    border: 2px solid ${(props) => props.theme.colors.primary};
    background-color: ${(props) =>
      `hsl(${props.color}, ${props.selected ? `100%` : `75%`}, 50%)}`};
  }
`;

const LineGraph = styled.div`
  flex-grow: 1;
  display: flex;
  justify-content: space-between;
  position: relative;

  &:before {
    position: absolute;
    top: 0;
    bottom: 0;
    margin: auto;
    content: "";
    width: 100%;
    height: 2px;
    background-color: ${(props) => props.theme.colors.primary};
  }
`;

const ColorLegend = ({ facilityType = "clinic" }) => {
  const options = [60, 150, 360];

  const getColor = (option) => Math.abs(option / 3.6 - 100);

  const getLegendText = () => {
    if (facilityType === "emergency") {
      return {
        left: "5 Stars",
        right: "1 Star",
        popup:
          "The CMS SCORE represents the official Medicare Overall Hospital Quality Star Rating, evaluating five key performance categories: mortality rates, safety of care, readmission rates, patient experience, and timely and effective care. This comprehensive rating system transforms complex healthcare metrics into an accessible one-to-five star scale, empowering patients to make informed decisions about their care providers.",
      };
    }
    return {
      left: "Shortest",
      right: "Longest",
      popup:
        "Medicare Score represents the overall quality and efficiency of care at this facility.",
    };
  };

  const legendText = getLegendText();

  return (
    <LegendWrapper>
      <LegendText color={getColor(60)}>{legendText.left}</LegendText>
      <LineGraph>
        {options.map((option, i) => {
          return <Label color={getColor(option)} key={i}></Label>;
        })}
      </LineGraph>
      <LegendText color={getColor(360)}>{legendText.right}</LegendText>
    </LegendWrapper>
  );
};

export default ColorLegend;
