// screens/LessonsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  Linking,
  Share,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import API_BASE_URL from '../config';

const { width, height } = Dimensions.get('window');

// API Keys
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// Complete video data for all subjects and grades
const VIDEO_DATA = {
  'Mathematics': {
    '10': {
      'Algebra': [
        {
          id: 'KP1QlnA7K1o',
          title: 'Algebra Basics - Full Course',
          duration: '15:30',
          channel: 'The Organic Chemistry Tutor',
          description: 'Complete algebra introduction covering variables, expressions, and equations'
        },
        {
          id: 'NybHckSEQBI',
          title: 'Linear Equations Practice',
          duration: '12:45',
          channel: 'Math and Science',
          description: 'Step-by-step linear equation solving with practice problems'
        }
      ],
      'Geometry': [
        {
          id: 'HIFb-a8b39s',
          title: 'Geometry Introduction',
          duration: '18:20',
          channel: 'The Organic Chemistry Tutor',
          description: 'Basic geometry concepts including angles, lines, and shapes'
        }
      ],
      'Trigonometry': [
        {
          id: 'T2O0SmGabc4',
          title: 'Trigonometry Basics',
          duration: '16:15',
          channel: 'Mario\'s Math Tutoring',
          description: 'Introduction to trigonometric functions and identities'
        }
      ],
      'Statistics': [
        {
          id: 'h8EYEJ32oQ8',
          title: 'Statistics Fundamentals',
          duration: '14:30',
          channel: 'The Organic Chemistry Tutor',
          description: 'Basic statistical concepts and data analysis'
        }
      ]
    },
    '11': {
      'Functions': [
        {
          id: 'FXItlSSEZ1Q',
          title: 'Functions and Graphs',
          duration: '20:15',
          channel: 'Mario\'s Math Tutoring',
          description: 'Understanding functions, graphing, and function properties'
        }
      ],
      'Calculus': [
        {
          id: 'rfjf7bCtCIk',
          title: 'Calculus Fundamentals',
          duration: '25:40',
          channel: 'Professor Dave Explains',
          description: 'Introduction to differential and integral calculus'
        }
      ],
      'Probability': [
        {
          id: 'uzkc-qNVoOk',
          title: 'Probability Theory',
          duration: '18:25',
          channel: 'The Organic Chemistry Tutor',
          description: 'Probability concepts and problem solving'
        }
      ]
    },
    '12': {
      'Calculus': [
        {
          id: 'rfjf7bCtCIk',
          title: 'Calculus Fundamentals',
          duration: '25:40',
          channel: 'Professor Dave Explains',
          description: 'Introduction to differential and integral calculus'
        },
        {
          id: 'axYQ1T34pLc',
          title: 'Advanced Calculus',
          duration: '22:30',
          channel: 'Professor Leonard',
          description: 'Advanced calculus concepts and applications'
        }
      ],
      'Complex Numbers': [
        {
          id: 'SP-YJe7Vldo',
          title: 'Complex Numbers Explained',
          duration: '19:45',
          channel: 'NancyPi',
          description: 'Understanding complex numbers and operations'
        }
      ],
      'Advanced Algebra': [
        {
          id: 'VSKx1p7rS7s',
          title: 'Advanced Algebra Concepts',
          duration: '21:20',
          channel: 'The Organic Chemistry Tutor',
          description: 'Advanced algebraic equations and functions'
        }
      ]
    }
  },
  'English': {
    '10': {
      'Grammar': [
        {
          id: '8qBwN_s6IjE',
          title: 'English Grammar Basics',
          duration: '14:25',
          channel: 'Shaw English Online',
          description: 'Fundamental grammar rules and sentence structure'
        }
      ],
      'Essay Writing': [
        {
          id: 'LK5M2FKDw2c',
          title: 'Essay Writing Masterclass',
          duration: '16:40',
          channel: 'English Lessons',
          description: 'Learn how to write compelling essays'
        }
      ],
      'Comprehension': [
        {
          id: 'zL-1o8l6Pw8',
          title: 'Reading Comprehension',
          duration: '13:20',
          channel: 'Learn English',
          description: 'Improve reading comprehension skills'
        }
      ]
    },
    '11': {
      'Advanced Writing': [
        {
          id: 'V3aK22k5-d8',
          title: 'Advanced Essay Writing',
          duration: '18:30',
          channel: 'Writing with Andrew',
          description: 'Advanced writing techniques and structures'
        }
      ],
      'Literature': [
        {
          id: '9mT6W7cIrY0',
          title: 'Literature Analysis',
          duration: '17:15',
          channel: 'CrashCourse',
          description: 'Analyzing literary works and themes'
        }
      ],
      'Poetry': [
        {
          id: 'JmkgAWAGtbE',
          title: 'Poetry Analysis',
          duration: '15:50',
          channel: 'The Poetry Foundation',
          description: 'Understanding and analyzing poetry'
        }
      ]
    },
    '12': {
      'Critical Analysis': [
        {
          id: 'zL-1o8l6Pw8',
          title: 'Critical Thinking Skills',
          duration: '22:10',
          channel: 'English Lessons',
          description: 'Developing critical analysis abilities'
        }
      ],
      'Drama': [
        {
          id: 'I6YrDUd4W7M',
          title: 'Drama and Theater',
          duration: '19:35',
          channel: 'Literature TV',
          description: 'Understanding dramatic literature'
        }
      ],
      'Novels': [
        {
          id: 'vrWnSYm8T4k',
          title: 'Novel Analysis',
          duration: '24:20',
          channel: 'CrashCourse',
          description: 'Analyzing novels and narrative techniques'
        }
      ]
    }
  },
  'Accounting': {
    '10': {
      'Basic Accounting': [
        {
          id: 'G4qshy9d8a8',
          title: 'Accounting Principles',
          duration: '19:35',
          channel: 'Accounting Stuff',
          description: 'Introduction to accounting concepts and principles'
        }
      ],
      'Ledgers': [
        {
          id: 'Y7cP8d4Xo8E',
          title: 'Ledger Accounting',
          duration: '16:45',
          channel: 'Accounting Coach',
          description: 'Understanding ledger systems and entries'
        }
      ],
      'Balance Sheet': [
        {
          id: 'rG0y7Y7-QoM',
          title: 'Balance Sheet Basics',
          duration: '14:20',
          channel: 'Corporate Finance Institute',
          description: 'Creating and analyzing balance sheets'
        }
      ]
    },
    '11': {
      'Cost Accounting': [
        {
          id: 'V3aK22k5-d8',
          title: 'Cost Accounting Fundamentals',
          duration: '21:30',
          channel: 'Accounting University',
          description: 'Cost accounting methods and applications'
        }
      ],
      'Financial Statements': [
        {
          id: '9mT6W7cIrY0',
          title: 'Financial Statement Analysis',
          duration: '23:15',
          channel: 'Corporate Finance Institute',
          description: 'Analyzing financial statements'
        }
      ],
      'Auditing': [
        {
          id: 'JmkgAWAGtbE',
          title: 'Auditing Principles',
          duration: '18:40',
          channel: 'Audit Academy',
          description: 'Introduction to auditing concepts'
        }
      ]
    },
    '12': {
      'Advanced Accounting': [
        {
          id: 'V3aK22k5-d8',
          title: 'Advanced Accounting Concepts',
          duration: '24:15',
          channel: 'Accounting University',
          description: 'Complex accounting scenarios and principles'
        }
      ],
      'Taxation': [
        {
          id: '9mT6W7cIrY0',
          title: 'Taxation Fundamentals',
          duration: '20:25',
          channel: 'Tax Foundation',
          description: 'Understanding tax systems and calculations'
        }
      ],
      'Management Accounting': [
        {
          id: 'JmkgAWAGtbE',
          title: 'Management Accounting',
          duration: '22:10',
          channel: 'Corporate Finance Institute',
          description: 'Accounting for management decisions'
        }
      ]
    }
  },
  'Physical Sciences': {
    '10': {
      'Physics Basics': [
        {
          id: 'ur0pU_imctw',
          title: 'Newton\'s Laws of Motion',
          duration: '17:45',
          channel: 'Physics Girl',
          description: 'Understanding motion, forces, and Newton\'s laws'
        }
      ],
      'Chemistry Basics': [
        {
          id: 'FSyAehMdpyI',
          title: 'Chemistry Fundamentals',
          duration: '16:30',
          channel: 'Tyler DeWitt',
          description: 'Basic chemistry concepts and reactions'
        }
      ],
      'Matter': [
        {
          id: '9nSGgO2gX4c',
          title: 'States of Matter',
          duration: '14:15',
          channel: 'Amoeba Sisters',
          description: 'Understanding different states of matter'
        }
      ]
    },
    '11': {
      'Mechanics': [
        {
          id: 'V3aK22k5-d8',
          title: 'Mechanics and Motion',
          duration: '23:30',
          channel: 'Physics Videos',
          description: 'Advanced mechanics concepts'
        }
      ],
      'Chemical Reactions': [
        {
          id: '9mT6W7cIrY0',
          title: 'Chemical Reactions',
          duration: '19:20',
          channel: 'Bozeman Science',
          description: 'Types of chemical reactions and balancing'
        }
      ],
      'Waves': [
        {
          id: 'JmkgAWAGtbE',
          title: 'Wave Properties',
          duration: '18:45',
          channel: 'Physics Girl',
          description: 'Understanding wave mechanics and properties'
        }
      ]
    },
    '12': {
      'Electricity': [
        {
          id: 'V3aK22k5-d8',
          title: 'Electrical Circuits',
          duration: '26:40',
          channel: 'Physics Videos',
          description: 'Circuit analysis and electrical principles'
        }
      ],
      'Organic Chemistry': [
        {
          id: '9mT6W7cIrY0',
          title: 'Organic Chemistry Basics',
          duration: '24:25',
          channel: 'The Organic Chemistry Tutor',
          description: 'Introduction to organic compounds'
        }
      ],
      'Modern Physics': [
        {
          id: 'JmkgAWAGtbE',
          title: 'Modern Physics Concepts',
          duration: '22:15',
          channel: 'Professor Dave Explains',
          description: 'Quantum mechanics and relativity basics'
        }
      ]
    }
  }
};

// Exam papers data
const EXAM_PAPERS = {
  'Mathematics': {
    '10': [
      {
        id: '1',
        title: 'Grade 10 Mathematics Paper 1 - 2023',
        questions: 8,
        duration: '2 hours',
        subject: 'Mathematics',
        grade: '10',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P1%20Gr10%202023.pdf'
      },
      {
        id: '2',
        title: 'Grade 10 Mathematics Paper 2 - 2023',
        questions: 7,
        duration: '2 hours',
        subject: 'Mathematics',
        grade: '10',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P2%20Gr10%202023.pdf'
      }
    ],
    '11': [
      {
        id: '3',
        title: 'Grade 11 Mathematics Paper 1 - 2023',
        questions: 10,
        duration: '2.5 hours',
        subject: 'Mathematics',
        grade: '11',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P1%20Gr11%202023.pdf'
      }
    ],
    '12': [
      {
        id: '4',
        title: 'Grade 12 Mathematics Paper 1 - 2023',
        questions: 12,
        duration: '3 hours',
        subject: 'Mathematics',
        grade: '12',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P1%20Gr12%202023.pdf'
      }
    ]
  },
  'English': {
    '10': [
      {
        id: '5',
        title: 'Grade 10 English Paper 1 - 2023',
        questions: 8,
        duration: '2 hours',
        subject: 'English',
        grade: '10',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/English%20P1%20Gr10%202023.pdf'
      }
    ],
    '11': [
      {
        id: '6',
        title: 'Grade 11 English Paper 1 - 2023',
        questions: 9,
        duration: '2.5 hours',
        subject: 'English',
        grade: '11',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/English%20P1%20Gr11%202023.pdf'
      }
    ]
  },
  'Accounting': {
    '10': [
      {
        id: '7',
        title: 'Grade 10 Accounting Paper 1 - 2023',
        questions: 9,
        duration: '2.5 hours',
        subject: 'Accounting',
        grade: '10',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Accounting%20P1%20Gr10%202023.pdf'
      }
    ]
  },
  'Physical Sciences': {
    '10': [
      {
        id: '8',
        title: 'Grade 10 Physical Sciences Paper 1 - 2023',
        questions: 11,
        duration: '2.5 hours',
        subject: 'Physical Sciences',
        grade: '10',
        year: '2023',
        downloadUrl: 'https://www.education.gov.za/Portals/0/Documents/Publications/Physical%20Sciences%20P1%20Gr10%202023.pdf'
      }
    ]
  }
};

// Study notes data
const STUDY_NOTES = {
  'Mathematics': {
    'Algebra': `# Algebra Fundamentals

## Key Concepts:
- **Variables**: Symbols that represent unknown values
- **Expressions**: Combinations of variables and numbers
- **Equations**: Mathematical statements with equals sign

## Basic Rules:
1. Commutative Property: a + b = b + a
2. Associative Property: (a + b) + c = a + (b + c)
3. Distributive Property: a(b + c) = ab + ac

## Example Problems:
1. Solve: 2x + 5 = 13
   Solution: x = 4
2. Simplify: 3(x + 2) - 2x
   Solution: x + 6

## Common Formulas:
- Quadratic Formula: x = [-b ± √(b² - 4ac)] / 2a
- Slope Formula: m = (y₂ - y₁) / (x₂ - x₁)`,

    'Geometry': `# Geometry Basics

## Key Concepts:
- **Points**: Locations in space
- **Lines**: Straight paths extending infinitely
- **Angles**: Formed by two rays sharing an endpoint

## Basic Shapes:
- Triangles: 3 sides, sum of angles = 180°
- Quadrilaterals: 4 sides, sum of angles = 360°
- Circles: All points equidistant from center

## Important Formulas:
- Area of triangle: A = ½ × base × height
- Area of circle: A = πr²
- Perimeter: Sum of all sides`
  },
  'English': {
    'Grammar': `# English Grammar Essentials

## Parts of Speech:
- **Nouns**: People, places, things, ideas
- **Verbs**: Actions or states of being
- **Adjectives**: Describe nouns
- **Adverbs**: Modify verbs, adjectives, other adverbs

## Sentence Structure:
- Subject + Verb + Object
- Simple, compound, and complex sentences
- Proper punctuation usage

## Common Rules:
- Subject-verb agreement
- Proper tense usage
- Pronoun reference clarity`
  }
};

export default function LessonsScreen({ navigation }) {
  const [selectedGrade, setSelectedGrade] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [activeTab, setActiveTab] = useState('videos');
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(0);
  const [videoModal, setVideoModal] = useState({ 
    visible: false, 
    videoId: null, 
    videoTitle: ''
  });
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [completedVideos, setCompletedVideos] = useState({});
  const [downloadingPaper, setDownloadingPaper] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [generatedNotes, setGeneratedNotes] = useState({});
  const [loadingNotes, setLoadingNotes] = useState({});

  const grades = ['10', '11', '12'];
  const subjects = ['Mathematics', 'English', 'Accounting', 'Physical Sciences'];

  // Load user progress and streak
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      await fetchUserProfile();
      
      const progressData = await AsyncStorage.getItem('userProgress');
      const streakData = await AsyncStorage.getItem('studyStreak');
      const completedData = await AsyncStorage.getItem('completedVideos');
      
      if (progressData) setProgress(JSON.parse(progressData));
      if (streakData) setStreak(parseInt(streakData));
      if (completedData) setCompletedVideos(JSON.parse(completedData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const syncVideoProgress = async (videoId, topic, action = 'completed') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/progress/video-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_id: videoId,
          subject: selectedSubject,
          grade: selectedGrade,
          topic: topic,
          action: action,
          completed: true
        }),
      });
    } catch (error) {
      console.error('Error syncing video progress:', error);
    }
  };

  const getSubjectTopics = () => {
    return VIDEO_DATA[selectedSubject]?.[selectedGrade] ? 
      Object.keys(VIDEO_DATA[selectedSubject][selectedGrade]) : [];
  };

  const getVideosForTopic = (topic) => {
    return VIDEO_DATA[selectedSubject]?.[selectedGrade]?.[topic] || [];
  };

  const isVideoCompleted = (topic, videoId) => {
    return completedVideos[`${selectedSubject}-${selectedGrade}-${topic}-${videoId}`];
  };

  // YouTube video player HTML
  const getYouTubeHTML = (videoId) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; background: #000; }
          .container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%;
          }
          iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      </body>
      </html>
    `;
  };

  const openVideoModal = async (video, topic) => {
    setVideoModal({
      visible: true,
      videoId: video.id,
      videoTitle: video.title
    });

    try {
      const key = `${selectedSubject}-${selectedGrade}-${topic}-${video.id}`;
      if (!completedVideos[key]) {
        await syncVideoProgress(video.id, topic, 'started');
      }
    } catch (error) {
      console.error('Error tracking video start:', error);
    }
  };

  const closeVideoModal = async () => {
    if (videoModal.videoId && videoModal.visible) {
      const key = `${selectedSubject}-${selectedGrade}-${selectedTopic}-${videoModal.videoId}`;
      if (!completedVideos[key]) {
        setCompletedVideos(prev => ({
          ...prev,
          [key]: true
        }));
        
        await syncVideoProgress(videoModal.videoId, selectedTopic, 'completed');
        
        await AsyncStorage.setItem('completedVideos', JSON.stringify({
          ...completedVideos,
          [key]: true
        }));
      }
    }
    
    setVideoModal({ visible: false, videoId: null, videoTitle: '' });
  };

  const askAIQuestion = async () => {
    if (!aiQuestion.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    setLoadingAI(true);
    setAiResponse('');

    try {
      const token = await AsyncStorage.getItem('access_token');
      const backendResponse = await fetch(`${API_BASE_URL}/ai/ask-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: aiQuestion,
          subject: selectedSubject,
          grade: selectedGrade,
          topic: selectedTopic
        }),
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        setAiResponse(data.answer || data.response);
        return;
      }

      if (!OPENAI_API_KEY) {
        setAiResponse('AI assistant is currently unavailable. Please try again later.');
        return;
      }

      const prompt = `As an expert ${selectedSubject} tutor for Grade ${selectedGrade}, answer this question about ${selectedTopic}: "${aiQuestion}"
      
Provide a clear, step-by-step explanation that a high school student can understand. Include examples if helpful. Keep the response under 300 words.`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful ${selectedSubject} tutor for high school students. Explain concepts clearly and provide step-by-step guidance.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await openaiResponse.json();
      
      if (data.choices && data.choices[0]) {
        setAiResponse(data.choices[0].message.content);
      } else {
        setAiResponse('Unable to get response. Please try again.');
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiResponse('Error connecting to AI service. Please check your internet connection.');
    } finally {
      setLoadingAI(false);
    }
  };

  const generateStudyNotes = async (topic) => {
    if (!OPENAI_API_KEY) {
      return getStudyNotes(topic);
    }

    try {
      const prompt = `Create comprehensive study notes for ${selectedSubject}, Grade ${selectedGrade}, topic: ${topic}.
      
      Format the notes with:
      - Clear headings using ## and ###
      - Key concepts in bullet points
      - Important formulas or rules
      - Example problems with solutions
      - Study tips
      
      Make it engaging and easy to understand for high school students.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content creator. Create clear, structured study notes for high school students.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      } else {
        return getStudyNotes(topic);
      }
    } catch (error) {
      console.error('Error generating study notes:', error);
      return getStudyNotes(topic);
    }
  };

  const loadGeneratedNotes = async (topic) => {
    const noteKey = `${selectedSubject}-${selectedGrade}-${topic}`;
    
    if (generatedNotes[noteKey]) {
      return generatedNotes[noteKey];
    }

    setLoadingNotes(prev => ({ ...prev, [noteKey]: true }));
    
    try {
      const notes = await generateStudyNotes(topic);
      setGeneratedNotes(prev => ({ ...prev, [noteKey]: notes }));
      return notes;
    } catch (error) {
      console.error('Error loading notes:', error);
      return getStudyNotes(topic);
    } finally {
      setLoadingNotes(prev => ({ ...prev, [noteKey]: false }));
    }
  };

  const downloadExamPaper = async (paper) => {
    setDownloadingPaper(paper.id);
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/progress/download-resource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource_type: 'exam_paper',
          resource_id: paper.id,
          subject: paper.subject,
          grade: paper.grade
        }),
      });

      Alert.alert(
        'Download Started',
        `${paper.title} is being downloaded.`,
        [{ text: 'OK' }]
      );
      
      setTimeout(() => {
        setDownloadingPaper(null);
        Alert.alert(
          'Download Complete',
          `${paper.title} has been downloaded successfully!`,
          [{ text: 'OK' }]
        );
      }, 2000);
      
    } catch (error) {
      setDownloadingPaper(null);
      Alert.alert('Download Error', 'Could not download the paper. Please try again.');
    }
  };

  const shareExamPaper = async (paper) => {
    try {
      await Share.share({
        title: paper.title,
        message: `Check out this ${paper.subject} exam paper for Grade ${paper.grade}: ${paper.downloadUrl}`,
        url: paper.downloadUrl
      });
    } catch (error) {
      Alert.alert('Share Error', 'Could not share the paper.');
    }
  };

  const getExamPapers = () => {
    return EXAM_PAPERS[selectedSubject]?.[selectedGrade] || [];
  };

  const getStudyNotes = (topic) => {
    return STUDY_NOTES[selectedSubject]?.[topic] || 'Study notes coming soon for this topic.';
  };

  const renderExamsTab = () => {
    const examPapers = getExamPapers();
    
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Past Exam Papers ({examPapers.length})</Text>
        {examPapers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text" size={48} color="#CBD5E0" />
            <Text style={styles.emptyStateText}>No exam papers available for this subject</Text>
          </View>
        ) : (
          examPapers.map((paper, index) => (
            <View key={paper.id} style={styles.examPaperItem}>
              <Ionicons name="document-text" size={32} color="#4ECDC4" />
              <View style={styles.examPaperInfo}>
                <Text style={styles.examPaperTitle}>{paper.title}</Text>
                <Text style={styles.examPaperMeta}>
                  {paper.questions} questions • {paper.duration} • {paper.year}
                </Text>
                <Text style={styles.examPaperSubject}>
                  {paper.subject} • Grade {paper.grade}
                </Text>
              </View>
              <View style={styles.examPaperActions}>
                <TouchableOpacity 
                  style={styles.downloadPaperButton}
                  onPress={() => downloadExamPaper(paper)}
                  disabled={downloadingPaper === paper.id}
                >
                  {downloadingPaper === paper.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sharePaperButton}
                  onPress={() => shareExamPaper(paper)}
                >
                  <Ionicons name="share" size={20} color="#4ECDC4" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderNotesTab = () => {
    const [currentNotes, setCurrentNotes] = useState(null);

    useEffect(() => {
      if (selectedTopic) {
        const loadNotes = async () => {
          const notes = await loadGeneratedNotes(selectedTopic);
          setCurrentNotes(notes);
        };
        loadNotes();
      }
    }, [selectedTopic]);

    const noteKey = `${selectedSubject}-${selectedGrade}-${selectedTopic}`;
    const isLoading = loadingNotes[noteKey];

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Study Notes</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Generating AI-powered study notes...</Text>
          </View>
        ) : (
          <>
            <View style={styles.notesCard}>
              <ScrollView>
                <Text style={styles.notesText}>
                  {currentNotes || getStudyNotes(selectedTopic)}
                </Text>
              </ScrollView>
            </View>
            <TouchableOpacity style={styles.downloadButton}>
              <Ionicons name="download" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Download Notes PDF</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  };

  const renderSubjectCard = (subject) => {
    const topics = getSubjectTopics();
    const totalVideos = topics.reduce((total, topic) => 
      total + getVideosForTopic(topic).length, 0
    );
    const completedCount = topics.reduce((total, topic) => 
      total + getVideosForTopic(topic).filter(video => 
        isVideoCompleted(topic, video.id)
      ).length, 0
    );
    const progressPercent = totalVideos > 0 ? (completedCount / totalVideos) * 100 : 0;

    return (
      <TouchableOpacity
        key={subject}
        style={[
          styles.subjectCard,
          selectedSubject === subject && styles.subjectCardActive
        ]}
        onPress={() => setSelectedSubject(subject)}
      >
        <View style={styles.subjectHeader}>
          <View style={styles.subjectIcon}>
            <Ionicons 
              name={getSubjectIcon(subject)} 
              size={24} 
              color="#4ECDC4" 
            />
          </View>
          <Text style={styles.subjectName}>{subject}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercent}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="play-circle" size={16} color="#4ECDC4" />
            <Text style={styles.statText}>
              {completedCount}/{totalVideos} completed
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getSubjectIcon = (subject) => {
    const icons = {
      'Mathematics': 'calculator',
      'English': 'book',
      'Accounting': 'cash',
      'Physical Sciences': 'flask'
    };
    return icons[subject] || 'school';
  };

  const renderTopicItem = ({ item: topic }) => {
    const videos = getVideosForTopic(topic);
    const completedCount = videos.filter(video => isVideoCompleted(topic, video.id)).length;
    const totalVideos = videos.length;

    return (
      <TouchableOpacity
        style={styles.topicCard}
        onPress={() => setSelectedTopic(topic)}
      >
        <View style={styles.topicHeader}>
          <View style={styles.topicIcon}>
            <Ionicons name="bookmark" size={20} color="#4ECDC4" />
          </View>
          <View style={styles.topicInfo}>
            <Text style={styles.topicName}>{topic}</Text>
            <Text style={styles.topicStats}>
              {completedCount}/{totalVideos} videos completed
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4ECDC4" />
        </View>
        
        <View style={styles.topicProgress}>
          <View style={styles.topicProgressBar}>
            <View 
              style={[
                styles.topicProgressFill,
                { width: totalVideos > 0 ? `${(completedCount / totalVideos) * 100}%` : '0%' }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTopicDetail = () => {
    if (!selectedTopic) return null;
    
    return (
      <Modal
        visible={!!selectedTopic}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedTopic(null)}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Back to Topics</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedTopic}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailTabs}>
            {['videos', 'notes', 'exams', 'qa'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.detailTab,
                  activeTab === tab && styles.detailTabActive
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.detailTabText,
                  activeTab === tab && styles.detailTabTextActive
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.detailContent}>
            {activeTab === 'videos' && renderVideosTab()}
            {activeTab === 'notes' && renderNotesTab()}
            {activeTab === 'exams' && renderExamsTab()}
            {activeTab === 'qa' && renderQATab()}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderVideosTab = () => {
    const videos = getVideosForTopic(selectedTopic);
    
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Video Lessons ({videos.length})</Text>
        {videos.map((video, index) => (
          <TouchableOpacity 
            key={video.id} 
            style={styles.videoItem}
            onPress={() => openVideoModal(video, selectedTopic)}
          >
            <View style={styles.videoThumbnail}>
              <Image 
                source={{ uri: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` }}
                style={styles.thumbnailImage}
              />
              <View style={styles.playButtonOverlay}>
                <Ionicons name="play-circle" size={40} color="#FFFFFF" />
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{video.duration}</Text>
              </View>
              {isVideoCompleted(selectedTopic, video.id) && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.channelName}>{video.channel}</Text>
              <Text style={styles.videoDescription}>{video.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderQATab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Q&A - AI Assistant</Text>
        <View style={styles.qaCard}>
          <Text style={styles.qaPrompt}>
            Ask any question about {selectedTopic} and get AI-generated explanations:
          </Text>
          <TextInput
            style={styles.qaInput}
            placeholder="Type your question here..."
            placeholderTextColor="#888"
            value={aiQuestion}
            onChangeText={setAiQuestion}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity 
            style={[styles.askButton, loadingAI && styles.askButtonDisabled]}
            onPress={askAIQuestion}
            disabled={loadingAI}
          >
            {loadingAI ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.askButtonText}>
              {loadingAI ? 'Thinking...' : 'Ask AI Assistant'}
            </Text>
          </TouchableOpacity>
        </View>

        {aiResponse ? (
          <View style={styles.aiResponseCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={20} color="#FFD166" />
              <Text style={styles.aiTitle}>AI Assistant Response</Text>
            </View>
            <Text style={styles.aiText}>{aiResponse}</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <LayoutWithNavigation 
      activeTab="lessons" 
      navigation={navigation}
    >
      <View style={styles.container}>
        <LinearGradient 
          colors={['#0A7C72', '#0fbfae', '#1a1a2e']}
          style={styles.background}
        >
          <SafeAreaView style={styles.safeArea}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Study Portal</Text>
              <Text style={styles.subtitle}>Choose your subject and grade</Text>
              
              {/* Streak Counter */}
              <View style={styles.streakContainer}>
                <Ionicons name="flame" size={20} color="#FFD166" />
                <Text style={styles.streakText}>{streak} day streak</Text>
              </View>
            </View>

            {/* Grade Selector */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.gradeSelector}
              contentContainerStyle={styles.gradeSelectorContent}
            >
              {grades.map(grade => (
                <TouchableOpacity
                  key={grade}
                  style={[
                    styles.gradeButton,
                    selectedGrade === grade && styles.gradeButtonActive
                  ]}
                  onPress={() => setSelectedGrade(grade)}
                >
                  <Text style={[
                    styles.gradeText,
                    selectedGrade === grade && styles.gradeTextActive
                  ]}>
                    Grade {grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Subjects Grid */}
            <View style={styles.subjectsGrid}>
              {subjects.map(subject => renderSubjectCard(subject))}
            </View>

            {/* Topics List */}
            <View style={styles.topicsSection}>
              <Text style={styles.sectionTitle}>
                {selectedSubject} - Grade {selectedGrade} Topics
              </Text>
              <FlatList
                data={getSubjectTopics()}
                renderItem={renderTopicItem}
                keyExtractor={item => item}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.topicsList}
              />
            </View>

            {renderTopicDetail()}

            {/* Video Player Modal */}
            <Modal
              visible={videoModal.visible}
              transparent={false}
              animationType="slide"
              statusBarTranslucent={true}
            >
              <View style={styles.videoModalContainer}>
                <View style={styles.videoModalHeader}>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={closeVideoModal}
                  >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.videoModalTitle} numberOfLines={1}>
                    {videoModal.videoTitle}
                  </Text>
                  <View style={styles.placeholder} />
                </View>

                <WebView
                  source={{ html: getYouTubeHTML(videoModal.videoId) }}
                  style={styles.videoPlayer}
                  allowsFullscreenVideo={true}
                  javaScriptEnabled={true}
                />
              </View>
            </Modal>

          </SafeAreaView>
        </LinearGradient>
      </View>
    </LayoutWithNavigation>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  safeArea: { flex: 1 },
  
  // Header
  header: { padding: 20, paddingBottom: 10 },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 5,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.8)', 
    marginBottom: 15,
    textAlign: 'center'
  },
  streakContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,209,102,0.2)', 
    padding: 10, 
    borderRadius: 20, 
    alignSelf: 'center',
    marginTop: 10
  },
  streakText: { color: '#FFD166', fontSize: 14, fontWeight: '600', marginLeft: 5 },
  
  // Grade Selector
  gradeSelector: { 
    paddingHorizontal: 15, 
    marginBottom: 20,
    maxHeight: 50
  },
  gradeSelectorContent: {
    alignItems: 'center'
  },
  gradeButton: {
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginHorizontal: 5,
    minWidth: 80,
    alignItems: 'center'
  },
  gradeButtonActive: { backgroundColor: 'rgba(78, 205, 196, 0.3)' },
  gradeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  gradeTextActive: { color: '#FFFFFF' },
  
  // Subjects Grid
  subjectsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 15, 
    justifyContent: 'space-between',
    marginBottom: 20
  },
  subjectCard: {
    width: (width - 40) / 2 - 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10
  },
  subjectCardActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderColor: '#4ECDC4',
    borderWidth: 1
  },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subjectIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 10
  },
  subjectName: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '600', 
    flex: 1,
    flexWrap: 'wrap'
  },
  progressContainer: { marginBottom: 10 },
  progressBar: { 
    height: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 3, 
    marginBottom: 5 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#4ECDC4', 
    borderRadius: 3 
  },
  progressText: { color: '#4ECDC4', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 4 },
  
  // Topics Section
  topicsSection: { flex: 1, paddingHorizontal: 15 },
  sectionTitle: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15,
    textAlign: 'center'
  },
  topicsList: { paddingBottom: 20 },
  topicCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10 
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  topicIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(78, 205, 196, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  topicInfo: { flex: 1 },
  topicName: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  topicStats: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  topicProgress: { marginTop: 5 },
  topicProgressBar: { 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 2 
  },
  topicProgressFill: { 
    height: '100%', 
    backgroundColor: '#4ECDC4', 
    borderRadius: 2 
  },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#1a1a2e' },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: 'rgba(10, 124, 114, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backButtonText: { color: '#FFFFFF', fontSize: 16, marginLeft: 5 },
  modalTitle: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    flex: 1, 
    marginHorizontal: 10 
  },
  placeholder: { width: 40 },
  
  // Detail Tabs
  detailTabs: { 
    paddingHorizontal: 15, 
    marginVertical: 10,
    maxHeight: 50
  },
  detailTab: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginRight: 10 
  },
  detailTabActive: { backgroundColor: 'rgba(78, 205, 196, 0.3)' },
  detailTabText: { color: '#4ECDC4', fontSize: 14, fontWeight: '600' },
  detailTabTextActive: { color: '#FFFFFF' },
  
  // Detail Content
  detailContent: { flex: 1 },
  tabContent: { flex: 1, padding: 15 },
  
  // Video Items
  videoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 10 
  },
  videoThumbnail: { 
    width: 100, 
    height: 70, 
    borderRadius: 8,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600'
  },
  completedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4ECDC4',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoInfo: { flex: 1 },
  videoTitle: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  channelName: { 
    color: '#4ECDC4', 
    fontSize: 12, 
    marginBottom: 4 
  },
  videoDescription: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 11,
    lineHeight: 14
  },
  
  // Exam Papers
  examPaperItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 10 
  },
  examPaperInfo: { flex: 1, marginLeft: 15 },
  examPaperTitle: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  examPaperMeta: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 12 
  },
  examPaperSubject: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  examPaperActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  downloadPaperButton: {
    backgroundColor: '#4ECDC4',
    padding: 8,
    borderRadius: 6,
    marginRight: 8
  },
  sharePaperButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 6
  },
  
  // Q&A
  qaCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 15,
    marginBottom: 15
  },
  qaPrompt: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    marginBottom: 15, 
    lineHeight: 20 
  },
  qaInput: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 8, 
    padding: 12, 
    color: '#FFFFFF', 
    minHeight: 80, 
    textAlignVertical: 'top',
    marginBottom: 15,
    fontSize: 14
  },
  askButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#4ECDC4', 
    padding: 12, 
    borderRadius: 8 
  },
  askButtonDisabled: {
    backgroundColor: '#7BD3C9',
  },
  askButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 8 
  },
  aiResponseCard: {
    backgroundColor: 'rgba(255, 215, 102, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD166'
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD166',
    marginLeft: 8
  },
  aiText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20
  },
  
  // Notes
  notesCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    maxHeight: 400
  },
  notesText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 10
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  
  // Loading States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 16
  },
  
  // Video Modal
  videoModalContainer: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#000000'
  },
  videoModalTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10
  },
  videoPlayer: {
    flex: 1
  },
  closeButton: {
    padding: 8
  }
});