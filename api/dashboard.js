// api/dashboard.js
import { apiClient } from './client';

export const dashboardApi = {
  async getOverview() {
    return apiClient.get('/dashboard/overview');
  },

  async getStats() {
    return apiClient.get('/dashboard/stats');
  },

  async getRecentActivity(limit = 10) {
    return apiClient.get(`/dashboard/recent-activity?limit=${limit}`);
  },

  async getUpcomingChallenges() {
    return apiClient.get('/dashboard/upcoming-challenges');
  },

  async getAchievements() {
    return apiClient.get('/dashboard/achievements');
  },

  async completeActivity(activityData) {
    return apiClient.post('/dashboard/complete-activity', activityData);
  }
};

export default dashboardApi;