import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { DASHBOARD_CONFIG } from './dashboardConfig';

const { width } = Dimensions.get('window');

const IconComponent = ({ iconType, name, size, color }) => {
  switch (iconType) {
    case 'Ionicons':
      return <Ionicons name={name} size={size} color={color} />;
    case 'MaterialIcons':
      return <MaterialIcons name={name} size={size} color={color} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={name} size={size} color={color} />;
    default:
      return <Ionicons name={name} size={size} color={color} />;
  }
};

export const QuickActions = ({ actions, onActionPress }) => {
  return (
    <View style={styles.actionsGrid}>
      {actions.map((action) => (
        <TouchableOpacity 
          key={action.id}
          style={styles.actionButton}
          onPress={() => onActionPress(action)}
        >
          <LinearGradient
            colors={action.gradient}
            style={styles.actionButtonGradient}
          >
            <IconComponent 
              iconType={action.iconType} 
              name={action.icon} 
              size={28} 
              color="white" 
            />
            <Text style={styles.actionButtonText}>{action.title}</Text>
            {action.description && (
              <Text style={styles.actionButtonDescription}>{action.description}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 2,
    height: 90,
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
  actionButtonDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: DASHBOARD_CONFIG.fontFamily,
  },
});