import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export const AchievementBadges = ({ achievements, onPress }) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.achievementsScroll}
    >
      <View style={styles.achievementsContainer}>
        {achievements.map((achievement) => (
          <TouchableOpacity 
            key={achievement.id} 
            style={styles.achievementCard}
            onPress={() => onPress(achievement)}
          >
            <View style={[
              styles.achievementIcon,
              { backgroundColor: achievement.unlocked ? '#4ECDC4' : '#E2E8F0' }
            ]}>
              <FontAwesome5 
                name={achievement.icon} 
                size={16} 
                color={achievement.unlocked ? 'white' : '#A0AEC0'} 
              />
            </View>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementPoints}>+{achievement.points} pts</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  achievementsScroll: {
    marginHorizontal: -20,
  },
  achievementsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  achievementCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  },
  achievementPoints: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  },
});