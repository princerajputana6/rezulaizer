const axios = require('axios');
const mongoose = require('mongoose');
const SuperAdmin = require('../src/models/SuperAdmin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const testCompaniesAPI = async () => {
  try {
    // Connect to MongoDB to get SuperAdmin
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Get SuperAdmin
    const superAdmin = await SuperAdmin.findOne({ email: 'superadmin@aitestingportal.com' });
    if (!superAdmin) {
      console.log('❌ SuperAdmin not found');
      return;
    }
    
    // Generate JWT token for SuperAdmin
    const token = jwt.sign(
      { userId: superAdmin._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('✅ Generated SuperAdmin token');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    // Test the companies API
    const baseURL = 'http://localhost:5000'; // Adjust port if different
    
    console.log('\n=== TESTING COMPANIES API ===\n');
    
    try {
      console.log('Testing GET /api/companies...');
      const response = await axios.get(`${baseURL}/api/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ API Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data.companies) {
        const companies = response.data.data.companies;
        console.log(`\n📊 Found ${companies.length} companies in API response:`);
        
        companies.forEach((company, index) => {
          console.log(`\n--- Company ${index + 1} (via API) ---`);
          console.log(`Name: ${company.name || company.companyName || 'N/A'}`);
          console.log(`Email: ${company.email}`);
          console.log(`Domain: ${company.domain || 'N/A'}`);
          console.log(`Active: ${company.isActive}`);
          console.log(`Created: ${company.createdAt}`);
        });
      }
      
    } catch (apiError) {
      console.log('❌ API Error:', apiError.message);
      
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        console.log('Response:', apiError.response.data);
      }
      
      console.log('\n💡 Possible issues:');
      console.log('1. Server not running on port 5000');
      console.log('2. Authentication middleware issue');
      console.log('3. Route not properly configured');
      console.log('4. CORS issues');
      
      console.log('\n🔧 To fix:');
      console.log('1. Start the server: npm run dev');
      console.log('2. Check if port 5000 is correct');
      console.log('3. Verify SuperAdmin authentication');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Also test a simple health check
const testHealthCheck = async () => {
  try {
    console.log('\n=== TESTING SERVER HEALTH ===\n');
    const baseURL = 'http://localhost:5000';
    
    const response = await axios.get(`${baseURL}/api/companies/test`);
    console.log('✅ Health check passed:', response.data);
    
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
    return false;
  }
};

const runTests = async () => {
  const isServerRunning = await testHealthCheck();
  
  if (isServerRunning) {
    await testCompaniesAPI();
  } else {
    console.log('\n⚠️  Server is not running. Please start it first:');
    console.log('cd /home/prince.kumar@tekmindz.com/Desktop/rezulyzer/Rezulyzer-server');
    console.log('npm run dev');
  }
};

runTests();
