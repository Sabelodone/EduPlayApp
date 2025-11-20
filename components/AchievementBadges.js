import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

export const AchievementBadges = ({ achievements, onPress }) => {
  // Map backend achievement data to component format
  const getDisplayAchievement = (achievement) => {
    return {
      id: achievement.id,
      title: achievement.name || achievement.title,
      description: achievement.description,
      icon: achievement.icon || 'trophy',
      completed: achievement.completed || achievement.unlocked || false,
      progress: achievement.progress || 0,
      total: achievement.total || 1,
      percentage: achievement.percentage || 0,
      points: achievement.points || Math.floor((achievement.percentage || 0) * 2) || 50
    };
  };

  const getIconComponent = (iconName, completed) => {
    // Try different icon libraries
    try {
      // Ionicons
      if (iconName in Ionicons.glyphMap) {
        return <Ionicons name={iconName} size={16} color={completed ? 'white' : '#A0AEC0'} />;
      }
      // FontAwesome5
      if (iconName in FontAwesome5.glyphMap) {
        return <FontAwesome5 name={iconName} size={16} color={completed ? 'white' : '#A0AEC0'} />;
      }
      // MaterialIcons
      if (iconName in MaterialIcons.glyphMap) {
        return <MaterialIcons name={iconName} size={16} color={completed ? 'white' : '#A0AEC0'} />;
      }
    } catch (error) {
      console.log('Icon not found:', iconName);
    }
    
    // Fallback to trophy icon
    return <FontAwesome5 name="trophy" size={16} color={completed ? 'white' : '#A0AEC0'} />;
  };

  const getProgressText = (achievement) => {
    if (achievement.completed) {
      return 'Completed!';
    }
    return `${achievement.progress}/${achievement.total}`;
  };

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.achievementsScroll}
      contentContainerStyle={styles.achievementsContent}
    >
      {achievements.map((achievement) => {
        const displayAchievement = getDisplayAchievement(achievement);
        
        return (
          <TouchableOpacity 
            key={displayAchievement.id} 
            style={styles.achievementCard}
            onPress={() => onPress && onPress(displayAchievement)}
          >
            <View style={[
              styles.achievementIcon,
              { backgroundColor: displayAchievement.completed ? '#4ECDC4' : '#E2E8F0' }
            ]}>
              {getIconComponent(displayAchievement.icon, displayAchievement.completed)}
            </View>
            <Text style={styles.achievementTitle} numberOfLines={2}>
              {displayAchievement.title}
            </Text>
            <Text style={styles.achievementProgress}>
              {getProgressText(displayAchievement)}
            </Text>
            {displayAchievement.completed && (
              <Text style={styles.achievementPoints}>+{displayAchievement.points} pts</Text>
            )}
            
            {/* Progress bar for incomplete achievements */}
            {!displayAchievement.completed && displayAchievement.total > 1 && (
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${displayAchievement.percentage}%` }
                  ]} 
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  achievementsScroll: {
    marginHorizontal: -16,
  },
  achievementsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  achievementCard: {
    width: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  achievementProgress: {
    fontSize: 11,
    fontWeight: '500',
    color: '#718096',
    marginBottom: 2,
  },
  achievementPoints: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
});