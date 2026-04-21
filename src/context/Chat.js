import React, { useState, useEffect, useContext } from "react";
import { db } from "services/firebase";
import { AuthContext } from "context/Auth";
import { differenceInHours } from "date-fns";
import { useAuth } from "hooks/useAuth";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = React.createContext();

const RATE_LIMITS = {
  free: 4,
  patient: 30,
  professional: 30,
};

const RESET_PERIOD_HOURS = 24;

function parse(text) {
  var source = /【.+†source】/g;
  var breaks = /<br>/g;
  var html = text.replace(source, "").replace(breaks, "");
  return html;
}

export const ChatProvider = ({ children }) => {
  const { user, userData, userLoading } = useContext(AuthContext);
  const { activeSubscriptionRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [keyword, setKeyword] = useState();
  const [descOpen, setDescOpen] = useState();
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);

  // Rate limiting state
  const [messageCount, setMessageCount] = useState(0);
  const [lastReset, setLastReset] = useState(new Date(0));

  const getDailyLimit = () => {
    // Ensure we're using a valid subscription type
    const currentSubscription = activeSubscriptionRole || "free";
    return RATE_LIMITS[currentSubscription] || RATE_LIMITS.free;
  };

  // Initialize rate limiting state from userData
  useEffect(() => {
    if (userLoading || !userData) return;

    // Initialize state from Firestore
    setMessageCount(userData.messageCount || 0);
    if (userData.lastMessageReset) {
      const resetDate = userData.lastMessageReset._seconds
        ? new Date(userData.lastMessageReset._seconds * 1000)
        : new Date(userData.lastMessageReset);
      setLastReset(resetDate);
    }

    // Check if we need to reset based on time
    const now = new Date();
    const hoursSinceReset = differenceInHours(now, lastReset);
    if (hoursSinceReset >= RESET_PERIOD_HOURS) {
      setMessageCount(0);
      setLastReset(now);
      setRateLimited(false);
    }
  }, [userData, userLoading]);

  // Update rate limited status when message count changes
  useEffect(() => {
    const dailyLimit = getDailyLimit();
    const remaining = dailyLimit - messageCount;
    setRateLimited(remaining <= 0);
  }, [messageCount, activeSubscriptionRole]);

  const getRemainingMessages = () => {
    const dailyLimit = getDailyLimit();
    return Math.max(0, dailyLimit - messageCount);
  };

  const getResetTime = () => {
    const now = new Date();
    const hoursSinceReset = differenceInHours(now, lastReset);
    const hoursRemaining = RESET_PERIOD_HOURS - hoursSinceReset;
    return Math.max(0, hoursRemaining);
  };

  const newThread = () => {
    const newThreadId = `thread_${uuidv4()}`;
    setThread(newThreadId);
    setMessages([]);
    sessionStorage.setItem("threadId", newThreadId);

    const timestamp = Date.now();
    db.collection("chat")
      .doc(user.uid)
      .collection("threads")
      .doc(newThreadId)
      .set({ messages: [], timestamp })
      .then(() => {
        console.log("New thread created with ID:", newThreadId);
      });
  };

  useEffect(() => {
    if (!user) {
      setIsMessagesLoading(false);
      return;
    }

    let lastProcessedMessageCount = 0;

    const unsubscribe = db
      .collection("chat")
      .doc(user.uid)
      .collection("threads")
      .onSnapshot((querySnapshot) => {
        const threads = [];
        setIsMessagesLoading(true);

        querySnapshot.forEach((doc) => {
          threads.push({ data: doc.data(), id: doc.id });
        });

        if (threads.length === 0) {
          setMessages([]);
          setIsMessagesLoading(false);
          return;
        }

        const currentThread = threads.sort(
          (a, b) => Number(a.id) - Number(b.id)
        )[threads.length - 1];
        const currentThreadId = currentThread.id;

        setThread(currentThreadId);

        const newMessages = currentThread.data.messages;
        const filteredMessages = newMessages.map((message) => ({
          ...message,
          message: parse(message.message),
          direction:
            message.sender === "My HealthDesk" ? "incoming" : "outgoing",
        }));

        if (
          messages === undefined ||
          newMessages.length > lastProcessedMessageCount
        ) {
          lastProcessedMessageCount = newMessages.length;
          setMessageCount((prev) => Math.max(prev, newMessages.length));
        }

        setMessages(filteredMessages);
        setIsMessagesLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  // Update session storage whenever thread ID changes
  useEffect(() => {
    if (thread) {
      sessionStorage.setItem("threadId", thread);
    }
  }, [thread]);

  return (
    <ChatContext.Provider
      value={{
        newThread,
        messages,
        setMessages,
        thread,
        setThread,
        rateLimited,
        messageCount,
        getRemainingMessages,
        getResetTime,
        keyword,
        setKeyword,
        descOpen,
        setDescOpen,
        limit: getDailyLimit(),
        isMessagesLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
