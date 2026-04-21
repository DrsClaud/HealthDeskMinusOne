import { useContext } from "react";
import { db } from "services/firebase";
import firebase from "firebase/compat/app";
import { ChatContext } from "context/Chat";
// import { Message } from "./Types";

export const useMessageHandler = ({
  user,
  userData,
  setIsTyping,
  submitInfo,
  assistantId,
}) => {
  const { setMessages, thread } = useContext(ChatContext);

  const handleSendRequest = async (message) => {
    const cleanMessage = message.replace(
      /<[^>]*>|&(nbsp|amp|quot|lt|gt);/g,
      ""
    );

    // const newMessage: Message = { // We would need to switch to ts on this file!
    const newMessage = {
      message: cleanMessage,
      direction: "outgoing",
      sender: "user",
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    try {
      await processMessageToChatGPT(newMessage);
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  const processMessageToChatGPT = async (message) => {
    if (!user) return;

    const currentTimestamp = Math.round(Date.now() / 1000);
    const threadId = thread || String(Date.now());
    const threadRef = db
      .collection("chat")
      .doc(user.uid)
      .collection("threads")
      .doc(threadId);

    // Add timeout
    const timeout = setTimeout(() => {
      setIsTyping(false);
      unsubscribe();
    }, 30000); // 30 seconds timeout

    const unsubscribe = threadRef.onSnapshot((doc) => {
      const data = doc.data();
      const messages = data?.messages || [];
      const lastMessage = messages[messages.length - 1];

      // Only consider messages newer than when we started this request
      if (
        lastMessage?.sender === "My HealthDesk" &&
        lastMessage?.created > currentTimestamp
      ) {
        clearTimeout(timeout);
        setIsTyping(false);
        unsubscribe();
      }
    });

    let newMessage = {
      messages: firebase.firestore.FieldValue.arrayUnion({
        sender: message.sender,
        message: message.message,
        created: Math.round(Date.now() / 1000),
      }),
    };

    if (submitInfo && userData?.profile) {
      newMessage.user = {
        ...(userData.profile?.sex && { sex: userData.profile.sex }),
        ...(userData.profile?.age && { age: userData.profile.age }),
      };
    }

    // If there's a selected assistant from admin panel, use that
    if (assistantId) {
      newMessage.assistant = assistantId;
    } else {
      if (userData?.role === "professional") {
        newMessage.assistant = "professional";
      }
    }

    try {
      await threadRef.set(newMessage, { merge: true });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      unsubscribe();
      clearTimeout(timeout);
    }
  };

  return { handleSendRequest };
};
