const mongoose = require('mongoose');
const Company = require('../src/models/Company');
require('dotenv').config();

const resetCompanyPasswords = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n=== RESETTING COMPANY PASSWORDS ===\n');
    
    // Reset password for admin@newtestcompany.com
    const company2 = await Company.findOne({ email: 'admin@newtestcompany.com' });
    if (company2) {
      const newPassword = 'Company123!';
      company2.password = newPassword;
      company2.loginAttempts = 0;
      company2.lockUntil = undefined;
      company2.isActive = true;
      company2.isEmailVerified = true;
      
      await company2.save();
      
      console.log('✅ Password reset for admin@newtestcompany.com');
      console.log(`New Password: ${newPassword}`);
      
      // Test the password
      const isValid = await company2.comparePassword(newPassword);
      console.log(`Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    console.log('\n=== FINAL COMPANY CREDENTIALS ===\n');
    
    console.log('--- Company 1 ---');
    console.log('Company Name: geeky prince pvt ltd');
    console.log('Email: princerajputana5@gmail.com');
    console.log('Password: Admin123!');
    console.log('Status: ✅ Ready to login');
    
    console.log('\n--- Company 2 ---');
    console.log('Company Name: New Test Company');
    console.log('Email: admin@newtestcompany.com');
    console.log('Password: Company123!');
    console.log('Status: ✅ Ready to login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

resetCompanyPasswords();
