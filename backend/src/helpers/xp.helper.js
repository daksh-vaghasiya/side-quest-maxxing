// ── XP Thresholds ─────────────────────────────────────────────────────────────
const XP_LEVELS = [
  { level: 'Beginner',     minXp: 0,    maxXp: 499,  voteWeight: 1.0 },
  { level: 'Intermediate', minXp: 500,  maxXp: 1999, voteWeight: 1.5 },
  { level: 'Pro',          minXp: 2000, maxXp: 4999, voteWeight: 2.0 },
  { level: 'Legend',       minXp: 5000, maxXp: Infinity, voteWeight: 3.0 },
];

// ── XP Awards ─────────────────────────────────────────────────────────────────
const XP_REWARDS = {
  QUEST_APPROVED:    null,    // Uses quest.xpReward value
  QUEST_REJECTED:    -20,
  COMMENT_POSTED:    1,
  LIKE_RECEIVED:     2,
  STREAK_BONUS:      10,      // Per day of streak
  VOTE_CAST:         1,       // Small reward for participating in validation
  BADGE_BONUS:       null,    // Uses badge.xpBonus
};

/**
 * Calculate the level name for a given XP value
 * @param {number} xp
 * @returns {string} level name
 */
const calculateLevel = (xp) => {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level;
  }
  return 'Beginner';
};

/**
 * Calculate vote weight for a user based on their XP
 * @param {number} xp
 * @returns {number} vote weight (1.0 – 3.0)
 */
const calculateVoteWeight = (xp) => {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].voteWeight;
  }
  return 1.0;
};

/**
 * Get XP progress toward the next level
 * @param {number} xp
 * @returns {{ current: number, max: number, pct: number, nextLevel: string|null }}
 */
const getXpProgress = (xp) => {
  for (let i = 0; i < XP_LEVELS.length; i++) {
    const tier = XP_LEVELS[i];
    if (xp >= tier.minXp && xp <= tier.maxXp) {
      const range = tier.maxXp === Infinity ? 5000 : tier.maxXp - tier.minXp + 1;
      const current = xp - tier.minXp;
      const nextLevel = XP_LEVELS[i + 1] ? XP_LEVELS[i + 1].level : null;
      return {
        currentLevelXp: current,
        levelRangeXp: range,
        pct: Math.min(100, Math.round((current / range) * 100)),
        nextLevel,
        xpToNextLevel: nextLevel ? tier.maxXp + 1 - xp : 0,
      };
    }
  }
  return { currentLevelXp: xp, levelRangeXp: 5000, pct: 100, nextLevel: null, xpToNextLevel: 0 };
};

/**
 * Check if user leveled up between two XP values
 */
const didLevelUp = (oldXp, newXp) => {
  return calculateLevel(oldXp) !== calculateLevel(newXp);
};

module.exports = { XP_LEVELS, XP_REWARDS, calculateLevel, calculateVoteWeight, getXpProgress, didLevelUp };
