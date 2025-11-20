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
import apiService from '../services/apiService';

const { width, height } = Dimensions.get('window');

// Fallback data
const SCHOOL_CURRICULUM_FALLBACK = {
  'Mathematics': {
    '10': ['Algebra', 'Geometry', 'Trigonometry'],
    '11': ['Functions', 'Calculus Basics'],
    '12': ['Calculus', 'Statistics']
  },
  'English': {
    '10': ['Grammar', 'Literature'],
    '11': ['Comprehension', 'Writing'],
    '12': ['Poetry', 'Drama']
  },
  'Accounting': {
    '10': ['Basic Accounting', 'Financial Statements'],
    '11': ['Cost Accounting', 'Management Accounting'],
    '12': ['Financial Management', 'Auditing']
  },
  'Physical Sciences': {
    '10': ['Physics Basics', 'Chemistry Basics'],
    '11': ['Mechanics', 'Chemical Reactions'],
    '12': ['Electricity', 'Organic Chemistry']
  }
};

const getFallbackTopics = (subject, grade) => {
  return SCHOOL_CURRICULUM_FALLBACK[subject]?.[grade] || ['General Topics'];
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
  
  // New state for backend data
  const [curriculum, setCurriculum] = useState(null);
  const [topics, setTopics] = useState([]);
  const [videos, setVideos] = useState([]);
  const [examPapers, setExamPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectProgress, setSubjectProgress] = useState({});
  const [error, setError] = useState(null);

  const grades = ['10', '11', '12'];
  const subjects = ['Mathematics', 'English', 'Accounting', 'Physical Sciences'];

  // Load data from backend
  useEffect(() => {
    loadUserData();
    fetchCurriculumData();
  }, [selectedSubject, selectedGrade]);

  const loadUserData = async () => {
    try {
      await fetchUserProfile();
      await fetchProgressOverview();
      
      const streakData = await AsyncStorage.getItem('studyStreak');
      const completedData = await AsyncStorage.getItem('completedVideos');
      
      if (streakData) setStreak(parseInt(streakData));
      if (completedData) setCompletedVideos(JSON.parse(completedData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const data = await apiService.getCurrentUser();
      setUserProfile(data.user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCurriculumData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching curriculum data...');
      console.log(`Selected: ${selectedSubject}, Grade: ${selectedGrade}`);

      // Test basic connection first
      try {
        console.log('🧪 Testing debug endpoint...');
        const debugResponse = await fetch('http://192.168.1.196:5000/api/lessons/debug/test');
        const debugData = await debugResponse.json();
        console.log('✅ Debug endpoint:', debugData);
      } catch (debugError) {
        console.error('❌ Debug endpoint failed:', debugError);
        setError('Cannot connect to lessons API. Please check backend routes.');
        setLoading(false);
        return;
      }

      // Test auth endpoint
      try {
        console.log('🔐 Testing auth endpoint...');
        const authResponse = await apiService.request('/lessons/debug/auth-test');
        console.log('✅ Auth test:', authResponse);
      } catch (authError) {
        console.error('❌ Auth test failed:', authError);
        setError('Authentication issue. Please try logging out and back in.');
        setLoading(false);
        return;
      }

      // Now try the actual curriculum endpoints
      console.log('📚 Fetching curriculum...');
      try {
        const curriculumData = await apiService.getCurriculum();
        console.log('✅ Curriculum data received');
        setCurriculum(curriculumData.curriculum);
      } catch (curriculumError) {
        console.error('❌ Curriculum fetch failed:', curriculumError);
        // Use fallback curriculum
        setCurriculum(SCHOOL_CURRICULUM_FALLBACK);
      }
      
      // Get topics for current subject and grade
      console.log(`🔍 Fetching topics for ${selectedSubject} Grade ${selectedGrade}...`);
      try {
        const topicsData = await apiService.getTopics(selectedSubject, selectedGrade);
        console.log('📖 Topics data received:', topicsData);
        setTopics(topicsData.topics || []);
      } catch (topicsError) {
        console.error('❌ Topics fetch failed:', topicsError);
        // Use fallback topics
        const fallbackTopics = getFallbackTopics(selectedSubject, selectedGrade);
        setTopics(fallbackTopics);
      }

      // Get exam papers
      try {
        const examData = await apiService.getExamPapers(selectedSubject, selectedGrade);
        console.log('📝 Exam papers received:', examData);
        setExamPapers(examData.exam_papers || []);
      } catch (examError) {
        console.error('❌ Exam papers fetch failed:', examError);
        setExamPapers([]);
      }

    } catch (error) {
      console.error('❌ Error in fetchCurriculumData:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicVideos = async (topic) => {
    try {
      const data = await apiService.getTopicVideos(selectedSubject, selectedGrade, topic);
      return data.videos || [];
    } catch (error) {
      console.error('Error fetching topic videos:', error);
      return [];
    }
  };

  const fetchProgressOverview = async () => {
    try {
      const data = await apiService.getProgressOverview();
      setProgress(data.overview);
      setSubjectProgress(data.subject_progress || {});
    } catch (error) {
      console.error('Error fetching progress overview:', error);
    }
  };

  const syncVideoProgress = async (videoId, topic, action = 'completed') => {
    try {
      await apiService.updateVideoProgress({
        video_id: videoId,
        subject: selectedSubject,
        grade: selectedGrade,
        topic: topic,
        action: action
      });

      // Update local state
      const key = `${selectedSubject}-${selectedGrade}-${topic}-${videoId}`;
      setCompletedVideos(prev => ({
        ...prev,
        [key]: true
      }));
      
      await AsyncStorage.setItem('completedVideos', JSON.stringify({
        ...completedVideos,
        [key]: true
      }));

      // Refresh progress overview
      await fetchProgressOverview();
    } catch (error) {
      console.error('Error syncing video progress:', error);
    }
  };

  const getSubjectTopics = () => {
    return topics;
  };

  const getVideosForTopic = async (topic) => {
    const videos = await fetchTopicVideos(topic);
    return videos;
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
      videoId: video.video_id,
      videoTitle: video.title
    });

    try {
      if (!isVideoCompleted(topic, video.video_id)) {
        await syncVideoProgress(video.video_id, topic, 'started');
      }
    } catch (error) {
      console.error('Error tracking video start:', error);
    }
  };

  const closeVideoModal = async () => {
    if (videoModal.videoId && videoModal.visible && selectedTopic) {
      await syncVideoProgress(videoModal.videoId, selectedTopic, 'completed');
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
      const data = await apiService.askQuestion(aiQuestion, selectedSubject, selectedGrade, selectedTopic);
      setAiResponse(data.answer);
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiResponse('Error connecting to AI service. Please check your internet connection.');
    } finally {
      setLoadingAI(false);
    }
  };

  const generateStudyNotes = async (topic) => {
    try {
      const data = await apiService.generateStudyNotes(selectedSubject, selectedGrade, topic);
      return data.notes?.content || 'Study notes coming soon for this topic.';
    } catch (error) {
      console.error('Error generating study notes:', error);
      return 'Study notes coming soon for this topic.';
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
      return 'Study notes coming soon for this topic.';
    } finally {
      setLoadingNotes(prev => ({ ...prev, [noteKey]: false }));
    }
  };

  const downloadExamPaper = async (paper) => {
    setDownloadingPaper(paper.id);
    
    try {
      await apiService.downloadResource({
        resource_type: 'exam_paper',
        resource_id: paper.id,
        subject: paper.subject,
        grade: paper.grade
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
        message: `Check out this ${paper.subject} exam paper for Grade ${paper.grade}: ${paper.download_url}`,
        url: paper.download_url
      });
    } catch (error) {
      Alert.alert('Share Error', 'Could not share the paper.');
    }
  };

  const getExamPapers = () => {
    return examPapers;
  };

  // Separate component for NotesTab to fix hook order issue
  const NotesTab = ({ selectedSubject, selectedGrade, selectedTopic, loadingNotes, loadGeneratedNotes }) => {
    const [currentNotes, setCurrentNotes] = useState(null);

    useEffect(() => {
      if (selectedTopic) {
        const loadNotes = async () => {
          const notes = await loadGeneratedNotes(selectedTopic);
          setCurrentNotes(notes);
        };
        loadNotes();
      }
    }, [selectedTopic, selectedSubject, selectedGrade]);

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
                  {currentNotes || 'Study notes coming soon for this topic.'}
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

  const renderSubjectCard = (subject) => {
    const subjectProgressData = subjectProgress[subject] || { total_lessons: 0, completed_lessons: 0, progress_percent: 0 };
    const progressPercent = subjectProgressData.progress_percent || 0;

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
              {subjectProgressData.completed_lessons || 0}/{subjectProgressData.total_lessons || 0} completed
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
    // For now, we'll show placeholder progress until we implement topic-level progress
    const completedCount = 0;
    const totalVideos = 1; // Placeholder

    return (
      <TouchableOpacity
        style={styles.topicCard}
        onPress={async () => {
          setSelectedTopic(topic);
          // Pre-fetch videos for this topic
          const topicVideos = await fetchTopicVideos(topic);
          setVideos(topicVideos);
        }}
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
            {activeTab === 'notes' && (
              <NotesTab 
                selectedSubject={selectedSubject}
                selectedGrade={selectedGrade}
                selectedTopic={selectedTopic}
                loadingNotes={loadingNotes}
                loadGeneratedNotes={loadGeneratedNotes}
              />
            )}
            {activeTab === 'exams' && renderExamsTab()}
            {activeTab === 'qa' && renderQATab()}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderVideosTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Video Lessons ({videos.length})</Text>
        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam" size={48} color="#CBD5E0" />
            <Text style={styles.emptyStateText}>No videos available for this topic</Text>
          </View>
        ) : (
          videos.map((video, index) => (
            <TouchableOpacity 
              key={video.id} 
              style={styles.videoItem}
              onPress={() => openVideoModal(video, selectedTopic)}
            >
              <View style={styles.videoThumbnail}>
                <Image 
                  source={{ uri: `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg` }}
                  style={styles.thumbnailImage}
                />
                <View style={styles.playButtonOverlay}>
                  <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                </View>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{video.duration}</Text>
                </View>
                {isVideoCompleted(selectedTopic, video.video_id) && (
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
          ))
        )}
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

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchCurriculumData}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

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
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4ECDC4" />
                  <Text style={styles.loadingText}>Loading topics...</Text>
                </View>
              ) : topics.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="book" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyStateText}>No topics available for this subject and grade</Text>
                </View>
              ) : (
                <FlatList
                  data={getSubjectTopics()}
                  renderItem={renderTopicItem}
                  keyExtractor={item => item}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.topicsList}
                />
              )}
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
  
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
    marginLeft: 8
  },
  retryText: {
    color: '#FFD166',
    fontSize: 14,
    fontWeight: '600'
  },
  
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