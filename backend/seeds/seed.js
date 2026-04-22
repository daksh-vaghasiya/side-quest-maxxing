/**
 * seeds/seed.js  — Master seed script for Side Quest Maxxing
 * Phase 1: Inserts all demo users from demoUsers.js
 *
 * Run with:
 *   npm run seed
 *   node seeds/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User           = require('../src/models/User');
const Quest          = require('../src/models/Quest');
const Badge          = require('../src/models/Badge');
const Leaderboard    = require('../src/models/Leaderboard');
const CommunityQuest = require('../src/models/CommunityQuest');
const Submission     = require('../src/models/Submission');
const Vote           = require('../src/models/Vote');
const Notification   = require('../src/models/Notification');

const { buildUsers } = require('./demoUsers');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/side-quest-maxxing';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('\n🌱 Connected to MongoDB — Starting Seed...\n');

  // ── Clear all collections ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Quest.deleteMany({}),
    Badge.deleteMany({}),
    Leaderboard.deleteMany({}),
    CommunityQuest.deleteMany({}),
    Submission.deleteMany({}),
    Vote.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('🗑️  Cleared all collections\n');

  // ── 1. Badges ──────────────────────────────────────────────────────────────
  console.log('Creating badges...');
  const badgeDefs = [
    { name: 'First Quest',    slug: 'first-quest',        description: 'Completed your first quest',                icon: '⚡', category: 'milestone', rarity: 'common',    condition: 'first_quest',        xpBonus: 50,   isActive: true },
    { name: 'Streak Starter', slug: 'streak-5',           description: 'Maintained a 5-day quest streak',           icon: '🔥', category: 'streak',    rarity: 'common',    condition: 'streak_5',           xpBonus: 100,  isActive: true },
    { name: 'On Fire',        slug: 'streak-30',          description: 'Maintained a legendary 30-day streak',       icon: '🌋', category: 'streak',    rarity: 'legendary', condition: 'streak_30',          xpBonus: 500,  isActive: true },
    { name: 'Rising',         slug: 'level-intermediate', description: 'Reached Intermediate level',                icon: '⬆️', category: 'level',     rarity: 'common',    condition: 'level_intermediate', xpBonus: 100,  isActive: true },
    { name: 'Pro Quester',    slug: 'level-pro',          description: 'Reached Pro level — elite tier',            icon: '💎', category: 'level',     rarity: 'rare',      condition: 'level_pro',          xpBonus: 250,  isActive: true },
    { name: 'Legend',         slug: 'level-legend',       description: 'Achieved Legend status',                    icon: '👑', category: 'level',     rarity: 'legendary', condition: 'level_legend',       xpBonus: 1000, isActive: true },
    { name: 'Quest Veteran',  slug: 'quests-10',          description: 'Completed 10 approved quests',              icon: '🎖️', category: 'quest',    rarity: 'rare',      condition: 'quests_10',          xpBonus: 200,  isActive: true },
    { name: 'Quest Legend',   slug: 'quests-50',          description: 'Completed 50 approved quests',              icon: '🏔️', category: 'quest',   rarity: 'epic',      condition: 'quests_50',          xpBonus: 750,  isActive: true },
    { name: 'Validator',      slug: 'votes-50',           description: 'Cast 50 community votes',                   icon: '🗳️', category: 'social',  rarity: 'common',    condition: 'votes_50',           xpBonus: 75,   isActive: true },
    { name: 'Top 10',         slug: 'top10-leaderboard',  description: 'Ranked in the global Top 10',               icon: '🏆', category: 'milestone', rarity: 'epic',      condition: 'top10_leaderboard',  xpBonus: 300,  isActive: true },
    { name: 'Quest Creator',  slug: 'quest-creator',      description: 'Had a community quest approved',            icon: '🛠️', category: 'social',  rarity: 'rare',      condition: 'quest_creator',      xpBonus: 150,  isActive: true },
    { name: 'Reputation 500', slug: 'reputation-500',     description: 'Built a stellar reputation of 500+',        icon: '⭐', category: 'milestone', rarity: 'epic',      condition: 'reputation_500',     xpBonus: 200,  isActive: true },
  ];
  const badges = await Badge.insertMany(badgeDefs);
  const badgeMap = {};
  badges.forEach((b) => { badgeMap[b.slug] = b._id; });
  console.log(`✅ ${badges.length} badges created`);

  // ── 2. Users (from demoUsers.js) ──────────────────────────────────────────
  console.log('Creating demo users...');
  const userDocs = buildUsers(badgeMap);
  const users = await User.insertMany(userDocs);
  console.log(`✅ ${users.length} demo users created`);

  // Named references for later phases
  const byUsername = {};
  users.forEach((u) => { byUsername[u.username] = u; });
  const admin      = byUsername['questmaster'];
  const aurorax    = byUsername['aurorax'];
  const neonrider  = byUsername['neonrider'];
  const shadowkat  = byUsername['shadowkat'];
  const cryptomaxer= byUsername['cryptomaxer'];
  const ironmindx  = byUsername['ironmindx'];
  const voltblaze  = byUsername['voltblaze'];
  const solaris    = byUsername['solaris_q'];
  const zenrunner  = byUsername['zenrunner'];
  const buildorbust= byUsername['buildorbust'];
  const naturehex  = byUsername['naturehex'];
  const pixelwolf  = byUsername['pixelwolf'];
  const starterpack= byUsername['starterpack'];
  const questnoob  = byUsername['questnoob99'];
  const dailygrinder=byUsername['dailygrinder'];

  // ── 3. Quests ──────────────────────────────────────────────────────────────
  console.log('Creating quests...');
  const quests = await Quest.insertMany([
    { title: 'Cold Shower Challenge',              category: 'fitness',     difficulty: 'Easy',      xpReward: 80,  isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Video proof required', 'Must show cold water', 'Minimum 60 seconds'],        tags: ['cold', 'discipline'],    description: 'Take a cold shower for 5 days in a row. Film yourself turning the handle to cold and enduring at least 60 seconds. Build mental resilience and boost circulation.',  acceptedCount: 45, completedCount: 28, submissionCount: 30 },
    { title: 'Run 5K Without Stopping',            category: 'fitness',     difficulty: 'Medium',    xpReward: 180, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['GPS tracking screenshot', 'Must be 5.0km+', 'Outdoor route'],               tags: ['running', 'cardio'],     description: 'Complete a 5-kilometer run without stopping. Use any tracking app to prove your time and distance. Must be outdoors.',                                                 acceptedCount: 78, completedCount: 42, submissionCount: 50 },
    { title: '7-Day Meditation Streak',            category: 'mindfulness', difficulty: 'Easy',      xpReward: 120, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['App screenshot each day', 'Minimum 10 min/day'],                            tags: ['meditation', 'streak'],  description: 'Meditate for at least 10 minutes every day for 7 consecutive days using any app or method.',                                                                          acceptedCount: 62, completedCount: 38, submissionCount: 40 },
    { title: 'Build Something in 24 Hours',        category: 'creativity',  difficulty: 'Hard',      xpReward: 350, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['3+ progress photos', 'Final result', 'Public shareable link'],             tags: ['maker', 'create'],       description: 'Build any project in under 24 hours and share it publicly. App, game, website, physical object — anything goes.',                                                     acceptedCount: 25, completedCount: 8,  submissionCount: 10 },
    { title: 'Cook a Dish From Another Culture',   category: 'food',        difficulty: 'Medium',    xpReward: 160, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Ingredients photo', 'Cooking process photo', 'Final dish photo'],          tags: ['cooking', 'culture'],    description: 'Research, buy ingredients, and cook a traditional dish from a country whose cuisine you have never attempted.',                                                        acceptedCount: 90, completedCount: 65, submissionCount: 70 },
    { title: 'Teach Someone a Skill',              category: 'social',      difficulty: 'Easy',      xpReward: 100, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Photo with student', 'Written testimonial'],                                tags: ['teaching', 'social'],    description: 'Identify someone who wants to learn something you are good at. Spend at least 30 minutes teaching them.',                                                             acceptedCount: 55, completedCount: 40, submissionCount: 42 },
    { title: 'Learn 50 Words in a New Language',   category: 'learning',    difficulty: 'Medium',    xpReward: 200, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Video reciting 50 words', 'Show app or system used'],                     tags: ['language', 'learning'],  description: 'Learn 50 vocabulary words in a language you have never studied before.',                                                                                             acceptedCount: 34, completedCount: 18, submissionCount: 20 },
    { title: 'Summit a Local Peak',                category: 'outdoor',     difficulty: 'Hard',      xpReward: 400, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['GPS route screenshot', 'Summit selfie', '500m+ elevation gain'],          tags: ['hiking', 'nature'],      description: 'Hike to the summit of any local mountain or elevated trail with at least 500 metres elevation gain.',                                                                 acceptedCount: 20, completedCount: 6,  submissionCount: 8  },
    { title: 'No Social Media for 72 Hours',       category: 'mindfulness', difficulty: 'Medium',    xpReward: 150, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Before screen-time screenshot', 'After screenshot', 'Written summary'],   tags: ['detox', 'focus'],        description: 'Delete or log out of all social media apps for 72 hours straight. Document what you did instead.',                                                                    acceptedCount: 110, completedCount: 60, submissionCount: 65 },
    { title: 'Save $100 in a Week',                category: 'finance',     difficulty: 'Hard',      xpReward: 300, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Budget screenshot', 'Spending strategy', 'Before/after comparison'],      tags: ['money', 'saving'],       description: 'Cut unnecessary expenses and save $100 in 7 days. Document your strategy.',                                                                                          acceptedCount: 40, completedCount: 20, submissionCount: 22 },
    { title: 'Open Source Contribution',           category: 'tech',        difficulty: 'Legendary', xpReward: 600, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['GitHub PR link', 'Screenshot of contribution', 'Explanation'],            tags: ['github', 'opensource'],  description: 'Make a meaningful contribution to any open source project on GitHub — code, docs, or bug fixes.',                                                                    acceptedCount: 15, completedCount: 4,  submissionCount: 5  },
    { title: '30-Day No Junk Food',                category: 'fitness',     difficulty: 'Legendary', xpReward: 700, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Weekly food journal photos', 'Day-30 summary'],                           tags: ['nutrition', 'diet'],     description: 'Cut all processed junk food and sugary snacks for 30 days straight.',                                                                                                acceptedCount: 30, completedCount: 5,  submissionCount: 6  },
    { title: 'Compliment 10 Strangers In a Day',   category: 'social',      difficulty: 'Easy',      xpReward: 90,  isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Written log of 10 interactions', 'Photo in public setting'],              tags: ['social', 'kindness'],    description: 'Genuinely compliment 10 strangers in a single day — in person only.',                                                                                                acceptedCount: 75, completedCount: 58, submissionCount: 60 },
    { title: 'Write and Publish an Article',       category: 'creativity',  difficulty: 'Medium',    xpReward: 220, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Public link', '500+ words proof', 'Publish screenshot'],                  tags: ['writing', 'creative'],   description: 'Write a 500+ word article about any topic and publish it publicly.',                                                                                                 acceptedCount: 28, completedCount: 14, submissionCount: 15 },
    { title: 'Plant Something — Keep Alive 30 Days', category: 'other',     difficulty: 'Easy',      xpReward: 110, isOfficial: true, status: 'active', createdBy: admin._id, requirements: ['Day 1 planting photo', 'Day 30 growth photo'],                           tags: ['nature', 'patience'],    description: 'Buy or propagate a plant and care for it for 30 days. Show its growth.',                                                                                             acceptedCount: 88, completedCount: 70, submissionCount: 72 },
  ]);
  console.log(`✅ ${quests.length} quests created`);

  // ── 4. Leaderboard ─────────────────────────────────────────────────────────
  console.log('Creating leaderboard entries...');
  const lbEntries = [
    { userId: admin._id,       totalXp: 9200, weeklyXp: 340, monthlyXp: 1300, globalRank: 1,  username: admin.username,       avatar: admin.avatar,       level: admin.level,       reputation: admin.reputation,       badges: admin.badges,       completedQuestCount: 53 },
    { userId: aurorax._id,     totalXp: 6400, weeklyXp: 260, monthlyXp: 950,  globalRank: 2,  username: aurorax.username,     avatar: aurorax.avatar,     level: aurorax.level,     reputation: aurorax.reputation,     badges: aurorax.badges,     completedQuestCount: 42 },
    { userId: ironmindx._id,   totalXp: 3200, weeklyXp: 200, monthlyXp: 700,  globalRank: 3,  username: ironmindx.username,   avatar: ironmindx.avatar,   level: ironmindx.level,   reputation: ironmindx.reputation,   badges: ironmindx.badges,   completedQuestCount: 24 },
    { userId: neonrider._id,   totalXp: 3900, weeklyXp: 190, monthlyXp: 620,  globalRank: 4,  username: neonrider.username,   avatar: neonrider.avatar,   level: neonrider.level,   reputation: neonrider.reputation,   badges: neonrider.badges,   completedQuestCount: 28 },
    { userId: shadowkat._id,   totalXp: 2200, weeklyXp: 110, monthlyXp: 360,  globalRank: 5,  username: shadowkat.username,   avatar: shadowkat.avatar,   level: shadowkat.level,   reputation: shadowkat.reputation,   badges: shadowkat.badges,   completedQuestCount: 17 },
    { userId: buildorbust._id, totalXp: 2050, weeklyXp: 130, monthlyXp: 420,  globalRank: 6,  username: buildorbust.username, avatar: buildorbust.avatar, level: buildorbust.level, reputation: buildorbust.reputation, badges: buildorbust.badges, completedQuestCount: 13 },
    { userId: cryptomaxer._id, totalXp: 1800, weeklyXp: 125, monthlyXp: 420,  globalRank: 7,  username: cryptomaxer.username, avatar: cryptomaxer.avatar, level: cryptomaxer.level, reputation: cryptomaxer.reputation, badges: cryptomaxer.badges, completedQuestCount: 11 },
    { userId: zenrunner._id,   totalXp: 1620, weeklyXp: 100, monthlyXp: 340,  globalRank: 8,  username: zenrunner.username,   avatar: zenrunner.avatar,   level: zenrunner.level,   reputation: zenrunner.reputation,   badges: zenrunner.badges,   completedQuestCount: 11 },
    { userId: solaris._id,     totalXp: 1350, weeklyXp: 90,  monthlyXp: 290,  globalRank: 9,  username: solaris.username,     avatar: solaris.avatar,     level: solaris.level,     reputation: solaris.reputation,     badges: solaris.badges,     completedQuestCount: 9  },
    { userId: naturehex._id,   totalXp: 1100, weeklyXp: 70,  monthlyXp: 240,  globalRank: 10, username: naturehex.username,   avatar: naturehex.avatar,   level: naturehex.level,   reputation: naturehex.reputation,   badges: naturehex.badges,   completedQuestCount: 6  },
    { userId: voltblaze._id,   totalXp: 980,  weeklyXp: 65,  monthlyXp: 210,  globalRank: 11, username: voltblaze.username,   avatar: voltblaze.avatar,   level: voltblaze.level,   reputation: voltblaze.reputation,   badges: voltblaze.badges,   completedQuestCount: 7  },
    { userId: dailygrinder._id,totalXp: 420,  weeklyXp: 40,  monthlyXp: 120,  globalRank: 12, username: dailygrinder.username,avatar: dailygrinder.avatar,level: dailygrinder.level,reputation: dailygrinder.reputation,badges: dailygrinder.badges,completedQuestCount: 3  },
    { userId: pixelwolf._id,   totalXp: 290,  weeklyXp: 20,  monthlyXp: 70,   globalRank: 13, username: pixelwolf.username,   avatar: pixelwolf.avatar,   level: pixelwolf.level,   reputation: pixelwolf.reputation,   badges: pixelwolf.badges,   completedQuestCount: 1  },
    { userId: starterpack._id, totalXp: 180,  weeklyXp: 15,  monthlyXp: 50,   globalRank: 14, username: starterpack.username, avatar: starterpack.avatar, level: starterpack.level, reputation: starterpack.reputation, badges: starterpack.badges, completedQuestCount: 1  },
    { userId: questnoob._id,   totalXp: 120,  weeklyXp: 10,  monthlyXp: 30,   globalRank: 15, username: questnoob.username,   avatar: questnoob.avatar,   level: questnoob.level,   reputation: questnoob.reputation,   badges: questnoob.badges,   completedQuestCount: 1  },
  ];
  await Leaderboard.insertMany(lbEntries);
  console.log(`✅ ${lbEntries.length} leaderboard entries created`);

  // ── 5. Community Quests ─────────────────────────────────────────────────────
  console.log('Creating community quests...');
  await CommunityQuest.insertMany([
    { title: 'Go 24 Hours Without Using Your Phone',  description: 'Completely disconnect from your phone for 24 hours. Document what you replaced phone time with. A true digital detox.',  category: 'mindfulness', difficulty: 'Hard',   suggestedXpReward: 250, submittedBy: neonrider._id,   upvotes: [admin._id, shadowkat._id, aurorax._id, cryptomaxer._id, ironmindx._id], upvoteCount: 5, downvoteCount: 0, status: 'auto_approved', tags: ['phone', 'detox'] },
    { title: 'Volunteer for 4 Hours at Any Charity',  description: 'Find a local charity, food bank, or shelter and volunteer for at least 4 hours. Document with photos and a short summary.', category: 'social',      difficulty: 'Medium', suggestedXpReward: 200, submittedBy: shadowkat._id,  upvotes: [admin._id, voltblaze._id, cryptomaxer._id, zenrunner._id],            upvoteCount: 4, downvoteCount: 0, status: 'pending',       tags: ['volunteer'] },
    { title: '100 Burpees in One Session',            description: 'Complete 100 burpees in a single session with no time limit. Video proof showing the count throughout is required.',         category: 'fitness',     difficulty: 'Hard',   suggestedXpReward: 300, submittedBy: aurorax._id,    upvotes: [admin._id, neonrider._id, shadowkat._id, voltblaze._id, ironmindx._id, cryptomaxer._id], upvoteCount: 6, downvoteCount: 0, status: 'auto_approved', tags: ['burpees'] },
    { title: 'Read a Full Book in One Week',          description: 'Read an entire book (200+ pages) in 7 days. Photo the cover and last page. Write a 3-sentence review.',                     category: 'learning',    difficulty: 'Easy',   suggestedXpReward: 130, submittedBy: cryptomaxer._id,upvotes: [admin._id, shadowkat._id, solaris._id],                             upvoteCount: 3, downvoteCount: 0, status: 'pending',       tags: ['reading'] },
    { title: 'Do 1,000 Push-Ups in One Day',          description: 'Spread 1,000 push-ups across the day however you like. Track each set and post your tally log at the end.',                  category: 'fitness',     difficulty: 'Legendary', suggestedXpReward: 500, submittedBy: ironmindx._id, upvotes: [admin._id, aurorax._id, neonrider._id, voltblaze._id], upvoteCount: 4, downvoteCount: 1, status: 'pending',       tags: ['pushups', 'endurance'] },
  ]);
  console.log(`✅ 5 community quests created`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  PHASE 1 COMPLETE — Demo Users Created & Stored');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Badges:            ${badges.length}`);
  console.log(`   Demo Users:        ${users.length}  (admin + mod + 13 community users)`);
  console.log(`   Quests:            ${quests.length}`);
  console.log(`   Leaderboard:       ${lbEntries.length} entries`);
  console.log(`   Community Quests:  5`);
  console.log('');
  console.log('   📌 Users across 4 tiers:');
  console.log('      Legend:       questmaster, aurorax');
  console.log('      Pro:          neonrider, shadowkat, cryptomaxer, ironmindx');
  console.log('      Intermediate: voltblaze, solaris_q, zenrunner, buildorbust, naturehex');
  console.log('      Beginner:     pixelwolf, starterpack, questnoob99, dailygrinder');
  console.log('');
  console.log('   ⚠️  Phase 2 (demo posts) not yet seeded.');
  console.log('      Run the Phase 2 seed to populate submissions & votes.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
