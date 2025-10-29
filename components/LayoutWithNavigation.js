// components/LayoutWithNavigation.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const LayoutWithNavigation = ({ children, activeTab, navigation, showBackButton = false, backButtonText = "Back" }) => {
  const handleTabPress = (tabName, screenName) => {
    if (screenName && screenName !== activeTab) {
      navigation.navigate(screenName);
    }
  };

  const NavigationBar = () => (
    <View style={styles.navigationBar}>
      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
        onPress={() => handleTabPress('home', 'HomeScreen')}
      >
        <Ionicons 
          name="home" 
          size={24} 
          color={activeTab === 'home' ? '#6a11cb' : '#666'} 
        />
        <Text style={[styles.navText, activeTab === 'home' && styles.activeNavText]}>
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'dashboard' && styles.activeNavItem]}
        onPress={() => handleTabPress('dashboard', 'StudentDashboardScreen')}
      >
        <Ionicons 
          name="grid" 
          size={24} 
          color={activeTab === 'dashboard' ? '#6a11cb' : '#666'} 
        />
        <Text style={[styles.navText, activeTab === 'dashboard' && styles.activeNavText]}>
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'lessons' && styles.activeNavItem]}
        onPress={() => handleTabPress('lessons', 'LessonsScreen')}
      >
        <Ionicons 
          name="book" 
          size={24} 
          color={activeTab === 'lessons' ? '#6a11cb' : '#666'} 
        />
        <Text style={[styles.navText, activeTab === 'lessons' && styles.activeNavText]}>
          Lessons
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'games' && styles.activeNavItem]}
        onPress={() => handleTabPress('games', 'GamesScreen')}
      >
        <Ionicons 
          name="game-controller" 
          size={24} 
          color={activeTab === 'games' ? '#6a11cb' : '#666'} 
        />
        <Text style={[styles.navText, activeTab === 'games' && styles.activeNavText]}>
          Games
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
        onPress={() => handleTabPress('profile', 'ProfileScreen')}
      >
        <Ionicons 
          name="person" 
          size={24} 
          color={activeTab === 'profile' ? '#6a11cb' : '#666'} 
        />
        <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {showBackButton && (
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#6a11cb" />
          <Text style={styles.backButtonText}>{backButtonText}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        {children}
      </View>
      <NavigationBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6a11cb',
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  navigationBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeNavItem: {
    backgroundColor: 'rgba(106, 17, 203, 0.1)',
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    color: '#666',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#6a11cb',
    fontWeight: '600',
  },
});