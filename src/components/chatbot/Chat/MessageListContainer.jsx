import React, { useRef, useEffect } from "react";
import {
  MessageList,
  Message,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { useMessageParser } from "components/chatbot/Chat/useMessageParser";

export const MessageListContainer = ({ messages, isTyping, openTab }) => {
  const messageRef = useRef(null);
  const { parseMessage } = useMessageParser(openTab);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView();
    }
  }, [messages]);

  return (
    <MessageList
      typingIndicator={
        isTyping ? (
          <TypingIndicator content="My HealthDesk is typing..." />
        ) : null
      }
    >
      {messages?.map((message, i) => {
        const parsedText = parseMessage(message);
        const itemProps = messages.length - 1 === i ? { ref: messageRef } : {};

        return (
          <Message
            key={`message_${i}`}
            model={{ direction: message.direction, type: "custom" }}
            style={{ position: "relative" }}
          >
            <Message.CustomContent>
              <div {...itemProps} />
              {parsedText}
            </Message.CustomContent>
          </Message>
        );
      })}
    </MessageList>
  );
};
