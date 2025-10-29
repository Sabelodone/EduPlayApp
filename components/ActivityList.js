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
  const getIconByType = (activity) => {
    // First try to use the icon from backend data
    if (activity.icon && activity.iconType) {
      return activity.icon;
    }
    
    // Fallback to type-based icons
    switch (activity.type) {
      case 'lesson':
        return 'book';
      case 'game':
        return 'game-controller';
      case 'quiz':
        return 'document-text';
      case 'challenge':
        return 'trophy';
      case 'ai_interaction':
        return 'help-buoy';
      default:
        return 'help-circle';
    }
  };

  const getIconType = (activity) => {
    // Use the iconType from backend data, or default to Ionicons
    return activity.iconType || 'Ionicons';
  };

  const getSubjectFromType = (type) => {
    switch (type) {
      case 'challenge':
        return 'Challenge';
      case 'ai_interaction':
        return 'AI Help';
      case 'lesson':
        return 'Lesson';
      case 'game':
        return 'Game';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Activity';
    }
  };

  const getPointsFromType = (type) => {
    switch (type) {
      case 'challenge':
        return 50;
      case 'ai_interaction':
        return 10;
      case 'lesson':
        return 25;
      case 'game':
        return 30;
      case 'quiz':
        return 40;
      default:
        return 15;
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

  return (
    <View style={styles.activityCard}>
      {activities.map((activity, index) => (
        <View key={activity.id}>
          <TouchableOpacity 
            style={styles.activityItem}
            onPress={() => onActivityPress(activity)}
          >
            <View style={[
              styles.activityIcon,
              { backgroundColor: SUBJECT_COLORS[activity.subject] || SUBJECT_COLORS[getSubjectFromType(activity.type)] || SUBJECT_COLORS.default }
            ]}>
              {renderIcon(activity)}
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activitySubtitle}>
                {getSubjectFromType(activity.type)} • {activity.time}
              </Text>
              {!activity.completed && (
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
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  inProgressText: {
    fontSize: 10,
    color: '#FFA726',
    fontWeight: '600',
    marginTop: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F4',
    marginHorizontal: -16,
  },
});