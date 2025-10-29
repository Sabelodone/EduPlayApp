import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const UpcomingChallenges = ({ challenges, onJoinPress }) => {
  return (
    <View style={styles.challengesList}>
      {challenges.map((challenge) => (
        <TouchableOpacity
          key={challenge.id}
          style={styles.challengeCard}
          onPress={() => onJoinPress(challenge.id)}
        >
          <LinearGradient
            colors={['#6a11cb', '#2575fc']}
            style={styles.challengeGradient}
          >
            <View style={styles.challengeContent}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeSubject}>{challenge.subject}</Text>
              <View style={styles.challengeDetails}>
                <View style={styles.challengeDetail}>
                  <Ionicons name="calendar" size={14} color="white" />
                  <Text style={styles.challengeDetailText}>{challenge.date}</Text>
                </View>
                <View style={styles.challengeDetail}>
                  <Ionicons name="people" size={14} color="white" />
                  <Text style={styles.challengeDetailText}>{challenge.participants}</Text>
                </View>
                <View style={styles.challengeDetail}>
                  <Ionicons name="time" size={14} color="white" />
                  <Text style={styles.challengeDetailText}>{challenge.duration}</Text>
                </View>
              </View>
              <Text style={styles.challengePrize}>🏆 {challenge.prize}</Text>
            </View>
            <TouchableOpacity 
              style={styles.joinButton}
              onPress={() => onJoinPress(challenge.id)}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  challengesList: {
    gap: 12,
  },
  challengeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  challengeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  challengeSubject: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  challengeDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  challengeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeDetailText: {
    color: 'white',
    fontSize: 11,
    marginLeft: 4,
  },
  challengePrize: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});