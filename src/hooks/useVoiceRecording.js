/**
 * useVoiceRecording - Core voice recording hook for ChartMind
 * MVP: Web Speech API transcription with start/stop/pause and timer
 *
 * TODO: iOS Safari handling (continuous mode workaround)
 * TODO: Whisper STT integration for higher accuracy
 * TODO: Speaker diarization
 * TODO: Audio normalization/compression (AudioProcessor)
 * TODO: MSI real-time guidance integration
 */

import { useState, useRef, useCallback, useEffect } from "react";
import chartmindService from "services/chartmindService";

const LOG_PREFIX = "[useVoiceRecording]";

const resolveRecognitionLanguage = (language) => {
  // Web Speech locale support differs by browser/provider.
  // Normalize known problematic locales to maximize uptime.
  if (language === "sw-KE") return "sw";
  return language;
};

const getFallbackLanguage = (language) => {
  if (language === "sw-KE") return "sw";
  if (language === "sw") return "en-US";
  return null;
};

/**
 * Check if Web Speech API is supported
 * Note: Web Speech API requires Chrome's speech services, so it only works
 * reliably in Chromium-based browsers (Chrome, Edge, Opera, etc.)
 */
const checkSpeechRecognitionSupport = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  return !!SpeechRecognition;
};

/**
 * useVoiceRecording Hook
 *
 * @param {Object} options - Hook options
 * @param {string} options.language - Speech recognition language code (default: 'en-US')
 * @returns {Object} Recording state and control functions
 */
const useVoiceRecording = ({ language = "en-US" } = {}) => {
  // Check browser support once on mount
  const [isSupported] = useState(() => checkSpeechRecognitionSupport());

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  // Chart generation state
  const [chart, setChart] = useState("");
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);

  // Refs for cleanup and state access in callbacks
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Transcript accumulation ref - persists across recognition restarts
  const finalTranscriptRef = useRef("");
  const lastInterimRef = useRef("");
  const fallbackLanguageRef = useRef(null);
  const recognitionRestartCountRef = useRef(0);

  // Update refs when state changes
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  /**
   * Initialize Web Speech API
   */
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        `${LOG_PREFIX} Speech recognition not supported in this browser`
      );
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveRecognitionLanguage(language);
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionRestartCountRef.current += 1;
      console.log(`${LOG_PREFIX} Speech recognition started`, {
        configuredLanguage: language,
        activeLanguage: recognition.lang,
        restartCount: recognitionRestartCountRef.current,
      });
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcriptPart + " ";
          lastInterimRef.current = "";
        } else {
          interimTranscript += transcriptPart;
        }
      }

      lastInterimRef.current = interimTranscript;
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onspeechstart = () => {
      console.log(`${LOG_PREFIX} Speech detected`);
    };

    recognition.onspeechend = () => {
      console.log(`${LOG_PREFIX} Speech ended`);
    };

    recognition.onaudioend = () => {
      console.log(`${LOG_PREFIX} Audio stream ended`);
    };

    recognition.onerror = (event) => {
      console.log(`${LOG_PREFIX} Recognition error`, {
        error: event.error,
        configuredLanguage: language,
        activeLanguage: recognition.lang,
        isRecording: isRecordingRef.current,
        isPaused: isPausedRef.current,
      });

      if (event.error === "no-speech") {
        // Normal silence - don't show error
      } else if (event.error === "aborted") {
        // Recognition was aborted - normal during stop
      } else if (event.error === "language-not-supported") {
        const fallbackLanguage = getFallbackLanguage(language);
        if (fallbackLanguage) {
          fallbackLanguageRef.current = fallbackLanguage;
          console.warn(`${LOG_PREFIX} Language unsupported, scheduling fallback`, {
            requestedLanguage: language,
            currentLanguage: recognition.lang,
            fallbackLanguage,
          });
        } else {
          setError(
            `Speech language "${language}" is not supported by this browser. Try English or a different locale.`
          );
        }
      } else if (event.error === "not-allowed") {
        setError(
          "Microphone permission denied. Please allow microphone access."
        );
      } else if (event.error === "network") {
        setError(
          "Speech recognition is unavailable. This may be due to browser privacy settings or network issues. Please use Google Chrome or Microsoft Edge."
        );
        // Stop recording on network error (e.g., Brave browser blocking Google's servers)
        if (isRecordingRef.current) {
          isRecordingRef.current = false;
          setIsRecording(false);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream
              .getTracks()
              .forEach((track) => track.stop());
          }
        }
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log(
        `${LOG_PREFIX} Recognition ended`,
        {
          isRecording: isRecordingRef.current,
          isPaused: isPausedRef.current,
          activeLanguage: recognition.lang,
          pendingFallbackLanguage: fallbackLanguageRef.current,
        }
      );

      // Preserve interim content if recognition ended unexpectedly
      if (lastInterimRef.current && lastInterimRef.current.trim()) {
        finalTranscriptRef.current += lastInterimRef.current + " ";
        lastInterimRef.current = "";
        setTranscript(finalTranscriptRef.current);
      }

      // Auto-restart if still recording and not paused
      if (isRecordingRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (isRecordingRef.current && !isPausedRef.current) {
            if (fallbackLanguageRef.current) {
              recognition.lang = fallbackLanguageRef.current;
              fallbackLanguageRef.current = null;
              console.log(`${LOG_PREFIX} Applying fallback language before restart`, {
                nextLanguage: recognition.lang,
              });
            }
            try {
              recognition.start();
            } catch (e) {
              console.log(
                `${LOG_PREFIX} Recognition restart failed`,
                {
                  message: e.message,
                  activeLanguage: recognition.lang,
                }
              );
            }
          }
        }, 250);
      }
    };

    return recognition;
  }, [language]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    // Check browser support first
    if (!isSupported) {
      setError(
        "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
      );
      return;
    }

    try {
      setError(null);
      setTranscript("");
      setChart("");
      setRecordingTime(0);
      audioChunksRef.current = [];
      finalTranscriptRef.current = "";
      lastInterimRef.current = "";
      fallbackLanguageRef.current = null;
      recognitionRestartCountRef.current = 0;
      console.log(`${LOG_PREFIX} Starting recording`, {
        requestedLanguage: language,
        resolvedLanguage: resolveRecognitionLanguage(language),
      });

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize MediaRecorder for audio capture
      // TODO: Add AudioProcessor for normalization/compression
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;

      // Initialize speech recognition
      const recognition = initializeSpeechRecognition();
      speechRecognitionRef.current = recognition;

      // Start recording
      mediaRecorder.start(1000); // 1s chunks
      if (recognition) {
        recognition.start();
      }

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error(`${LOG_PREFIX} Error starting recording:`, err);
      if (err.name === "NotAllowedError") {
        setError(
          "Microphone permission denied. Please allow microphone access."
        );
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
      throw err;
    }
  }, [isSupported, initializeSpeechRecognition]);

  /**
   * Stop recording and generate chart
   */
  const stopRecording = useCallback(async () => {
    try {
      isRecordingRef.current = false;

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }

      // Stop media recorder and tracks
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        const stream = mediaRecorderRef.current.stream;
        stream.getTracks().forEach((track) => track.stop());
      }

      setIsRecording(false);
      setIsPaused(false);

      // Get final transcript
      const finalTranscript = finalTranscriptRef.current.trim();

      // Generate chart if we have transcript
      if (finalTranscript) {
        setIsGeneratingChart(true);
        try {
          const audioBlob =
            audioChunksRef.current.length > 0
              ? new Blob(audioChunksRef.current, { type: "audio/webm" })
              : null;

          const generatedChart = await chartmindService.generateChart({
            transcript: finalTranscript,
            audioBlob,
          });
          setChart(generatedChart);
        } catch (chartErr) {
          console.error(
            "[useVoiceRecording] Chart generation failed:",
            chartErr
          );
          setError("Failed to generate chart. Please try again.");
        } finally {
          setIsGeneratingChart(false);
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error stopping recording:`, err);
      setError(`Failed to stop recording: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsPaused(true);
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.start();
      } catch (e) {
        console.error(
          "[useVoiceRecording] Failed to resume speech recognition:",
          e
        );
      }
    }
    // Resume timer
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    setIsPaused(false);
  }, []);

  /**
   * Reset all state for a new recording
   */
  const resetRecording = useCallback(() => {
    setTranscript("");
    setChart("");
    setRecordingTime(0);
    setError(null);
    audioChunksRef.current = [];
    finalTranscriptRef.current = "";
    lastInterimRef.current = "";
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Manually set transcript (for paste functionality)
   * Also updates the internal ref to keep state in sync
   */
  const updateTranscript = useCallback((newTranscript) => {
    finalTranscriptRef.current = newTranscript;
    lastInterimRef.current = "";
    setTranscript(newTranscript);
  }, []);

  return {
    // Browser support
    isSupported,

    // Recording state
    isRecording,
    isPaused,
    recordingTime,
    transcript,
    error,

    // Chart state
    chart,
    isGeneratingChart,

    // Control functions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    clearError,
    updateTranscript,
  };
};

export default useVoiceRecording;
