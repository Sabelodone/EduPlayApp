import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { DASHBOARD_CONFIG } from './dashboardConfig';

export const HeaderSection = ({ userData, onNotificationPress, onProfilePress }) => {
  // SAFEGUARD: Always ensure userData is an object
  const safeUserData = userData || {};
  
  // SAFEGUARD: Handle avatar initials safely
  const getAvatarInitials = () => {
    if (safeUserData.avatarInitials) {
      return safeUserData.avatarInitials;
    }
    if (safeUserData.name) {
      return safeUserData.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (safeUserData.first_name) {
      return safeUserData.first_name.charAt(0).toUpperCase();
    }
    if (safeUserData.fullName) {
      return safeUserData.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'S'; // Default initial
  };

  // SAFEGUARD: Handle user name safely
  const getUserName = () => {
    return safeUserData.name || 
           safeUserData.fullName || 
           safeUserData.first_name || 
           'Student';
  };

  // SAFEGUARD: Handle grade safely
  const getUserGrade = () => {
    return safeUserData.grade || 
           safeUserData.gradeLevel || 
           'Grade 10';
  };

  // SAFEGUARD: Handle points safely
  const getUserPoints = () => {
    return safeUserData.points !== undefined ? safeUserData.points : 0;
  };

  // SAFEGUARD: Handle streak safely
  const getUserStreak = () => {
    return safeUserData.streak !== undefined ? safeUserData.streak : 0;
  };

  // SAFEGUARD: Handle level safely
  const getUserLevel = () => {
    return safeUserData.level || 'Beginner';
  };

  const avatarInitials = getAvatarInitials();
  const userName = getUserName();
  const userGrade = getUserGrade();
  const userPoints = getUserPoints();
  const userStreak = getUserStreak();
  const userLevel = getUserLevel();

  return (
    <LinearGradient
      colors={[DASHBOARD_CONFIG.primaryColor, DASHBOARD_CONFIG.secondaryColor]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.userInfo} onPress={onProfilePress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {avatarInitials}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userGrade}>{userGrade}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.notificationIcon} onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={24} color="white" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>
      
      {/* Points and Streak */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialIcons name="emoji-events" size={20} color="#FFD700" />
          <Text style={styles.statText}>{userPoints} pts</Text>
        </View>
        <View style={styles.statItem}>
          <FontAwesome5 name="fire" size={20} color="#FF6B6B" />
          <Text style={styles.statText}>{userStreak} days</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="school" size={20} color="#4ECDC4" />
          <Text style={styles.statText}>{userLevel}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flexDirection: 'column',
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
  userGrade: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
  notificationIcon: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
});