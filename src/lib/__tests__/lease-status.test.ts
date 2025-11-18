import { describe, expect, it } from '@jest/globals';
import { 
  getLeaseStatus, 
  getDaysUntilExpiry, 
  isExpiringSoon,
  getStatusDescription,
  sortLeasesByStatus
} from '../lease-status';

describe('Lease Status Utilities', () => {
  // Helper to get date strings
  const getDateString = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  describe('getLeaseStatus', () => {
    it('should return "pending" for future leases', () => {
      const startDate = getDateString(10); // 10 days from now
      const endDate = getDateString(375); // 375 days from now
      expect(getLeaseStatus(startDate, endDate)).toBe('pending');
    });

    it('should return "active" for current leases', () => {
      const startDate = getDateString(-10); // 10 days ago
      const endDate = getDateString(355); // 355 days from now
      expect(getLeaseStatus(startDate, endDate)).toBe('active');
    });

    it('should return "expired" for past leases', () => {
      const startDate = getDateString(-375); // 375 days ago
      const endDate = getDateString(-10); // 10 days ago
      expect(getLeaseStatus(startDate, endDate)).toBe('expired');
    });

    it('should handle edge case: lease starting today', () => {
      const startDate = getDateString(0); // Today
      const endDate = getDateString(365);
      expect(getLeaseStatus(startDate, endDate)).toBe('active');
    });

    it('should handle edge case: lease ending today', () => {
      const startDate = getDateString(-365);
      const endDate = getDateString(0); // Today
      expect(getLeaseStatus(startDate, endDate)).toBe('active');
    });

    it('should handle edge case: lease ended yesterday', () => {
      const startDate = getDateString(-366);
      const endDate = getDateString(-1); // Yesterday
      expect(getLeaseStatus(startDate, endDate)).toBe('expired');
    });
  });

  describe('getDaysUntilExpiry', () => {
    it('should return positive days for future expiry', () => {
      const endDate = getDateString(30);
      expect(getDaysUntilExpiry(endDate)).toBe(30);
    });

    it('should return 0 for today\'s expiry', () => {
      const endDate = getDateString(0);
      expect(getDaysUntilExpiry(endDate)).toBe(0);
    });

    it('should return negative days for past expiry', () => {
      const endDate = getDateString(-10);
      expect(getDaysUntilExpiry(endDate)).toBe(-10);
    });
  });

  describe('isExpiringSoon', () => {
    it('should return true for leases expiring within default 60 days', () => {
      expect(isExpiringSoon(getDateString(30))).toBe(true);
      expect(isExpiringSoon(getDateString(60))).toBe(true);
    });

    it('should return false for leases expiring after 60 days', () => {
      expect(isExpiringSoon(getDateString(61))).toBe(false);
      expect(isExpiringSoon(getDateString(365))).toBe(false);
    });

    it('should return false for already expired leases', () => {
      expect(isExpiringSoon(getDateString(-1))).toBe(false);
    });

    it('should respect custom threshold', () => {
      expect(isExpiringSoon(getDateString(89), 90)).toBe(true);
      expect(isExpiringSoon(getDateString(91), 90)).toBe(false);
    });
  });

  describe('getStatusDescription', () => {
    it('should provide appropriate descriptions for active leases', () => {
      expect(getStatusDescription('active', 0)).toBe('Expires today');
      expect(getStatusDescription('active', 1)).toBe('Expires tomorrow');
      expect(getStatusDescription('active', 5)).toBe('Expires in 5 days');
      expect(getStatusDescription('active', 14)).toBe('Expires in 2 weeks');
      expect(getStatusDescription('active', 45)).toBe('Expires soon');
      expect(getStatusDescription('active', 365)).toBe('Active lease');
      expect(getStatusDescription('active')).toBe('Active lease');
    });

    it('should provide descriptions for pending and expired', () => {
      expect(getStatusDescription('pending')).toBe('Lease not yet started');
      expect(getStatusDescription('expired')).toBe('Lease has expired');
    });
  });

  describe('sortLeasesByStatus', () => {
    const leases = [
      { id: '1', startDate: getDateString(-400), endDate: getDateString(-35) }, // expired
      { id: '2', startDate: getDateString(-30), endDate: getDateString(30) },   // active, expires soon
      { id: '3', startDate: getDateString(10), endDate: getDateString(375) },   // pending
      { id: '4', startDate: getDateString(-100), endDate: getDateString(265) }, // active
      { id: '5', startDate: getDateString(-365), endDate: getDateString(-1) },  // expired recently
    ];

    it('should sort leases by status priority', () => {
      const sorted = sortLeasesByStatus(leases);
      
      // Check the order: active first, then pending, then expired
      expect(sorted[0].id).toBe('2'); // Active, expires soonest
      expect(sorted[1].id).toBe('4'); // Active
      expect(sorted[2].id).toBe('3'); // Pending
      expect(sorted[3].id).toBe('5'); // Expired recently
      expect(sorted[4].id).toBe('1'); // Expired longer ago
    });
  });
});