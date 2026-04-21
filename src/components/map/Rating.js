import React, { useState } from "react";
import styled from "styled-components";
import Legend from "./Legend";

const Label = styled.label`
  flex: 1;
  margin-right: 2px;
  margin-top: ${({ $schedule }) => ($schedule ? 0 : "10px")};
  text-align: center;
  font-size: 14px;

  div {
    display: block;
    height: ${({ $schedule }) => ($schedule ? "20px" : "50px")};
    background-color: ${(props) =>
      `hsl(${props.color}, ${props.selected ? `100%` : `75%`}, 50%)}`};
    cursor: pointer;
  }

  input {
    visibility: hidden;
  }
`;

const Wrapper = styled.div`
  width: 100%;
  display: flex;
`;

const Rating = ({ register, schedule }) => {
  const [selected, setSelected] = useState();
  const options = [15, 30, 60, 90, 120, 150, 180, 240, 360, 480];

  return (
    <>
      <Wrapper>
        {options.map((option, i) => {
          return (
            <Label
              $schedule={schedule}
              color={Math.abs((option - 15) / 4.65 - 100)}
              selected={selected === option}
              key={i}
            >
              <div>
                <input
                  type="radio"
                  name="time"
                  value={option}
                  {...(register &&
                    register({ required: "Wait time is required." }))}
                  onChange={() => setSelected(option)}
                />
              </div>
            </Label>
          );
        })}
      </Wrapper>
      <Legend schedule={schedule} />
    </>
  );
};

export default Rating;
