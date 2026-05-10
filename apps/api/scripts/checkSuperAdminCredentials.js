const mongoose = require('mongoose');
const SuperAdmin = require('../src/models/SuperAdmin');
const User = require('../src/models/User');
require('dotenv').config();

const checkSuperAdminCredentials = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    console.log('\n=== CHECKING SUPERADMIN CREDENTIALS ===\n');
    
    // Check SuperAdmin collection
    console.log('1. Checking SuperAdmin collection...');
    const superAdmins = await SuperAdmin.find({}).select('firstName lastName email isActive isEmailVerified createdAt');
    
    if (superAdmins.length > 0) {
      console.log(`Found ${superAdmins.length} SuperAdmin(s):`);
      superAdmins.forEach((admin, index) => {
        console.log(`\n--- SuperAdmin ${index + 1} ---`);
        console.log(`Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Active: ${admin.isActive}`);
        console.log(`Email Verified: ${admin.isEmailVerified}`);
        console.log(`Created: ${admin.createdAt}`);
      });
    } else {
      console.log('❌ No SuperAdmin records found in SuperAdmin collection');
    }
    
    // Check User collection for SUPER_ADMIN role
    console.log('\n2. Checking User collection for SUPER_ADMIN role...');
    try {
      const superAdminUsers = await User.find({ role: 'SUPER_ADMIN' }).select('firstName lastName email role isActive isEmailVerified createdAt');
      
      if (superAdminUsers.length > 0) {
        console.log(`Found ${superAdminUsers.length} SUPER_ADMIN user(s):`);
        superAdminUsers.forEach((user, index) => {
          console.log(`\n--- SUPER_ADMIN User ${index + 1} ---`);
          console.log(`Name: ${user.firstName} ${user.lastName}`);
          console.log(`Email: ${user.email}`);
          console.log(`Role: ${user.role}`);
          console.log(`Active: ${user.isActive}`);
          console.log(`Email Verified: ${user.isEmailVerified}`);
          console.log(`Created: ${user.createdAt}`);
        });
      } else {
        console.log('❌ No SUPER_ADMIN users found in User collection');
      }
    } catch (userError) {
      console.log('⚠️  User model not found or error accessing User collection');
    }
    
    // Check all collections for any admin-like records
    console.log('\n3. Checking all collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Check for any records with admin-like emails
    console.log('\n4. Searching for admin-like email patterns...');
    const adminPatterns = ['admin', 'superadmin', 'super'];
    
    for (const collection of collections) {
      if (collection.name.includes('admin') || collection.name.includes('user')) {
        try {
          const records = await mongoose.connection.db.collection(collection.name).find({
            email: { $regex: /(admin|super)/i }
          }).toArray();
          
          if (records.length > 0) {
            console.log(`\nFound ${records.length} admin-like record(s) in ${collection.name}:`);
            records.forEach((record, index) => {
              console.log(`--- Record ${index + 1} ---`);
              console.log(`Email: ${record.email || 'N/A'}`);
              console.log(`Name: ${record.firstName || ''} ${record.lastName || ''}`);
              console.log(`Role: ${record.role || 'N/A'}`);
              console.log(`Active: ${record.isActive || 'N/A'}`);
              if (record._id) console.log(`ID: ${record._id}`);
            });
          }
        } catch (err) {
          console.log(`Error checking ${collection.name}:`, err.message);
        }
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('If no SuperAdmin found, you can create one using:');
    console.log('node src/seeders/createSuperAdminNew.js');
    console.log('or');
    console.log('node src/seeders/createSuperAdmin.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkSuperAdminCredentials();
