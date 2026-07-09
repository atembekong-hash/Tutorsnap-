import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SubjectPicker } from "@/components/subject-picker";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import type { ChatMessage } from "@/shared/types";
import type { SubjectId } from "@/lib/subjects";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type QuizData = {
  quizTitle: string;
  subject: string;
  difficulty: string;
  questions: QuizQuestion[];
};

type QuizAnswer = {
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
};

type AppMode = "chat" | "quiz";

// ─── Quick Prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS: Record<string, string[]> = {
  default: [
    "Explain the quadratic formula",
    "What is integration by parts?",
    "Explain Newton's Second Law",
    "What caused World War I?",
    "Explain photosynthesis",
    "What is supply and demand?",
  ],
  algebra: ["Explain factoring", "How do I solve systems of equations?", "What is the quadratic formula?"],
  calculus: ["What is a derivative?", "Explain integration by parts", "What is the chain rule?"],
  biology: ["Explain DNA replication", "What is natural selection?", "Explain cell division"],
  chemistry: ["What is a mole?", "Explain ionic vs covalent bonds", "What is stoichiometry?"],
  physics: ["Explain Newton's laws", "What is kinetic energy?", "Explain electromagnetic waves"],
  us_history: ["What caused the Civil War?", "Explain the New Deal", "What was Manifest Destiny?"],
  world_history: ["What caused WWI?", "Explain the Cold War", "What was the Renaissance?"],
  american_literature: ["Analyze The Great Gatsby themes", "Explain symbolism in To Kill a Mockingbird"],
  composition: ["How do I write a thesis statement?", "Explain the 5-paragraph essay"],
  economics: ["Explain supply and demand", "What is GDP?", "Explain inflation"],
  psychology: ["Explain classical conditioning", "What is cognitive dissonance?"],
};

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, colors }: { message: ChatMessage; colors: any }) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
        {
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderColor: isUser ? colors.primary : colors.border,
        },
      ]}
    >
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={{ fontSize: 12 }}>📚</Text>
        </View>
      )}
      <View style={styles.bubbleContent}>
        <Text style={[styles.messageText, { color: isUser ? "#FFFFFF" : colors.foreground }]}>
          {message.content}
        </Text>
        <Text style={[styles.messageTime, { color: isUser ? "rgba(255,255,255,0.6)" : colors.muted }]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

// ─── QuizView ─────────────────────────────────────────────────────────────────

function QuizView({
  quiz,
  colors,
  onFinish,
  onRetake,
}: {
  quiz: QuizData;
  colors: any;
  onFinish: (answers: QuizAnswer[]) => void;
  onRetake: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const currentQ = quiz.questions[currentIndex];
  const totalQ = quiz.questions.length;
  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === currentQ?.correctIndex;
  const score = answers.filter((a) => a.isCorrect).length;

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === currentQ.correctIndex && Platform.OS !== "web") {
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 200);
    } else if (Platform.OS !== "web") {
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 200);
    }
  };

  const handleNext = () => {
    const newAnswer: QuizAnswer = {
      questionId: currentQ.id,
      selectedIndex: selectedOption!,
      isCorrect: selectedOption === currentQ.correctIndex,
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 >= totalQ) {
      setQuizComplete(true);
      onFinish(updatedAnswers);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return { backgroundColor: colors.surface, borderColor: colors.border };
    }
    if (index === currentQ.correctIndex) {
      return { backgroundColor: `${colors.success}18`, borderColor: colors.success };
    }
    if (index === selectedOption && index !== currentQ.correctIndex) {
      return { backgroundColor: `${colors.error}15`, borderColor: colors.error };
    }
    return { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.5 };
  };

  const getOptionTextColor = (index: number) => {
    if (!isAnswered) return colors.foreground;
    if (index === currentQ.correctIndex) return colors.success;
    if (index === selectedOption && index !== currentQ.correctIndex) return colors.error;
    return colors.muted;
  };

  if (quizComplete) {
    const pct = Math.round((score / totalQ) * 100);
    const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
    const gradeColor = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.error;
    const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📖";

    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Score card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.scoreEmoji}>{emoji}</Text>
          <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Quiz Complete!</Text>
          <Text style={[styles.quizTitleSmall, { color: colors.muted }]}>{quiz.quizTitle}</Text>
          <View style={[styles.gradeCircle, { backgroundColor: `${gradeColor}20`, borderColor: gradeColor }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
          </View>
          <Text style={[styles.scoreText, { color: colors.foreground }]}>
            {score} / {totalQ} correct
          </Text>
          <Text style={[styles.scorePct, { color: gradeColor }]}>{pct}%</Text>
        </View>

        {/* Review answers */}
        <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Review Answers</Text>
        {quiz.questions.map((q, i) => {
          const ans = answers[i];
          const correct = ans?.isCorrect;
          return (
            <View
              key={q.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: correct ? `${colors.success}10` : `${colors.error}10`,
                  borderColor: correct ? `${colors.success}40` : `${colors.error}40`,
                },
              ]}
            >
              <View style={styles.reviewHeader}>
                <MaterialIcons
                  name={correct ? "check-circle" : "cancel"}
                  size={18}
                  color={correct ? colors.success : colors.error}
                />
                <Text style={[styles.reviewQNum, { color: colors.muted }]}>Q{i + 1}</Text>
              </View>
              <Text style={[styles.reviewQuestion, { color: colors.foreground }]}>{q.question}</Text>
              <Text style={[styles.reviewAnswer, { color: correct ? colors.success : colors.error }]}>
                {correct ? "✓ " : "✗ "}{q.options[ans?.selectedIndex ?? 0]}
              </Text>
              {!correct && (
                <Text style={[styles.reviewCorrect, { color: colors.success }]}>
                  Correct: {q.options[q.correctIndex]}
                </Text>
              )}
              <Text style={[styles.reviewExplanation, { color: colors.muted }]}>{q.explanation}</Text>
            </View>
          );
        })}

        <TouchableOpacity
          onPress={onRetake}
          style={[styles.retakeBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <MaterialIcons name="refresh" size={18} color="#FFF" />
          <Text style={styles.retakeBtnText}>Take Another Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Progress */}
      <View style={styles.quizProgress}>
        <Text style={[styles.quizProgressText, { color: colors.muted }]}>
          Question {currentIndex + 1} of {totalQ}
        </Text>
        <View style={[styles.quizProgressBar, { backgroundColor: `${colors.primary}20` }]}>
          <View
            style={[
              styles.quizProgressFill,
              { backgroundColor: colors.primary, width: `${((currentIndex) / totalQ) * 100}%` as any },
            ]}
          />
        </View>
      </View>

      {/* Quiz title */}
      <Text style={[styles.quizTitleSmall, { color: colors.muted }]}>{quiz.quizTitle}</Text>

      {/* Question */}
      <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.questionText, { color: colors.foreground }]}>{currentQ.question}</Text>
      </View>

      {/* Options */}
      {currentQ.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleSelectOption(index)}
          style={[styles.optionBtn, getOptionStyle(index)]}
          activeOpacity={isAnswered ? 1 : 0.75}
        >
          <View style={[styles.optionLetter, {
            backgroundColor: isAnswered && index === currentQ.correctIndex
              ? `${colors.success}25`
              : isAnswered && index === selectedOption && index !== currentQ.correctIndex
              ? `${colors.error}20`
              : `${colors.primary}15`,
          }]}>
            <Text style={[styles.optionLetterText, { color: getOptionTextColor(index) }]}>
              {["A", "B", "C", "D"][index]}
            </Text>
          </View>
          <Text style={[styles.optionText, { color: getOptionTextColor(index) }]} numberOfLines={3}>
            {option.replace(/^[A-D]\)\s*/, "")}
          </Text>
          {isAnswered && index === currentQ.correctIndex && (
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
          )}
          {isAnswered && index === selectedOption && index !== currentQ.correctIndex && (
            <MaterialIcons name="cancel" size={18} color={colors.error} />
          )}
        </TouchableOpacity>
      ))}

      {/* Explanation */}
      {showExplanation && (
        <View
          style={[
            styles.explanationCard,
            {
              backgroundColor: isCorrect ? `${colors.success}12` : `${colors.warning}12`,
              borderColor: isCorrect ? `${colors.success}40` : `${colors.warning}40`,
            },
          ]}
        >
          <View style={styles.explanationHeader}>
            <Text style={{ fontSize: 16 }}>{isCorrect ? "✅" : "💡"}</Text>
            <Text style={[styles.explanationTitle, { color: isCorrect ? colors.success : colors.warning }]}>
              {isCorrect ? "Correct!" : "Not quite — here's why:"}
            </Text>
          </View>
          <Text style={[styles.explanationText, { color: colors.foreground }]}>
            {currentQ.explanation}
          </Text>
        </View>
      )}

      {/* Next button */}
      {isAnswered && (
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex + 1 >= totalQ ? "See Results" : "Next Question"}
          </Text>
          <MaterialIcons name={currentIndex + 1 >= totalQ ? "emoji-events" : "arrow-forward"} size={18} color="#FFF" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── QuizSetupModal ───────────────────────────────────────────────────────────

function QuizSetupModal({
  visible,
  subject,
  colors,
  onStart,
  onClose,
}: {
  visible: boolean;
  subject: SubjectId | null;
  colors: any;
  onStart: (topic: string, difficulty: "easy" | "medium" | "hard") => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const subjectLabel = subject ? getSubjectLabel(subject) : "General";
  const subjectColor = subject ? getSubjectColor(subject) : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Quiz Me 🧠</Text>
          <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
            Generate a 5-question {subjectLabel} quiz with instant feedback
          </Text>

          {/* Subject badge */}
          <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
            <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
            <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
          </View>

          {/* Topic input */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>SPECIFIC TOPIC (optional)</Text>
          <TextInput
            style={[styles.topicInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder={`e.g. "quadratic equations", "photosynthesis"...`}
            placeholderTextColor={colors.muted}
            value={topic}
            onChangeText={setTopic}
            returnKeyType="done"
          />

          {/* Difficulty */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>DIFFICULTY</Text>
          <View style={styles.diffRow}>
            {(["easy", "medium", "hard"] as const).map((d) => {
              const diffColors = { easy: colors.success, medium: colors.warning, hard: colors.error };
              const selected = difficulty === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[
                    styles.diffBtn,
                    {
                      backgroundColor: selected ? `${diffColors[d]}20` : colors.surface,
                      borderColor: selected ? diffColors[d] : colors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.diffBtnText, { color: selected ? diffColors[d] : colors.muted }]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Start button */}
          <TouchableOpacity
            onPress={() => { onStart(topic, difficulty); setTopic(""); }}
            style={[styles.startQuizBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="quiz" size={20} color="#FFF" />
            <Text style={styles.startQuizBtnText}>Start Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const colors = useColors();
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [mode, setMode] = useState<AppMode>("chat");
  const [showQuizSetup, setShowQuizSetup] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm StudyGenius AI, your personal academic tutor. I can help with Math, English/ELA, Science, Social Studies, and more.\n\nTap 'Quiz Me' to test your knowledge with a 5-question quiz, or just ask me anything! 📚",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const chatMutation = trpc.academic.chat.useMutation({
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const quizMutation = trpc.academic.generateQuiz.useMutation({
    onSuccess: (data) => {
      setActiveQuiz(data as QuizData);
      setQuizFinished(false);
      setMode("quiz");
      setShowQuizSetup(false);
    },
    onError: () => {
      setShowQuizSetup(false);
    },
  });

  const handleSend = (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText) return;

    Keyboard.dismiss();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const contextMessages = updatedMessages
      .filter((m) => m.id !== "welcome" && !m.id.startsWith("welcome-"))
      .map((m) => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ messages: contextMessages, subject: selectedSubject });
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: "Chat cleared! Ask me anything — math, science, English, history, and more. Tap 'Quiz Me' to test your knowledge! 📚",
        timestamp: Date.now(),
      },
    ]);
    setMode("chat");
    setActiveQuiz(null);
  };

  const handleStartQuiz = (topic: string, difficulty: "easy" | "medium" | "hard") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    quizMutation.mutate({
      subject: selectedSubject ?? "algebra",
      topic: topic.trim() || undefined,
      difficulty,
    });
  };

  const handleQuizFinish = useCallback((answers: QuizAnswer[]) => {
    setQuizFinished(true);
    const score = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const pct = Math.round((score / total) * 100);
    if (Platform.OS !== "web") {
      if (pct >= 80) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, []);

  const handleRetakeQuiz = () => {
    setActiveQuiz(null);
    setQuizFinished(false);
    setMode("chat");
    setShowQuizSetup(true);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.aiIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={{ fontSize: 20 }}>📚</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Tutor</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.onlineText, { color: colors.success }]}>Online · All Subjects</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Quiz Me button */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowQuizSetup(true);
              }}
              style={[styles.quizMeBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="quiz" size={16} color={colors.primary} />
              <Text style={[styles.quizMeBtnText, { color: colors.primary }]}>Quiz Me</Text>
            </TouchableOpacity>
            {/* Mode toggle (back to chat from quiz) */}
            {mode === "quiz" && (
              <TouchableOpacity
                onPress={() => { setMode("chat"); setActiveQuiz(null); }}
                style={[styles.clearBtn, { backgroundColor: colors.surface }]}
              >
                <MaterialIcons name="chat" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
            {mode === "chat" && (
              <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
                <IconSymbol size={20} name="trash.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subject Picker */}
        <View style={[styles.subjectRow, { borderBottomColor: colors.border }]}>
          <SubjectPicker selectedSubject={selectedSubject} onSelect={setSelectedSubject} />
        </View>

        {/* Content: Chat or Quiz */}
        {mode === "quiz" && activeQuiz ? (
          quizMutation.isPending ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Generating your quiz...</Text>
            </View>
          ) : (
            <QuizView
              quiz={activeQuiz}
              colors={colors}
              onFinish={handleQuizFinish}
              onRetake={handleRetakeQuiz}
            />
          )
        ) : (
          <>
            {/* Loading overlay for quiz generation */}
            {quizMutation.isPending && (
              <View style={[styles.quizLoadingBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.quizLoadingText, { color: colors.primary }]}>Generating your quiz...</Text>
              </View>
            )}

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListFooterComponent={
                chatMutation.isPending ? (
                  <View style={[styles.typingIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.typingText, { color: colors.muted }]}>StudyGenius is thinking...</Text>
                  </View>
                ) : null
              }
            />

            {/* Quick Prompts */}
            {messages.length <= 1 && (
              <View style={styles.quickPromptsContainer}>
                <Text style={[styles.quickPromptsLabel, { color: colors.muted }]}>Try asking:</Text>
                <View style={styles.quickPrompts}>
                  {(QUICK_PROMPTS[selectedSubject ?? ""] ?? QUICK_PROMPTS.default).map((prompt, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSend(prompt)}
                      style={[styles.quickPromptChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                    >
                      <Text style={[styles.quickPromptText, { color: colors.primary }]} numberOfLines={1}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={selectedSubject ? `Ask about ${selectedSubject.replace(/_/g, " ")}...` : "Ask about any subject..."}
                  placeholderTextColor={colors.muted}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={2000}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSend()}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!inputText.trim() || chatMutation.isPending}
                style={[
                  styles.sendBtn,
                  { backgroundColor: colors.primary },
                  (!inputText.trim() || chatMutation.isPending) && { opacity: 0.5 },
                ]}
              >
                <IconSymbol size={20} name="paperplane.fill" color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Quiz Setup Modal */}
      <QuizSetupModal
        visible={showQuizSetup}
        subject={selectedSubject}
        colors={colors}
        onStart={handleStartQuiz}
        onClose={() => setShowQuizSetup(false)}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 12, fontWeight: "600" },
  quizMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quizMeBtnText: { fontSize: 13, fontWeight: "700" },
  clearBtn: { padding: 8 },
  messageBubble: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "85%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  userBubble: { alignSelf: "flex-end", borderRadius: 18 },
  aiBubble: { alignSelf: "flex-start" },
  aiAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubbleContent: { flex: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  typingText: { fontSize: 13 },
  subjectRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5 },
  quickPromptsContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  quickPromptsLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
  quickPrompts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPromptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, maxWidth: "48%" },
  quickPromptText: { fontSize: 13, fontWeight: "500" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", padding: 12, borderTopWidth: 0.5, gap: 10 },
  inputWrapper: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120 },
  input: { fontSize: 15, lineHeight: 22 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 15 },
  quizLoadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quizLoadingText: { fontSize: 14, fontWeight: "600" },
  // Quiz styles
  quizProgress: { marginBottom: 8 },
  quizProgressText: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  quizProgressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  quizProgressFill: { height: 6, borderRadius: 3 },
  quizTitleSmall: { fontSize: 13, fontWeight: "600", marginBottom: 12, letterSpacing: 0.3 },
  questionCard: { padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  questionText: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  optionLetter: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 14, fontWeight: "800" },
  optionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  explanationCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  explanationTitle: { fontSize: 15, fontWeight: "700" },
  explanationText: { fontSize: 14, lineHeight: 22 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 4,
  },
  nextBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Score screen
  scoreCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  scoreEmoji: { fontSize: 48 },
  scoreTitle: { fontSize: 22, fontWeight: "800" },
  gradeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  gradeText: { fontSize: 32, fontWeight: "900" },
  scoreText: { fontSize: 17, fontWeight: "600" },
  scorePct: { fontSize: 28, fontWeight: "900" },
  reviewTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  reviewCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  reviewQNum: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  reviewQuestion: { fontSize: 14, lineHeight: 20, fontWeight: "600", marginBottom: 6 },
  reviewAnswer: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  reviewCorrect: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  reviewExplanation: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  retakeBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  subjectBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 6, alignSelf: "flex-start" },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectBadgeText: { fontSize: 13, fontWeight: "700" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 4 },
  topicInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  diffRow: { flexDirection: "row", gap: 10 },
  diffBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
  diffBtnText: { fontSize: 14, fontWeight: "700" },
  startQuizBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  startQuizBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
