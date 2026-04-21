const functions = require("firebase-functions");
const { runtimeConfigSecret } = require("../../runtimeConfig");
const { writeUnauthenticatedResponse } = require("./unauthenticated");
const { getKijabeRateLimit } = require("./ratelimiting");
const {
  startNewChat,
  sendMessage,
  getThreads,
  renameChat,
  deleteChat,
  deleteAllChats,
  getRateLimit,
  updateMessage,
} = require("./response");

const callableWithSecrets = functions
  .runWith({ secrets: [runtimeConfigSecret] })
  .https;

exports.getKijabeRateLimit = callableWithSecrets.onCall(async (data, context) => {
  const { userid, moduleTitle } = data;
  return await getKijabeRateLimit(userid, moduleTitle);
});

exports.startNewChat = callableWithSecrets.onCall(async (data, context) => {
  const { userid, assistantID, chattype, title, kijabeData, tracking } = data;
  return await startNewChat(
    userid,
    assistantID,
    chattype,
    title,
    kijabeData,
    tracking,
  );
});

exports.sendMessage = callableWithSecrets.onCall(async (data, context) => {
  const { userid, threadid, message, extra_instructions, model, tracking } =
    data;
  return await sendMessage(
    userid,
    threadid,
    message,
    extra_instructions,
    model,
    tracking,
  );
});

exports.getThreads = callableWithSecrets.onCall(async (data, context) => {
  const { userid } = data;
  return await getThreads(userid);
});

exports.renameChat = callableWithSecrets.onCall(async (data, context) => {
  const { userid, threadid, newtitle } = data;
  return await renameChat(userid, threadid, newtitle);
});

exports.deleteChat = callableWithSecrets.onCall(async (data, context) => {
  const { userid, threadid } = data;
  return await deleteChat(userid, threadid);
});

exports.deleteAllChats = callableWithSecrets.onCall(async (data, context) => {
  const { userid } = data;
  return await deleteAllChats(userid);
});

exports.getRateLimit = callableWithSecrets.onCall(async (data, context) => {
  const { userid, moduleTitle } = data;
  return await getRateLimit(userid, moduleTitle);
});

exports.updateMessage = callableWithSecrets.onCall(async (data, context) => {
  const { userid, threadid, index, new_message } = data;
  return await updateMessage(userid, threadid, index, new_message);
});

module.exports = {
  writeUnauthenticatedResponse,
  getKijabeRateLimit: exports.getKijabeRateLimit,
  startNewChat: exports.startNewChat,
  sendMessage: exports.sendMessage,
  getThreads: exports.getThreads,
  renameChat: exports.renameChat,
  deleteChat: exports.deleteChat,
  deleteAllChats: exports.deleteAllChats,
  getRateLimit: exports.getRateLimit,
  updateMessage: exports.updateMessage,
};
