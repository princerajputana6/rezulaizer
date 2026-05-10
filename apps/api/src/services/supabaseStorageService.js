const { createClient } = require('@supabase/supabase-js');
const path = require('path');

class SupabaseStorageService {
  constructor() {
    this.supabase = null;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'rezulyzer-files';
    this.initializeClient();
  }

  initializeClient() {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        console.log('✅ Supabase Storage Client initialized successfully');
      } else {
        console.log('⚠️  Supabase credentials not found. File uploads will be disabled.');
        console.log('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error.message);
    }
  }

  /**
   * Upload resume file to Supabase Storage with candidate email-based folder structure
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} companyId - Company ID
   * @param {string} candidateEmail - Candidate email (used as folder name)
   * @param {string} candidateId - Candidate ID (optional)
   * @returns {Promise<Object>} Upload result
   */
  async uploadResume(fileBuffer, originalName, mimeType, companyId, candidateEmail, candidateId = null) {
    try {
      // Check if Supabase client is available
      if (!this.supabase) {
        console.log('⚠️  Supabase not configured, using local file storage fallback');
        return this.saveLocalFile(fileBuffer, originalName, companyId, candidateEmail, candidateId);
      }

      // Sanitize candidate email for folder name (replace special characters)
      const sanitizedEmail = candidateEmail
        .toLowerCase()
        .replace(/[^a-z0-9@.-]/g, '_') // Replace special chars with underscore
        .replace(/[.]/g, '_'); // Replace dots with underscore for better folder structure
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(originalName);
      const fileName = `${timestamp}_${randomString}${extension}`;
      
      // Structure: companyid/candidates/[candidate-email]/resumes/filename
      const filePath = `${companyId}/candidates/${sanitizedEmail}/resumes/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          metadata: {
            originalName: originalName,
            uploadDate: new Date().toISOString(),
            companyId: companyId,
            candidateId: candidateId || 'unknown',
            candidateEmail: candidateEmail,
            sanitizedEmail: sanitizedEmail
          }
        });

      if (error) {
        console.error('Error uploading resume to Supabase:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      
      return {
        success: true,
        fileUrl: urlData.publicUrl,
        filePath: filePath,
        originalName,
        bucket: this.bucketName,
        companyId,
        candidateId,
        candidateEmail,
        candidateFolder: sanitizedEmail
      };
    } catch (error) {
      console.error('Error uploading resume to Supabase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload file to Supabase Storage (legacy method for backward compatibility)
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} folder - Storage folder (default: 'resumes')
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(fileBuffer, originalName, mimeType, folder = 'resumes') {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = path.extname(originalName);
      const uniqueFileName = `${folder}/${timestamp}_${randomString}${extension}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          metadata: {
            originalName: originalName,
            uploadDate: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Error uploading file to Supabase:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);
      
      return {
        success: true,
        fileUrl: urlData.publicUrl,
        filePath: uniqueFileName,
        originalName,
        bucket: this.bucketName
      };
    } catch (error) {
      console.error('Error uploading file to Supabase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate signed URL for secure file access
   * @param {string} filePath - File path in storage
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        console.error('Error generating signed URL:', error);
        throw error;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - File path in storage
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting file from Supabase:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }
  }

  /**
   * Get file metadata from Supabase Storage
   * @param {string} filePath - File path in storage
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(filePath) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path.dirname(filePath), {
          search: path.basename(filePath)
        });
      
      if (error) {
        console.error('Error getting file metadata:', error);
        throw error;
      }
      
      const file = data.find(f => f.name === path.basename(filePath));
      if (!file) {
        throw new Error('File not found');
      }
      
      return {
        name: file.name,
        size: file.metadata?.size,
        lastModified: file.updated_at,
        contentType: file.metadata?.mimetype,
        metadata: file.metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Check if file exists in Supabase Storage
   * @param {string} filePath - File path in storage
   * @returns {Promise<boolean>} File exists status
   */
  async fileExists(filePath) {
    try {
      await this.getFileMetadata(filePath);
      return true;
    } catch (error) {
      if (error.message === 'File not found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param {string} folderPath - Folder path to list
   * @param {Object} options - List options
   * @returns {Promise<Array>} List of files
   */
  async listFiles(folderPath = '', options = {}) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(folderPath, options);
      
      if (error) {
        console.error('Error listing files:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * List all files for a specific candidate
   * @param {string} companyId - Company ID
   * @param {string} candidateEmail - Candidate email
   * @returns {Promise<Array>} List of candidate files
   */
  async listCandidateFiles(companyId, candidateEmail) {
    try {
      const sanitizedEmail = candidateEmail
        .toLowerCase()
        .replace(/[^a-z0-9@.-]/g, '_')
        .replace(/[.]/g, '_');
      
      const candidateFolderPath = `${companyId}/candidates/${sanitizedEmail}/resumes`;
      
      const files = await this.listFiles(candidateFolderPath);
      
      // Add full file paths and public URLs
      return files.map(file => ({
        ...file,
        fullPath: `${candidateFolderPath}/${file.name}`,
        publicUrl: this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(`${candidateFolderPath}/${file.name}`).data.publicUrl,
        candidateEmail,
        sanitizedEmail
      }));
    } catch (error) {
      console.error('Error listing candidate files:', error);
      throw error;
    }
  }

  /**
   * List all candidates for a company (based on folder structure)
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} List of candidate folders
   */
  async listCompanyCandidates(companyId) {
    try {
      const candidatesFolderPath = `${companyId}/candidates`;
      
      const folders = await this.listFiles(candidatesFolderPath);
      
      // Filter only directories (candidate email folders)
      const candidateFolders = folders.filter(item => !item.name.includes('.'));
      
      return candidateFolders.map(folder => ({
        sanitizedEmail: folder.name,
        folderPath: `${candidatesFolderPath}/${folder.name}`,
        lastModified: folder.updated_at,
        companyId
      }));
    } catch (error) {
      console.error('Error listing company candidates:', error);
      throw error;
    }
  }

  /**
   * Delete all files for a specific candidate
   * @param {string} companyId - Company ID
   * @param {string} candidateEmail - Candidate email
   * @returns {Promise<boolean>} Success status
   */
  async deleteCandidateFiles(companyId, candidateEmail) {
    try {
      const files = await this.listCandidateFiles(companyId, candidateEmail);
      
      if (files.length === 0) {
        return true; // No files to delete
      }
      
      const filePaths = files.map(file => file.fullPath);
      
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(filePaths);
      
      if (error) {
        console.error('Error deleting candidate files:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting candidate files:', error);
      return false;
    }
  }
}

module.exports = new SupabaseStorageService();
