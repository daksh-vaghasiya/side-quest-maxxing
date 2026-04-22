/**
 * seeds/demoUsers.js
 * ---------------------------------------------------------------------------
 * 15 realistic demo users for the Side Quest Maxxing platform.
 * Each user has:
 *   – Unique clerkId (prefixed with "demo_") for easy filter/identification
 *   – Realistic username, email, bio
 *   – XP / level / reputation matching their archetype
 *   – Streak history and role
 *
 * Usage:
 *   const { DEMO_USERS, buildUsers } = require('./demoUsers');
 *   const users = await buildUsers(badgeMap);
 * ---------------------------------------------------------------------------
 */

const AV = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

/**
 * Raw user definitions.
 * `badgeSlugs` is resolved to ObjectIds at seed-time by `buildUsers()`.
 */
const DEMO_USERS = [
  /* 0 ── Legend-tier Admin ──────────────────────────────────────────────── */
  {
    clerkId: 'demo_admin_001',
    username: 'questmaster',
    email: 'questmaster@sidequest.dev',
    avatar: AV('questmaster'),
    bio: 'I run this realm. Complete your quests or face the consequences. Legend-tier since day one.',
    xp: 9200, level: 'Legend', reputation: 980,
    currentStreak: 52, longestStreak: 65,
    role: 'admin',
    totalSubmissions: 55, approvedSubmissions: 53, rejectedSubmissions: 2, totalVotesCast: 220,
    badgeSlugs: ['level-legend', 'top10-leaderboard', 'quests-50', 'votes-50', 'reputation-500'],
  },

  /* 1 ── Moderator ─────────────────────────────────────────────────────── */
  {
    clerkId: 'demo_mod_001',
    username: 'aurorax',
    email: 'aurorax@example.com',
    avatar: AV('aurorax'),
    bio: 'Outdoor quest specialist. I conquer mountains on weekdays and code on weekends.',
    xp: 6400, level: 'Legend', reputation: 810,
    currentStreak: 28, longestStreak: 44,
    role: 'moderator',
    totalSubmissions: 44, approvedSubmissions: 42, rejectedSubmissions: 2, totalVotesCast: 160,
    badgeSlugs: ['level-legend', 'quests-10', 'top10-leaderboard', 'streak-5'],
  },

  /* 2-5 ── Pro-tier Users ──────────────────────────────────────────────── */
  {
    clerkId: 'demo_user_001',
    username: 'neonrider',
    email: 'neonrider@example.com',
    avatar: AV('neonrider'),
    bio: 'Pro tier quester. Fitness + tech challenges only. Current goal: Legend by year end.',
    xp: 3900, level: 'Pro', reputation: 670,
    currentStreak: 14, longestStreak: 31,
    role: 'user',
    totalSubmissions: 31, approvedSubmissions: 28, rejectedSubmissions: 3, totalVotesCast: 90,
    badgeSlugs: ['level-pro', 'quests-10', 'votes-50', 'streak-5'],
  },
  {
    clerkId: 'demo_user_002',
    username: 'shadowkat',
    email: 'shadowkat@example.com',
    avatar: AV('shadowkat'),
    bio: 'Mindfulness meets mayhem. I challenge everything. Meditation streak at 21 days.',
    xp: 2200, level: 'Pro', reputation: 440,
    currentStreak: 8, longestStreak: 16,
    role: 'user',
    totalSubmissions: 20, approvedSubmissions: 17, rejectedSubmissions: 3, totalVotesCast: 65,
    badgeSlugs: ['level-pro', 'first-quest', 'streak-5'],
  },
  {
    clerkId: 'demo_user_003',
    username: 'cryptomaxer',
    email: 'cryptomaxer@example.com',
    avatar: AV('cryptomaxer'),
    bio: 'Finance & tech quest specialist. Building habits that compound like interest.',
    xp: 1800, level: 'Intermediate', reputation: 340,
    currentStreak: 6, longestStreak: 13,
    role: 'user',
    totalSubmissions: 14, approvedSubmissions: 11, rejectedSubmissions: 3, totalVotesCast: 50,
    badgeSlugs: ['level-intermediate', 'first-quest', 'votes-50'],
  },
  {
    clerkId: 'demo_user_004',
    username: 'ironmindx',
    email: 'ironmindx@example.com',
    avatar: AV('ironmindx'),
    bio: 'Mental toughness is my superpower. Cold showers, hard runs, no excuses.',
    xp: 3200, level: 'Pro', reputation: 560,
    currentStreak: 19, longestStreak: 25,
    role: 'user',
    totalSubmissions: 26, approvedSubmissions: 24, rejectedSubmissions: 2, totalVotesCast: 110,
    badgeSlugs: ['level-pro', 'quests-10', 'streak-5', 'reputation-500'],
  },

  /* 6-10 ── Intermediate-tier Users ───────────────────────────────────── */
  {
    clerkId: 'demo_user_005',
    username: 'voltblaze',
    email: 'voltblaze@example.com',
    avatar: AV('voltblaze'),
    bio: 'Just here to level up IRL. Started as a beginner — now at Intermediate.',
    xp: 980, level: 'Intermediate', reputation: 230,
    currentStreak: 4, longestStreak: 9,
    role: 'user',
    totalSubmissions: 9, approvedSubmissions: 7, rejectedSubmissions: 2, totalVotesCast: 35,
    badgeSlugs: ['level-intermediate', 'first-quest'],
  },
  {
    clerkId: 'demo_user_006',
    username: 'solaris_q',
    email: 'solaris@example.com',
    avatar: AV('solaris'),
    bio: 'Learning quests are my jam. Currently on a language-learning spree.',
    xp: 1350, level: 'Intermediate', reputation: 280,
    currentStreak: 5, longestStreak: 10,
    role: 'user',
    totalSubmissions: 11, approvedSubmissions: 9, rejectedSubmissions: 2, totalVotesCast: 42,
    badgeSlugs: ['level-intermediate', 'first-quest', 'streak-5'],
  },
  {
    clerkId: 'demo_user_007',
    username: 'zenrunner',
    email: 'zenrunner@example.com',
    avatar: AV('zenrunner'),
    bio: 'Run, meditate, repeat. Chasing equanimity one quest at a time.',
    xp: 1620, level: 'Intermediate', reputation: 300,
    currentStreak: 7, longestStreak: 18,
    role: 'user',
    totalSubmissions: 13, approvedSubmissions: 11, rejectedSubmissions: 2, totalVotesCast: 55,
    badgeSlugs: ['level-intermediate', 'streak-5', 'first-quest'],
  },
  {
    clerkId: 'demo_user_008',
    username: 'buildorbust',
    email: 'buildorbust@example.com',
    avatar: AV('buildorbust'),
    bio: 'Maker, builder, hacker. If it can be built in 24 hours, it should be.',
    xp: 2050, level: 'Intermediate', reputation: 390,
    currentStreak: 9, longestStreak: 15,
    role: 'user',
    totalSubmissions: 16, approvedSubmissions: 13, rejectedSubmissions: 3, totalVotesCast: 70,
    badgeSlugs: ['level-intermediate', 'quests-10', 'first-quest'],
  },
  {
    clerkId: 'demo_user_009',
    username: 'naturehex',
    email: 'naturehex@example.com',
    avatar: AV('naturehex'),
    bio: 'Outdoor and social challenges. If it involves fresh air or people, I am in.',
    xp: 1100, level: 'Intermediate', reputation: 240,
    currentStreak: 3, longestStreak: 11,
    role: 'user',
    totalSubmissions: 8, approvedSubmissions: 6, rejectedSubmissions: 2, totalVotesCast: 28,
    badgeSlugs: ['first-quest', 'level-intermediate'],
  },

  /* 11-14 ── Beginner-tier Users ──────────────────────────────────────── */
  {
    clerkId: 'demo_user_010',
    username: 'pixelwolf',
    email: 'pixelwolf@example.com',
    avatar: AV('pixelwolf'),
    bio: 'New to questing. Every day is a side quest opportunity. Just getting started.',
    xp: 290, level: 'Beginner', reputation: 105,
    currentStreak: 2, longestStreak: 2,
    role: 'user',
    totalSubmissions: 3, approvedSubmissions: 1, rejectedSubmissions: 1, totalVotesCast: 10,
    badgeSlugs: ['first-quest'],
  },
  {
    clerkId: 'demo_user_011',
    username: 'starterpack',
    email: 'starterpack@example.com',
    avatar: AV('starterpack'),
    bio: 'Day 3 of my questing journey. Feeling motivated! Let us see how long I last.',
    xp: 180, level: 'Beginner', reputation: 90,
    currentStreak: 3, longestStreak: 3,
    role: 'user',
    totalSubmissions: 2, approvedSubmissions: 1, rejectedSubmissions: 0, totalVotesCast: 5,
    badgeSlugs: ['first-quest'],
  },
  {
    clerkId: 'demo_user_012',
    username: 'questnoob99',
    email: 'questnoob99@example.com',
    avatar: AV('questnoob'),
    bio: 'Discovered this platform last week. Already on my second quest!',
    xp: 120, level: 'Beginner', reputation: 60,
    currentStreak: 1, longestStreak: 1,
    role: 'user',
    totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0, totalVotesCast: 3,
    badgeSlugs: [],
  },
  {
    clerkId: 'demo_user_013',
    username: 'dailygrinder',
    email: 'dailygrinder@example.com',
    avatar: AV('dailygrinder'),
    bio: 'Morning person, quest person. Building better habits one challenge at a time.',
    xp: 420, level: 'Beginner', reputation: 130,
    currentStreak: 5, longestStreak: 5,
    role: 'user',
    totalSubmissions: 4, approvedSubmissions: 3, rejectedSubmissions: 1, totalVotesCast: 15,
    badgeSlugs: ['first-quest', 'streak-5'],
  },
];

/**
 * Resolves badge slugs to Mongoose ObjectIds using a pre-built badge map.
 * @param {Object} badgeMap  – { slug: Badge._id }
 * @returns {Object[]}        Array of user objects ready for User.insertMany()
 */
function buildUsers(badgeMap) {
  return DEMO_USERS.map(({ badgeSlugs, ...u }) => ({
    ...u,
    badges: (badgeSlugs || [])
      .filter((s) => badgeMap[s])
      .map((s) => badgeMap[s]),
    completedQuests: [],
    acceptedQuests: [],
  }));
}

module.exports = { DEMO_USERS, buildUsers };
