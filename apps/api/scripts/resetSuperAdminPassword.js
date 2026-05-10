const mongoose = require('mongoose');
const SuperAdmin = require('../src/models/SuperAdmin');
require('dotenv').config();

const resetSuperAdminPassword = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Find the SuperAdmin
    const superAdmin = await SuperAdmin.findOne({ email: 'superadmin@aitestingportal.com' });
    
    if (!superAdmin) {
      console.log('❌ SuperAdmin not found!');
      return;
    }
    
    console.log('\n=== CURRENT SUPERADMIN STATUS ===');
    console.log('Name:', superAdmin.firstName, superAdmin.lastName);
    console.log('Email:', superAdmin.email);
    console.log('Active:', superAdmin.isActive);
    console.log('Email Verified:', superAdmin.isEmailVerified);
    console.log('Login Attempts:', superAdmin.loginAttempts);
    console.log('Lock Until:', superAdmin.lockUntil);
    console.log('Is Locked:', superAdmin.isLocked);
    console.log('Last Login:', superAdmin.lastLogin);
    
    // Reset password and unlock account
    const newPassword = 'SuperAdmin123!';
    superAdmin.password = newPassword;
    superAdmin.loginAttempts = 0;
    superAdmin.lockUntil = undefined;
    superAdmin.isActive = true;
    superAdmin.isEmailVerified = true;
    
    await superAdmin.save();
    
    console.log('\n=== PASSWORD RESET SUCCESSFUL ===');
    console.log('✅ SuperAdmin password has been reset');
    console.log('✅ Account unlocked');
    console.log('✅ Login attempts reset');
    
    console.log('\n=== NEW LOGIN CREDENTIALS ===');
    console.log('Email:', superAdmin.email);
    console.log('Password:', newPassword);
    console.log('Status: Ready to login');
    
    // Test password comparison
    console.log('\n=== TESTING PASSWORD ===');
    const isPasswordValid = await superAdmin.comparePassword(newPassword);
    console.log('Password test result:', isPasswordValid ? '✅ VALID' : '❌ INVALID');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

resetSuperAdminPassword();
