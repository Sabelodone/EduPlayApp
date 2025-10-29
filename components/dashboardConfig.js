// components/dashboardConfig.js - UPDATED VERSION

// Dashboard Configuration - Structure Only
export const DASHBOARD_CONFIG = {
  primaryColor: '#6a11cb',
  secondaryColor: '#2575fc',
  sectionPadding: 20,
  fontFamily: 'System',
  animationDuration: 300,
};

export const SUBJECT_COLORS = {
  'Mathematics': '#FF6B6B',
  'English': '#4ECDC4',
  'Physical Sciences': '#45B7D1',
  'Accounting': '#96CEB4',
  'Science': '#FFA726',
  'History': '#AB47BC',
  'Geography': '#EC407A',
  'Art': '#26C6DA',
  'Music': '#42A5F5',
  'Physics': '#66BB6A',
  'Chemistry': '#778CA3',
  'Biology': '#8E44AD',
  'default': '#718096'
};

export const QUICK_ACTIONS = [
  {
    id: 1,
    title: 'Lessons',
    icon: 'book',
    iconType: 'Ionicons',
    screen: 'LessonsScreen', // ✅ Matches your navigator
    gradient: ['#6a11cb', '#2575fc'],
    description: 'Continue learning'
  },
  {
    id: 2,
    title: 'Games',
    icon: 'game-controller',
    iconType: 'Ionicons',
    screen: 'GamesScreen', // ✅ Matches your navigator
    gradient: ['#FF6B6B', '#FF8E8E'],
    description: 'Play & learn'
  },
  {
    id: 3,
    title: 'Challenges',
    icon: 'trophy',
    iconType: 'FontAwesome5',
    screen: 'ChallengesScreen', // ✅ Matches your navigator
    gradient: ['#4ECDC4', '#67E6DC'],
    description: 'Test skills'
  },
  {
    id: 4,
    title: 'Progress',
    icon: 'analytics',
    iconType: 'MaterialIcons',
    screen: 'ProgressScreen', // ✅ Matches your navigator
    gradient: ['#45B7D1', '#67C8E6'],
    description: 'View stats'
  },
  {
    id: 5,
    title: 'Quiz',
    icon: 'help-circle',
    iconType: 'Ionicons',
    screen: 'QuizScreen', // ✅ Added QuizScreen navigation
    gradient: ['#96CEB4', '#B5E8C3'],
    description: 'Quick practice'
  },
  {
    id: 6,
    title: 'Profile',
    icon: 'person',
    iconType: 'Ionicons',
    screen: 'ProfileScreen', // ✅ Matches your navigator
    gradient: ['#FFA726', '#FFB74D'],
    description: 'Your account'
  }
];

export const ACHIEVEMENTS_CONFIG = {
  types: {
    streak: { icon: 'fire', color: '#FF6B6B' },
    points: { icon: 'star', color: '#FFD700' },
    completion: { icon: 'checkmark-circle', color: '#4ECDC4' },
    speed: { icon: 'bolt', color: '#FFA726' },
    mastery: { icon: 'trophy', color: '#45B7D1' }
  }
};

// Subject-specific configurations
export const SUBJECT_CONFIG = {
  'Mathematics': {
    icon: 'calculator',
    topics: ['Algebra', 'Trigonometry', 'Calculus', 'Geometry'],
    color: '#FF6B6B'
  },
  'English': {
    icon: 'book',
    topics: ['Reading', 'Writing', 'Grammar', 'Comprehension'],
    color: '#4ECDC4'
  },
  'Physical Sciences': {
    icon: 'flask',
    topics: ['Physics', 'Chemistry', 'Forces', 'Energy'],
    color: '#45B7D1'
  },
  'Accounting': {
    icon: 'cash',
    topics: ['Financial Statements', 'Ratios', 'Budgeting', 'Ledgers'],
    color: '#96CEB4'
  }
};

// Game categories for quick access
export const GAME_CATEGORIES = [
  {
    id: 'math-quick',
    title: 'Math Quiz',
    subject: 'Mathematics',
    difficulty: 'Medium',
    duration: '5 min',
    icon: '📊'
  },
  {
    id: 'english-quick',
    title: 'Reading Challenge',
    subject: 'English', 
    difficulty: 'Easy',
    duration: '8 min',
    icon: '📚'
  },
  {
    id: 'science-quick',
    title: 'Science Trivia',
    subject: 'Physical Sciences',
    difficulty: 'Medium',
    duration: '6 min',
    icon: '🔬'
  },
  {
    id: 'accounting-quick',
    title: 'Accounting Basics',
    subject: 'Accounting',
    difficulty: 'Hard',
    duration: '10 min',
    icon: '💰'
  }
];

// Data management functions
export const updateDashboardContent = (newContent) => {
  // Implement your data update logic here
  console.log('Updating dashboard content:', newContent);
  // This could connect to your backend API later
  return Promise.resolve({ success: true, data: newContent });
};

export const getSubjectColor = (subject) => {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;
};

export const getSubjectConfig = (subject) => {
  return SUBJECT_CONFIG[subject] || { 
    icon: 'school', 
    topics: [], 
    color: SUBJECT_COLORS.default 
  };
};

// Navigation helper functions
export const isValidScreen = (screenName) => {
  const validScreens = [
    'GamesScreen',
    'LessonsScreen', 
    'ChallengesScreen',
    'ProgressScreen',
    'ProfileScreen',
    'QuizScreen',
    'HomeScreen',
    'StudentDashboardScreen'
  ];
  return validScreens.includes(screenName);
};

export const navigateToScreen = (navigation, screenName, params = {}) => {
  if (isValidScreen(screenName)) {
    navigation.navigate(screenName, params);
    return true;
  } else {
    console.warn(`Invalid screen navigation attempt: ${screenName}`);
    return false;
  }
};

// Quick stats templates
export const STATS_TEMPLATES = {
  daily: {
    title: 'Today',
    value: '0',
    change: '+0%',
    icon: 'today',
    color: '#6a11cb'
  },
  weekly: {
    title: 'This Week', 
    value: '0',
    change: '+0%',
    icon: 'calendar',
    color: '#2575fc'
  },
  streak: {
    title: 'Current Streak',
    value: '0 days',
    change: '+0',
    icon: 'flash',
    color: '#FF6B6B'
  },
  points: {
    title: 'Total Points',
    value: '0',
    change: '+0',
    icon: 'star',
    color: '#FFD700'
  }
};

export default {
  DASHBOARD_CONFIG,
  SUBJECT_COLORS,
  QUICK_ACTIONS,
  ACHIEVEMENTS_CONFIG,
  SUBJECT_CONFIG,
  GAME_CATEGORIES,
  updateDashboardContent,
  getSubjectColor,
  getSubjectConfig,
  isValidScreen,
  navigateToScreen,
  STATS_TEMPLATES
};