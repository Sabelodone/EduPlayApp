import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SUBJECT_COLORS } from './dashboardConfig';

export const ActivityList = ({ activities, onActivityPress }) => {
  // Time formatting function for backend ISO times
  const formatTime = (isoTime) => {
    if (!isoTime) return 'Recently';
    
    try {
      const time = new Date(isoTime);
      const now = new Date();
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return 'Just now';
    } catch {
      return 'Recently';
    }
  };

  const getIconByType = (activity) => {
    // Use backend-provided icon first
    if (activity.icon) {
      return activity.icon;
    }
    
    // Fallback to type-based icons
    switch (activity.type) {
      case 'lesson':
      case 'lesson_complete':
        return 'book';
      case 'game':
      case 'game_complete':
      case 'game_start':
        return 'game-controller';
      case 'quiz':
        return 'document-text';
      case 'challenge':
      case 'challenge_complete':
        return 'trophy';
      case 'ai_interaction':
        return 'help-buoy';
      case 'download':
        return 'download';
      default:
        return 'help-circle';
    }
  };

  const getIconType = (activity) => {
    return activity.iconType || 'Ionicons';
  };

  // Map backend activity types to display subjects
  const getSubjectFromType = (type) => {
    switch (type) {
      case 'challenge':
      case 'challenge_complete':
        return 'Challenge';
      case 'ai_interaction':
        return 'AI Help';
      case 'lesson':
      case 'lesson_complete':
        return 'Lesson';
      case 'game':
      case 'game_complete':
      case 'game_start':
        return 'Game';
      case 'quiz':
        return 'Quiz';
      case 'download':
        return 'Resource';
      default:
        return 'Activity';
    }
  };

  // Points based on activity type (matches backend points)
  const getPointsFromType = (type) => {
    switch (type) {
      case 'challenge':
      case 'challenge_complete':
        return 30; // Matches backend challenge points
      case 'ai_interaction':
        return 10;
      case 'lesson':
      case 'lesson_complete':
        return 10; // Matches backend lesson points
      case 'game':
      case 'game_complete':
        return 20; // Matches backend game points
      case 'quiz':
        return 15;
      case 'download':
        return 5;
      default:
        return 10;
    }
  };

  const renderIcon = (activity) => {
    const iconName = getIconByType(activity);
    const iconType = getIconType(activity);
    
    switch (iconType) {
      case 'FontAwesome5':
        return <FontAwesome5 name={iconName} size={14} color="white" />;
      case 'MaterialIcons':
        return <MaterialIcons name={iconName} size={14} color="white" />;
      case 'Ionicons':
      default:
        return <Ionicons name={iconName} size={14} color="white" />;
    }
  };

  // Get display title from backend data
  const getDisplayTitle = (activity) => {
    if (activity.title) return activity.title;
    
    // Fallback titles based on type
    switch (activity.type) {
      case 'challenge_complete':
        return 'Challenge Completed';
      case 'lesson_complete':
        return 'Lesson Completed';
      case 'game_complete':
        return 'Game Completed';
      case 'game_start':
        return 'Game Started';
      case 'ai_interaction':
        return 'AI Assistance';
      case 'download':
        return 'Resource Downloaded';
      default:
        return 'Activity Completed';
    }
  };

  // Get display description from backend data
  const getDisplayDescription = (activity) => {
    if (activity.description) return activity.description;
    
    // Fallback descriptions
    switch (activity.type) {
      case 'challenge_complete':
        return 'Great job completing the challenge!';
      case 'lesson_complete':
        return 'You completed a learning module';
      case 'game_complete':
        return 'You finished an educational game';
      case 'game_start':
        return 'You started a new game';
      case 'ai_interaction':
        return 'Used AI learning assistant';
      case 'download':
        return 'Downloaded learning resource';
      default:
        return 'Learning activity completed';
    }
  };

  return (
    <View style={styles.activityCard}>
      {activities.map((activity, index) => (
        <View key={activity.id || `activity-${index}`}>
          <TouchableOpacity 
            style={styles.activityItem}
            onPress={() => onActivityPress && onActivityPress(activity)}
          >
            <View style={[
              styles.activityIcon,
              { backgroundColor: SUBJECT_COLORS[getSubjectFromType(activity.type)] || SUBJECT_COLORS.default }
            ]}>
              {renderIcon(activity)}
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{getDisplayTitle(activity)}</Text>
              <Text style={styles.activitySubtitle}>
                {getSubjectFromType(activity.type)} • {formatTime(activity.time)}
              </Text>
              <Text style={styles.activityDescription}>
                {getDisplayDescription(activity)}
              </Text>
              {activity.completed === false && (
                <Text style={styles.inProgressText}>In Progress</Text>
              )}
            </View>
            <View style={styles.pointsContainer}>
              <Text style={styles.points}>+{getPointsFromType(activity.type)}</Text>
              <MaterialIcons name="emoji-events" size={16} color="#FFD700" />
            </View>
          </TouchableOpacity>
          {index < activities.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  inProgressText: {
    fontSize: 10,
    color: '#ED8936',
    fontWeight: '500',
    marginTop: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  points: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
});