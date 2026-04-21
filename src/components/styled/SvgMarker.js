import React from "react";
import styled from "styled-components";

const MarkerWrapper = styled.div`
  position: absolute;
  transform: scale(0.04) translateY(-70%) translateX(-50%);
  transform-origin: top left;
  top: -15px;
  left: 0;

  .q-logo {
    visibility: ${({ $queueEnabled }) =>
      $queueEnabled ? "visible" : "hidden"};
  }

  .st1 {
    fill: ${(props) => props.$colors[0]};
  }
  .st2 {
    fill: ${(props) => props.$colors[2]};
    stroke: ${(props) => props.$colors[1]};
    stroke-miterlimit: 10;
  }
  .st3 {
    fill: #ffffff;
    stroke: #000000;
    stroke-miterlimit: 10;
  }
  .st4 {
    fill: ${(props) => props.$colors[2]};
    stroke: ${(props) => props.$colors[2]};
    stroke-width: 8;
    stroke-miterlimit: 10;
  }
`;

const SvgMarker = ({ queueEnabled, baseHue, owned, visible, type }) => {
  if (!visible) {
    return <></>;
  }

  // const getColors_old = (baseHue) => {
  //   if (type === "Emergency Department") {
  //     return ["#1B4584", "#1B4584", "#1B4584"];
  //   }
  //   if (baseHue === -1) {
  //     if (owned) {
  //       return ["#1B4584", "#1B4584", "#1B4584"];
  //     } else {
  //       return ["#999", "#999", "#999"];
  //     }
  //   }
  //   const base = `hsl(${baseHue}, 75%, 50%)`;
  //   const accent1 = `hsl(${baseHue + 3}, 75%, 50%)`;
  //   const accent2 = `hsl(${baseHue + 6}, 75%, 50%)`;
  //   return [base, accent1, accent2];
  // };

  function interpolateColor(color1, color2, factor = 0.5) {
    // Four-color gradient to match the four score states (0, 33, 66, 100)

    // Define four colors for the four states
    const redColor = "#C31111"; // Score 0
    const orangeColor = "#F59802"; // Score 33
    const yellowColor = "#5BA218"; // Score 66
    const greenColor = "#118B1F"; // Score 100

    // Determine which segment we're in
    if (factor < 0.33) {
      // First segment: interpolate from red to orange
      return interpolateBetweenTwoColors(redColor, orangeColor, factor * 3);
    } else if (factor < 0.66) {
      // Second segment: interpolate from orange to yellow
      return interpolateBetweenTwoColors(
        orangeColor,
        yellowColor,
        (factor - 0.33) * 3
      );
    } else {
      // Third segment: interpolate from yellow to green
      return interpolateBetweenTwoColors(
        yellowColor,
        greenColor,
        (factor - 0.66) * 3
      );
    }
  }

  function interpolateBetweenTwoColors(color1, color2, factor) {
    // Clamp values
    if (factor < 0) factor = 0;
    if (factor > 1) factor = 1;

    // Convert hex to rgb
    const hexToRgb = (hex) => {
      let bigint = parseInt(hex.slice(1), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    // Convert rgb to hex
    const rgbToHex = (rgb) => {
      return (
        "#" +
        rgb.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
      );
    };

    let rgb1 = hexToRgb(color1);
    let rgb2 = hexToRgb(color2);
    let interpolatedRgb = rgb1.map((c, i) => c + factor * (rgb2[i] - c));
    return rgbToHex(interpolatedRgb);
  }

  const getColors = (baseHue) => {
    let main_color = interpolateColor("#841B45", "#45841B", baseHue);
    return [main_color, main_color, main_color];
  };

  const colors = getColors(baseHue);

  return (
    <>
      <MarkerWrapper $colors={colors} $queueEnabled={queueEnabled}>
        <svg width="869" height="1454" xmlns="http://www.w3.org/2000/svg">
          <g>
            <circle
              id="svg_1"
              r="423.5"
              cy="436"
              cx="435"
              className="st1"
            ></circle>
            <path
              id="svg_4"
              d="m859.5,435.5c-141.67,333 -283.33,666 -425,999c-140.33,-333 -280.67,-666 -421,-999l846,0z"
              className="st1"
            ></path>
            <circle
              id="svg_5"
              r="315"
              cy="435.5"
              cx="433.5"
              className="st2"
            ></circle>
            <circle
              id="svg_6"
              r="271"
              cy="437.5"
              cx="436.5"
              className="st3"
            ></circle>
            <line
              id="svg_7"
              y2="1422"
              x2="435"
              y1="751"
              x1="437.01"
              className="st4"
            ></line>
            <text
              className="st2 q-logo"
              transform="matrix(1.9172346105895508,0,0,1.9998665266266438,-465.4979078943156,-537.9067930677238) "
              fontStyle="normal"
              fontWeight="bold"
              stroke="null"
              textAnchor="start"
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              fontSize="200"
              id="svg_9"
              y="551.5514"
              x="375.12693"
              fillOpacity="null"
              strokeOpacity="null"
              strokeWidth="0"
              fill="#000000"
            >
              Q
            </text>
          </g>
        </svg>
      </MarkerWrapper>
    </>
  );
};

export default SvgMarker;
