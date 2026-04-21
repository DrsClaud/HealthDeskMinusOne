import React, { useMemo } from "react";
import { Box } from "@mui/material";

const tokenize = (value) => String(value || "").match(/\s+|[^\s]+/g) || [];

const buildLcsMatrix = (leftTokens, rightTokens) => {
  const matrix = Array.from({ length: leftTokens.length + 1 }, () =>
    Array(rightTokens.length + 1).fill(0),
  );

  for (let i = leftTokens.length - 1; i >= 0; i -= 1) {
    for (let j = rightTokens.length - 1; j >= 0; j -= 1) {
      matrix[i][j] =
        leftTokens[i] === rightTokens[j]
          ? matrix[i + 1][j + 1] + 1
          : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  return matrix;
};

const buildDiffSegments = (beforeText, afterText) => {
  const beforeTokens = tokenize(beforeText);
  const afterTokens = tokenize(afterText);
  const lcs = buildLcsMatrix(beforeTokens, afterTokens);

  const segments = [];
  let i = 0;
  let j = 0;

  const pushSegment = (type, value) => {
    if (!value) return;

    const previous = segments[segments.length - 1];
    if (previous?.type === type) {
      previous.value += value;
      return;
    }

    segments.push({ type, value });
  };

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (beforeTokens[i] === afterTokens[j]) {
      pushSegment("equal", afterTokens[j]);
      i += 1;
      j += 1;
      continue;
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pushSegment("removed", beforeTokens[i]);
      i += 1;
      continue;
    }

    pushSegment("added", afterTokens[j]);
    j += 1;
  }

  while (i < beforeTokens.length) {
    pushSegment("removed", beforeTokens[i]);
    i += 1;
  }

  while (j < afterTokens.length) {
    pushSegment("added", afterTokens[j]);
    j += 1;
  }

  return segments;
};

const getSegmentStyles = (type) => {
  if (type === "removed") {
    return {
      backgroundColor: "rgba(211, 47, 47, 0.12)",
      color: "error.dark",
      textDecoration: "line-through",
    };
  }

  if (type === "added") {
    return {
      backgroundColor: "rgba(46, 125, 50, 0.12)",
      color: "success.dark",
    };
  }

  return null;
};

const InlineTextDiff = ({ beforeText = "", afterText = "" }) => {
  const segments = useMemo(
    () => buildDiffSegments(beforeText, afterText),
    [beforeText, afterText],
  );

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "common.white",
        p: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "monospace",
        fontSize: "0.875rem",
        lineHeight: 1.6,
      }}
    >
      {segments.length ? (
        segments.map((segment, index) => (
          <Box
            key={`${segment.type}-${index}`}
            component="span"
            sx={{
              ...getSegmentStyles(segment.type),
              borderRadius: segment.type === "equal" ? 0 : 0.75,
            }}
          >
            {segment.value}
          </Box>
        ))
      ) : (
        <Box component="span" sx={{ color: "text.secondary" }}>
          Empty
        </Box>
      )}
    </Box>
  );
};

export default InlineTextDiff;
