import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Skeleton,
  keyframes,
} from "@mui/material";
import { ChatMessages } from "../chat_new/messages";
import CustomMessageInput from "../chat_new/CustomMessageInput";
import { getFunctions, httpsCallable } from "firebase/functions";

// @ts-expect-error - Images exist but TypeScript config needs updating
import amhLogo from "../../assets/images/logos/amhlearn-logo.png";
// @ts-expect-error - Images exist but TypeScript config needs updating
import kijabeLogo from "../../assets/images/logos/kijabe-logo.png";

const functions = getFunctions();
const startNewChatCallable = httpsCallable(functions, "startNewChat");
const sendMessageCallable = httpsCallable(functions, "sendMessage");
const getRateLimitCallable = httpsCallable(functions, "getRateLimit");

// Create a pulsing animation for initializing state
const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.4; }
  50% { transform: scale(1.05); opacity: 0.7; }
  100% { transform: scale(0.95); opacity: 0.4; }
`;

const InitializingIndicator: React.FC = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, pl: 2 }}>
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: "#1976d2",
        animation: `${pulse} 1.2s ease-in-out infinite`,
      }}
    />
    <Typography variant="body2" color="text.secondary" sx={{ ml: 0 }}>
      My HealthDesk is initializing...
    </Typography>
  </Box>
);

interface KijabeUserData {
  userId: string;
  displayName?: string;
  email?: string;
  isDirectLogin: boolean;
  fromWordPress: boolean;
  custom_prompt?: string;
  wpUserId?: string;
  wpUsername?: string;
  pageTitle?: string;
  pageUrl?: string;
  assistant_id?: string; // NEW: Optional assistant ID for flexible assistant selection
}

interface UsageStats {
  remaining: number;
  used: number;
  limited: boolean;
  total: number;
}

interface Props {
  userData: KijabeUserData;
  onUsageUpdate?: (stats: UsageStats) => void;
}

const NewKijabeChatPage: React.FC<Props> = ({ userData, onUsageUpdate }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [initialUsedTurns, setInitialUsedTurns] = useState(0);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  // Auto-scroll effect
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Auto-start conversation with AI case presentation
  useEffect(() => {
    const autoStartConversation = async () => {
      console.log("🔍 Auto-start check - userData:", {
        assistant_id: userData.assistant_id,
        pageTitle: userData.pageTitle,
        hasCustomPrompt: !!userData.custom_prompt,
      });

      // Skip auto-start for Ask Me Anything - save user's rate limit
      if (userData.assistant_id === "ask_me_anything") {
        console.log("🚫 Skipping auto-start for Ask Me Anything assistant");
        return;
      }

      // Only auto-start once when conditions are met
      if (
        !hasAutoStarted.current &&
        userData.pageTitle &&
        userData.custom_prompt &&
        usageStats &&
        !usageStats.limited &&
        !isTyping &&
        !currentThreadId
      ) {
        console.log("✅ Auto-starting module conversation");
        hasAutoStarted.current = true; // Mark as started immediately
        try {
          setIsTyping(true);

          // Create the thread first
          const processedPrompt = userData.custom_prompt.replace(
            /\{pageTitle\}/g,
            userData.pageTitle
          );

          // Use assistant_id from userData if provided, otherwise default to "kijabe"
          const assistantId = userData.assistant_id || "kijabe";

          const result = await startNewChatCallable({
            userid: `kijabe_${userData.userId}`,
            chattype: "kijabe",
            assistantID: assistantId,
            kijabeData: {
              moduleTitle: userData.pageTitle,
              custom_prompt: processedPrompt,
            },
            tracking: {
              source: "Kijabe Education Module",
            },
          });

          const threadId = result.data as string;
          setCurrentThreadId(threadId);

          // Send the auto-start message to trigger AI case presentation
          const autoStartMessage = `Present a realistic clinical case scenario about ${userData.pageTitle}. Include patient details, symptoms, examination findings, and ask me specific questions to test my clinical knowledge. Do not ask me what I want to focus on - just present the case immediately.`;

          const response = await sendMessageCallable({
            userid: `kijabe_${userData.userId}`,
            threadid: threadId,
            message: autoStartMessage,
            tracking: {
              source: "Kijabe Education Module",
            },
          });

          // Update messages with AI response (skip showing the auto-start message)
          const responseMessages = (response.data as any[]) || [];
          const newMessages = responseMessages
            .filter((msg: any) => msg.role === "assistant") // Only show AI responses
            .map((msg: any) => ({
              message: msg.content,
              direction: "incoming",
              sender: msg.role,
            }));

          setMessages(newMessages);

          // Update usage stats
          const TOTAL_TURNS = 8;
          const currentTurns = Math.floor(responseMessages.length / 2);
          const totalUsedTurns = initialUsedTurns + currentTurns;
          const remainingTurns = Math.max(0, TOTAL_TURNS - totalUsedTurns);

          const newStats = {
            remaining: remainingTurns,
            used: totalUsedTurns,
            limited: totalUsedTurns >= TOTAL_TURNS,
            total: TOTAL_TURNS,
          };
          setUsageStats(newStats);
          if (onUsageUpdate) onUsageUpdate(newStats);

          // Update local storage
          const storageKey = `rate_limit:${userData.userId}:${userData.pageTitle}`;
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              data: { messages_remaining: remainingTurns },
              timestamp: Date.now(),
            })
          );
        } catch (error: any) {
          console.error("Auto-start conversation failed:", error);
          setError("Failed to start conversation. Please refresh the page.");
          hasAutoStarted.current = false; // Allow retry on error
        } finally {
          setIsTyping(false);
        }
      }
    };

    autoStartConversation();
  }, [
    userData.pageTitle,
    userData.custom_prompt,
    userData.assistant_id,
    usageStats?.limited,
    currentThreadId,
  ]);

  // Add initial rate limit check
  useEffect(() => {
    const checkInitialRateLimit = async () => {
      if (!userData.userId || !userData.pageTitle) return;

      // Check local storage first
      const storageKey = `rate_limit:${userData.userId}:${userData.pageTitle}`;
      const storedData = localStorage.getItem(storageKey);
      const now = Date.now();

      if (storedData) {
        try {
          const { data, timestamp } = JSON.parse(storedData);
          if (now - timestamp < 60000) {
            const { messages_remaining } = data;
            const TOTAL_TURNS = 8;
            const remainingTurns = messages_remaining;
            const usedTurns = TOTAL_TURNS - remainingTurns;

            setInitialUsedTurns(usedTurns);

            const newStats = {
              remaining: remainingTurns,
              used: usedTurns,
              limited: usedTurns >= TOTAL_TURNS,
              total: TOTAL_TURNS,
            };
            setUsageStats(newStats);
            if (onUsageUpdate) onUsageUpdate(newStats);
            return;
          }
        } catch (e) {
          console.warn("Error parsing stored rate limit:", e);
          // Clear corrupted cache
          localStorage.removeItem(storageKey);
        }
      }

      try {
        const response = await getRateLimitCallable({
          userid: `kijabe_${userData.userId}`,
          moduleTitle: userData.pageTitle,
        });

        if (!response.data) return;

        const { messages_remaining } = response.data as {
          messages_remaining: number;
        };

        const TOTAL_TURNS = 8;
        const remainingTurns = messages_remaining;
        const usedTurns = TOTAL_TURNS - remainingTurns;

        setInitialUsedTurns(usedTurns);
        const newStats = {
          remaining: remainingTurns,
          used: usedTurns,
          limited: usedTurns >= TOTAL_TURNS,
          total: TOTAL_TURNS,
        };

        setUsageStats(newStats);
        if (onUsageUpdate) onUsageUpdate(newStats);

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data: { messages_remaining: remainingTurns },
            timestamp: now,
          })
        );
      } catch (error: any) {
        // Set default stats on error
        setUsageStats({
          remaining: 8,
          used: 0,
          limited: false,
          total: 8,
        });
      }
    };

    checkInitialRateLimit();
  }, [userData.userId, userData.pageTitle]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return;

    // Check rate limit before proceeding
    if (usageStats?.limited) {
      setError("You have reached your daily limit for this module.");
      return;
    }

    try {
      setIsTyping(true);
      setInputValue("");

      // Remove placeholder and add user message
      setMessages((prev) => {
        const filteredMessages = prev.filter(
          (msg) =>
            !msg.message.startsWith(
              "Hello! I'm here to help you with any questions about"
            )
        );
        return [
          ...filteredMessages,
          { message, direction: "outgoing", sender: "user" },
        ];
      });

      // Start new chat if needed
      let current_chat_id = currentThreadId;
      if (!currentThreadId) {
        if (!userData.pageTitle || !userData.custom_prompt) {
          throw new Error("Missing pageTitle or custom_prompt");
        }

        // Process the prompt template
        const processedPrompt = userData.custom_prompt.replace(
          /\{pageTitle\}/g,
          userData.pageTitle
        );

        // Use assistant_id from userData if provided, otherwise default to "kijabe"
        const assistantId = userData.assistant_id || "kijabe";

        const result = await startNewChatCallable({
          userid: `kijabe_${userData.userId}`,
          chattype: "kijabe",
          assistantID: assistantId,
          kijabeData: {
            moduleTitle: userData.pageTitle,
            custom_prompt: processedPrompt,
          },
          tracking: {
            source: "Kijabe Education Module",
          },
        });
        current_chat_id = result.data as string;
        setCurrentThreadId(current_chat_id);
      }

      // Send message
      const response = await sendMessageCallable({
        userid: `kijabe_${userData.userId}`,
        threadid: current_chat_id,
        message,
        tracking: {
          source: "Kijabe Education Module",
        },
      });

      // Update messages with response
      const newMessages = (response.data as any[]).map((msg) => ({
        message: msg.content,
        direction: msg.role === "user" ? "outgoing" : "incoming",
        sender: msg.role,
      }));
      setMessages(newMessages);

      // FIXED: Better usage calculation
      const TOTAL_TURNS = 8;
      const currentTurns = Math.floor(newMessages.length / 2); // Each turn = user + assistant message
      const totalUsedTurns = initialUsedTurns + currentTurns;
      const remainingTurns = Math.max(0, TOTAL_TURNS - totalUsedTurns);

      const newStats = {
        remaining: remainingTurns,
        used: totalUsedTurns,
        limited: totalUsedTurns >= TOTAL_TURNS,
        total: TOTAL_TURNS,
      };
      setUsageStats(newStats);
      if (onUsageUpdate) onUsageUpdate(newStats);

      const storageKey = `rate_limit:${userData.userId}:${userData.pageTitle}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data: { messages_remaining: remainingTurns }, // Store remaining, not used
          timestamp: Date.now(),
        })
      );
    } catch (error: any) {
      setError(error.message || "Failed to send message");
      // Revert the optimistic message update on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };

  // Render usage stats display
  const renderUsageStats = () => {
    if (!usageStats)
      return (
        <Box sx={{ mt: 0, mb: 2, height: 66 }}>
          <Typography variant="subtitle2">
            <Skeleton width="60%" />
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            <Skeleton
              variant="rounded"
              height={10}
              sx={{ flexGrow: 1, borderRadius: 5 }}
            />
            <Skeleton width={80} height={20} sx={{ ml: 2 }} />
          </Box>
          <Typography variant="caption">
            <Skeleton width="40%" />
          </Typography>
        </Box>
      );

    const { used, remaining, limited, total } = usageStats;
    const usedPercentage = (used / total) * 100;

    return (
      <Box sx={{ mt: 0, mb: 2 }}>
        <Typography variant="subtitle2">Chat Usage for this Module:</Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <LinearProgress
            variant="determinate"
            value={usedPercentage}
            color={
              limited ? "error" : usedPercentage > 75 ? "warning" : "primary"
            }
            sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: 2, minWidth: 80 }}
          >
            {used} / {total} turns
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {limited
            ? "You've reached your daily limit for this module."
            : `You have ${remaining} turns remaining.`}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        pb: 0,
        maxWidth: 1200,
        mx: "auto",
        mt: userData.fromWordPress ? 1 : 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          mb: 3,
        }}
      >
        <img src={amhLogo} alt="AMH" style={{ height: 45 }} />
        <Typography color="text.secondary" sx={{ mx: 1 }}>
          ×
        </Typography>
        <img src={kijabeLogo} alt="Kijabe" style={{ height: 45 }} />
      </Box>

      <Box sx={{ mt: userData.fromWordPress ? 4 : 0 }}>
        <Box sx={{ maxWidth: 600, mx: "auto" }}>{renderUsageStats()}</Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          height: userData.fromWordPress
            ? "calc(800px - 200px)"
            : "calc(100vh - 280px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box ref={chatBoxRef} sx={{ flex: 1, overflow: "auto" }}>
          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            showEditButton={false}
          />
          {messages.length === 0 && !isTyping && !usageStats && (
            <InitializingIndicator />
          )}
          {messages.length === 0 &&
            !isTyping &&
            usageStats &&
            userData.assistant_id === "ask_me_anything" && (
              <Box sx={{ p: 3, maxWidth: 700, mx: "auto" }}>
                <Typography variant="body1" color="text.secondary">
                  Welcome! I'm your medical knowledge assistant. Feel free to
                  ask me any questions you might have.
                </Typography>
              </Box>
            )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <CustomMessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendRequest={handleSendMessage}
            userData={userData}
            disabled={usageStats?.limited || false}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(NewKijabeChatPage, (prevProps, nextProps) => {
  return (
    prevProps.userData === nextProps.userData &&
    prevProps.onUsageUpdate === nextProps.onUsageUpdate
  );
});
