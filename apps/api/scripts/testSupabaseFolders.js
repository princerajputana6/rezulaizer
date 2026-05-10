const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const Candidate = require('../src/models/Candidate');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const testSupabaseFolders = async () => {
  try {
    // Connect to MongoDB
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
    
    const baseURL = 'http://localhost:5000';
    
    console.log('\n=== TESTING SUPABASE FOLDER STRUCTURE ===\n');
    
    // Test 1: Create a test candidate
    console.log('1. Creating test candidate...');
    const candidateData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    };
    
    try {
      const createResponse = await axios.post(`${baseURL}/api/candidates`, candidateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (createResponse.data.success) {
        console.log('✅ Test candidate created:', createResponse.data.data.candidate.email);
        const candidateId = createResponse.data.data.candidate._id;
        
        // Test 2: Upload resume for the candidate
        console.log('\n2. Testing resume upload with email-based folders...');
        
        // Create a dummy PDF file for testing
        const dummyPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF');
        
        const formData = new FormData();
        formData.append('resume', dummyPdfContent, {
          filename: 'john_doe_resume.pdf',
          contentType: 'application/pdf'
        });
        
        const uploadResponse = await axios.post(`${baseURL}/api/candidates/${candidateId}/resume`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
          }
        });
        
        if (uploadResponse.data.success) {
          console.log('✅ Resume uploaded successfully!');
          console.log('📁 File structure details:');
          console.log(`   - Candidate Email: ${candidateData.email}`);
          console.log(`   - Sanitized Folder: ${uploadResponse.data.data.candidateFolder}`);
          console.log(`   - File Path: ${uploadResponse.data.data.filePath}`);
          console.log(`   - Public URL: ${uploadResponse.data.data.fileUrl}`);
          
          // Test 3: List candidate files
          console.log('\n3. Testing candidate files listing...');
          const filesResponse = await axios.get(`${baseURL}/api/candidates/${candidateId}/files`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (filesResponse.data.success) {
            console.log('✅ Candidate files retrieved:');
            console.log(`   - Candidate: ${filesResponse.data.data.candidate.name}`);
            console.log(`   - Email: ${filesResponse.data.data.candidate.email}`);
            console.log(`   - Files count: ${filesResponse.data.data.files.length}`);
            
            filesResponse.data.data.files.forEach((file, index) => {
              console.log(`   - File ${index + 1}: ${file.name}`);
              console.log(`     Size: ${file.metadata?.size || 'Unknown'} bytes`);
              console.log(`     URL: ${file.publicUrl}`);
            });
          }
          
          // Test 4: List all candidate folders for company
          console.log('\n4. Testing company candidate folders listing...');
          const foldersResponse = await axios.get(`${baseURL}/api/candidates/folders`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (foldersResponse.data.success) {
            console.log('✅ Company candidate folders retrieved:');
            console.log(`   - Company ID: ${foldersResponse.data.data.companyId}`);
            console.log(`   - Candidate folders: ${foldersResponse.data.data.candidateFolders.length}`);
            
            foldersResponse.data.data.candidateFolders.forEach((folder, index) => {
              console.log(`   - Folder ${index + 1}: ${folder.sanitizedEmail}`);
              console.log(`     Path: ${folder.folderPath}`);
            });
          }
          
        } else {
          console.log('❌ Resume upload failed:', uploadResponse.data.message);
        }
        
      } else {
        console.log('❌ Candidate creation failed:', createResponse.data.message);
      }
      
    } catch (apiError) {
      console.log('❌ API Error:', apiError.message);
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        console.log('Response:', apiError.response.data);
      }
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Test server health first
const testServerHealth = async () => {
  try {
    console.log('=== TESTING SERVER HEALTH ===\n');
    const baseURL = 'http://localhost:5000';
    
    const response = await axios.get(`${baseURL}/api/candidates/folders`);
    return false; // This should fail without auth, which means server is running
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Server is running (got expected 401 for unauthenticated request)');
      return true;
    }
    console.log('❌ Server health check failed:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
    return false;
  }
};

const runTests = async () => {
  const isServerRunning = await testServerHealth();
  
  if (isServerRunning) {
    await testSupabaseFolders();
  } else {
    console.log('\n⚠️  Server is not running. Please start it first:');
    console.log('cd /home/prince.kumar@tekmindz.com/Desktop/rezulyzer/Rezulyzer-server');
    console.log('npm run dev');
  }
};

runTests();
