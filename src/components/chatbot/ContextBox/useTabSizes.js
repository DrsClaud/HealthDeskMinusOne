import { useState, useEffect } from "react";

export const useTabSizes = (tabs) => {
  const [sizes, setSizes] = useState({
    xs: "calc(20dvh - 24px)",
    sm: "calc(20dvh - 24px)",
    chatXs: "calc(80dvh - 60px)",
    chatSm: "80dvh",
  });

  useEffect(() => {
    if (tabs.length === 0) {
      setSizes({
        xs: "20vh",
        sm: "20vh",
        chatXs: "calc(80dvh - 86px)",
        chatSm: "calc(80dvh - 24px)",
      });
    } else {
      setSizes({
        xs: "calc(20dvh - 24px)",
        sm: "calc(20dvh - 24px)",
        chatXs: "calc(80dvh - 60px)",
        chatSm: "80dvh",
      });
    }
  }, [tabs]);

  return sizes;
};
