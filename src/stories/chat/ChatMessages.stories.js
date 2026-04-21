import React from "react";
import { Box, Typography } from "@mui/material";
import {
  MessageList,
  Message,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import MessageBlood from "components/chat_new/message_blood";
import {
  MessageUser,
  MessageRed,
  MessageWarning,
  ChatMessages,
} from "components/chat_new/messages";

// // Create a custom MessageRed component using MUI
// const MessageUser = ({ message, direction }) => {
//     return (
//         <Box
//             sx={{
//                 backgroundColor: direction === 'outgoing' ? '#1976d2' : '#eee',
//                 color: direction === 'outgoing' ? 'white' : 'black',
//                 borderRadius: '8px',
//                 padding: '10px',
//                 margin: '5px 0',
//                 width: 'fit-content',
//                 marginLeft: direction === 'outgoing' ? 'auto' : '0',
//                 marginRight: direction === 'outgoing' ? '0' : 'auto',
//                 // display: 'inline-block',
//                 position: 'relative',
//                 boxShadow: 1,
//             }}
//         >
//             <Typography variant="body2">
//                 {message}
//             </Typography>
//         </Box>
//     );
// };

// const MessageRed = ({ message, direction }) => {
//     return (
//         <Box
//             sx={{
//                 backgroundColor: '#ff7979',
//                 borderRadius: '8px',
//                 padding: '10px',
//                 margin: '5px 0',
//                 maxWidth: '80%',
//                 alignSelf: direction === 'outgoing' ? 'flex-end' : 'flex-start',
//                 display: 'flex',
//                 alignItems: 'center',
//                 position: 'relative',
//                 boxShadow: 1,
//             }}
//         >
//             <Box sx={{ minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
//                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
//                     <path stroke="none" d="M0 0h24v24H0z" fill="none" />
//                     <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.403zm.01 13.33l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -7a1 1 0 0 0 -.993 .883l-.007 .117v4l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-4l-.007 -.117a1 1 0 0 0 -.993 -.883z" />
//                 </svg>
//             </Box>
//             <Typography variant="body2">
//                 {message}
//             </Typography>
//         </Box>
//     );
// };

// const MessageWarning = ({ message, direction }) => {
//     return (
//         <Box
//             sx={{
//                 backgroundColor: '#ffe14a',
//                 borderRadius: '8px',
//                 padding: '10px',
//                 margin: '5px 0',
//                 maxWidth: '80%',
//                 alignSelf: direction === 'outgoing' ? 'flex-end' : 'flex-start',
//                 display: 'flex',
//                 alignItems: 'center',
//                 position: 'relative',
//                 boxShadow: 1,
//             }}
//         >
//             <Box sx={{ minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
//                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-alert-square"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
//             </Box>
//             <Typography variant="body2">
//                 {message}
//             </Typography>
//         </Box>
//     );
// };

// const MessageBlood = ({ message, direction }) => {
//     return (
//         <Box
//             sx={{
//                 backgroundColor: '#63a2ff',
//                 borderRadius: '8px',
//                 padding: '10px',
//                 margin: '5px 0',
//                 maxWidth: '80%',
//                 alignSelf: direction === 'outgoing' ? 'flex-end' : 'flex-start',
//                 display: 'flex',
//                 alignItems: 'center',
//                 position: 'relative',
//                 boxShadow: 1,
//                 minHeight: '100px',
//             }}
//         >
//             <Box sx={{ minWidth: '50px', display: 'flex', justifyContent: 'center' }}>
//                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-droplet"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M10.708 2.372a2.382 2.382 0 0 0 -.71 .686l-4.892 7.26c-1.981 3.314 -1.22 7.466 1.767 9.882c2.969 2.402 7.286 2.402 10.254 0c2.987 -2.416 3.748 -6.569 1.795 -9.836l-4.919 -7.306c-.722 -1.075 -2.192 -1.376 -3.295 -.686z" /></svg>
//             </Box>
//             <Box sx={{
//                 borderLeft: '2px solid black',
//                 alignSelf: 'stretch',
//                 marginLeft: '10px',
//                 marginRight: '10px'
//             }} />
//             <Typography variant="body2">
//                 {message}
//                 sdfsdf sfd
//             </Typography>
//         </Box>
//     );
// };

// // Create a component for displaying chat messages
// const ChatMessages = ({ messages, isTyping = false }) => {
//     const renderMessage = (message, i) => {
//         if (message.type === "message_red") {
//             return (
//                 <MessageRed
//                     key={`message_${i}`}
//                     message={message.message}
//                     direction={message.direction}
//                 />
//             );
//         } else if (message.type === "message_warning") {
//             return (
//                 <MessageWarning
//                     key={`message_${i}`}
//                     message={message.message}
//                     direction={message.direction}
//                 />
//             );
//         } else if (message.type === "message_blood") {
//             return (
//                 <MessageBlood
//                     key={`message_${i}`}
//                     message={message.message}
//                     direction={message.direction}
//                 />
//             );
//         } else if (message.direction === "outgoing") {
//             return (
//                 <MessageUser
//                     key={`message_${i}`}
//                     message={message.message}
//                     direction={message.direction}
//                 />
//             );
//         } else {
//             return (
//                 <MessageUser
//                     key={`message_${i}`}
//                     message={message.message}
//                     direction={message.direction}
//                 />
//             );
//         }
//     };
//     return (
//         <Box sx={{ height: "600px", position: "relative", overflow: "hidden" }}>
//             <MessageList
//                 style={{ top: 0 }}
//                 typingIndicator={isTyping ? <TypingIndicator content="My HealthDesk is typing..." /> : null}
//             >
//                 {messages?.map((message, i) => renderMessage(message, i))}
//             </MessageList>
//         </Box>
//     );
// };

// Default export for Storybook
export default {
  title: "Chat/ChatMessages",
  component: ChatMessages,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    messages: { control: "object" },
    isTyping: { control: "boolean" },
  },
};

// Create template for the stories
const Template = (args) => <ChatMessages {...args} />;

let message_warning = `
It seems that there is a mismatch between the information in the documents you provided so far and the information in your medical history. Please provide the correct information so that we can help you better.

- Dates are inconsistent
- Missing hospital name
- Low quality picture
`;

export const Default = Template.bind({});
Default.args = {
  messages: [
    {
      message: "What is the first message of this conversation?",
      sender: "user",
      created: 1742549641,
      direction: "outgoing",
    },

    // Funny messages go here:
    {
      message:
        "We seem to confidently diagnose that you suffer from a critical condition named 'harlquin type itchiosys'. You need urgent care. Please go to the nearest emergency room.",
      sender: "My HealthDesk",
      created: 1742549645,
      direction: "incoming",
      type: "message_red",
    },
    {
      message: message_warning,
      sender: "My HealthDesk",
      created: 1742549645,
      direction: "incoming",
      type: "message_warning",
    },
    {
      message: "",
      sender: "My HealthDesk",
      created: 1742549645,
      direction: "incoming",
      type: "message_blood",
      data: {
        bloodType: "A+",
        eosinophilCount: 0.5,
        neutrophilCount: 1.0,
        lymphocyteCount: 1.2,
        monocyteCount: 0.8,
        plateletCount: 0.75,
        redBloodCellCount: 1,
        whiteBloodCellCount: 1,
      },
    },

    {
      message:
        "I need to find a doctor for my chronic headaches. Where should I go?",
      sender: "user",
      created: 1742549700,
      direction: "outgoing",
    },
    {
      message:
        "I'm sorry to hear about your chronic headaches. Before suggesting where to go, could you tell me how long you've been experiencing these headaches and if they've recently changed in frequency or severity?",
      sender: "My HealthDesk",
      created: 1742549730,
      direction: "incoming",
    },
    {
      message:
        "I've had them for about 6 months, but they've gotten worse in the last 2 weeks.",
      sender: "user",
      created: 1742549800,
      direction: "outgoing",
    },
    {
      message:
        "Given that you're experiencing chronic headaches that have worsened recently, I would recommend seeing a primary care physician first. They can evaluate your condition and refer you to a neurologist if needed. Would you like me to help you find primary care options in your area?",
      sender: "My HealthDesk",
      created: 1742549830,
      direction: "incoming",
    },
    {
      message:
        "I've had them for about 6 months, but they've gotten worse in the last 2 weeks.",
      sender: "user",
      created: 1742549800,
      direction: "outgoing",
    },
    {
      message:
        "Given that you're experiencing chronic headaches that have worsened recently, I would recommend seeing a primary care physician first. They can evaluate your condition and refer you to a neurologist if needed. Would you like me to help you find primary care options in your area?",
      sender: "My HealthDesk",
      created: 1742549830,
      direction: "incoming",
    },
    {
      message:
        "I've had them for about 6 months, but they've gotten worse in the last 2 weeks.",
      sender: "user",
      created: 1742549800,
      direction: "outgoing",
    },
    {
      message:
        "Given that you're experiencing chronic headaches that have worsened recently, I would recommend seeing a primary care physician first. They can evaluate your condition and refer you to a neurologist if needed. Would you like me to help you find primary care options in your area?",
      sender: "My HealthDesk",
      created: 1742549830,
      direction: "incoming",
    },
    {
      message:
        "I've had them for about 6 months, but they've gotten worse in the last 2 weeks.",
      sender: "user",
      created: 1742549800,
      direction: "outgoing",
    },
    {
      message:
        "Given that you're experiencing chronic headaches that have worsened recently, I would recommend seeing a primary care physician first. They can evaluate your condition and refer you to a neurologist if needed. Would you like me to help you find primary care options in your area?",
      sender: "My HealthDesk",
      created: 1742549830,
      direction: "incoming",
    },
  ],
  isTyping: true,
};

export const EmptyChat = Template.bind({});
EmptyChat.args = {
  messages: [],
};
