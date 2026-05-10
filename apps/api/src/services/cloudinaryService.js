const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

class CloudinaryService {
  constructor() {
    this.initialized = false;
    this.initializeClient();
  }

  initializeClient() {
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME && 
          process.env.CLOUDINARY_API_KEY && 
          process.env.CLOUDINARY_API_SECRET) {
        
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        this.initialized = true;
        console.log('✅ Cloudinary initialized successfully');
      } else {
        console.log('⚠️  Cloudinary credentials not found. File uploads will use fallback.');
        console.log('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary:', error.message);
    }
  }

  /**
   * Sanitize name for folder structure (remove special characters)
   */
  sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Upload resume to Cloudinary with structured folder path
   * Path: rezulyzer/companies/{companyName}/candidates/{candidateName}/resumes/{filename}
   * 
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} companyName - Company name
   * @param {string} candidateName - Candidate name (firstName lastName)
   * @param {string} candidateEmail - Candidate email (for metadata)
   * @returns {Promise<Object>} Upload result
   */
  async uploadResume(fileBuffer, originalName, companyName, candidateName, candidateEmail) {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'Cloudinary not initialized. Please configure credentials.'
        };
      }

      // Sanitize names for folder structure
      const sanitizedCompany = this.sanitizeName(companyName);
      const sanitizedCandidate = this.sanitizeName(candidateName);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = originalName.split('.').pop();
      const baseFileName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_');
      const uniqueFileName = `${baseFileName}_${timestamp}`;
      
      // Build folder path: rezulyzer/companies/{companyName}/candidates/{candidateName}/resumes
      const folderPath = `rezulyzer/companies/${sanitizedCompany}/candidates/${sanitizedCandidate}/resumes`;
      const publicId = `${folderPath}/${uniqueFileName}`;

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'raw', // For non-image files (PDF, DOC, etc.)
            folder: folderPath,
            context: {
              originalName: originalName,
              candidateEmail: candidateEmail,
              uploadDate: new Date().toISOString()
            },
            tags: ['resume', sanitizedCompany, sanitizedCandidate]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });

      return {
        success: true,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        originalName: originalName,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
        folderPath: folderPath,
        companyName: sanitizedCompany,
        candidateName: sanitizedCandidate,
        candidateEmail: candidateEmail
      };

    } catch (error) {
      console.error('Error uploading resume to Cloudinary:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload to Cloudinary'
      };
    }
  }

  /**
   * Delete resume from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteResume(publicId) {
    try {
      if (!this.initialized) {
        return { success: false, error: 'Cloudinary not initialized' };
      }

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });

      return {
        success: result.result === 'ok',
        result: result.result
      };
    } catch (error) {
      console.error('Error deleting resume from Cloudinary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all resumes for a candidate
   * @param {string} companyName - Company name
   * @param {string} candidateName - Candidate name
   * @returns {Promise<Array>} List of resumes
   */
  async listCandidateResumes(companyName, candidateName) {
    try {
      if (!this.initialized) {
        return [];
      }

      const sanitizedCompany = this.sanitizeName(companyName);
      const sanitizedCandidate = this.sanitizeName(candidateName);
      const folderPath = `rezulyzer/companies/${sanitizedCompany}/candidates/${sanitizedCandidate}/resumes`;

      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: folderPath,
        max_results: 100
      });

      return result.resources.map(resource => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        format: resource.format,
        bytes: resource.bytes,
        createdAt: resource.created_at
      }));
    } catch (error) {
      console.error('Error listing candidate resumes:', error);
      return [];
    }
  }

  /**
   * Get resume URL by public ID
   * @param {string} publicId - Cloudinary public ID
   * @returns {string} Secure URL
   */
  getResumeUrl(publicId) {
    if (!this.initialized) {
      return null;
    }
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true
    });
  }

  /**
   * Delete all resumes for a candidate
   * @param {string} companyName - Company name
   * @param {string} candidateName - Candidate name
   * @returns {Promise<Object>} Delete result
   */
  async deleteCandidateResumes(companyName, candidateName) {
    try {
      if (!this.initialized) {
        return { success: false, error: 'Cloudinary not initialized' };
      }

      const sanitizedCompany = this.sanitizeName(companyName);
      const sanitizedCandidate = this.sanitizeName(candidateName);
      const folderPath = `rezulyzer/companies/${sanitizedCompany}/candidates/${sanitizedCandidate}/resumes`;

      // Delete all resources in the folder
      const result = await cloudinary.api.delete_resources_by_prefix(folderPath, {
        resource_type: 'raw'
      });

      return {
        success: true,
        deleted: result.deleted
      };
    } catch (error) {
      console.error('Error deleting candidate resumes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CloudinaryService();
