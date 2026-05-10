const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getCompanyCredentials = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n=== COMPANY CREDENTIALS ===\n');
    
    // Get all companies with passwords
    const companies = await Company.find({}).select('+password');
    
    if (companies.length === 0) {
      console.log('❌ No companies found');
      return;
    }
    
    console.log(`Found ${companies.length} company(ies):\n`);
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`--- Company ${i + 1} ---`);
      console.log(`Company Name: ${company.name || company.companyName || 'N/A'}`);
      console.log(`Contact Name: ${company.firstName || 'N/A'} ${company.lastName || 'N/A'}`);
      console.log(`Email: ${company.email}`);
      console.log(`Domain: ${company.domain || 'N/A'}`);
      console.log(`Active: ${company.isActive}`);
      console.log(`Email Verified: ${company.isEmailVerified}`);
      console.log(`Created: ${company.createdAt}`);
      console.log(`Last Login: ${company.lastLogin || 'Never'}`);
      console.log(`Login Attempts: ${company.loginAttempts || 0}`);
      console.log(`ID: ${company._id}`);
      
      // Check if password exists
      if (company.password) {
        console.log(`Password Hash: ${company.password.substring(0, 20)}...`);
        
        // Try common passwords
        const commonPasswords = [
          'password123',
          'Password123!',
          'admin123',
          'Admin123!',
          'company123',
          'Company123!',
          '123456',
          'password',
          'admin'
        ];
        
        console.log('Testing common passwords...');
        let foundPassword = false;
        
        for (const testPassword of commonPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPassword, company.password);
            if (isMatch) {
              console.log(`🔑 PASSWORD FOUND: ${testPassword}`);
              foundPassword = true;
              break;
            }
          } catch (err) {
            // Continue testing
          }
        }
        
        if (!foundPassword) {
          console.log('❌ Password not found in common passwords');
          console.log('💡 You may need to reset the password');
        }
      } else {
        console.log('❌ No password hash found');
      }
      
      console.log(''); // Empty line for separation
    }
    
    // Create a password reset script for companies
    console.log('\n=== PASSWORD RESET OPTION ===');
    console.log('To reset company passwords, I can create a script.');
    console.log('Would you like me to reset passwords for these companies?');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

getCompanyCredentials();
