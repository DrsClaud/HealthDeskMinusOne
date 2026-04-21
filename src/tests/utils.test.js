import {
  calculateCost,
  formatCost,
  calculateAggregatedCost,
} from '../utils/costCalculator';
import {
  getPostAuctionDisplayDuration,
  getNextAuctionEndDate,
  isAuctionEnded,
} from '../utils/dateUtils';
import { isLikelyWorkEmail } from '../utils/emailUtils';
import {
  calculateWaitingScore,
  calculateHlthdskScore,
  getAdminTime,
  getUserTime,
  getActiveWaitTime,
} from '../utils/locationProcessing';
import {
  getUserTimezone,
  getTimezoneDisplayName,
  isValidTimezone,
  getCachedUserTimezone,
  getUserTimezoneWithFallback,
} from '../utils/timezoneUtils';

describe('costCalculator', () => {
  it('calculateCost returns cost for known model', () => {
    expect(calculateCost('gpt-4o-mini', 1000000, 500000)).toBeGreaterThan(0);
  });
  it('formatCost formats as currency', () => {
    expect(formatCost(1.5)).toMatch(/\$1\.50/);
  });
  it('calculateAggregatedCost returns totalCost and structure', () => {
    const result = calculateAggregatedCost({
      sources: {},
      total_tokens: 0,
      calls_count: 0,
    });
    expect(result).toHaveProperty('totalCost', 0);
    expect(result).toHaveProperty('sources');
  });
});

describe('dateUtils', () => {
  it('getPostAuctionDisplayDuration returns number of minutes', () => {
    expect([5, 15]).toContain(getPostAuctionDisplayDuration());
  });
  it('getNextAuctionEndDate returns a Date', () => {
    expect(getNextAuctionEndDate()).toBeInstanceOf(Date);
  });
  it('isAuctionEnded returns true when status is ended', () => {
    expect(isAuctionEnded({ status: 'ended' })).toBe(true);
  });
});

describe('emailUtils', () => {
  it('isLikelyWorkEmail returns false for gmail', () => {
    expect(isLikelyWorkEmail('u@gmail.com')).toBe(false);
  });
  it('isLikelyWorkEmail returns true for unknown domain', () => {
    expect(isLikelyWorkEmail('u@company.org')).toBe(true);
  });
  it('isLikelyWorkEmail returns false for empty', () => {
    expect(isLikelyWorkEmail('')).toBe(false);
  });
});

describe('locationProcessing', () => {
  it('calculateWaitingScore maps score to minutes', () => {
    expect(calculateWaitingScore(1)).toBe(30);
    expect(calculateWaitingScore(5)).toBe(150);
  });
  it('calculateHlthdskScore returns components and total', () => {
    const result = calculateHlthdskScore({ rating: 4, queueEnabled: true });
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('rating_component');
  });
  it('getAdminTime returns latest waitTime or undefined', () => {
    expect(getAdminTime([])).toBeUndefined();
    const times = [{ date: Date.now(), waitTime: 45 }];
    expect(getAdminTime(times)).toBe(45);
  });
  it('getUserTime returns average', () => {
    expect(getUserTime([{ waitTime: 30 }, { waitTime: 60 }])).toBe(45);
  });
  it('getActiveWaitTime returns null when no waitTimes', () => {
    expect(getActiveWaitTime({})).toBeNull();
  });
});

describe('timezoneUtils', () => {
  it('getUserTimezone returns string', () => {
    expect(typeof getUserTimezone()).toBe('string');
    expect(getUserTimezone().length).toBeGreaterThan(0);
  });
  it('getTimezoneDisplayName returns string for valid zone', () => {
    expect(getTimezoneDisplayName('America/New_York')).toBeTruthy();
  });
  it('isValidTimezone validates zone', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Invalid/Zone')).toBe(false);
  });
  it('getCachedUserTimezone returns null when empty', () => {
    localStorage.removeItem('userTimezone');
    expect(getCachedUserTimezone()).toBeNull();
  });
  it('getUserTimezoneWithFallback returns valid timezone', () => {
    expect(getUserTimezoneWithFallback()).toBeTruthy();
  });
});
