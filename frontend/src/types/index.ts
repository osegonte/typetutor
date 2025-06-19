// types/index.ts - Comprehensive TypeScript definitions for TypeTutor

// Core typing engine types
export interface TypingEngineOptions {
  enableBackspace?: boolean;
  enableCorrection?: boolean;
  highlightErrors?: boolean;
  trackDetailedStats?: boolean;
}

export interface Keystroke {
  index: number;
  char: string;
  expected: string;
  correct: boolean;
  timestamp: number;
  inputMethod: 'keyboard' | 'paste' | 'autocomplete';
  timeSinceLastKey: number;
}

export interface CharacterStats {
  total: number;
  correct: number;
  avgTime: number;
}

export interface WordBoundary {
  start: number;
  end: number;
  word: string;
}

export interface Correction {
  index: number;
  originalChar: string;
  typedChar: string;
  timestamp: number;
}

export interface WordStats {
  word: string;
  accuracy: number;
  errors: number;
  completed: boolean;
}

export interface TypingAnalytics {
  wpm: number;
  cpm: number;
  accuracy: number;
  burstSpeed: number;
  consistency: number;
  errorsByChar: Record<string, number>;
  characterStats: Record<string, CharacterStats>;
  wordStats: WordStats[];
  corrections: number;
  totalKeystrokes: number;
  currentWordIndex: number;
  progress: number;
  averageSpeed: number;
}

export interface ProblematicCharacter {
  char: string;
  accuracy: number;
  attempts: number;
  avgTime: number;
}

export interface TypingEngineResult {
  userInput: string;
  currentIndex: number;
  errors: number[];
  isComplete: boolean;
  processInput: (value: string, metadata?: InputMetadata) => ProcessInputResult | false;
  reset: () => void;
  getCharacterStyle: (index: number) => 'error' | 'correct' | 'current' | 'pending';
  getDetailedAnalytics: () => TypingAnalytics;
  getSpeedMetrics: () => SpeedMetrics;
  calculateAccuracy: (input?: string) => number;
  getProblematicCharacters: () => ProblematicCharacter[];
  keystrokes: Keystroke[];
  corrections: Correction[];
  characterStats: Record<string, CharacterStats>;
  wordBoundaries: WordBoundary[];
  currentWord: number;
  errorCount: number;
  accuracy: number;
  progress: number;
}

export interface InputMetadata {
  timestamp?: number;
  inputMethod?: 'keyboard' | 'paste' | 'autocomplete';
}

export interface ProcessInputResult {
  isComplete: boolean;
  errors: number;
  accuracy: number;
}

export interface SpeedMetrics {
  wpm: number;
  cpm: number;
  averageSpeed: number;
}

// Session statistics types
export interface SessionStatsOptions {
  autoUpdateInterval?: number;
  trackDetailedMetrics?: boolean;
  enablePredictions?: boolean;
}

export interface SessionData {
  startTime: number | null;
  endTime: number | null;
  pausedTime: number;
  isPaused: boolean;
  pauseStart: number | null;
}

export interface SessionMetrics {
  timeElapsed: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  consistency: number;
  burstSpeed: number;
  predictedFinalWpm: number;
  estimatedTimeRemaining: number;
}

export interface SessionHistoryPoint extends SessionMetrics {
  timestamp: number;
  progress: number;
}

export interface SessionTrends {
  wpmTrend: number;
  accuracyTrend: number;
  consistencyTrend: number;
}

export interface SessionSummary extends SessionMetrics {
  totalDuration: number;
  activeDuration: number;
  pausedDuration: number;
  trends: SessionTrends;
  history: SessionHistoryPoint[];
  peakWpm: number;
  averageWpm: number;
}

export interface SessionStatsResult {
  startSession: () => void;
  endSession: () => void;
  togglePause: () => void;
  reset: () => void;
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  endTime: number | null;
  timeElapsed: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  consistency: number;
  burstSpeed: number;
  predictedFinalWpm: number;
  estimatedTimeRemaining: number;
  formattedTime: string;
  formattedEstimatedTime: string;
  updateMetrics: (typingData: TypingData, textLength: number) => void;
  getSessionSummary: () => SessionSummary | null;
  history: SessionHistoryPoint[];
  trends: boolean;
}

export interface TypingData {
  inputLength?: number;
  errorCount?: number;
  keystrokes?: Keystroke[];
  burstSpeed?: number;
  consistency?: number;
}

// Keyboard handler types
export interface KeyboardHandlerOptions {
  preventDefault?: boolean;
  captureAllKeys?: boolean;
  enableShortcuts?: boolean;
  disabled?: boolean;
}

export interface KeyboardHandlers {
  onInput?: (e: KeyboardEvent) => void;
  onPause?: () => void;
  onReset?: () => void;
  onEscape?: () => void;
  onEnter?: (e: KeyboardEvent) => void;
  onTab?: (e: KeyboardEvent) => void;
  onSpace?: (e: KeyboardEvent) => void;
  onBackspace?: (e: KeyboardEvent) => void;
  onDelete?: (e: KeyboardEvent) => void;
  onArrowKey?: (key: string, e: KeyboardEvent) => void;
  onSpecialKey?: (key: string, e: KeyboardEvent) => void;
}

// Sound effects types
export interface SoundEffectsOptions {
  enabled?: boolean;
  volume?: number;
  enableKeyboardSounds?: boolean;
  enableNotificationSounds?: boolean;
  enableAmbientSounds?: boolean;
}

export interface SoundEffectsResult {
  soundEnabled: boolean;
  soundVolume: number;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  playKeySound: (isCorrect?: boolean, char?: string) => void;
  playCompletionSound: () => void;
  playErrorSound: () => void;
  playNotificationSound: (type?: NotificationSoundType) => void;
  enableKeyboardSounds: boolean;
  enableNotificationSounds: boolean;
  enableAmbientSounds: boolean;
}

export type NotificationSoundType = 'info' | 'warning' | 'success' | 'error';

// API types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  isDevelopment: boolean;
  environment: string;
  cacheStatus: CacheStatus;
}

export interface CacheStatus {
  statsCache: {
    hasData: boolean;
    age: number | null;
    ttl: number;
  };
}

export interface HealthCheckResult {
  success: boolean;
  data?: any;
  timestamp: string;
  latency?: string;
  error?: string;
  isNetworkError?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing';
}

export interface PDFUploadResult {
  success: boolean;
  items?: StudyItem[];
  processingTime?: string;
  error?: string;
  details?: any;
  stage?: string;
}

export interface StudyItem {
  id: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface TextProcessingOptions {
  chunkSize?: number;
  preserveLineBreaks?: boolean;
  removeExtraSpaces?: boolean;
  sessionId?: string;
}

export interface TextProcessingResult {
  success: boolean;
  items?: StudyItem[];
  processingTime?: string;
  error?: string;
  details?: any;
}

export interface UserStats {
  averageWpm: number;
  accuracy: number;
  practiceMinutes: number;
  currentStreak: number;
  totalSessions: number;
  personalBest: number;
  lastSessionDate: string | null;
  recentSessions: SessionRecord[];
  weeklyProgress?: WeeklyProgress[];
  monthlyProgress?: MonthlyProgress[];
  accuracyTrend?: AccuracyTrendPoint[];
  difficultyBreakdown?: Record<string, DifficultyStats>;
  cacheTime?: string;
  error?: string;
}

export interface SessionRecord {
  date: string;
  duration: string;
  wpm: number;
  accuracy: number;
  mode: string;
  difficulty?: string;
  errors?: number;
  timestamp?: string;
}

export interface WeeklyProgress {
  week: string;
  averageWpm: number;
  totalPracticeTime: number;
  sessionsCompleted: number;
  bestAccuracy: number;
}

export interface MonthlyProgress {
  month: string;
  averageWpm: number;
  totalPracticeTime: number;
  sessionsCompleted: number;
  improvement: number;
}

export interface AccuracyTrendPoint {
  date: string;
  accuracy: number;
  sessionCount: number;
}

export interface DifficultyStats {
  averageWpm: number;
  averageAccuracy: number;
  totalSessions: number;
  bestWpm: number;
}

export interface SaveStatsData {
  wpm: number;
  accuracy: number;
  duration: number;
  errors?: number;
  mode?: string;
  difficulty?: string;
  completedAt?: string;
  sessionId?: string;
  timestamp?: string;
  userAgent?: string;
  platform?: string;
  viewport?: {
    width: number;
    height: number;
  };
  timezone?: string;
  sessionDuration?: number;
}

export interface SaveStatsResult {
  success: boolean;
  sessionId?: string;
  message?: string;
  error?: string;
  details?: any;
  backupKey?: string;
}

export interface PracticeRecommendation {
  type: 'character_focus' | 'speed_building' | 'accuracy_improvement' | 'consistency_training';
  title: string;
  description: string;
  targetCharacters?: string[];
  suggestedTexts?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
}

export interface PracticeRecommendationsResult {
  success: boolean;
  recommendations: PracticeRecommendation[];
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wpm: number;
  accuracy: number;
  sessionsCompleted: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResult {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  currentUserRank?: number;
  totalParticipants?: number;
  timeframe: string;
  error?: string;
}

export interface ConnectionTestResult {
  health: TestEndpointResult;
  pdfSupport: TestEndpointResult;
  stats: TestEndpointResult;
  upload: TestEndpointResult;
}

export interface TestEndpointResult {
  status: 'pending' | 'success' | 'error';
  message: string;
  responseTime: number;
  data?: any;
  startTime?: number;
}

export interface BackupSession {
  key: string;
  data: SaveStatsData;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DebugInfo {
  success: boolean;
  server?: any;
  client?: ClientInfo;
  timestamp: string;
  error?: string;
  isNetworkError?: boolean;
}

export interface ClientInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookiesEnabled: boolean;
  onlineStatus: boolean;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  timezone: string;
  sessionManager: {
    activeSessionId: string | null;
    sessionStartTime: number | null;
  };
}

// Component prop types
export interface PracticeScreenProps {
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
  customText: string;
}

export interface StatCardProps {
  darkMode: boolean;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface DifficultyAnalysis {
  level: 'Easy' | 'Medium' | 'Hard';
  wordCount: number;
  characterCount: number;
  avgWordLength: number;
  specialCharacters: number;
  numbers: number;
  estimatedTime: number;
}

export interface SessionFinalStats {
  wpm: number;
  accuracy: number;
  timeElapsed: number;
  cpm: number;
  errors: number;
  totalCharacters: number;
  difficulty: string;
  textPreview: string;
  completedAt: string;
}

// App state types
export interface AppState {
  darkMode: boolean;
  activeTab: string;
  isDebugMode: boolean;
  studyItems: StudyItem[];
  customText: string;
  typingInProgress: boolean;
}

export interface HomeScreenProps {
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
  customText: string;
  setCustomText: (text: string) => void;
  typingInProgress: boolean;
  setTypingInProgress: (inProgress: boolean) => void;
}

export interface StatsScreenProps {
  darkMode: boolean;
  setActiveTab: (tab: string) => void;
}

export interface FeatureCardProps {
  darkMode: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  statusText: string;
  data: any;
  isNetworkError: boolean;
  timestamp: string;
  retryable: boolean;
}

export interface ValidationError extends Error {
  field: string;
  value: any;
  expectedType: string;
}

// Performance monitoring types
export interface PerformanceMetrics {
  renderTime: number;
  keystrokeLatency: number;
  accuracyCalculationTime: number;
  wpmCalculationTime: number;
  memoryUsage?: number;
  frameRate?: number;
}

export interface PerformanceThresholds {
  maxKeystrokeLatency: number;
  maxRenderTime: number;
  minFrameRate: number;
  maxMemoryUsage: number;
}

// Advanced typing features
export interface TypingMode {
  id: string;
  name: string;
  description: string;
  timeLimit?: number;
  targetWpm?: number;
  targetAccuracy?: number;
  allowBackspace: boolean;
  showErrors: boolean;
  playSounds: boolean;
}

export interface PracticeSession {
  id: string;
  mode: TypingMode;
  text: string;
  startTime: number;
  endTime?: number;
  results?: SessionFinalStats;
  isPaused: boolean;
  pausedDuration: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: number;
  target?: number;
  category: 'speed' | 'accuracy' | 'consistency' | 'milestone' | 'streak';
}

export interface UserProfile {
  username?: string;
  email?: string;
  joinDate: string;
  totalSessions: number;
  totalPracticeTime: number;
  personalBests: {
    wpm: number;
    accuracy: number;
    longestStreak: number;
  };
  achievements: Achievement[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  soundVolume: number;
  keyboardLayout: string;
  fontSize: 'small' | 'medium' | 'large';
  showWpmInRealTime: boolean;
  showAccuracyInRealTime: boolean;
  highlightErrors: boolean;
  allowBackspace: boolean;
  practiceReminders: boolean;
  dailyGoal: number;
}

// Advanced analytics types
export interface DetailedAnalytics {
  overallStats: UserStats;
  timeOfDayPerformance: TimeOfDayStats[];
  characterAccuracyBreakdown: CharacterAccuracyStats[];
  speedProgression: SpeedProgressionPoint[];
  commonMistakes: CommonMistake[];
  improvementSuggestions: ImprovementSuggestion[];
}

export interface TimeOfDayStats {
  hour: number;
  averageWpm: number;
  averageAccuracy: number;
  sessionCount: number;
}

export interface CharacterAccuracyStats {
  character: string;
  accuracy: number;
  frequency: number;
  averageTime: number;
}

export interface SpeedProgressionPoint {
  date: string;
  wpm: number;
  accuracy: number;
  sessionNumber: number;
}

export interface CommonMistake {
  intended: string;
  typed: string;
  frequency: number;
  contexts: string[];
}

export interface ImprovementSuggestion {
  type: 'finger_placement' | 'rhythm' | 'accuracy' | 'speed';
  title: string;
  description: string;
  exercises: string[];
  priority: 'low' | 'medium' | 'high';
}

// Event types for analytics
export interface TypingEvent {
  type: 'session_start' | 'session_end' | 'session_pause' | 'session_resume' | 'keystroke' | 'error' | 'correction';
  timestamp: number;
  sessionId: string;
  data?: any;
}

export interface SessionStartEvent extends TypingEvent {
  type: 'session_start';
  data: {
    textLength: number;
    difficulty: string;
    mode: string;
  };
}

export interface SessionEndEvent extends TypingEvent {
  type: 'session_end';
  data: SessionFinalStats;
}

export interface KeystrokeEvent extends TypingEvent {
  type: 'keystroke';
  data: {
    key: string;
    isCorrect: boolean;
    position: number;
    timeSinceLastKey: number;
  };
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Hook return types for easier usage
export type UseTypingEngine = (text: string, options?: TypingEngineOptions) => TypingEngineResult;
export type UseSessionStats = (options?: SessionStatsOptions) => SessionStatsResult;
export type UseKeyboardHandler = (handlers: KeyboardHandlers, options?: KeyboardHandlerOptions) => void;
export type UseSoundEffects = (options?: SoundEffectsOptions) => SoundEffectsResult;