import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { format } from "date-fns";

// Constants
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-: ";
const ROW_DELAY = 100;

// FlipChar Component
const FlipChar = ({ char = " ", isFlipping, onAnimationComplete, compact }) => {
  useEffect(() => {
    if (isFlipping) {
      const timeout = setTimeout(() => {
        onAnimationComplete?.();
      }, 75);
      return () => clearTimeout(timeout);
    }
  }, [isFlipping, onAnimationComplete]);

  return (
    <Box
      sx={{
        position: "relative",
        width: compact ? "1.5rem" : "2rem",
        height: compact ? "2.25rem" : "3rem",
        perspective: "1000px",
        margin: "0 1px",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          backgroundColor: "#117ACA",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: compact ? "1rem" : "1.25rem",
          fontFamily: "monospace",
          fontWeight: "bold",
          paddingTop: "4px",
          transition: "transform 75ms",
          transformStyle: "preserve-3d",
          transform: isFlipping ? "rotateX(90deg)" : "rotateX(0deg)",
          border: "1px solid rgba(17, 122, 202, 0.3)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
        }}
      >
        {char}
      </Box>
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "1px",
          backgroundColor: "white",
          opacity: "33%",
          top: "50%",
          zIndex: 10,
        }}
      />
    </Box>
  );
};

// SplitFlapRow Component
const SplitFlapRow = ({
  textSegments = [],
  speeds = [],
  rowIndex = 0,
  isClock = false,
  compact = false,
}) => {
  const [segmentStates, setSegmentStates] = useState(() =>
    textSegments.map((segment) =>
      " "
        .repeat(segment.length)
        .split("")
        .map((char) => ({
          currentChar: char,
          isFlipping: false,
          targetChar: char,
          animationIndex: 0,
        }))
    )
  );

  useEffect(() => {
    textSegments.forEach((segment, segmentIndex) => {
      const targetChars = segment.split("");
      const rowDelay = rowIndex * ROW_DELAY;
      const speed = speeds[segmentIndex] || 35;

      targetChars.forEach((targetChar, charIndex) => {
        if (segmentStates[segmentIndex][charIndex].currentChar !== targetChar) {
          setTimeout(() => {
            startCharAnimation(segmentIndex, charIndex, targetChar);
          }, rowDelay + charIndex * 100);
        }
      });
    });
  }, [textSegments, rowIndex]);

  const getNextChar = (current, target) => {
    let currentIndex = CHARS.indexOf(current);
    const targetIndex = CHARS.indexOf(target);

    if (currentIndex === -1) currentIndex = 0;
    if (targetIndex === -1) return target;

    let forwardDist =
      (targetIndex - currentIndex + CHARS.length) % CHARS.length;
    let backwardDist =
      (currentIndex - targetIndex + CHARS.length) % CHARS.length;

    return forwardDist <= backwardDist
      ? CHARS[(currentIndex + 1) % CHARS.length]
      : CHARS[(currentIndex - 1 + CHARS.length) % CHARS.length];
  };

  const startCharAnimation = (segmentIndex, charIndex, targetChar) => {
    setSegmentStates((prev) => {
      const newStates = [...prev];
      const currentState = newStates[segmentIndex][charIndex];
      const nextChar = getNextChar(currentState.currentChar, targetChar);

      newStates[segmentIndex][charIndex] = {
        ...currentState,
        isFlipping: true,
        currentChar: nextChar,
        targetChar,
        animationIndex: currentState.animationIndex + 1,
      };

      return newStates;
    });
  };

  const handleCharAnimationComplete = (segmentIndex, charIndex) => {
    setSegmentStates((prev) => {
      const newStates = [...prev];
      const currentState = newStates[segmentIndex][charIndex];
      const speed = speeds[segmentIndex] || 35;

      newStates[segmentIndex][charIndex] = {
        ...currentState,
        isFlipping: false,
      };

      if (currentState.currentChar !== currentState.targetChar) {
        setTimeout(() => {
          startCharAnimation(segmentIndex, charIndex, currentState.targetChar);
        }, speed);
      }

      return newStates;
    });
  };

  return (
    <Box
      sx={
        isClock
          ? {
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }
          : {
              display: "grid",
              gridTemplateColumns: compact
                ? "5rem 7rem 9rem"
                : "10rem 9rem 12rem",
              gap: compact ? "1rem" : "5rem",
              minWidth: "100%",
              justifyContent: "center",
            }
      }
    >
      {segmentStates.map((segment, segmentIndex) => (
        <Box
          key={segmentIndex}
          sx={{
            display: "flex",
            bgcolor: "white",
            p: 0.5,
            borderRadius: 1,
          }}
        >
          {segment.map((state, charIndex) => (
            <FlipChar
              key={`${segmentIndex}-${charIndex}-${state.currentChar}-${state.animationIndex}`}
              char={state.currentChar}
              isFlipping={state.isFlipping}
              onAnimationComplete={() =>
                handleCharAnimationComplete(segmentIndex, charIndex)
              }
              compact={compact}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Clock Component
const Clock = ({ SplitFlapRow }) => {
  const [time, setTime] = useState(formatTime(new Date()));

  function formatTime(date) {
    const hours = format(date, "h");
    const paddedHours = hours.length === 1 ? `0${hours}` : hours;
    const minutes = format(date, "mm");
    const period = format(date, "a").charAt(0).toUpperCase();
    return `${paddedHours}:${minutes}${period}`;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          bgcolor: "white",
          p: 0.5,
          borderRadius: 1,
          width: "auto",
        }}
      >
        <SplitFlapRow
          textSegments={[time]}
          speeds={[35]}
          rowIndex={0}
          isClock={true}
        />
      </Box>
    </Box>
  );
};

// Main QueueDisplay Component
const QueueDisplay = ({
  queue = [],
  compact = false,
  showClock = true,
  showHeader = true,
}) => {
  // If queue is empty, don't render anything
  if (queue.length === 0) {
    return null;
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "P" : "A";
    return `${String(hours).padStart(2, "0")}:${minutes}${ampm}`;
  };

  const formatPhone = (phone) => {
    return phone.slice(-4);
  };

  return (
    <Box sx={{ my: compact ? 2 : 3 }}>
      {showClock && <Clock SplitFlapRow={SplitFlapRow} />}

      {showHeader && (
        <Typography
          variant="h5"
          sx={{
            color: "#117ACA",
            fontWeight: "bold",
            textAlign: "center",
            mb: compact ? 3 : 5,
            letterSpacing: "0.1em",
            fontSize: compact ? "1.25rem" : undefined,
          }}
        >
          VIRTUAL QUEUE STATUS
        </Typography>
      )}

      <Box
        sx={{
          mb: compact ? 2 : 3,
          display: "grid",
          gridTemplateColumns: compact ? "5rem 7rem 9rem" : "10rem 9rem 12rem",
          gap: compact ? "1rem" : "5rem",
          px: 0.5,
          width: "100%",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: "#117ACA",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            fontSize: compact ? "0.75rem" : undefined,
          }}
        >
          {compact ? "ID" : "PATIENT ID"}
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color: "#117ACA",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            fontSize: compact ? "0.75rem" : undefined,
          }}
        >
          PHONE
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color: "#117ACA",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            fontSize: compact ? "0.75rem" : undefined,
          }}
        >
          WAIT TIME
        </Typography>
      </Box>

      {queue.slice(0, 8).map((patient, index) => (
        <Box key={patient.id} sx={{ mb: compact ? 0.5 : 1 }}>
          <SplitFlapRow
            textSegments={[
              String(patient.id).padStart(2, "0"),
              formatPhone(patient.phone),
              formatTime(patient.date),
            ]}
            speeds={[35, 35, 35]}
            rowIndex={index}
            compact={compact}
          />
        </Box>
      ))}
    </Box>
  );
};

export default QueueDisplay;
