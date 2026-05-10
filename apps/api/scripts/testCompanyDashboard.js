const axios = require('axios');
const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const testCompanyDashboard = async () => {
  try {
    // Connect to MongoDB to get Company
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    
    // Get Company
    const company = await Company.findOne({ email: 'princerajputana5@gmail.com' });
    if (!company) {
      console.log('❌ Company not found');
      return;
    }
    
    // Generate JWT token for Company
    const token = jwt.sign(
      { userId: company._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('✅ Generated Company token');
    console.log('Company:', company.firstName, company.lastName);
    console.log('Email:', company.email);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    // Test the dashboard API
    const baseURL = 'http://localhost:5000'; // Adjust port if different
    
    console.log('\n=== TESTING COMPANY DASHBOARD API ===\n');
    
    try {
      console.log('Testing GET /api/dashboard/stats...');
      const response = await axios.get(`${baseURL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Dashboard API Response Status:', response.status);
      console.log('✅ Dashboard API Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data.stats) {
        const stats = response.data.data.stats;
        console.log('\n📊 Company Dashboard Stats:');
        console.log(`Total Candidates: ${stats.totalCandidates || stats.totalUsers}`);
        console.log(`Active Users: ${stats.activeUsers}`);
        console.log(`Total Assessments: ${stats.totalAssessments}`);
        console.log(`Total Interviews: ${stats.totalInterviews}`);
        console.log(`Monthly Revenue: $${stats.monthlyRevenue}`);
        console.log(`User Type: ${response.data.data.userType}`);
      }
      
    } catch (apiError) {
      console.log('❌ Dashboard API Error:', apiError.message);
      
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        console.log('Response:', apiError.response.data);
      }
    }
    
    // Test candidates API
    try {
      console.log('\n=== TESTING CANDIDATES API ===\n');
      console.log('Testing GET /api/candidates...');
      const candidatesResponse = await axios.get(`${baseURL}/api/candidates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Candidates API Response Status:', candidatesResponse.status);
      console.log('✅ Candidates API Response:');
      console.log(JSON.stringify(candidatesResponse.data, null, 2));
      
    } catch (candidatesError) {
      console.log('❌ Candidates API Error:', candidatesError.message);
      
      if (candidatesError.response) {
        console.log('Status:', candidatesError.response.status);
        console.log('Response:', candidatesError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Test server health first
const testServerHealth = async () => {
  try {
    console.log('=== TESTING SERVER HEALTH ===\n');
    const baseURL = 'http://localhost:5000';
    
    const response = await axios.get(`${baseURL}/api/companies/test`);
    console.log('✅ Server health check passed:', response.data);
    
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
    return false;
  }
};

const runTests = async () => {
  const isServerRunning = await testServerHealth();
  
  if (isServerRunning) {
    await testCompanyDashboard();
  } else {
    console.log('\n⚠️  Server is not running. Please start it first:');
    console.log('cd /home/prince.kumar@tekmindz.com/Desktop/rezulyzer/Rezulyzer-server');
    console.log('npm run dev');
  }
};

runTests();
