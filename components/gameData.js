// components/gameData.js
export const GAME_CATEGORIES = [
  'All', 'Mathematics', 'English', 'Physical Sciences', 'Accounting'
];

export const GRADES = [10, 11, 12];

export const GAME_DIFFICULTIES = {
  'Easy': { color: '#4CAF50', points: 5, time: 45 },
  'Medium': { color: '#FF9800', points: 10, time: 60 },
  'Hard': { color: '#F44336', points: 15, time: 75 }
};

export const SUBJECT_ICONS = {
  'Mathematics': '📊',
  'English': '📚', 
  'Physical Sciences': '🔬',
  'Accounting': '💰',
  'All': '🎮'
};

export const SUBJECT_COLORS = {
  'Mathematics': '#FF6B6B',
  'English': '#4ECDC4',
  'Physical Sciences': '#45B7D1',
  'Accounting': '#96CEB4',
  'All': '#667eea'
};

// CAPS Curriculum Topics by Subject and Grade
export const CAPS_TOPICS = {
  'Mathematics': {
    10: [
      'Algebraic Expressions',
      'Equations and Inequalities', 
      'Number Patterns',
      'Functions and Graphs',
      'Finance and Growth',
      'Trigonometry',
      'Measurement',
      'Probability'
    ],
    11: [
      'Exponents and Surds',
      'Equations and Inequalities',
      'Number Patterns',
      'Analytical Geometry',
      'Functions',
      'Trigonometry',
      'Measurement',
      'Euclidean Geometry',
      'Statistics'
    ],
    12: [
      'Sequences and Series',
      'Functions and Inverses',
      'Calculus',
      'Probability',
      'Statistics',
      'Analytical Geometry',
      'Trigonometry',
      'Euclidean Geometry'
    ]
  },
  'English': {
    10: [
      'Reading Comprehension',
      'Visual Literacy',
      'Summary Writing',
      'Language Structures',
      'Creative Writing',
      'Poetry Analysis',
      'Drama and Novel Study'
    ],
    11: [
      'Reading for Meaning',
      'Visual Literacy',
      'Summary Skills',
      'Language Editing',
      'Essay Writing',
      'Poetry Analysis',
      'Drama and Novel Study',
      'Oral Presentation'
    ],
    12: [
      'Critical Reading',
      'Visual Literacy',
      'Summary Writing',
      'Language Structures',
      'Transactional Writing',
      'Literary Analysis',
      'Exam Preparation',
      'Research Skills'
    ]
  },
  'Physical Sciences': {
    10: [
      'Matter and Materials',
      'Chemical Change',
      'Motion in One Dimension',
      'Waves and Sound',
      'Electricity and Magnetism',
      'Energy and Change'
    ],
    11: [
      'Vectors and Scalars',
      'Newton\'s Laws',
      'Atomic Combinations',
      'Intermolecular Forces',
      'Chemical Change',
      'Energy and Change',
      'Organic Chemistry'
    ],
    12: [
      'Momentum and Impulse',
      'Vertical Projectile Motion',
      'Work, Energy and Power',
      'Doppler Effect',
      'Electrodynamics',
      'Chemical Equilibrium',
      'Acids and Bases',
      'Electrochemistry'
    ]
  },
  'Accounting': {
    10: [
      'Basic Accounting Concepts',
      'Accounting Equation',
      'Source Documents',
      'Ledger Accounts',
      'Financial Statements',
      'Cash Receipts and Payments'
    ],
    11: [
      'Companies',
      'Financial Statements',
      'Ratios and Interpretation',
      'Budgeting',
      'Cost Accounting',
      'Inventory Systems'
    ],
    12: [
      'Partnerships',
      'Manufacturing',
      'Cost Accounting',
      'Financial Analysis',
      'IFRS Standards',
      'Ethics in Accounting',
      'Budgeting and Control'
    ]
  }
};

// Generate dynamic game templates based on CAPS curriculum
export const generateGameTemplates = () => {
  const templates = [];
  const subjects = GAME_CATEGORIES.filter(cat => cat !== 'All');
  
  subjects.forEach(subject => {
    GRADES.forEach(grade => {
      const topics = CAPS_TOPICS[subject]?.[grade] || ['General Topics'];
      
      // Create 2 games per grade per subject with different difficulties
      const difficulties = ['Easy', 'Medium', 'Hard'];
      
      difficulties.forEach(difficulty => {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        templates.push({
          id: `${subject.toLowerCase()}-grade${grade}-${difficulty.toLowerCase()}-${Date.now()}`,
          title: `${subject} Grade ${grade} ${difficulty}`,
          category: subject,
          description: `Practice ${topic} with ${difficulty.toLowerCase()} level questions`,
          difficulty: difficulty,
          duration: difficulty === 'Easy' ? '10-15 min' : difficulty === 'Medium' ? '15-20 min' : '20-25 min',
          players: '1-2',
          rating: 4.0 + (Math.random() * 0.5), // 4.0 - 4.5
          color: SUBJECT_COLORS[subject],
          icon: SUBJECT_ICONS[subject],
          locked: false,
          grade: grade.toString(),
          topics: [topic],
          generated: true,
          selectable: true
        });
      });
    });
  });
  
  return templates;
};

// Empty array - games will be generated dynamically by OpenAI
export const GAME_TEMPLATES = generateGameTemplates();

// Filter functions
export const getGamesByCategory = (category) => {
  if (category === 'All') return GAME_TEMPLATES;
  return GAME_TEMPLATES.filter(game => game.category === category);
};

export const getGamesByDifficulty = (difficulty) => {
  return GAME_TEMPLATES.filter(game => game.difficulty === difficulty);
};

export const getGamesByGrade = (grade) => {
  return GAME_TEMPLATES.filter(game => game.grade === grade.toString());
};

export const getGamesBySubjectAndGrade = (subject, grade) => {
  return GAME_TEMPLATES.filter(game => 
    game.category === subject && game.grade === grade.toString()
  );
};

export const getAvailableTopics = (subject, grade) => {
  return CAPS_TOPICS[subject]?.[grade] || ['General Topics'];
};

export const getSubjectStats = () => {
  const stats = {};
  GAME_CATEGORIES.forEach(category => {
    if (category !== 'All') {
      stats[category] = GAME_TEMPLATES.filter(game => game.category === category).length;
    }
  });
  return stats;
};

// Game configuration for QuizScreen
export const getGameConfig = (game) => {
  return {
    subject: game.category,
    grade: parseInt(game.grade),
    difficulty: game.difficulty,
    topics: game.topics,
    title: game.title,
    duration: game.duration
  };
};

// Generate unique game ID
export const generateGameId = (subject, grade, difficulty, topic) => {
  const subjectSlug = subject.toLowerCase().replace(/\s+/g, '-');
  const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `${subjectSlug}-grade${grade}-${difficulty.toLowerCase()}-${topicSlug}-${Date.now()}`;
};

// Create a new game dynamically
export const createDynamicGame = (subject, grade, difficulty, topic) => {
  return {
    id: generateGameId(subject, grade, difficulty, topic),
    title: `${subject} Grade ${grade} - ${topic}`,
    category: subject,
    description: `Practice ${topic} with ${difficulty.toLowerCase()} level questions`,
    difficulty: difficulty,
    duration: difficulty === 'Easy' ? '10-15 min' : difficulty === 'Medium' ? '15-20 min' : '20-25 min',
    players: '1-2',
    rating: 4.0 + (Math.random() * 0.5),
    color: SUBJECT_COLORS[subject],
    icon: SUBJECT_ICONS[subject],
    locked: false,
    grade: grade.toString(),
    topics: [topic],
    generated: true,
    selectable: true
  };
};