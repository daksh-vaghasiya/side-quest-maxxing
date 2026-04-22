/**
 * seedDemoData.js — ONE-SHOT demo data seeder
 * Run:  node seedDemoData.js
 *
 * Clears ALL collections, then inserts:
 *   - 12 badges
 *   - 15 demo users
 *   - 15 quests
 *   - 40 submissions (25 approved + 15 pending)
 *   - ~180 votes
 *   - 15 leaderboard entries
 *   - 5 community quests
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const User           = require('./src/models/User');
const Quest          = require('./src/models/Quest');
const Badge          = require('./src/models/Badge');
const Submission     = require('./src/models/Submission');
const Vote           = require('./src/models/Vote');
const Leaderboard    = require('./src/models/Leaderboard');
const CommunityQuest = require('./src/models/CommunityQuest');
const Notification   = require('./src/models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/side-quest-maxxing';
const AV = (s) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

// ── Demo image URLs (Unsplash, free, no auth) ────────────────────────────────
const IMG = [
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
  'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&q=80',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
  'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=600&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&q=80',
  'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=600&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('🌱 Connected to MongoDB\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK FOR EXISTING CONTENT TO PREVENT OVERWRITES
  // ═══════════════════════════════════════════════════════════════════════════
  const realUserCount = await User.countDocuments({ isDemo: { $ne: true } });
  if (realUserCount > 0 && !process.argv.includes('--force')) {
    console.log(`⚠️  Found ${realUserCount} real user(s) in the database.`);
    console.log('⚠️  Aborting seed script to protect real user data.');
    console.log('   (Use `node seedDemoData.js --force` to override and clear ALL data)');
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR ONLY DEMO DATA (or all if force)
  // ═══════════════════════════════════════════════════════════════════════════
  if (process.argv.includes('--force')) {
    await Promise.all([
      User.deleteMany({}), Quest.deleteMany({}), Badge.deleteMany({}),
      Submission.deleteMany({}), Vote.deleteMany({}), Leaderboard.deleteMany({}),
      CommunityQuest.deleteMany({}), Notification.deleteMany({})
    ]);
    console.log('🗑️  Cleared ALL collections (--force)');
  } else {
    // We update native collections directly so we can store 'isDemo' even if not in Schema
    await Promise.all([
      mongoose.connection.collection('users').deleteMany({ isDemo: true }),
      mongoose.connection.collection('quests').deleteMany({ isDemo: true }),
      mongoose.connection.collection('badges').deleteMany({ isDemo: true }),
      mongoose.connection.collection('submissions').deleteMany({ isDemo: true }),
      mongoose.connection.collection('votes').deleteMany({ isDemo: true }),
      mongoose.connection.collection('leaderboards').deleteMany({ isDemo: true }),
      mongoose.connection.collection('communityquests').deleteMany({ isDemo: true }),
      mongoose.connection.collection('notifications').deleteMany({ isDemo: true })
    ]);
    console.log('🗑️  Cleared only previous demo data');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — BADGES
  // ═══════════════════════════════════════════════════════════════════════════
  const badges = await Badge.insertMany([
    { name: 'First Quest',    slug: 'first-quest',        description: 'Completed your first quest',          icon: '⚡', category: 'milestone', rarity: 'common',    condition: 'first_quest',        xpBonus: 50,   isActive: true },
    { name: 'Streak Starter', slug: 'streak-5',           description: 'Maintained a 5-day quest streak',     icon: '🔥', category: 'streak',    rarity: 'common',    condition: 'streak_5',           xpBonus: 100,  isActive: true },
    { name: 'On Fire',        slug: 'streak-30',          description: '30-day streak achieved',               icon: '🌋', category: 'streak',    rarity: 'legendary', condition: 'streak_30',          xpBonus: 500,  isActive: true },
    { name: 'Rising',         slug: 'level-intermediate', description: 'Reached Intermediate level',          icon: '⬆️', category: 'level',     rarity: 'common',    condition: 'level_intermediate', xpBonus: 100,  isActive: true },
    { name: 'Pro Quester',    slug: 'level-pro',          description: 'Reached Pro level',                   icon: '💎', category: 'level',     rarity: 'rare',      condition: 'level_pro',          xpBonus: 250,  isActive: true },
    { name: 'Legend',         slug: 'level-legend',       description: 'Achieved Legend status',               icon: '👑', category: 'level',     rarity: 'legendary', condition: 'level_legend',       xpBonus: 1000, isActive: true },
    { name: 'Quest Veteran',  slug: 'quests-10',          description: 'Completed 10 approved quests',        icon: '🎖️', category: 'quest',    rarity: 'rare',      condition: 'quests_10',          xpBonus: 200,  isActive: true },
    { name: 'Quest Legend',   slug: 'quests-50',          description: 'Completed 50 approved quests',        icon: '🏔️', category: 'quest',   rarity: 'epic',      condition: 'quests_50',          xpBonus: 750,  isActive: true },
    { name: 'Validator',      slug: 'votes-50',           description: 'Cast 50 community votes',             icon: '🗳️', category: 'social',  rarity: 'common',    condition: 'votes_50',           xpBonus: 75,   isActive: true },
    { name: 'Top 10',         slug: 'top10-leaderboard',  description: 'Ranked in the global Top 10',         icon: '🏆', category: 'milestone', rarity: 'epic',      condition: 'top10_leaderboard',  xpBonus: 300,  isActive: true },
    { name: 'Quest Creator',  slug: 'quest-creator',      description: 'Had a community quest approved',      icon: '🛠️', category: 'social',  rarity: 'rare',      condition: 'quest_creator',      xpBonus: 150,  isActive: true },
    { name: 'Reputation 500', slug: 'reputation-500',     description: 'Reputation of 500+',                  icon: '⭐', category: 'milestone', rarity: 'epic',      condition: 'reputation_500',     xpBonus: 200,  isActive: true, isDemo: true },
  ].map(b => ({ ...b, isDemo: true })));
  const bMap = {};
  badges.forEach(b => { bMap[b.slug] = b._id; });
  console.log(`✅ ${badges.length} badges`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — 15 DEMO USERS
  // ═══════════════════════════════════════════════════════════════════════════
  const users = await User.insertMany([
    { clerkId:'demo_001', username:'questmaster',  email:'questmaster@sq.dev',  avatar:AV('questmaster'),  bio:'I run this realm.',                         xp:9200, level:'Legend',       reputation:980, badges:[bMap['level-legend'],bMap['top10-leaderboard'],bMap['quests-50']], currentStreak:52, longestStreak:65, role:'admin',     totalSubmissions:55, approvedSubmissions:53, rejectedSubmissions:2, totalVotesCast:220 },
    { clerkId:'demo_002', username:'aurorax',      email:'aurorax@sq.dev',      avatar:AV('aurorax'),      bio:'Outdoor quest specialist.',                  xp:6400, level:'Legend',       reputation:810, badges:[bMap['level-legend'],bMap['quests-10']],                          currentStreak:28, longestStreak:44, role:'moderator', totalSubmissions:44, approvedSubmissions:42, rejectedSubmissions:2, totalVotesCast:160 },
    { clerkId:'demo_003', username:'neonrider',    email:'neonrider@sq.dev',    avatar:AV('neonrider'),    bio:'Pro tier. Fitness + tech only.',              xp:3900, level:'Pro',          reputation:670, badges:[bMap['level-pro'],bMap['quests-10'],bMap['votes-50']],             currentStreak:14, longestStreak:31, role:'user',      totalSubmissions:31, approvedSubmissions:28, rejectedSubmissions:3, totalVotesCast:90  },
    { clerkId:'demo_004', username:'shadowkat',    email:'shadowkat@sq.dev',    avatar:AV('shadowkat'),    bio:'Mindfulness meets mayhem.',                  xp:2200, level:'Pro',          reputation:440, badges:[bMap['level-pro'],bMap['first-quest']],                           currentStreak:8,  longestStreak:16, role:'user',      totalSubmissions:20, approvedSubmissions:17, rejectedSubmissions:3, totalVotesCast:65  },
    { clerkId:'demo_005', username:'ironmindx',    email:'ironmindx@sq.dev',    avatar:AV('ironmindx'),    bio:'Mental toughness is my superpower.',         xp:3200, level:'Pro',          reputation:560, badges:[bMap['level-pro'],bMap['quests-10'],bMap['reputation-500']],       currentStreak:19, longestStreak:25, role:'user',      totalSubmissions:26, approvedSubmissions:24, rejectedSubmissions:2, totalVotesCast:110 },
    { clerkId:'demo_006', username:'cryptomaxer',  email:'cryptomaxer@sq.dev',  avatar:AV('cryptomaxer'),  bio:'Finance & tech quest specialist.',           xp:1800, level:'Intermediate', reputation:340, badges:[bMap['level-intermediate'],bMap['first-quest']],                  currentStreak:6,  longestStreak:13, role:'user',      totalSubmissions:14, approvedSubmissions:11, rejectedSubmissions:3, totalVotesCast:50  },
    { clerkId:'demo_007', username:'voltblaze',    email:'voltblaze@sq.dev',    avatar:AV('voltblaze'),    bio:'Levelling up IRL every single day.',         xp:980,  level:'Intermediate', reputation:230, badges:[bMap['level-intermediate'],bMap['first-quest']],                  currentStreak:4,  longestStreak:9,  role:'user',      totalSubmissions:9,  approvedSubmissions:7,  rejectedSubmissions:2, totalVotesCast:35  },
    { clerkId:'demo_008', username:'solaris_q',    email:'solaris@sq.dev',      avatar:AV('solaris'),      bio:'Learning quests are my jam.',                xp:1350, level:'Intermediate', reputation:280, badges:[bMap['level-intermediate'],bMap['streak-5']],                      currentStreak:5,  longestStreak:10, role:'user',      totalSubmissions:11, approvedSubmissions:9,  rejectedSubmissions:2, totalVotesCast:42  },
    { clerkId:'demo_009', username:'zenrunner',    email:'zenrunner@sq.dev',    avatar:AV('zenrunner'),    bio:'Run, meditate, repeat.',                     xp:1620, level:'Intermediate', reputation:300, badges:[bMap['level-intermediate'],bMap['streak-5']],                      currentStreak:7,  longestStreak:18, role:'user',      totalSubmissions:13, approvedSubmissions:11, rejectedSubmissions:2, totalVotesCast:55  },
    { clerkId:'demo_010', username:'buildorbust',  email:'buildorbust@sq.dev',  avatar:AV('buildorbust'),  bio:'Maker, builder, hacker.',                    xp:2050, level:'Intermediate', reputation:390, badges:[bMap['level-intermediate'],bMap['quests-10']],                     currentStreak:9,  longestStreak:15, role:'user',      totalSubmissions:16, approvedSubmissions:13, rejectedSubmissions:3, totalVotesCast:70  },
    { clerkId:'demo_011', username:'naturehex',    email:'naturehex@sq.dev',    avatar:AV('naturehex'),    bio:'Outdoor and social challenges.',             xp:1100, level:'Intermediate', reputation:240, badges:[bMap['first-quest'],bMap['level-intermediate']],                  currentStreak:3,  longestStreak:11, role:'user',      totalSubmissions:8,  approvedSubmissions:6,  rejectedSubmissions:2, totalVotesCast:28  },
    { clerkId:'demo_012', username:'pixelwolf',    email:'pixelwolf@sq.dev',    avatar:AV('pixelwolf'),    bio:'New to questing. Every day is a side quest.',xp:290,  level:'Beginner',     reputation:105, badges:[bMap['first-quest']],                                            currentStreak:2,  longestStreak:2,  role:'user',      totalSubmissions:3,  approvedSubmissions:1,  rejectedSubmissions:1, totalVotesCast:10  },
    { clerkId:'demo_013', username:'starterpack',  email:'starterpack@sq.dev',  avatar:AV('starterpack'),  bio:'Day 3 of my questing journey.',              xp:180,  level:'Beginner',     reputation:90,  badges:[bMap['first-quest']],                                            currentStreak:3,  longestStreak:3,  role:'user',      totalSubmissions:2,  approvedSubmissions:1,  rejectedSubmissions:0, totalVotesCast:5   },
    { clerkId:'demo_014', username:'questnoob99',  email:'questnoob99@sq.dev',  avatar:AV('questnoob'),    bio:'Discovered this platform last week!',        xp:120,  level:'Beginner',     reputation:60,  badges:[],                                                               currentStreak:1,  longestStreak:1,  role:'user',      totalSubmissions:1,  approvedSubmissions:1,  rejectedSubmissions:0, totalVotesCast:3   },
    { clerkId:'demo_015', username:'dailygrinder', email:'dailygrinder@sq.dev', avatar:AV('dailygrinder'), bio:'Morning person, quest person.',              xp:420,  level:'Beginner',     reputation:130, badges:[bMap['first-quest'],bMap['streak-5']],                            currentStreak:5,  longestStreak:5,  role:'user',      totalSubmissions:4,  approvedSubmissions:3,  rejectedSubmissions:1, totalVotesCast:15  },
  ].map(u => ({ ...u, isDemo: true })));
  console.log(`✅ ${users.length} demo users`);

  const U = {};
  users.forEach(u => { U[u.username] = u; });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — 15 QUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  const quests = await Quest.insertMany([
    { title:'Cold Shower Challenge',           category:'fitness',     difficulty:'Easy',      xpReward:80,  isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Video proof','Show cold water','60 seconds minimum'],        tags:['cold','discipline'],    description:'Take a cold shower for 5 days. Film at least 60 seconds under cold water.',                          acceptedCount:45, completedCount:28, submissionCount:30 },
    { title:'Run 5K Without Stopping',         category:'fitness',     difficulty:'Medium',    xpReward:180, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['GPS screenshot','5.0km+','Outdoor'],                        tags:['running','cardio'],    description:'Complete a 5km run without stopping. Use any tracking app for proof.',                                acceptedCount:78, completedCount:42, submissionCount:50 },
    { title:'7-Day Meditation Streak',         category:'mindfulness', difficulty:'Easy',      xpReward:120, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['App screenshot daily','10 min minimum'],                    tags:['meditation','streak'], description:'Meditate at least 10 minutes every day for 7 consecutive days.',                                      acceptedCount:62, completedCount:38, submissionCount:40 },
    { title:'Build Something in 24 Hours',     category:'creativity',  difficulty:'Hard',      xpReward:350, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['3+ progress photos','Final result','Public link'],          tags:['maker','create'],      description:'Build any project in under 24 hours and share it publicly.',                                          acceptedCount:25, completedCount:8,  submissionCount:10 },
    { title:'Cook a Dish From Another Culture', category:'food',       difficulty:'Medium',    xpReward:160, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Ingredients photo','Cooking process','Final dish'],         tags:['cooking','culture'],   description:'Cook a traditional dish from a country you have never attempted.',                                     acceptedCount:90, completedCount:65, submissionCount:70 },
    { title:'Teach Someone a Skill',           category:'social',      difficulty:'Easy',      xpReward:100, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Photo with student','Testimonial'],                        tags:['teaching','social'],   description:'Spend 30+ minutes teaching someone and get their testimonial.',                                       acceptedCount:55, completedCount:40, submissionCount:42 },
    { title:'Learn 50 Words in a New Language', category:'learning',   difficulty:'Medium',    xpReward:200, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Video reciting 50 words','Show app used'],                 tags:['language','learning'], description:'Learn 50 vocabulary words in a language you never studied.',                                           acceptedCount:34, completedCount:18, submissionCount:20 },
    { title:'Summit a Local Peak',             category:'outdoor',     difficulty:'Hard',      xpReward:400, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['GPS route','Summit selfie','500m+ elevation'],             tags:['hiking','nature'],     description:'Hike to a local summit with 500m+ elevation gain. GPS + selfie required.',                            acceptedCount:20, completedCount:6,  submissionCount:8  },
    { title:'No Social Media for 72 Hours',    category:'mindfulness', difficulty:'Medium',    xpReward:150, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Before screenshot','After screenshot','Written summary'], tags:['detox','focus'],       description:'Delete or log out of all social media for 72 hours.',                                                  acceptedCount:110,completedCount:60, submissionCount:65 },
    { title:'Save $100 in a Week',             category:'finance',     difficulty:'Hard',      xpReward:300, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Budget screenshot','Strategy doc','Comparison'],           tags:['money','saving'],      description:'Cut expenses and save $100 in 7 days. Document your strategy.',                                       acceptedCount:40, completedCount:20, submissionCount:22 },
    { title:'Open Source Contribution',        category:'tech',        difficulty:'Legendary', xpReward:600, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['GitHub PR link','Screenshot','Explanation'],               tags:['github','opensource'], description:'Contribute meaningfully to any open source project on GitHub.',                                        acceptedCount:15, completedCount:4,  submissionCount:5  },
    { title:'30-Day No Junk Food',             category:'fitness',     difficulty:'Legendary', xpReward:700, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Weekly food journal','Day-30 summary'],                    tags:['nutrition','diet'],    description:'Cut all processed junk food for 30 days straight.',                                                    acceptedCount:30, completedCount:5,  submissionCount:6  },
    { title:'Compliment 10 Strangers',         category:'social',      difficulty:'Easy',      xpReward:90,  isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Written log of 10','Photo in public'],                     tags:['social','kindness'],   description:'Genuinely compliment 10 strangers in a single day.',                                                   acceptedCount:75, completedCount:58, submissionCount:60 },
    { title:'Write and Publish an Article',    category:'creativity',  difficulty:'Medium',    xpReward:220, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Public link','500+ words','Publish screenshot'],           tags:['writing','creative'],  description:'Write a 500+ word article and publish it publicly.',                                                   acceptedCount:28, completedCount:14, submissionCount:15 },
    { title:'Plant Something — 30 Days Alive', category:'other',       difficulty:'Easy',      xpReward:110, isOfficial:true, status:'active', createdBy:U.questmaster._id, requirements:['Day 1 photo','Day 30 photo'],                              tags:['nature','patience'],   description:'Buy or propagate a plant. Keep it alive for 30 days.',                                                 acceptedCount:88, completedCount:70, submissionCount:72 },
  ].map(q => ({ ...q, isDemo: true })));
  console.log(`✅ ${quests.length} quests`);

  const Q = quests;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — 40 SUBMISSIONS (25 approved + 15 pending)
  // Each submission uses a UNIQUE (questId, userId) pair per the model index
  // ═══════════════════════════════════════════════════════════════════════════
  const approved = (lv, nlv, xp, extra = {}) => ({
    rawVoteCount: lv + nlv, legitimVotes: lv, notLegitVotes: nlv,
    weightedLegitTotal: lv * 1.5, weightedVoteTotal: (lv + nlv) * 1.5,
    approvalPct: lv / (lv + nlv), status: 'approved', isControversial: false,
    xpAwarded: true, xpAmount: xp, likeCount: 0, commentCount: 0, ...extra,
  });
  const pending = (lv, nlv, extra = {}) => ({
    rawVoteCount: lv + nlv, legitimVotes: lv, notLegitVotes: nlv,
    weightedLegitTotal: lv * 1.5, weightedVoteTotal: (lv + nlv) * 1.5,
    approvalPct: (lv + nlv) > 0 ? lv / (lv + nlv) : 0,
    status: 'pending', isControversial: false,
    xpAwarded: false, xpAmount: 0, likeCount: 0, commentCount: 0, ...extra,
  });

  const SUBS_RAW = [
    // ── 25 APPROVED ──────────────────────────────────────────────────────
    { q:0,  u:'neonrider',    desc:'Day 5 done! Cold showers changed my life. 90 seconds each. Huge mental resilience boost.',                   img:0,  t:daysAgo(14), ...approved(12,1,80),   likes:['questmaster','aurorax','shadowkat'] },
    { q:1,  u:'aurorax',      desc:'Crushed 5K in 23:14 on Strava! Wet weather but no excuses. GPS proof attached.',                              img:1,  t:daysAgo(13), ...approved(14,2,180),  likes:['questmaster','neonrider','voltblaze','cryptomaxer'] },
    { q:2,  u:'shadowkat',    desc:'7 days complete with Headspace! Started at 5 min, worked up to 20. Anxiety noticeably lower.',                 img:2,  t:daysAgo(12), ...approved(11,1,120),  likes:['questmaster','neonrider','aurorax'] },
    { q:3,  u:'neonrider',    desc:'Built a real-time habit tracker in 22h 45min. React + Firebase. Live link in bio.',                            img:3,  t:daysAgo(11), ...approved(15,1,350),  likes:['questmaster','shadowkat','aurorax','cryptomaxer','voltblaze'] },
    { q:4,  u:'voltblaze',    desc:'Made Ethiopian injera with doro wat from scratch! 3 hours but incredible result.',                             img:4,  t:daysAgo(10), ...approved(10,2,160),  likes:['questmaster','neonrider','shadowkat'] },
    { q:7,  u:'aurorax',      desc:'Summited Mount Snowdon! 1,085m elevation. 7.2km round trip, 600m+ gain. Brutal winds at top.',                 img:5,  t:daysAgo(9),  ...approved(14,0,400),  likes:['questmaster','neonrider','shadowkat','voltblaze','cryptomaxer','pixelwolf'] },
    { q:6,  u:'cryptomaxer',  desc:'Learned 50 Japanese words in 6 days using Anki. 90% recall rate. Video of me reciting all 50.',                img:6,  t:daysAgo(8),  ...approved(11,1,200),  likes:['questmaster','neonrider','aurorax'] },
    { q:10, u:'neonrider',    desc:'PR merged into shadcn/ui! Fixed tooltip accessibility bug for screen readers. Same-day review.',               img:12, t:daysAgo(7),  ...approved(13,1,600),  likes:['questmaster','aurorax','cryptomaxer','shadowkat','voltblaze'] },
    { q:13, u:'shadowkat',    desc:'Published 1,200-word Medium piece on habit psychology. 47 reads in 24 hours!',                                 img:8,  t:daysAgo(6),  ...approved(10,2,220),  likes:['questmaster','neonrider','voltblaze'] },
    { q:14, u:'pixelwolf',    desc:'Day 1 and Day 30 of my pothos plant! 8 leaves now. Longest I ever kept a plant alive.',                         img:10, t:daysAgo(5),  ...approved(12,0,110),  likes:['questmaster','shadowkat','aurorax'] },
    { q:5,  u:'ironmindx',    desc:'Taught my neighbor chess basics for 45 min. She beat me in her 3rd game. Testimonial attached.',                img:7,  t:daysAgo(5),  ...approved(10,1,100),  likes:['questmaster','aurorax','zenrunner'] },
    { q:1,  u:'zenrunner',    desc:'5K done in 26:42! First time ever running nonstop. Strava route attached. Feeling amazing.',                   img:1,  t:daysAgo(4),  ...approved(11,1,180),  likes:['questmaster','neonrider','ironmindx','shadowkat'] },
    { q:2,  u:'zenrunner',    desc:'7 days of Insight Timer meditation complete. 15 min/day minimum. Sleep quality improved drastically.',          img:2,  t:daysAgo(4),  ...approved(10,0,120),  likes:['questmaster','shadowkat','aurorax'] },
    { q:3,  u:'buildorbust',  desc:'Built a CLI task manager in Rust in 18 hours. GitHub repo live. 3 progress screenshots.',                      img:3,  t:daysAgo(3),  ...approved(12,2,350),  likes:['questmaster','neonrider','ironmindx','cryptomaxer'] },
    { q:12, u:'naturehex',    desc:'Complimented 10 strangers in the park! #7 turned into a 10-min conversation. Changed my whole day.',            img:7,  t:daysAgo(3),  ...approved(9,1,90),   likes:['questmaster','shadowkat','pixelwolf'] },
    { q:4,  u:'solaris_q',    desc:'Made authentic Thai green curry! Never cooked Thai before. Used fresh lemongrass. Family loved it.',             img:4,  t:daysAgo(3),  ...approved(10,1,160),  likes:['questmaster','neonrider','voltblaze'] },
    { q:8,  u:'ironmindx',    desc:'72 hours off social media. Screen time dropped from 5.8h to 0.3h. Read 2 books instead.',                      img:17, t:daysAgo(2),  ...approved(13,1,150),  likes:['questmaster','aurorax','shadowkat','neonrider'] },
    { q:0,  u:'dailygrinder', desc:'Cold shower day 5 complete! Screamed every morning but did it. Wim Hof would be proud.',                       img:0,  t:daysAgo(2),  ...approved(8,2,80),   likes:['questmaster','neonrider'] },
    { q:9,  u:'cryptomaxer',  desc:'Saved $127 in 7 days by meal prepping and cutting coffee. Full budget breakdown attached.',                     img:9,  t:daysAgo(2),  ...approved(11,1,300),  likes:['questmaster','ironmindx','aurorax','voltblaze'] },
    { q:5,  u:'naturehex',    desc:'Taught my younger cousin Python for an hour! We built a number guessing game together.',                       img:7,  t:daysAgo(1),  ...approved(9,1,100),   likes:['questmaster','buildorbust','solaris_q'] },
    { q:6,  u:'solaris_q',    desc:'Learned 50 Korean words with Duolingo + Anki combo. Video proof of all 50 without cheating.',                   img:6,  t:daysAgo(1),  ...approved(10,1,200),  likes:['questmaster','neonrider','aurorax','zenrunner'] },
    { q:14, u:'starterpack',  desc:'My first plant! Basil from seed, day 30. Its alive and I used fresh basil on pasta yesterday!',                img:10, t:daysAgo(1),  ...approved(8,0,110),   likes:['questmaster','pixelwolf'] },
    { q:12, u:'shadowkat',    desc:'Complimented 10 strangers downtown. Everyone smiled. One person got emotional. This quest changed me.',         img:7,  t:daysAgo(1),  ...approved(11,0,90),   likes:['questmaster','neonrider','aurorax','ironmindx'] },
    { q:1,  u:'ironmindx',    desc:'5K in 21:30. PB! Ran in freezing rain at 6am. Nothing stops the grind. Strava screenshot attached.',           img:1,  t:hoursAgo(18),...approved(13,1,180),  likes:['questmaster','aurorax','neonrider','zenrunner','shadowkat'] },
    { q:13, u:'buildorbust',  desc:'Published article on Dev.to about Rust vs Go for CLI tools. 200+ reads in 12 hours. Link attached.',           img:8,  t:hoursAgo(12),...approved(10,2,220),  likes:['questmaster','neonrider','cryptomaxer'] },

    // ── 15 PENDING (need community votes — shown in "Vote Now") ──────────
    { q:8,  u:'voltblaze',    desc:'72 hours done! Screen time 6.5h → 0. Used time for reading, working out, cooking. Before/after attached.',      img:17, t:hoursAgo(10), ...pending(6,1) },
    { q:5,  u:'pixelwolf',    desc:'Taught my cousin Python basics for 45 min. We built a number guessing game. He said coolest thing he learned!', img:7,  t:hoursAgo(8),  ...pending(4,0) },
    { q:9,  u:'voltblaze',    desc:'Saved $142 this week. Meal prepped all 7 days, no Uber Eats, no coffee shops. Strategy doc attached.',          img:9,  t:hoursAgo(7),  ...pending(5,2) },
    { q:12, u:'questnoob99',  desc:'My first social quest! Complimented 10 people at the mall. Everyone was so nice back. Personal log attached.',  img:7,  t:hoursAgo(6),  ...pending(3,0) },
    { q:11, u:'aurorax',      desc:'Day 30 of no junk food! Lost 3.5kg. Traveling in week 2 was hardest. Meal prep Sundays = lifesaver.',           img:13, t:hoursAgo(5),  ...pending(7,1) },
    { q:0,  u:'voltblaze',    desc:'Cold shower streak day 5. BRUTAL in winter. Screamed every day but I did it. Audio proof in video.',             img:0,  t:hoursAgo(4),  ...pending(2,1) },
    { q:3,  u:'cryptomaxer',  desc:'Built a portfolio site with Next.js in 20h. Dark theme, animations, deployed on Vercel. Honest review wanted.',img:3,  t:hoursAgo(4),  ...pending(4,1) },
    { q:2,  u:'dailygrinder', desc:'7-day streak complete! Used Calm app, 12 min per session. Noticed less phone addiction.',                      img:2,  t:hoursAgo(3),  ...pending(5,0) },
    { q:7,  u:'ironmindx',    desc:'Summit of Ben Nevis, Scotland! 1,345m. Took 5 hours up, 3 down. GPS + summit selfie attached.',                img:5,  t:hoursAgo(3),  ...pending(6,0) },
    { q:4,  u:'zenrunner',    desc:'Made Japanese ramen from scratch — including the broth (12 hour simmer). Best meal I ever cooked.',             img:19, t:hoursAgo(2),  ...pending(3,1) },
    { q:10, u:'buildorbust',  desc:'PR submitted to Vite. Added TypeScript strict mode guide to docs. Waiting for review.',                        img:12, t:hoursAgo(2),  ...pending(4,0) },
    { q:6,  u:'naturehex',    desc:'50 Spanish words learned via Anki in 5 days. Video of me reciting all 50 back to back. No peeking.',           img:6,  t:hoursAgo(1),  ...pending(2,0) },
    { q:13, u:'ironmindx',    desc:'Published article on cold exposure science. 800 words on Medium. Got 35 reads in 5 hours.',                    img:8,  t:hoursAgo(1),  ...pending(5,1) },
    { q:8,  u:'shadowkat',    desc:'72h social media detox. Replaced scrolling with journaling. Wrote 15 pages. Felt like a different person.',     img:17, t:hoursAgo(0.5),...pending(3,0) },
    { q:14, u:'dailygrinder', desc:'Succulent plant day 30! Started from a tiny cutting. Now has 5 healthy leaves. Daily watering log attached.',   img:10, t:hoursAgo(0.3),...pending(1,0) },
  ];

  // Build submission docs
  const allUsers = users;
  const subDocs = SUBS_RAW.map(s => {
    const userId = U[s.u]._id;
    const questId = Q[s.q]._id;
    const likeUserIds = (s.likes || []).map(name => U[name]?._id).filter(Boolean);
    return {
      questId, userId,
      mediaUrls: [IMG[s.img % IMG.length]],
      mediaTypes: ['image'],
      description: s.desc,
      rawVoteCount: s.rawVoteCount,
      legitimVotes: s.legitimVotes,
      notLegitVotes: s.notLegitVotes,
      weightedLegitTotal: s.weightedLegitTotal,
      weightedVoteTotal: s.weightedVoteTotal,
      approvalPct: s.approvalPct,
      status: s.status,
      isControversial: s.isControversial,
      xpAwarded: s.xpAwarded,
      xpAmount: s.xpAmount,
      likes: likeUserIds,
      likeCount: likeUserIds.length,
      commentCount: s.commentCount || 0,
      createdAt: s.t,
      resolvedAt: s.status === 'approved' ? new Date(s.t.getTime() + 86400000) : null,
      isDemo: true,
    };
  });

  const submissions = await Submission.insertMany(subDocs);
  console.log(`✅ ${submissions.length} submissions (25 approved + 15 pending)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — VOTES (~180 vote records)
  // ═══════════════════════════════════════════════════════════════════════════
  const voterPool = [U.questmaster, U.aurorax, U.neonrider, U.shadowkat, U.ironmindx, U.cryptomaxer, U.voltblaze, U.solaris_q, U.zenrunner, U.buildorbust, U.naturehex, U.pixelwolf, U.dailygrinder];
  const voteRecords = [];

  for (const sub of submissions) {
    const eligible = voterPool.filter(v => v._id.toString() !== sub.userId.toString());
    const lv = sub.legitimVotes;
    const nlv = sub.notLegitVotes;

    for (let i = 0; i < Math.min(lv, eligible.length); i++) {
      voteRecords.push({
        submissionId: sub._id,
        voterId: eligible[i]._id,
        voteType: 'legit',
        weight: 1.5,
        voterXpAtVote: eligible[i].xp,
        voterLevelAtVote: eligible[i].level,
        isDemo: true,
      });
    }
    for (let i = lv; i < Math.min(lv + nlv, eligible.length); i++) {
      voteRecords.push({
        submissionId: sub._id,
        voterId: eligible[i]._id,
        voteType: 'not_legit',
        weight: 1.0,
        voterXpAtVote: eligible[i].xp,
        voterLevelAtVote: eligible[i].level,
        isDemo: true,
      });
    }
  }

  let voteCount = 0;
  for (const vr of voteRecords) {
    try { await Vote.create(vr); voteCount++; } catch (e) { /* skip duplicate */ }
  }
  console.log(`✅ ${voteCount} votes`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6 — LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const ranked = [...users].sort((a, b) => b.xp - a.xp);
  const lbDocs = ranked.map((u, i) => ({
    userId: u._id, totalXp: u.xp,
    weeklyXp: Math.round(u.xp * 0.04),
    monthlyXp: Math.round(u.xp * 0.15),
    globalRank: i + 1,
    username: u.username, avatar: u.avatar,
    level: u.level, reputation: u.reputation,
    badges: u.badges, completedQuestCount: u.approvedSubmissions,
    isDemo: true
  }));
  await Leaderboard.insertMany(lbDocs);
  console.log(`✅ ${lbDocs.length} leaderboard entries`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7 — COMMUNITY QUESTS
  // ═══════════════════════════════════════════════════════════════════════════
  await CommunityQuest.insertMany([
    { title:'Go 24 Hours Without Your Phone',   description:'Complete digital detox for 24 hours.',         category:'mindfulness', difficulty:'Hard',      suggestedXpReward:250, submittedBy:U.neonrider._id,   upvotes:[U.questmaster._id,U.shadowkat._id,U.aurorax._id,U.ironmindx._id], upvoteCount:4, downvoteCount:0, status:'auto_approved', tags:['detox'] },
    { title:'Volunteer for 4 Hours',            description:'Volunteer at a charity or food bank.',         category:'social',      difficulty:'Medium',    suggestedXpReward:200, submittedBy:U.shadowkat._id,   upvotes:[U.questmaster._id,U.voltblaze._id,U.cryptomaxer._id],             upvoteCount:3, downvoteCount:0, status:'pending',       tags:['volunteer'] },
    { title:'100 Burpees in One Session',       description:'Complete 100 burpees. Video proof required.',  category:'fitness',     difficulty:'Hard',      suggestedXpReward:300, submittedBy:U.aurorax._id,     upvotes:[U.questmaster._id,U.neonrider._id,U.ironmindx._id,U.voltblaze._id,U.shadowkat._id], upvoteCount:5, downvoteCount:0, status:'auto_approved', tags:['burpees'] },
    { title:'Read a Book in One Week',          description:'Read 200+ pages in 7 days.',                   category:'learning',    difficulty:'Easy',      suggestedXpReward:130, submittedBy:U.cryptomaxer._id, upvotes:[U.questmaster._id,U.solaris_q._id],                              upvoteCount:2, downvoteCount:0, status:'pending',       tags:['reading'] },
    { title:'1,000 Push-Ups in One Day',        description:'Spread across the day. Track every set.',      category:'fitness',     difficulty:'Legendary', suggestedXpReward:500, submittedBy:U.ironmindx._id,   upvotes:[U.questmaster._id,U.aurorax._id,U.neonrider._id],                upvoteCount:3, downvoteCount:1, status:'pending',       tags:['pushups'] },
  ].map(cq => ({ ...cq, isDemo: true })));
  console.log(`✅ 5 community quests`);

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════');
  console.log('   DEMO DATA READY');
  console.log('════════════════════════════════════════════');
  console.log(`   Users:        ${users.length}`);
  console.log(`   Quests:       ${quests.length}`);
  console.log(`   Submissions:  ${submissions.length}`);
  console.log(`   Votes:        ${voteCount}`);
  console.log(`   Leaderboard:  ${lbDocs.length}`);
  console.log(`   CQ:           5`);
  console.log('════════════════════════════════════════════');
  console.log('   Restart backend: node server.js');
  console.log('   Feed will show all posts immediately.');
  console.log('════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

run().catch(err => { console.error('❌ SEED FAILED:', err); process.exit(1); });
