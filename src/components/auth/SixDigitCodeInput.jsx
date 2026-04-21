import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, styled } from "@mui/material";

const CodeInput = styled("input")(({ theme }) => ({
  width: "48px",
  height: "56px",
  textAlign: "center",
  fontSize: "1.5rem",
  fontFamily: theme.typography.fontFamily,
  border: `1px solid rgba(0, 0, 0, 0.23)`,
  borderRadius: "8px",
  backgroundColor: "transparent",
  transition: "border-color 0.15s, border-width 0.15s",
  "&:disabled": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    opacity: 0.6,
    cursor: "not-allowed",
  },
  "&:focus": {
    outline: "none",
    borderColor: theme.palette.primary.main,
    borderWidth: "2px",
  },
}));

/**
 * SixDigitCodeInput — six individual digit boxes for OTP/MFA codes.
 *
 * @param {function} onComplete  - called with the 6-char string when all digits are filled
 * @param {function} [onChange]  - called with the current code string on every change
 * @param {boolean}  [disabled]
 * @param {boolean}  [autoFocus] - focuses the first box on mount
 *
 * Ref exposes: reset() — clears all boxes and refocuses the first input
 */
const SixDigitCodeInput = forwardRef(
  ({ onComplete, onChange, disabled = false, autoFocus = false }, ref) => {
    const [digits, setDigits] = useState(["", "", "", "", "", ""]);
    const inputRefs = useRef([]);

    useImperativeHandle(ref, () => ({
      reset() {
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      },
      focus() {
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      },
    }));

    useEffect(() => {
      const code = digits.join("");
      onChange?.(code);
      if (code.length === 6 && !disabled) {
        onComplete?.(code);
      }
    }, [digits, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = useCallback(
      (index, value) => {
        if (disabled) return;
        if (value && !/^\d$/.test(value)) return;
        setDigits((prev) => {
          const next = [...prev];
          next[index] = value;
          return next;
        });
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
      },
      [disabled],
    );

    const handleKeyDown = useCallback(
      (index, e) => {
        if (disabled) return;
        if (e.key === "Backspace" && !digits[index] && index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      },
      [digits, disabled],
    );

    const handlePaste = useCallback(
      (e) => {
        if (disabled) return;
        e.preventDefault();
        const pasted = e.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 6);
        if (!pasted) return;
        const next = pasted.split("");
        while (next.length < 6) next.push("");
        setDigits(next);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      },
      [disabled],
    );

    return (
      <Box
        sx={{ display: "flex", gap: 1, justifyContent: "center" }}
        onPaste={handlePaste}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CodeInput
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            value={digits[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </Box>
    );
  },
);

SixDigitCodeInput.displayName = "SixDigitCodeInput";

export default SixDigitCodeInput;
