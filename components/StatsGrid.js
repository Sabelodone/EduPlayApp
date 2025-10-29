import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { DASHBOARD_CONFIG } from './dashboardConfig';

const { width } = Dimensions.get('window');

const IconComponent = ({ iconType, name, size, color }) => {
  switch (iconType) {
    case 'MaterialIcons':
      return <MaterialIcons name={name} size={size} color={color} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={name} size={size} color={color} />;
    default:
      return <Ionicons name={name} size={size} color={color} />;
  }
};

// Map color to gradient and icon
const getStatConfig = (stat) => {
  const colorConfigs = {
    '#4ECDC4': {
      gradient: ['#4ECDC4', '#44A08D'],
      icon: 'trophy',
      iconType: 'Ionicons'
    },
    '#FFD166': {
      gradient: ['#FFD166', '#FFB347'],
      icon: 'star',
      iconType: 'Ionicons'
    },
    '#FF6B6B': {
      gradient: ['#FF6B6B', '#EE5A52'],
      icon: 'flash',
      iconType: 'Ionicons'
    },
    '#6A7FDB': {
      gradient: ['#6A7FDB', '#5A6FC8'],
      icon: 'activity',
      iconType: 'Ionicons'
    }
  };

  // If stat already has gradient, use it directly
  if (stat.gradient) {
    return {
      gradient: stat.gradient,
      icon: stat.icon || 'help-circle',
      iconType: stat.iconType || 'Ionicons',
      suffix: stat.suffix || ''
    };
  }

  // Otherwise, map color to gradient and icon
  const config = colorConfigs[stat.color] || colorConfigs['#4ECDC4'];
  return {
    ...config,
    suffix: stat.suffix || ''
  };
};

export const StatsGrid = ({ stats }) => {
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat) => {
        const config = getStatConfig(stat);
        
        return (
          <View key={stat.id} style={styles.statCard}>
            <LinearGradient
              colors={config.gradient}
              style={styles.statCardGradient}
            >
              <IconComponent 
                iconType={config.iconType} 
                name={config.icon} 
                size={24} 
                color="white" 
              />
              <Text style={styles.statCardNumber}>
                {stat.value}{config.suffix}
              </Text>
              <Text style={styles.statCardLabel}>{stat.title}</Text>
              {stat.change && (
                <Text style={styles.statCardChange}>{stat.change}</Text>
              )}
              {stat.subtitle && (
                <Text style={styles.statCardSubtitle}>{stat.subtitle}</Text>
              )}
            </LinearGradient>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    height: 120,
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  statCardNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
  statCardLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
    textAlign: 'center',
  },
  statCardChange: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 2,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
  statCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 2,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
});