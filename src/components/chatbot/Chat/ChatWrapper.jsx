import { styled } from "@mui/material/styles";
import { ChatContainer } from "@chatscope/chat-ui-kit-react";

const StyledChatContainer = styled(ChatContainer, {
  shouldForwardProp: (prop) => prop !== "expanded" && prop !== "full",
})(({ theme, expanded, full }) => ({
  // Message styling
  "& .cs-message--incoming .cs-message__content": {
    backgroundColor: "#eee",
  },

  "& .cs-message--outgoing .cs-message__content": {
    color: "#fff",
    backgroundColor: "#117aca",
  },

  // Input styling
  "& .cs-button--send": {
    color: "#117aca",
  },

  "& .cs-message-input__content-editor-wrapper, & .cs-message-input__content-editor":
    {
      backgroundColor: "#eee",
    },

  // Scrollbar styling
  "& .ps__rail-y": {
    opacity: 0.8,
    width: "10px",

    "&:hover, &:active, &:focus, &.ps--clicking": {
      backgroundColor: "#f6f7f8",
      opacity: 1,

      "& > .ps__thumb-y": {
        backgroundColor: "#686e72",
        width: "6px",
      },
    },
  },

  "& .ps__thumb-y": {
    backgroundColor: "#686e72",
    width: "6px",
  },

  // Message list height adjustments
  "& .cs-message-list": {
    // height: expanded || full ? "90dvh" : "76.5dvh",
    // [theme.breakpoints.down("sm")]: {
    //   height: expanded || full ? "calc(90dvh - 100px)" : "calc(80dvh - 100px)",
    // },
  },

  // // Input positioning
  // "& .cs-message-input, & .cs-button": {
  //   bottom: expanded ? "50px !important" : 0,
  // },

  "& .cs-message-input": {
    paddingTop: "0 !important",
  },

  "& .cs-typing-indicator": {
    bottom: "65px !important",
  },
}));

export default StyledChatContainer;
