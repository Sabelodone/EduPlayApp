// components/EducationalContentScreen.js - UPDATED WITH BACKEND INTEGRATION
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OpenAIService from '../services/openaiService';
import API_BASE_URL from '../config';

export default function EducationalContentScreen() {
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedGrade, setSelectedGrade] = useState('10');
  const [selectedTopic, setSelectedTopic] = useState('Algebra');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subjects = {
    'Mathematics': ['Algebra', 'Geometry', 'Functions', 'Calculus', 'Probability', 'Statistics'],
    'Physical Sciences': ['Physics', 'Chemistry', 'Mechanics', 'Waves', 'Electricity', 'Matter'],
    'English': ['Grammar', 'Writing', 'Comprehension', 'Literature', 'Poetry', 'Drama'],
    'Accounting': ['Financial Statements', 'Ratios', 'Budgeting', 'Cost Accounting', 'Taxation']
  };

  const grades = ['10', '11', '12'];

  // Track lesson completion to backend
  const trackLessonCompletion = async (lessonData) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/progress/lesson-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: selectedSubject,
          grade: selectedGrade,
          topic: selectedTopic,
          content_type: 'lesson',
          points_earned: 10
        }),
      });

      if (response.ok) {
        console.log('✅ Lesson completion tracked');
      }
    } catch (error) {
      console.log('⚠️ Failed to track lesson completion:', error.message);
    }
  };

  // Track question completion to backend
  const trackQuestionsCompletion = async (questionsData) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/progress/quiz-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: selectedSubject,
          grade: selectedGrade,
          topic: selectedTopic,
          questions_count: questionsData.length,
          points_earned: 15
        }),
      });

      if (response.ok) {
        console.log('✅ Questions completion tracked');
      }
    } catch (error) {
      console.log('⚠️ Failed to track questions completion:', error.message);
    }
  };

  const generateContent = async (type) => {
    setLoading(true);
    setError(null);
    setContent(null);

    try {
      console.log(`🎯 Generating ${type} for ${selectedSubject} Grade ${selectedGrade} - ${selectedTopic}`);
      
      let result;
      if (type === 'questions') {
        result = await OpenAIService.generateExamQuestions(selectedSubject, selectedGrade, selectedTopic, 3);
        // Track questions completion
        await trackQuestionsCompletion(result);
      } else {
        result = await OpenAIService.generateLessonContent(selectedSubject, selectedGrade, selectedTopic);
        // Track lesson completion
        await trackLessonCompletion(result);
      }

      setContent({
        type: type,
        data: result,
        subject: selectedSubject,
        grade: selectedGrade,
        topic: selectedTopic,
        timestamp: new Date().toLocaleTimeString()
      });

      Alert.alert('Success!', `Content generated successfully for ${selectedSubject}`);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message);
      Alert.alert('Generation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestions = () => {
    if (!content?.data || !Array.isArray(content.data)) {
      return <Text style={styles.noContent}>No questions generated.</Text>;
    }

    return content.data.map((q, index) => (
      <View key={q.id || index} style={styles.questionCard}>
        <Text style={styles.questionNumber}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{q.question}</Text>
        
        <View style={styles.optionsContainer}>
          {q.options.map((option, optIndex) => (
            <Text 
              key={optIndex} 
              style={[
                styles.optionText,
                optIndex === q.correctAnswer && styles.correctOption
              ]}
            >
              {String.fromCharCode(65 + optIndex)}) {option}
            </Text>
          ))}
        </View>

        <View style={styles.solutionSection}>
          <Text style={styles.solutionTitle}>Explanation:</Text>
          <Text style={styles.explanation}>{q.explanation}</Text>
          
          {q.steps && q.steps.length > 0 && (
            <>
              <Text style={styles.stepsTitle}>Step-by-step solution:</Text>
              {q.steps.map((step, stepIndex) => (
                <Text key={stepIndex} style={styles.stepText}>• {step}</Text>
              ))}
            </>
          )}

          {q.commonMistakes && q.commonMistakes.length > 0 && (
            <>
              <Text style={styles.mistakesTitle}>Common mistakes:</Text>
              {q.commonMistakes.map((mistake, mistakeIndex) => (
                <Text key={mistakeIndex} style={styles.mistakeText}>⚠️ {mistake}</Text>
              ))}
            </>
          )}
        </View>
      </View>
    ));
  };

  const renderLesson = () => {
    if (!content?.data) {
      return <Text style={styles.noContent}>No lesson content generated.</Text>;
    }

    return (
      <View style={styles.lessonCard}>
        <Text style={styles.lessonContent}>{content.data}</Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0A7C72', '#0fbfae', '#F5E27A']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>CAPS AI Tutor</Text>
          <Text style={styles.subtitle}>Grade {selectedGrade} Educational Content</Text>
        </View>

        {/* Selection Section */}
        <View style={styles.selectionSection}>
          <Text style={styles.sectionTitle}>1. Select Subject & Topic</Text>
          
          {/* Subject Selection */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
            {Object.keys(subjects).map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.selectorButton,
                  selectedSubject === subject && styles.selectorButtonActive
                ]}
                onPress={() => {
                  setSelectedSubject(subject);
                  setSelectedTopic(subjects[subject][0]);
                }}
              >
                <Text style={[
                  styles.selectorText,
                  selectedSubject === subject && styles.selectorTextActive
                ]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Grade Selection */}
          <Text style={styles.selectorLabel}>Grade Level:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
            {grades.map((grade) => (
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

          {/* Topic Selection */}
          <Text style={styles.selectorLabel}>Topic:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
            {subjects[selectedSubject]?.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.topicButton,
                  selectedTopic === topic && styles.topicButtonActive
                ]}
                onPress={() => setSelectedTopic(topic)}
              >
                <Text style={[
                  styles.topicText,
                  selectedTopic === topic && styles.topicTextActive
                ]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>2. Generate Content</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.lessonButton]}
              onPress={() => generateContent('lesson')}
              disabled={loading}
            >
              <Ionicons name="book-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>
                {loading ? 'Generating...' : 'Create Lesson'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.questionsButton]}
              onPress={() => generateContent('questions')}
              disabled={loading}
            >
              <Ionicons name="help-circle-outline" size={20} color="#FFF" />
              <Text style={styles.buttonText}>
                {loading ? 'Generating...' : 'Practice Questions'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>AI is creating content...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Generation Failed</Text>
              <Text style={styles.errorMessage}>{error}</Text>
            </View>
          </View>
        )}

        {/* Content Display */}
        {content && !loading && (
          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>
                {content.type === 'questions' ? 'Practice Questions' : 'AI Lesson'}
              </Text>
              <Text style={styles.contentSubtitle}>
                {content.subject} • Grade {content.grade} • {content.topic}
              </Text>
              <Text style={styles.timestamp}>Generated at {content.timestamp}</Text>
            </View>

            {content.type === 'questions' ? renderQuestions() : renderLesson()}
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  
  selectionSection: { marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 15 },
  selectorLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8, marginTop: 10 },
  selectorRow: { marginBottom: 10 },
  
  selectorButton: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  selectorButtonActive: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.5)' },
  selectorText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  selectorTextActive: { color: '#FFF', fontWeight: '600' },
  
  gradeButton: { 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginHorizontal: 5 
  },
  gradeButtonActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  gradeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  gradeTextActive: { color: '#FFF', fontWeight: '600' },
  
  topicButton: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 15, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    marginHorizontal: 5 
  },
  topicButtonActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  topicText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  topicTextActive: { color: '#FFF' },
  
  actionSection: { marginBottom: 25 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderRadius: 15, 
    flex: 0.48,
    justifyContent: 'center'
  },
  lessonButton: { backgroundColor: '#4ECDC4' },
  questionsButton: { backgroundColor: '#FF6B6B' },
  buttonText: { color: '#FFF', fontWeight: '600', marginLeft: 8, fontSize: 14 },
  
  loadingContainer: { alignItems: 'center', padding: 30, marginVertical: 20 },
  loadingText: { color: '#FFF', fontSize: 16, marginTop: 15, fontWeight: '500' },
  loadingSubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 5 },
  
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,107,107,0.2)', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B'
  },
  errorTextContainer: { flex: 1, marginLeft: 10 },
  errorTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  errorMessage: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
  
  contentSection: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 30 
  },
  contentHeader: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  contentTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  contentSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 5 },
  timestamp: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 },
  
  questionCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 15 
  },
  questionNumber: { color: '#4ECDC4', fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  questionText: { color: '#FFF', fontSize: 16, fontWeight: '500', marginBottom: 12, lineHeight: 22 },
  optionsContainer: { marginBottom: 15 },
  optionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  correctOption: { color: '#6BCF7F', fontWeight: '600' },
  
  solutionSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
  solutionTitle: { color: '#4ECDC4', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  explanation: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  stepsTitle: { color: '#FFD93D', fontWeight: '600', fontSize: 14, marginBottom: 6, marginTop: 10 },
  stepText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 3 },
  mistakesTitle: { color: '#FF6B6B', fontWeight: '600', fontSize: 14, marginBottom: 6, marginTop: 10 },
  mistakeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, marginBottom: 3 },
  
  lessonCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 15 },
  lessonContent: { color: '#FFF', fontSize: 14, lineHeight: 22 },
  
  noContent: { 
    color: 'rgba(255,255,255,0.5)', 
    textAlign: 'center', 
    fontStyle: 'italic', 
    padding: 20,
    fontSize: 14
  }
});