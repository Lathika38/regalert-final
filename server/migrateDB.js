const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Alert = require('./models/Alert');
const Obligation = require('./models/Obligation');
const AuditLog = require('./models/AuditLog');
require('dotenv').config();

// TO USE THIS SCRIPT:
// 1. Put your NEW cloud database link here:
const CLOUD_DB_URI = 'INSERT_YOUR_MONGODB_ATLAS_LINK_HERE';

// 2. Put your OLD local database link here (default):
const LOCAL_DB_URI = 'mongodb://127.0.0.1:27017/regalert';

async function migrateDatabase() {
  if (CLOUD_DB_URI === 'INSERT_YOUR_MONGODB_ATLAS_LINK_HERE') {
    console.error('❌ ERROR: You must paste your MongoDB Atlas connection string into the script first!');
    process.exit(1);
  }

  console.log('⏳ Step 1: Connecting to Local Database...');
  const localConn = await mongoose.createConnection(LOCAL_DB_URI).asPromise();
  
  console.log('⏳ Step 2: Extracting all local data...');
  const LocalAlert = localConn.model('Alert', Alert.schema);
  const LocalObligation = localConn.model('Obligation', Obligation.schema);
  const LocalAuditLog = localConn.model('AuditLog', AuditLog.schema);
  const LocalUser = localConn.model('User', User.schema);
  const LocalProfile = localConn.model('Profile', Profile.schema);

  const alerts = await LocalAlert.find({});
  const obligations = await LocalObligation.find({});
  const auditLogs = await LocalAuditLog.find({});
  const users = await LocalUser.find({});
  const profiles = await LocalProfile.find({});

  console.log(`✅ Found: ${alerts.length} Alerts, ${obligations.length} Obligations, ${auditLogs.length} Logs, ${users.length} Users.`);
  
  console.log('\n⏳ Step 3: Connecting to Cloud Database (Atlas)...');
  const cloudConn = await mongoose.createConnection(CLOUD_DB_URI).asPromise();
  
  const CloudAlert = cloudConn.model('Alert', Alert.schema);
  const CloudObligation = cloudConn.model('Obligation', Obligation.schema);
  const CloudAuditLog = cloudConn.model('AuditLog', AuditLog.schema);
  const CloudUser = cloudConn.model('User', User.schema);
  const CloudProfile = cloudConn.model('Profile', Profile.schema);

  console.log('⏳ Step 4: Uploading data to the Cloud...');
  await CloudAlert.insertMany(alerts);
  await CloudObligation.insertMany(obligations);
  await CloudAuditLog.insertMany(auditLogs);
  await CloudUser.insertMany(users);
  await CloudProfile.insertMany(profiles);

  console.log('\n🎉 SUCCESS! All your local laptop data has been perfectly moved to the Cloud Datebase!');
  console.log('👉 Next Step: Update your server/.env file with this new CLOUD_DB_URI.');
  
  process.exit(0);
}

migrateDatabase().catch(err => {
  console.error('Migration Failed:', err);
  process.exit(1);
});
