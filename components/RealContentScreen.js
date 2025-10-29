// components/RealContentScreen.js
import React, { useState, useEffect } from 'react';
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
import OpenAIService from '../services/openaiService';

export default function RealContentScreen() {
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedGrade, setSelectedGrade] = useState('12');
  const [selectedTopic, setSelectedTopic] = useState('Algebra');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subjects = [
    { name: 'Mathematics', topics: ['Algebra', 'Geometry', 'Calculus', 'Probability', 'Functions'] },
    { name: 'Physical Sciences', topics: ['Physics', 'Chemistry', 'Mechanics', 'Electricity', 'Waves'] },
    { name: 'English', topics: ['Grammar', 'Writing', 'Comprehension', 'Literature', 'Poetry'] },
    { name: 'Accounting', topics: ['Financial Statements', 'Ratios', 'Budgeting', 'Cost Accounting', 'Taxation'] }
  ];

  const grades = ['10', '11', '12'];

  const generateContent = async (contentType = 'lesson') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🎯 Generating ${contentType} for ${selectedSubject} Grade ${selectedGrade} - ${selectedTopic}`);
      
      const result = await OpenAIService.generateEducationalContent(
        selectedSubject,
        selectedGrade,
        selectedTopic,
        contentType
      );

      setContent({
        type: contentType,
        data: result,
        generatedAt: new Date().toLocaleString()
      });

      Alert.alert('Success', `${contentType === 'lesson' ? 'Lesson' : 'Practice Questions'} generated successfully!`);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message);
      Alert.alert('Error', `Failed to generate content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestions = (questions) => {
    if (!questions || !questions.length) {
      return <Text style={styles.noContent}>No questions generated yet.</Text>;
    }

    return questions.map((q, index) => (
      <View key={index} style={styles.questionCard}>
        <Text style={styles.questionNumber}>Question {index + 1}</Text>
        <Text style={styles.questionText}>{q.question}</Text>
        
        <View style={styles.optionsContainer}>
          {q.options && q.options.map((option, optIndex) => (
            <Text key={optIndex} style={styles.optionText}>
              {String.fromCharCode(65 + optIndex)}) {option}
            </Text>
          ))}
        </View>

        <View style={styles.solutionSection}>
          <Text style={styles.solutionTitle}>Solution:</Text>
          <Text style={styles.correctAnswer}>
            Correct answer: {String.fromCharCode(65 + q.correctAnswer)}
          </Text>
          <Text style={styles.explanation}>{q.explanation}</Text>
          
          {q.steps && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>Step-by-step:</Text>
              {q.steps.map((step, stepIndex) => (
                <Text key={stepIndex} style={styles.stepText}>• {step}</Text>
              ))}
            </View>
          )}

          {q.commonMistakes && (
            <View style={styles.mistakesContainer}>
              <Text style={styles.mistakesTitle}>Common mistakes:</Text>
              {q.commonMistakes.map((mistake, mistakeIndex) => (
                <Text key={mistakeIndex} style={styles.mistakeText}>⚠️ {mistake}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    ));
  };

  const renderLesson = (lessonData) => {
    if (!lessonData) {
      return <Text style={styles.noContent}>No lesson content generated yet.</Text>;
    }

    return (
      <View style={styles.lessonCard}>
        <Text style={styles.lessonContent}>
          {typeof lessonData === 'string' ? lessonData : JSON.stringify(lessonData, null, 2)}
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0A7C72', '#0fbfae', '#F5E27A']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Tutor - CAPS Curriculum</Text>
          <Text style={styles.subtitle}>Grade {selectedGrade} {selectedSubject}: {selectedTopic}</Text>
        </View>

        {/* Subject Selection */}
        <View style={styles.selectorSection}>
          <Text style={styles.sectionTitle}>Select Subject & Topic</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.name}
                style={[
                  styles.subjectButton,
                  selectedSubject === subject.name && styles.subjectButtonActive
                ]}
                onPress={() => {
                  setSelectedSubject(subject.name);
                  setSelectedTopic(subject.topics[0]);
                }}
              >
                <Text style={[
                  styles.subjectText,
                  selectedSubject === subject.name && styles.subjectTextActive
                ]}>
                  {subject.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Topic Selection */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicScroll}>
            {subjects.find(s => s.name === selectedSubject)?.topics.map((topic) => (
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

          {/* Grade Selection */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.lessonButton]}
            onPress={() => generateContent('lesson')}
            disabled={loading}
          >
            <Ionicons name="book-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>
              {loading ? 'Generating...' : 'Generate Lesson'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.questionsButton]}
            onPress={() => generateContent('exam_questions')}
            disabled={loading}
          >
            <Ionicons name="help-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>
              {loading ? 'Generating...' : 'Practice Questions'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>AI is creating content...</Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content Display */}
        {content && !loading && (
          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>
                {content.type === 'lesson' ? 'AI-Generated Lesson' : 'Practice Questions'}
              </Text>
              <Text style={styles.generatedAt}>Generated: {content.generatedAt}</Text>
            </View>

            {content.type === 'lesson' 
              ? renderLesson(content.data?.content || content.data)
              : renderQuestions(content.data?.questions || [])
            }
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  
  selectorSection: { marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 15 },
  
  subjectButton: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  subjectButtonActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  subjectText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  subjectTextActive: { color: '#FFF', fontWeight: '600' },
  
  topicScroll: { marginVertical: 10 },
  topicButton: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    marginHorizontal: 5 
  },
  topicButtonActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  topicText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  topicTextActive: { color: '#FFF' },
  
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
  
  actionSection: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25 },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderRadius: 15, 
    flex: 0.45 
  },
  lessonButton: { backgroundColor: '#4ECDC4' },
  questionsButton: { backgroundColor: '#FF6B6B' },
  actionButtonText: { color: '#FFF', fontWeight: '600', marginLeft: 10 },
  
  loadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { color: '#FFF', marginTop: 10 },
  
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,107,107,0.2)', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  errorText: { color: '#FFF', marginLeft: 10, flex: 1 },
  
  contentSection: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 20 },
  contentHeader: { marginBottom: 15 },
  contentTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  generatedAt: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  
  questionCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 15 
  },
  questionNumber: { color: '#4ECDC4', fontWeight: 'bold', marginBottom: 5 },
  questionText: { color: '#FFF', fontSize: 16, marginBottom: 10 },
  optionsContainer: { marginBottom: 10 },
  optionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 3 },
  
  solutionSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  solutionTitle: { color: '#4ECDC4', fontWeight: 'bold', marginBottom: 5 },
  correctAnswer: { color: '#6BCF7F', fontWeight: '600', marginBottom: 5 },
  explanation: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 10 },
  
  stepsContainer: { marginBottom: 10 },
  stepsTitle: { color: '#FFD93D', fontWeight: '600', marginBottom: 5 },
  stepText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 },
  
  mistakesContainer: { marginTop: 10 },
  mistakesTitle: { color: '#FF6B6B', fontWeight: '600', marginBottom: 5 },
  mistakeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 },
  
  lessonCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 15 },
  lessonContent: { color: '#FFF', lineHeight: 20 },
  
  noContent: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontStyle: 'italic' }
});