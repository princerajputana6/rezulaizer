const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const SuperAdmin = require('../src/models/SuperAdmin');
require('dotenv').config();

const checkCompaniesAndCredentials = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://biztreck:biztreck@biztreck.xvbxe4g.mongodb.net/rezulyzer';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    console.log('\n=== CHECKING COMPANIES IN DATABASE ===\n');
    
    // Get all companies
    const companies = await Company.find({}).select('companyName email firstName lastName isActive isEmailVerified createdAt lastLogin');
    
    if (companies.length === 0) {
      console.log('❌ No companies found in the database');
    } else {
      console.log(`✅ Found ${companies.length} company(ies):`);
      
      companies.forEach((company, index) => {
        console.log(`\n--- Company ${index + 1} ---`);
        console.log(`Company Name: ${company.companyName || 'N/A'}`);
        console.log(`Contact Name: ${company.firstName || 'N/A'} ${company.lastName || 'N/A'}`);
        console.log(`Email: ${company.email}`);
        console.log(`Active: ${company.isActive}`);
        console.log(`Email Verified: ${company.isEmailVerified}`);
        console.log(`Created: ${company.createdAt}`);
        console.log(`Last Login: ${company.lastLogin || 'Never'}`);
        console.log(`ID: ${company._id}`);
      });
    }
    
    // Check if there are any admin-like records in companies collection
    console.log('\n=== SEARCHING FOR ADMIN-LIKE COMPANIES ===');
    const adminCompanies = await Company.find({
      $or: [
        { email: { $regex: /admin/i } },
        { companyName: { $regex: /admin/i } },
        { firstName: { $regex: /admin/i } }
      ]
    });
    
    if (adminCompanies.length > 0) {
      console.log(`Found ${adminCompanies.length} admin-like company record(s):`);
      adminCompanies.forEach((company, index) => {
        console.log(`\n--- Admin Company ${index + 1} ---`);
        console.log(`Company Name: ${company.companyName}`);
        console.log(`Email: ${company.email}`);
        console.log(`Name: ${company.firstName} ${company.lastName}`);
      });
    }
    
    // Check all collections for any company-related data
    console.log('\n=== CHECKING ALL COLLECTIONS ===');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Check for records in companies collection directly
    console.log('\n=== RAW COMPANIES COLLECTION CHECK ===');
    const rawCompanies = await mongoose.connection.db.collection('companies').find({}).toArray();
    console.log(`Raw companies count: ${rawCompanies.length}`);
    
    if (rawCompanies.length > 0) {
      console.log('\nFirst few raw company records:');
      rawCompanies.slice(0, 3).forEach((company, index) => {
        console.log(`\n--- Raw Company ${index + 1} ---`);
        console.log('Email:', company.email || 'N/A');
        console.log('Company Name:', company.companyName || 'N/A');
        console.log('Name:', (company.firstName || '') + ' ' + (company.lastName || ''));
        console.log('Active:', company.isActive);
        console.log('Created:', company.createdAt);
        console.log('All fields:', Object.keys(company));
      });
    }
    
    // Check for any test/demo companies
    console.log('\n=== SEARCHING FOR TEST/DEMO COMPANIES ===');
    const testCompanies = await Company.find({
      $or: [
        { email: { $regex: /(test|demo|example)/i } },
        { companyName: { $regex: /(test|demo|example)/i } }
      ]
    });
    
    if (testCompanies.length > 0) {
      console.log(`Found ${testCompanies.length} test/demo company(ies):`);
      testCompanies.forEach((company, index) => {
        console.log(`\n--- Test Company ${index + 1} ---`);
        console.log(`Company Name: ${company.companyName}`);
        console.log(`Email: ${company.email}`);
        console.log(`Password: [Check seeder files for default password]`);
      });
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Companies: ${companies.length}`);
    console.log(`Active Companies: ${companies.filter(c => c.isActive).length}`);
    console.log(`Verified Companies: ${companies.filter(c => c.isEmailVerified).length}`);
    
    if (companies.length === 0) {
      console.log('\n💡 To create a test company, run:');
      console.log('node scripts/createTestCompany.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkCompaniesAndCredentials();
