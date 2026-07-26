import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FAQ Data ──────────────────────────────────────────────────────────────
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: "gs1",
    category: "Getting Started",
    question: "How do I solve a math problem with TutorSnap?",
    answer: "There are two ways to solve a problem:\n\n1. Type your problem: Tap the Solve tab, type your problem in the text box (you can use the math keyboard for symbols like sqrt, integral, pi), then tap Solve. The AI will generate a full step-by-step solution within seconds.\n\n2. Take a photo: Tap the camera button in the center of the tab bar, point your camera at the problem, and tap the shutter. TutorSnap will read the text using OCR, confirm the recognized problem with you, and then solve it.\n\nTip: After receiving a solution, you can tap any step to ask the AI Tutor to explain it in more detail. You can also tap the bookmark icon to save the solution for later review.",
    tags: ["solve", "type", "camera", "how to", "step by step"],
  },
  {
    id: "gs2",
    category: "Getting Started",
    question: "What subjects does TutorSnap support?",
    answer: "TutorSnap covers every major academic subject taught from middle school through university level:\n\nMathematics: Arithmetic, Pre-Algebra, Algebra I and II, Geometry, Trigonometry, Pre-Calculus, Calculus (Differential and Integral), Multivariable Calculus, Linear Algebra, Differential Equations, Statistics, Probability, Discrete Mathematics, and Number Theory.\n\nSciences: Physics (Mechanics, Thermodynamics, Electromagnetism, Optics, Quantum), Chemistry (General, Organic, Inorganic, Physical, Analytical), Biology (Cell Biology, Genetics, Ecology, Anatomy, Physiology), Earth Science, Environmental Science, and Astronomy.\n\nHumanities: World History, US History, European History, Geography, Political Science, Economics (Micro and Macro), Philosophy, and Sociology.\n\nLanguage Arts: English Grammar, Essay Writing, Literary Analysis, Reading Comprehension, Creative Writing, Spanish, French, German, and Latin.\n\nComputer Science: Programming concepts, Algorithms, Data Structures, and Discrete Math.\n\nYou can set your preferred subjects in Settings to receive personalized practice problems and study tips tailored to your curriculum.",
    tags: ["subjects", "math", "science", "history", "languages", "calculus", "chemistry"],
  },
  {
    id: "gs3",
    category: "Getting Started",
    question: "Is TutorSnap free to use?",
    answer: "TutorSnap offers a comprehensive free tier with no time limits or paywalls on core features. Free users get:\n\nUnlimited problem solving with full step-by-step explanations, AI Chat Tutor access for concept explanations and follow-up questions, Practice Quiz generation in any subject at any difficulty level, Flashcard creation and review, Streak tracking with daily reminders, Badge and achievement system, History of all solved problems with bookmarks, Study Planner with Pomodoro timer, and the Classroom feature for group study.\n\nTutorSnap Pro (optional upgrade) unlocks additional features including priority AI response speed, extended conversation history, advanced analytics, and early access to new features. Pro is never required to access the core learning tools.\n\nAll pricing is shown transparently in Settings. There are no hidden fees or auto-renewing trials without your explicit consent.",
    tags: ["free", "pricing", "cost", "premium", "pro", "subscription"],
  },
  {
    id: "gs4",
    category: "Getting Started",
    question: "Do I need to create an account?",
    answer: "No account is required. TutorSnap is fully functional without signing in. All your study data including history, streaks, badges, flashcards, notes, and preferences is stored locally on your device and is never uploaded to a server without your consent.\n\nCreating an optional account (Settings) lets you:\n- Sync your progress across multiple devices\n- Restore your data if you get a new phone\n- Participate in the Classroom leaderboard with a persistent identity\n- Receive personalized study recommendations based on your history\n\nYou can use TutorSnap for years without ever creating an account, and your data will remain safe on your device.",
    tags: ["account", "login", "sign up", "registration", "no account", "guest"],
  },
  {
    id: "gs5",
    category: "Getting Started",
    question: "How do I set up TutorSnap for my grade level?",
    answer: "TutorSnap adapts to your grade level to provide age-appropriate explanations and practice problems. To set your grade:\n\n1. Go to Settings (gear icon in the top right of any tab)\n2. Tap Grade Level\n3. Select your current grade (Middle School, High School, Undergraduate, Graduate, or Professional)\n\nYou can also set your grade level during the initial onboarding flow when you first open the app.\n\nOnce set, the AI Tutor will automatically calibrate its explanations to your level. For example, a middle schooler asking about fractions will get a simpler explanation than a high schooler asking the same question. You can always change your grade level at any time in Settings.",
    tags: ["grade level", "setup", "onboarding", "calibrate", "difficulty"],
  },
  {
    id: "gs6",
    category: "Getting Started",
    question: "What is the Classroom feature?",
    answer: "The Classroom feature (accessible from the Classroom tab) lets teachers and students collaborate in a shared learning space.\n\nFor teachers:\n- Create a classroom with a unique 6-digit join code\n- Post homework assignments and practice problems\n- Track student progress and completion rates\n- View a leaderboard of top performers in your class\n- Send announcements to all students\n\nFor students:\n- Join a classroom using the teacher's code\n- See assigned homework and due dates\n- Submit solutions and get AI-graded feedback\n- See your rank on the class leaderboard\n- Ask questions that the whole class can benefit from\n\nClassrooms are private and only accessible to members with the join code. Student data within classrooms is only visible to the teacher and the student themselves.",
    tags: ["classroom", "teacher", "student", "homework", "join code", "leaderboard"],
  },
  {
    id: "gs7",
    category: "Getting Started",
    question: "How do I use the Study Planner?",
    answer: "The Study Planner (accessible from Settings or the Practice tab) helps you build a consistent study schedule.\n\nKey features:\n\nPomodoro Timer: Work in focused 25-minute sessions with 5-minute breaks. After 4 sessions, take a longer 15-minute break. This technique is scientifically proven to improve focus and retention.\n\nDaily Goal: Set a target number of problems to solve each day (1, 3, 5, 10, or custom). Completing your daily goal maintains your streak and earns bonus XP.\n\nStudy Reminders: Schedule up to 3 daily reminders at custom times. TutorSnap will send you a push notification to remind you to study.\n\nWeekly Review: Every Sunday, TutorSnap summarizes your week including problems solved, quiz scores, subjects studied, and streak progress.\n\nTo access: Settings > Study Planner, or tap the timer icon on the Practice tab.",
    tags: ["study planner", "pomodoro", "timer", "schedule", "reminder", "daily goal"],
  },
  // Camera & Scanning
  {
    id: "cam1",
    category: "Camera & Scanning",
    question: "The camera is not recognizing my problem. What should I try?",
    answer: "Here are the most effective tips for improving scan accuracy:\n\n1. Lighting: Use bright, even lighting. Natural daylight or a desk lamp positioned to eliminate shadows works best. Avoid backlighting (having a bright window behind the paper).\n\n2. Camera angle: Hold your device directly above the problem, parallel to the page. Angled shots introduce distortion that reduces OCR accuracy.\n\n3. Distance: Keep the camera 20 to 30 cm (about 8 to 12 inches) from the page. Too close causes blur; too far reduces resolution.\n\n4. Contrast: Dark ink on white or light-colored paper gives the best results. Blue or black ballpoint pen is ideal. Pencil, especially light pencil, is harder to read.\n\n5. Crop carefully: After taking the photo, use the crop tool to include only the specific problem you want solved. Removing surrounding text helps the AI focus on the right content.\n\n6. Steady your hand: Use both hands or rest your elbows on the desk to minimize camera shake.\n\n7. Edit after scan: After the OCR processes the image, you can edit the recognized text before submitting. Always review the recognized text to catch any errors before solving.",
    tags: ["camera", "scan", "photo", "recognition", "not working", "OCR", "accuracy"],
  },
  {
    id: "cam2",
    category: "Camera & Scanning",
    question: "Can I scan problems from a textbook or worksheet?",
    answer: "Yes, TutorSnap can read printed and handwritten text from virtually any source:\n\nPrinted text (textbooks, worksheets, typed problems): Excellent accuracy, typically 95%+ recognition rate.\n\nNeat handwriting: Good accuracy, typically 80 to 90% recognition rate. Works best with clear, block-style writing.\n\nCursive or messy handwriting: Lower accuracy, typically 50 to 70%. We recommend reviewing and correcting the recognized text before solving.\n\nDigital screens (tablet, computer monitor): Works well, but may have glare issues. Try adjusting your angle or reducing screen brightness.\n\nAfter scanning, TutorSnap always shows you the recognized text and lets you edit it before submitting. This ensures you can correct any OCR errors before the AI attempts to solve the problem.\n\nFor complex diagrams, graphs, or geometric figures, describe the figure in text after scanning the surrounding text for best results.",
    tags: ["textbook", "worksheet", "handwriting", "printed", "OCR", "accuracy"],
  },
  {
    id: "cam3",
    category: "Camera & Scanning",
    question: "Can I upload a photo from my gallery instead of taking a new one?",
    answer: "Yes. When you tap the camera button in the Scan tab, you will see two options at the bottom of the screen: Take Photo and Choose from Library. Tapping Choose from Library opens your device photo gallery, where you can select any existing image.\n\nThis is useful for:\n- Problems you photographed earlier but did not solve yet\n- Screenshots of digital problems sent to you by a teacher or classmate\n- Images of problems from educational apps or websites\n- Photos taken on a different device and transferred to your phone\n\nThe same OCR and editing flow applies to gallery uploads. The recognized text will be shown for your review before solving.",
    tags: ["gallery", "photo library", "upload", "image", "existing photo"],
  },
  {
    id: "cam4",
    category: "Camera & Scanning",
    question: "Can TutorSnap solve problems with diagrams, graphs, or geometric figures?",
    answer: "TutorSnap can partially handle problems with visual elements:\n\nWhat works well: Problems where the diagram is supplementary and the key information is in the text (e.g., 'Triangle ABC has sides of 3, 4, and 5 cm. Find the area.'). The AI can solve these from the text alone.\n\nWhat requires manual input: Problems where the diagram contains essential information not present in the text (e.g., a graph with specific coordinates, a circuit diagram, a geometric proof with labeled angles). In these cases, describe the visual elements in the text field after scanning.\n\nTip for geometry: After scanning the text, add a description like 'The triangle has a right angle at C, with angle A = 30 degrees and hypotenuse = 10 cm' to give the AI the information it needs.\n\nFuture updates will include improved diagram understanding capabilities.",
    tags: ["diagram", "graph", "geometry", "figure", "visual", "image"],
  },
  // Streaks & Progress
  {
    id: "str1",
    category: "Streaks & Progress",
    question: "How does the streak system work?",
    answer: "Your streak is a count of consecutive days on which you meet your daily study goal. Here is how it works in detail:\n\nWhat counts: Solving at least 1 problem, completing a practice quiz, or reviewing flashcards on a given calendar day (midnight to midnight in your local timezone).\n\nDaily goal: You can set a custom daily goal in Settings (e.g., solve 5 problems per day). If you set a goal higher than 1, you must meet that goal to advance your streak. Solving fewer problems than your goal will not count for streak purposes.\n\nStreak reset: If you do not meet your goal on any calendar day, your streak resets to 0 at midnight. The only exception is if you have a Streak Shield available and choose to use it.\n\nStreak milestones: Reaching 7, 14, 30, 60, 100, 200, and 365 days unlocks special badges and bonus rewards.\n\nTip: Set a daily reminder in Settings to help you stay consistent. Even solving one quick problem before bed is enough to maintain your streak.",
    tags: ["streak", "daily", "consecutive", "reset", "goal", "milestone"],
  },
  {
    id: "str2",
    category: "Streaks & Progress",
    question: "What is a Streak Shield and how do I use it?",
    answer: "A Streak Shield is a one-time protection that prevents your streak from resetting if you miss a day. Think of it as a free pass for life's unexpected interruptions.\n\nHow to earn Streak Shields:\n- Reach a streak milestone (7, 30, 100 days) to receive 1 shield automatically\n- Complete a Daily Challenge to earn a shield\n- Redeem a promotional code that includes shields\n- Earn them through the Rewards system\n\nHow to use a Streak Shield:\n1. If you miss a day, open TutorSnap the next day\n2. You will see a notification that your streak is at risk\n3. Tap Use Shield to consume one shield and preserve your streak\n4. Your streak continues as if you had studied the previous day\n\nImportant rules:\n- You can hold a maximum of 3 shields at any time\n- Shields can only be used once per missed day\n- You cannot use a shield retroactively for a day you already lost\n- Shields do not stack for multiple consecutive missed days",
    tags: ["shield", "streak freeze", "protect", "missed day", "earn shield"],
  },
  {
    id: "str3",
    category: "Streaks & Progress",
    question: "Why did my streak reset even though I solved a problem?",
    answer: "There are several reasons this can happen:\n\n1. Timezone issue: Streaks reset at midnight in your device's local timezone. If your device clock is incorrect, or if you traveled across timezones, the day boundary may have shifted. Check that your device time and timezone are set correctly in your device Settings.\n\n2. Daily goal not met: If you set a daily goal higher than 1 problem (e.g., 5 problems per day), solving fewer than your goal does not count for streak purposes. Check your daily goal in Settings.\n\n3. App reinstalled or data cleared: Local data is stored on your device. If you reinstalled TutorSnap, cleared the app's storage, or got a new phone without backing up, your streak history is lost.\n\n4. Solve happened after midnight: If you solved a problem at 11:58 PM and the next one was at 12:02 AM, those are on different calendar days.\n\nIf none of these explain the issue, please report it via Settings > Report a Bug. Include the date it happened and your device timezone.",
    tags: ["streak reset", "bug", "timezone", "lost progress", "daily goal"],
  },
  {
    id: "str4",
    category: "Streaks & Progress",
    question: "How do I earn badges and what are they all?",
    answer: "Badges are permanent achievements that recognize your learning milestones. Here is the complete list:\n\nProblem Solver Series: First Step (1 problem), Getting Going (10 problems), Century Club (100 problems), Problem Machine (500 problems), Legend (1000 problems).\n\nStreak Series: Week Warrior (7-day streak), Monthly Master (30-day streak), Century Streak (100-day streak), Year-Round Scholar (365-day streak).\n\nSubject Mastery: Bronze, Silver, and Gold badges for each subject (Mathematics, Science, English, History, Languages, Computer Science).\n\nQuiz Performance: Quiz Starter (first quiz completed), High Scorer (90%+ on any quiz), Perfect Round (100% on a 10-question quiz), Speed Demon (complete a quiz in under 60 seconds with 80%+ score).\n\nConsistency: Daily Devotion (meet daily goal 7 days in a row), Habit Builder (meet daily goal 30 days in a row).\n\nSpecial: Early Adopter (joined during launch period), Night Owl (solved a problem after midnight), Early Bird (solved a problem before 6 AM), Weekend Warrior (studied on both Saturday and Sunday).\n\nView all your earned and locked badges on the Progress screen.",
    tags: ["badges", "achievements", "milestones", "earn", "list", "all badges"],
  },
  {
    id: "str5",
    category: "Streaks & Progress",
    question: "What is the XP system and how does it work?",
    answer: "XP (Experience Points) is a measure of your overall learning activity in TutorSnap. You earn XP for every study action:\n\nSolving a problem: 10 XP (Easy), 20 XP (Medium), 35 XP (Hard)\nCompleting a quiz: 15 XP (Easy), 30 XP (Medium), 50 XP (Hard), plus bonus XP for high scores\nAI Tutor conversation: 5 XP per session\nCreating flashcards: 5 XP per deck\nReviewing flashcards: 3 XP per session\nDaily goal completion: 25 XP bonus\nStreak milestone: 50 to 200 XP bonus depending on milestone\n\nXP accumulates on your profile and is used to determine your overall rank on the leaderboard. XP never decreases, even if your streak resets.\n\nXP levels: Beginner (0 to 500), Learner (500 to 2000), Scholar (2000 to 5000), Expert (5000 to 15000), Master (15000+).",
    tags: ["XP", "experience points", "level", "rank", "leaderboard"],
  },
  // Practice & Quizzes
  {
    id: "prac1",
    category: "Practice & Quizzes",
    question: "How does the Practice Quiz work?",
    answer: "The Practice Quiz generates AI-powered questions tailored to your chosen subject, difficulty level, and grade setting. Here is the full flow:\n\n1. Go to the Practice tab\n2. Select a subject from the list (Mathematics, Science, English, History, etc.)\n3. Choose a difficulty: Easy (foundational concepts), Medium (standard curriculum), or Hard (advanced and challenging)\n4. Choose quiz length: 3 questions (quick check), 5 questions (standard), or 10 questions (full session)\n5. Tap Start Quiz\n\nDuring the quiz:\n- Each question is multiple choice with 4 options\n- A timer counts up (no time limit by default, but you can enable a timed mode in Settings)\n- Tap an answer to select it, then tap Submit to confirm\n\nAfter the quiz:\n- Your score is shown as a percentage\n- Each question is reviewed with the correct answer highlighted\n- The AI provides a detailed explanation for every question, including why the wrong answers are incorrect\n- Your result is saved to Quiz History for later review",
    tags: ["quiz", "practice", "multiple choice", "score", "difficulty", "how to"],
  },
  {
    id: "prac2",
    category: "Practice & Quizzes",
    question: "What is Subject Mastery and how do I level it up?",
    answer: "Subject Mastery is a per-subject progression system that tracks your depth of knowledge over time. Each subject has three mastery levels:\n\nBronze (Beginner): Awarded after solving 5 or more problems in a subject. This shows you have started exploring the subject.\n\nSilver (Intermediate): Awarded after solving 20 or more problems in a subject AND achieving an average quiz score of 70% or higher in that subject. This shows consistent engagement and reasonable accuracy.\n\nGold (Advanced): Awarded after solving 50 or more problems in a subject AND achieving an average quiz score of 85% or higher. This is the highest mastery level and indicates strong command of the subject.\n\nTips for leveling up faster:\n- Focus on one subject at a time rather than spreading across many\n- Review your wrong quiz answers using the Quiz History feature\n- Use the AI Tutor to clarify concepts you find difficult\n- Complete the Daily Challenge, which often focuses on a specific subject\n\nYour mastery levels are displayed on the Progress screen and contribute to your overall profile rank.",
    tags: ["mastery", "subject", "bronze", "silver", "gold", "level up", "progression"],
  },
  {
    id: "prac3",
    category: "Practice & Quizzes",
    question: "Can I review my past quiz results?",
    answer: "Yes. TutorSnap keeps a complete history of every quiz you have taken. To access it:\n\n1. Go to the Practice tab\n2. Tap View Quiz History (or the history icon in the top right)\n3. Browse your past quizzes sorted by date\n\nFor each quiz in your history, you can see:\n- The subject and difficulty level\n- Your score as a percentage\n- The date and time you took it\n- The number of questions and time taken\n- A full question-by-question breakdown showing which you got right and wrong\n- The AI's explanation for each question\n\nYou can also filter your quiz history by subject, date range, or score range. This is useful for identifying subjects where you consistently struggle and need more practice.",
    tags: ["quiz history", "past results", "review", "scores", "breakdown"],
  },
  {
    id: "prac4",
    category: "Practice & Quizzes",
    question: "What is the Daily Challenge?",
    answer: "The Daily Challenge is a special problem that refreshes every 24 hours. It is designed to be slightly harder than a typical practice problem and covers a variety of subjects and topics.\n\nWhy do the Daily Challenge?\n- Earn bonus XP (50 XP for completion, 100 XP for a perfect solution)\n- Earn Streak Shields for consistent daily challenge completion\n- Unlock special Daily Challenge badges\n- Compete with other TutorSnap users on the global leaderboard\n\nHow to access it:\n- The Daily Challenge banner appears at the top of the Practice tab each day\n- You can also access it from the Home screen widget (if enabled)\n- Tap the challenge to see the problem and submit your answer\n\nThe Daily Challenge resets at midnight in your local timezone. You cannot go back and complete a previous day's challenge after it has expired.",
    tags: ["daily challenge", "bonus", "XP", "leaderboard", "special problem"],
  },
  {
    id: "prac5",
    category: "Practice & Quizzes",
    question: "How do Flashcards work?",
    answer: "Flashcards are a powerful spaced repetition study tool built into TutorSnap. You can create, organize, and review flashcard decks for any subject.\n\nCreating flashcards:\n1. Go to Settings > Flashcards, or tap the flashcard icon in the Practice tab\n2. Tap Create New Deck and give it a name (e.g., 'Calculus Formulas')\n3. Add cards with a front (question or term) and back (answer or definition)\n4. You can also auto-generate flashcards from a solved problem by tapping the flashcard icon in the solution view\n\nReviewing flashcards:\n- Tap a deck to start a review session\n- Swipe right if you know the card, swipe left if you do not\n- TutorSnap uses a spaced repetition algorithm to show you harder cards more often\n- Each session shows you a summary of cards you knew vs. did not know\n\nSharing and exporting:\n- Tap the share icon on any deck to export it as a PDF or share it with a classmate\n- You can also import decks shared by others",
    tags: ["flashcards", "spaced repetition", "review", "create", "deck", "study"],
  },
  // AI Tutor
  {
    id: "ai1",
    category: "AI Tutor",
    question: "What can I ask the AI Tutor?",
    answer: "The AI Tutor (Chat tab) is a full-featured academic assistant that can help with virtually any school or university subject. Here are examples of what you can ask:\n\nMath and Science:\n- 'Explain what a derivative is in simple terms'\n- 'Walk me through solving this integral step by step: integral of x^2 * sin(x) dx'\n- 'Why does water have a higher boiling point than hydrogen sulfide?'\n- 'Help me understand Newton's second law with a real-world example'\n\nHumanities and Writing:\n- 'Help me outline a 5-paragraph essay on the causes of World War I'\n- 'What is the difference between a simile and a metaphor? Give me 5 examples of each'\n- 'Explain the significance of the Magna Carta in modern democracy'\n\nStudy Skills:\n- 'What is the best way to study for a chemistry exam?'\n- 'Create a 2-week study plan for my SAT Math section'\n- 'Explain the Feynman Technique and how I can use it'\n\nFollow-up and clarification:\n- 'Can you explain step 3 again more simply?'\n- 'What if I used a different method?'\n- 'Give me a harder practice problem on this topic'\n\nThe AI Tutor remembers the last 50 messages in your current conversation.",
    tags: ["chat", "ai tutor", "ask", "explain", "help", "examples", "what to ask"],
  },
  {
    id: "ai2",
    category: "AI Tutor",
    question: "Is the AI Tutor always accurate?",
    answer: "The AI Tutor is highly capable and accurate for the vast majority of academic questions, but it is not infallible. Here is what you should know:\n\nStrengths: The AI performs very well on well-defined mathematical problems, standard science concepts, grammar and writing, historical facts, and explaining established theories. For these, accuracy is typically 95%+.\n\nLimitations: The AI may occasionally make errors on:\n- Very long multi-step calculations (arithmetic errors can accumulate)\n- Highly specialized or niche academic topics\n- Problems that require interpreting a diagram or graph it cannot see\n- Very recent events (the AI's knowledge has a training cutoff)\n\nBest practices:\n- Always verify critical answers with your textbook or teacher, especially for exams\n- Use the step-by-step explanations to understand the reasoning, not just copy the final answer\n- If an answer seems wrong, ask the AI to 'double-check your work' or 'try a different method'\n- Report persistent errors via Settings > Report a Bug\n\nAcademic integrity: TutorSnap is designed as a learning aid. Understanding the solution process is far more valuable than submitting a copied answer.",
    tags: ["accuracy", "wrong answer", "error", "reliable", "limitations", "trust"],
  },
  {
    id: "ai3",
    category: "AI Tutor",
    question: "Why does the AI Tutor sometimes give different answers to the same question?",
    answer: "This is a normal characteristic of AI language models. Here is a detailed explanation:\n\nTemperature: AI models use a parameter called 'temperature' that introduces controlled randomness into responses. This makes conversations feel more natural and varied rather than robotic and repetitive. For factual questions, the core answer should be the same, but the phrasing, examples, and explanation style may differ.\n\nFor math problems specifically: The final numerical answer should always be the same (e.g., 2 + 2 = 4 every time). What may vary is the explanation approach, the order of steps, or the examples used.\n\nWhen to be concerned: If you are getting different final answers to the same math problem (not just different explanations), that is a bug. Please report it via Settings > Report a Bug and include the exact problem text and the two different answers you received.\n\nTip: If you want a more consistent explanation, try asking the AI to 'use the standard textbook method' or 'follow the same steps as last time'.",
    tags: ["different answers", "inconsistent", "random", "temperature", "varies"],
  },
  {
    id: "ai4",
    category: "AI Tutor",
    question: "How do I use the 'Explain at my level' feature?",
    answer: "The 'Explain at my level' feature lets you request an explanation calibrated to a specific grade or difficulty level. This is useful when the default explanation is too complex or too simple for your needs.\n\nHow to use it:\n1. In the Chat tab, after receiving a response, tap the grade selector icon (the graduation cap icon below the AI's message)\n2. Select your target level: Elementary, Middle School, High School, Undergraduate, or Graduate\n3. The AI will immediately re-explain the concept at that level\n\nAlternatively, you can type it directly: 'Explain this as if I am a 7th grader' or 'Give me the university-level explanation of this concept.'\n\nYou can also set a default explanation level in Settings > AI Tutor > Default Explanation Level, so every response is automatically calibrated to your grade.",
    tags: ["explain at my level", "grade selector", "difficulty", "simplify", "calibrate"],
  },
  {
    id: "ai5",
    category: "AI Tutor",
    question: "Can I use the AI Tutor offline?",
    answer: "The AI Tutor requires an internet connection to generate responses, as the AI processing happens on our servers. You cannot have new AI conversations while offline.\n\nHowever, TutorSnap does cache your recent conversation history locally, so you can read and review past conversations offline.\n\nFeatures that work offline:\n- Viewing your solve history\n- Reviewing saved flashcards\n- Reading bookmarked solutions\n- Viewing your badges and progress\n- Using the Pomodoro timer\n\nFeatures that require internet:\n- Solving new problems (AI processing)\n- AI Chat Tutor conversations\n- Generating new practice quizzes\n- Syncing data (if you have an account)\n\nWhen you regain internet access, any problems you have queued will be processed automatically.",
    tags: ["offline", "internet", "connection", "no wifi", "cache"],
  },
  // Data & Privacy
  {
    id: "priv1",
    category: "Data & Privacy",
    question: "Where is my study data stored?",
    answer: "TutorSnap is designed with a privacy-first architecture. Here is exactly where each type of data is stored:\n\nStored only on your device (never uploaded):\n- Your complete solve history (all problems and solutions)\n- Streak count and daily goal progress\n- Badges and achievements\n- Flashcard decks and review history\n- Notes\n- App preferences (dark mode, font size, notification settings)\n- Bookmarked solutions\n- Quiz history and scores\n\nSent to our servers (temporarily, for processing):\n- The text of problems you submit for solving (sent to generate the AI solution, not stored permanently)\n- AI chat messages (sent to generate responses, conversation history stored locally on your device)\n\nStored on our servers (only if you create an account):\n- Your email address and authentication token\n- Your display name and profile settings\n- Classroom membership and homework submissions\n\nTutorSnap does not collect advertising identifiers, location data, contact lists, or any other personal information beyond what is listed above.",
    tags: ["data", "storage", "local", "privacy", "where", "server", "stored"],
  },
  {
    id: "priv2",
    category: "Data & Privacy",
    question: "How do I delete all my data?",
    answer: "You have several options for deleting your data, depending on what you want to remove:\n\nOption 1 - Clear solve history only:\nSettings > Clear History. This deletes all solved problems from your history but keeps your streak, badges, and preferences intact.\n\nOption 2 - Reset all local progress:\nSettings > Reset All Progress. This deletes everything stored locally: streak, badges, history, flashcards, notes, and preferences. This cannot be undone.\n\nOption 3 - Delete your account (if you have one):\nSettings > Account > Delete Account. This deletes your account and all associated server-side data including classroom memberships and profile information.\n\nOption 4 - Formal data deletion request (GDPR/CCPA):\nSettings > Legal and Privacy > Data Deletion Request. This opens a pre-filled email to privacy@tutorsnapai.tech with your request. We will process it within 30 days as required by law.\n\nOption 5 - Uninstall the app:\nUninstalling TutorSnap from your device removes all locally stored data automatically.",
    tags: ["delete data", "reset", "clear history", "GDPR", "CCPA", "privacy", "account deletion"],
  },
  {
    id: "priv3",
    category: "Data & Privacy",
    question: "Does TutorSnap share my data with third parties?",
    answer: "No. TutorSnap does not sell, rent, or share your personal data with third parties for advertising or commercial purposes.\n\nThe only external services we use are:\n\n1. AI processing service: The text of problems you submit is sent to our AI provider to generate solutions. This data is processed under strict data processing agreements and is not used to train AI models or stored beyond the processing window.\n\n2. Crash reporting (optional): If you consent, anonymized crash reports may be sent to help us fix bugs. These reports contain no personal information or problem content.\n\n3. App stores: Apple App Store and Google Play Store handle payment processing for Pro subscriptions. We do not receive your payment card details.\n\nWe do not use Google Analytics, Facebook Pixel, advertising SDKs, or any other tracking technologies.\n\nFor the complete details, see our Privacy Policy at tutorsnapai.tech/privacy or in Settings > Legal and Privacy.",
    tags: ["third party", "share data", "sell", "privacy policy", "advertising", "tracking"],
  },
  {
    id: "priv4",
    category: "Data & Privacy",
    question: "Is TutorSnap safe for children? What about COPPA compliance?",
    answer: "TutorSnap is designed to be safe for students of all ages, including children under 13.\n\nCOPPA compliance: TutorSnap complies with the Children's Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 without verifiable parental consent.\n\nWhat this means in practice:\n- No account is required to use TutorSnap, so children can use the app without providing any personal information\n- If a child creates an account, we collect only an email address for authentication\n- We do not show behavioral advertising to any users\n- We do not collect location data\n- We do not allow children's data to be shared with third parties\n\nParental controls: Parents can request deletion of their child's data at any time by emailing privacy@tutorsnapai.tech. Include the child's username or email address in the request.\n\nContent safety: All AI responses are filtered to ensure age-appropriate content. The AI will not generate inappropriate, violent, or adult content in response to any query.",
    tags: ["children", "COPPA", "safe", "kids", "parental consent", "under 13", "age"],
  },
  {
    id: "priv5",
    category: "Data & Privacy",
    question: "What are my rights under GDPR if I am in the European Union?",
    answer: "If you are located in the European Union or European Economic Area, you have the following rights under the General Data Protection Regulation (GDPR):\n\nRight of Access: You can request a copy of all personal data we hold about you. Email privacy@tutorsnapai.tech with the subject 'GDPR Data Access Request'.\n\nRight to Rectification: If any data we hold about you is inaccurate, you can request that we correct it.\n\nRight to Erasure ('Right to be Forgotten'): You can request that we delete all personal data we hold about you. Use Settings > Legal and Privacy > Data Deletion Request or email privacy@tutorsnapai.tech.\n\nRight to Data Portability: You can request your data in a machine-readable format (JSON or CSV).\n\nRight to Object: You can object to our processing of your data for specific purposes.\n\nRight to Restrict Processing: You can request that we limit how we use your data.\n\nWe will respond to all GDPR requests within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your national data protection authority.",
    tags: ["GDPR", "EU", "rights", "data access", "erasure", "portability", "European Union"],
  },
  // Troubleshooting
  {
    id: "ts1",
    category: "Troubleshooting",
    question: "The app is running slowly or freezing. What should I do?",
    answer: "Performance issues are usually caused by one of a few common factors. Try these steps in order:\n\n1. Restart the app: Close TutorSnap completely (swipe it away from the app switcher) and reopen it. This clears any temporary memory issues.\n\n2. Clear solve history: If you have thousands of solved problems in your history, the app may slow down when loading the History tab. Go to Settings > Clear History to remove old entries. Your streak and badges are not affected.\n\n3. Restart your device: A full device restart clears system memory and often resolves performance issues that persist across app restarts.\n\n4. Free up storage: If your device has less than 1 GB of free storage, apps can run slowly. Delete unused apps, photos, or videos to free up space.\n\n5. Update the app: Performance improvements are included in every update. Check the App Store or Google Play for the latest version.\n\n6. Check your internet connection: Slow AI responses are often caused by a slow or unstable internet connection, not the app itself. Try switching between WiFi and mobile data.\n\nIf the issue persists after all these steps, please report it via Settings > Report a Bug. Include your device model, OS version, and a description of when the slowness occurs.",
    tags: ["slow", "freezing", "performance", "lag", "crash", "speed"],
  },
  {
    id: "ts2",
    category: "Troubleshooting",
    question: "I am not receiving notifications. How do I fix this?",
    answer: "Notification issues are almost always caused by permission or settings mismatches. Work through these steps:\n\nStep 1 - Check TutorSnap notification settings:\nGo to Settings > Notification Center. Make sure the notification types you want (Daily Reminder, Streak Alert, Quiz Results, etc.) are toggled on. Also verify that your Daily Reminder time is set correctly.\n\nStep 2 - Check device notification permissions:\niOS: Go to your iPhone/iPad Settings > Notifications > TutorSnap. Make sure Allow Notifications is on, and that the alert style is set to Banners or Alerts (not None).\nAndroid: Go to your device Settings > Apps > TutorSnap > Notifications. Make sure notifications are enabled.\n\nStep 3 - Check Do Not Disturb / Focus modes:\niOS: Check that your Focus mode (Do Not Disturb, Sleep, Work, etc.) is not blocking TutorSnap. Go to Settings > Focus > [your mode] > Allowed Apps and add TutorSnap.\nAndroid: Check that Do Not Disturb is not blocking TutorSnap notifications.\n\nStep 4 - Toggle notifications off and back on:\nIn TutorSnap Settings > Notification Center, toggle your Daily Reminder off, wait 5 seconds, then toggle it back on. This re-registers the notification with the system.\n\nStep 5 - Reinstall the app:\nAs a last resort, uninstall and reinstall TutorSnap. This resets all notification permissions and registrations.",
    tags: ["notifications", "not receiving", "alerts", "reminder", "permissions", "iOS", "Android"],
  },
  {
    id: "ts3",
    category: "Troubleshooting",
    question: "The camera scanner is not working at all. What is wrong?",
    answer: "If the camera does not open, shows a black screen, or crashes immediately, follow these steps:\n\n1. Check camera permissions:\niOS: Go to Settings (device) > Privacy and Security > Camera. Find TutorSnap in the list and make sure it is set to On.\nAndroid: Go to Settings > Apps > TutorSnap > Permissions > Camera. Make sure it is set to Allow.\n\n2. Restart the app: Force-close TutorSnap and reopen it. Sometimes the camera session gets stuck.\n\n3. Restart your device: Camera issues are often resolved by a full device restart, especially on Android.\n\n4. Check available storage: If your device is almost full, the camera may fail to save temporary files. Free up at least 500 MB of storage.\n\n5. Update the app: Camera-related bugs are fixed in updates. Check for the latest version.\n\n6. Check for iOS/Android updates: Sometimes camera issues are caused by OS-level bugs fixed in system updates.\n\n7. Test the device camera: Open your device's default camera app to confirm the camera hardware is working correctly.\n\nIf none of these steps resolve the issue, please report it via Settings > Report a Bug. Include your device model (e.g., iPhone 15 Pro), OS version, and a description of exactly what happens when you try to open the camera.",
    tags: ["camera not working", "crash", "permissions", "black screen", "iOS", "Android"],
  },
  {
    id: "ts4",
    category: "Troubleshooting",
    question: "How do I contact support if my issue is not listed here?",
    answer: "We offer several support channels and aim to respond to all inquiries within 1 to 2 business days:\n\nIn-app support (fastest):\nGo to Settings > Contact Support. This opens a pre-filled email with your device information already included, which helps us resolve your issue faster.\n\nEmail support:\nsupport@tutorsnapai.tech\nInclude: your device model, OS version, app version (found in Settings > About), a clear description of the issue, and steps to reproduce it if possible.\n\nBug reports:\nSettings > Report a Bug. Use this for technical issues, crashes, or incorrect AI answers. Bug reports include automatic diagnostic information.\n\nFeature requests and feedback:\nSettings > Send Feedback. We read every piece of feedback and use it to prioritize new features.\n\nWhen contacting support, the more detail you provide, the faster we can help. Screenshots or screen recordings of the issue are especially helpful.",
    tags: ["contact", "support", "email", "help", "not listed", "response time"],
  },
  {
    id: "ts5",
    category: "Troubleshooting",
    question: "The AI gave me a wrong answer. What should I do?",
    answer: "If you believe the AI has given you an incorrect answer, here is what to do:\n\n1. Double-check the problem input: Make sure the problem was entered or scanned correctly. A small typo (e.g., 'x^2' vs 'x^3') can lead to a completely different answer.\n\n2. Ask the AI to verify: In the Chat tab, type 'Please double-check your answer to [problem]' or 'Can you verify this step by step?' The AI will often catch its own errors when prompted to review.\n\n3. Try a different approach: Ask 'Can you solve this using a different method?' Seeing the same problem solved two different ways can help identify where an error occurred.\n\n4. Check with a reference: Verify the answer against your textbook, a trusted website, or your teacher.\n\n5. Report the error: Go to Settings > Report a Bug and describe the incorrect answer. Include the exact problem text and what the correct answer should be. This helps us improve the AI's accuracy for everyone.\n\nWe take accuracy very seriously and review all reported errors. Your reports directly contribute to making TutorSnap better.",
    tags: ["wrong answer", "incorrect", "error", "report", "verify", "double check"],
  },
  {
    id: "ts6",
    category: "Troubleshooting",
    question: "How do I update TutorSnap to the latest version?",
    answer: "TutorSnap updates are distributed through the App Store (iOS) and Google Play Store (Android). Here is how to update:\n\niOS:\n1. Open the App Store\n2. Tap your profile picture in the top right\n3. Scroll down to see pending updates\n4. Find TutorSnap and tap Update\n\nAlternatively, go to the App Store > Search > TutorSnap and tap Update if available.\n\nAndroid:\n1. Open the Google Play Store\n2. Tap your profile picture in the top right\n3. Tap Manage apps and device\n4. Find TutorSnap and tap Update\n\nEnable automatic updates (recommended):\niOS: Settings > App Store > App Updates (toggle on)\nAndroid: Play Store > Settings > Network preferences > Auto-update apps\n\nYou can check your current app version in TutorSnap Settings > About. The latest version number is shown at the top of the screen.",
    tags: ["update", "latest version", "App Store", "Google Play", "upgrade"],
  },
  // Accessibility
  {
    id: "acc1",
    category: "Accessibility",
    question: "Does TutorSnap support dark mode?",
    answer: "Yes. TutorSnap has a full dark mode that is carefully designed to reduce eye strain during late-night study sessions.\n\nHow to enable dark mode:\n- Automatic (recommended): Go to Settings > Appearance > Theme and select System Default. TutorSnap will automatically match your device's light/dark mode setting.\n- Always dark: Select Dark Mode in Settings > Appearance > Theme.\n- Always light: Select Light Mode in Settings > Appearance > Theme.\n\nDark mode is applied across all screens including the AI Chat, History, Practice, and all modals. The color palette is carefully chosen to maintain readability and contrast ratios that meet WCAG AA accessibility standards.\n\nYou can also access appearance settings quickly by long-pressing the Settings icon in the tab bar.",
    tags: ["dark mode", "light mode", "theme", "appearance", "night mode", "eye strain"],
  },
  {
    id: "acc2",
    category: "Accessibility",
    question: "Can I change the text size in TutorSnap?",
    answer: "Yes. TutorSnap supports dynamic text sizing to accommodate different visual needs.\n\nMethod 1 - TutorSnap font size setting:\nGo to Settings > Appearance > Text Size. You can choose from Small, Default, Large, and Extra Large. This setting affects all text throughout the app.\n\nMethod 2 - System font size:\nTutorSnap respects your device's system font size setting.\niOS: Settings > Display and Brightness > Text Size (or Settings > Accessibility > Display and Text Size > Larger Text)\nAndroid: Settings > Display > Font size\n\nMethod 3 - Display zoom:\niOS: Settings > Display and Brightness > Display Zoom\nAndroid: Settings > Display > Display size\n\nAll text in TutorSnap uses scalable font sizes, so it will grow proportionally with your system settings.",
    tags: ["text size", "font size", "accessibility", "large text", "zoom", "visual"],
  },
  {
    id: "acc3",
    category: "Accessibility",
    question: "Does TutorSnap work with screen readers (VoiceOver / TalkBack)?",
    answer: "TutorSnap is designed to be compatible with screen readers on both iOS and Android.\n\niOS VoiceOver: All interactive elements (buttons, inputs, cards) have accessibility labels and hints. Navigation follows a logical reading order. To enable VoiceOver: Settings > Accessibility > VoiceOver.\n\nAndroid TalkBack: All interactive elements are labeled for TalkBack. To enable TalkBack: Settings > Accessibility > TalkBack.\n\nKnown limitations:\n- Mathematical equations rendered in LaTeX format may not be read correctly by screen readers. We are working on improved accessibility for math rendering.\n- Some complex animations may not be described by screen readers.\n\nIf you encounter any accessibility issues, please report them via Settings > Report a Bug with the tag 'Accessibility'. We prioritize accessibility improvements in every release.",
    tags: ["VoiceOver", "TalkBack", "screen reader", "accessibility", "blind", "visual impairment"],
  },
  {
    id: "acc4",
    category: "Accessibility",
    question: "Can I reduce animations if they cause discomfort?",
    answer: "Yes. TutorSnap respects your device's Reduce Motion setting, which disables or simplifies animations throughout the app.\n\niOS:\n1. Go to Settings > Accessibility > Motion\n2. Toggle on Reduce Motion\nTutorSnap will automatically detect this setting and disable all non-essential animations.\n\nAndroid:\n1. Go to Settings > Accessibility > Remove animations (or Settings > Developer options > Window animation scale / Transition animation scale, set to 0.5x or off)\n\nAdditionally, TutorSnap has its own Reduce Motion setting:\nGo to Settings > Appearance > Reduce Motion and toggle it on. This is independent of the system setting and gives you control without affecting other apps.",
    tags: ["reduce motion", "animations", "accessibility", "motion sickness", "vestibular"],
  },
  // Premium & Billing
  {
    id: "prem1",
    category: "Premium & Billing",
    question: "What does TutorSnap Pro include?",
    answer: "TutorSnap Pro is an optional upgrade that enhances your experience with advanced features. Pro includes:\n\nAI and Solving:\n- Priority AI processing (faster response times during peak hours)\n- Extended conversation history (unlimited vs. 50 messages for free users)\n- Advanced step-by-step explanations with more detail\n- Unlimited problem solving with no daily limits\n\nStudy Tools:\n- Unlimited flashcard decks (free users can create up to 10 decks)\n- PDF export for flashcards and solve history\n- Advanced quiz analytics with performance trends over time\n- Custom quiz creation (choose specific topics within a subject)\n\nPersonalization:\n- Custom AI Tutor persona and name\n- Priority support with 24-hour response time\n- Early access to new features before they launch to free users\n- Ad-free experience (if ads are ever introduced)\n\nPricing and billing details are shown in Settings > Upgrade to Pro. Subscriptions are managed through the App Store or Google Play and can be cancelled at any time.",
    tags: ["pro", "premium", "subscription", "features", "upgrade", "what is included"],
  },
  {
    id: "prem2",
    category: "Premium & Billing",
    question: "How do I cancel my TutorSnap Pro subscription?",
    answer: "TutorSnap Pro subscriptions are managed entirely by the App Store (iOS) or Google Play (Android). TutorSnap does not handle billing directly.\n\nTo cancel on iOS:\n1. Open the Settings app on your iPhone/iPad\n2. Tap your name at the top\n3. Tap Subscriptions\n4. Find TutorSnap Pro and tap it\n5. Tap Cancel Subscription\n\nTo cancel on Android:\n1. Open the Google Play Store\n2. Tap your profile picture\n3. Tap Payments and subscriptions > Subscriptions\n4. Find TutorSnap Pro and tap it\n5. Tap Cancel subscription\n\nImportant: Cancelling stops future charges but does not provide a refund for the current billing period. You will retain Pro access until the end of the period you have already paid for.\n\nFor refund requests, contact Apple Support (iOS) or Google Play Support (Android) directly, as they handle all payment disputes.",
    tags: ["cancel", "subscription", "billing", "refund", "App Store", "Google Play"],
  },
  {
    id: "prem3",
    category: "Premium & Billing",
    question: "I have a promo code or referral reward. How do I redeem it?",
    answer: "TutorSnap has two types of codes you can redeem:\n\nReferral rewards: When a friend you referred to TutorSnap signs up, you both receive a reward (bonus XP, Streak Shields, or a Pro trial). Your reward is automatically credited to your account when your friend completes onboarding. You do not need to enter a code.\n\nPromo codes: Special codes distributed through partnerships, social media giveaways, or events. To redeem a promo code:\n1. Go to Settings\n2. Tap Redeem Code\n3. Enter your code exactly as provided (codes are case-sensitive)\n4. Tap Redeem\n\nYour reward will be credited immediately. Promo codes can unlock Pro trials, bonus XP, Streak Shields, or exclusive badges.\n\nIf your code is not working, check that:\n- You are entering it exactly as provided (no extra spaces)\n- The code has not expired (expiry dates are shown on the code)\n- You have not already redeemed this code (each code can only be used once per account)",
    tags: ["promo code", "redeem", "referral", "reward", "discount", "free pro"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🔍" },
  { id: "Getting Started", label: "Getting Started", emoji: "🚀" },
  { id: "Camera & Scanning", label: "Camera", emoji: "📸" },
  { id: "Streaks & Progress", label: "Streaks", emoji: "🔥" },
  { id: "Practice & Quizzes", label: "Practice", emoji: "📝" },
  { id: "AI Tutor", label: "AI Tutor", emoji: "🤖" },
  { id: "Data & Privacy", label: "Privacy", emoji: "🔒" },
  { id: "Troubleshooting", label: "Help", emoji: "🛠️" },
  { id: "Accessibility", label: "Accessibility", emoji: "♿" },
  { id: "Premium & Billing", label: "Premium", emoji: "⭐" },
];

export default function FAQScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      if (!q) return matchesCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const handleToggle = (id: string) => {
    H.impactLight()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCategoryPress = (id: string) => {
    H.impactLight()
    setActiveCategory(id);
    setExpandedId(null);
  };

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Help Center</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        
          maxLength={100}
        />
        {search.length > 0 && Platform.OS !== "ios" && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}
            accessibilityLabel="Toggle search">
            <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Category Chips */}
        <ScrollView keyboardDismissMode="on-drag"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              activeOpacity={0.7}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: activeCategory === cat.id ? colors.primary : colors.surface,
                  borderColor: activeCategory === cat.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: activeCategory === cat.id ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Result Count */}
        <Text style={[styles.resultCount, { color: colors.muted }]}>
          {filtered.length} {filtered.length === 1 ? "question" : "questions"}
          {search ? ` for "${search}"` : ""}
        </Text>

        {/* FAQ Items */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results found</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              Try different keywords, or contact our support team directly.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@tutorsnapai.tech")}
              style={[styles.contactBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <IconSymbol size={16} name="envelope.fill" color="#FFFFFF" />
              <Text style={styles.contactBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((item, idx) => (
            <TouchableOpacity
              accessibilityLabel="Toggle"
              key={item.id}
              onPress={() => handleToggle(item.id)}
              activeOpacity={0.7}
              style={[
                styles.faqCard,
                {
                  backgroundColor: expandedId === item.id ? `${colors.primary}08` : colors.surface,
                  borderColor: expandedId === item.id ? `${colors.primary}40` : colors.border,
                  marginBottom: idx === filtered.length - 1 ? 0 : 6,
                },
              ]}
            >
              <View style={styles.faqHeader}>
                <View style={[styles.categoryDot, { backgroundColor: `${colors.primary}30` }]}>
                  <Text style={styles.categoryDotText}>
                    {CATEGORIES.find((c) => c.id === item.category)?.emoji ?? "❓"}
                  </Text>
                </View>
                <Text style={[styles.faqQuestion, { color: colors.foreground, flex: 1 }]}>
                  {item.question}
                </Text>
                <IconSymbol
                  size={18}
                  name={expandedId === item.id ? "chevron.up" : "chevron.down"}
                  color={colors.muted}
                />
              </View>
              {expandedId === item.id && (
                <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.faqAnswerText, { color: colors.muted }]}>
                    {item.answer}
                  </Text>
                  <View style={styles.tagRow}>
                    {item.tags.slice(0, 4).map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Contact Footer */}
        {filtered.length > 0 && (
          <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.footerTitle, { color: colors.foreground }]}>Still need help?</Text>
            <Text style={[styles.footerDesc, { color: colors.muted }]}>
              Our support team is here for you. We typically respond within 1–2 business days.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@tutorsnapai.tech")}
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <IconSymbol size={16} name="envelope.fill" color="#FFFFFF" />
              <Text style={styles.footerBtnText}>Email Support</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    
      </Animated.View></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: "600" },
  resultCount: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  faqCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  categoryDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryDotText: { fontSize: 16 },
  faqQuestion: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    paddingTop: 12,
  },
  faqAnswerText: { fontSize: 14, lineHeight: 22 },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    padding: 32,
    marginHorizontal: 16,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  contactBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  footerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  footerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  footerDesc: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  footerBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
