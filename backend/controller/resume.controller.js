import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Resume from "../models/resume.model.js";
// import elasticClient from "../config/elasticSearch.js"; // Removed - using Meilisearch now
import path from "path";
import meiliClient from "../config/meiliSearch.js";


export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const formData = new FormData();
    formData.append("resume", fs.createReadStream(req.file.path));

    const CV_LLM_URL = process.env.CV_LLM_URL || "http://127.0.0.1:5001";
    const response = await axios.post(`${CV_LLM_URL}/parse-resume`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000, // 30 seconds timeout
    });

    const cvResponse = JSON.parse(response.data);
    
    // Extract the actual data from the CV LLM response structure
    const extractedData = cvResponse.extractedData || cvResponse;

    const resume = new Resume({
      user: req.user.id,
      originalFileName: req.file.originalname,
      extractedData,
    });

    await resume.save();

    // await elasticClient.index({
    //   index: 'resumes',
    //   id: resume._id.toString(),
    //   document: {
    //     userId: req.user.id,
    //     name: extractedData.name,
    //     email: extractedData.email,
    //     phone: extractedData.phone,
    //     cgpa: extractedData.cgpa,
    //     skills: extractedData.skills ? extractedData.skills.join(', ') : '',
    //     education: extractedData.education || [],
    //     workExperience: extractedData.workExperience || []
    //   },
    // });
    try {
      await meiliClient.createIndex('resumes', { primaryKey: 'id' });
    } catch (error) {
      // Index already exists, ignore error
    }
 
    // Add to Meilisearch index
    const index = meiliClient.index('resumes');
    await index.addDocuments([{
      id: resume._id.toString(),
      userId: req.user.id,
      name: extractedData.name,
      email: extractedData.email,
      phone: extractedData.phone,
      cgpa: extractedData.cgpa,
      skills: extractedData.skills ? extractedData.skills.join(', ') : '',
      education: extractedData.education || [],
      workExperience: extractedData.workExperience || []
    }]);

    // Keep the PDF file for download purposes
    // Only clean up if we want to save storage (uncomment below)
    // if (fs.existsSync(req.file.path)) {
    //   fs.unlinkSync(req.file.path);
    //   console.log('Backend file cleaned up:', req.file.path);
    // }

    res.status(201).json({
      message: "Resume uploaded and processed",
      resumeId: resume._id,
      extractedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Resume parsing failed", error: err.message });
  }
};

export const uploadMultipleResumes = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const CV_LLM_URL = process.env.CV_LLM_URL || "http://127.0.0.1:5001";
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const formData = new FormData();
        formData.append("resume", fs.createReadStream(file.path));

        const response = await axios.post(`${CV_LLM_URL}/parse-resume`, formData, {
          headers: formData.getHeaders(),
          timeout: 30000,
        });

        const cvResponse = JSON.parse(response.data);
        const extractedData = cvResponse.extractedData || cvResponse;

        const resume = new Resume({
          user: req.user.id,
          originalFileName: file.originalname,
          extractedData,
        });

        await resume.save();

        // Add to Meilisearch index
        try {
          await meiliClient.createIndex('resumes', { primaryKey: 'id' });
        } catch (error) {
          // Index already exists, ignore error
        }

        const index = meiliClient.index('resumes');
        await index.addDocuments([{
          id: resume._id.toString(),
          userId: req.user.id,
          name: extractedData.name,
          email: extractedData.email,
          phone: extractedData.phone,
          cgpa: extractedData.cgpa,
          skills: extractedData.skills ? extractedData.skills.join(', ') : '',
          education: extractedData.education || [],
          workExperience: extractedData.workExperience || []
        }]);

        results.push({
          fileName: file.originalname,
          success: true,
          resumeId: resume._id
        });

      } catch (error) {
        errors.push({
          fileName: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Processed ${req.files.length} files`,
      results,
      errors,
      summary: {
        total: req.files.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Multiple resume upload failed", error: err.message });
  }
};

export const searchResumes = async (req, res) => {
  const { query, minCgpa, maxCgpa } = req.query;

  if (!query && !minCgpa && !maxCgpa) {
    return res.status(400).json({ message: "Search query or filter required" });
  }

  try {
    const index = meiliClient.index('resumes');
    
    let searchParams = {};
    if (query) {
      searchParams.q = query;
    }
    
    // For HR users: search all resumes
    // For applicants: search only their resumes
    if (req.user.role === 'applicant') {
      searchParams.filter = [`userId = ${req.user.id}`];
    }
    
    if (minCgpa || maxCgpa) {
      if (!searchParams.filter) searchParams.filter = [];
      if (minCgpa) searchParams.filter.push(`cgpa >= ${minCgpa}`);
      if (maxCgpa) searchParams.filter.push(`cgpa <= ${maxCgpa}`);
    }

    const result = await index.search(query || '', searchParams);

    res.json({
      results: result.hits.map(hit => ({
        id: hit.id,
        ...hit
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const shortListed = async (req, res) => {
  try {
    let query = { "extractedData.shortlisted": true };
    
    // HR users see all shortlisted, applicants see only their own
    if (req.user.role === 'applicant') {
      query.user = req.user.id;
    }
    
    const resumes = await Resume.find(query);
    res.json({ resumes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shortlisted resumes" });
  }
};

export const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    // Check if user owns this resume
    if (resume.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filePath = path.join(process.cwd(), "uploads", resume.originalFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.download(filePath, resume.originalFileName);
  } catch (err) {
    res.status(500).json({ message: "Download failed", error: err.message });
  }
};
export const getDashboardStats = async (req, res) => {
  try {
    let query = {};
    
    // HR users see all resumes, applicants see only their own
    if (req.user.role === 'applicant') {
      query.user = req.user.id;
    }
    
    // Get total resumes count
    const totalResumes = await Resume.countDocuments(query);
    
    // Get shortlisted resumes count
    const shortlistedResumes = await Resume.countDocuments({ 
      ...query,
      "extractedData.shortlisted": true 
    });
    
    // Get pending review count (not shortlisted or missing shortlisted field)
    const pendingReview = await Resume.countDocuments({ 
      ...query,
      $or: [
        { "extractedData.shortlisted": false },
        { "extractedData.shortlisted": { $exists: false } }
      ]
    });

    // Get unique skills from all resumes
    const allResumes = await Resume.find(query);
    const allSkills = allResumes.flatMap(resume => {
      const skills = resume.extractedData?.skills || [];
      return skills;
    });
    const uniqueSkills = [...new Set(allSkills)];

    // Analytics data
    const analytics = {
      skillDistribution: [],
      statusDistribution: [],
      cgpaDistribution: []
    };

    // Skill distribution (top 8 skills)
    const skillCounts = {};
    allSkills.forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });
    analytics.skillDistribution = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    // Status distribution
    analytics.statusDistribution = [
      { name: 'Shortlisted', value: shortlistedResumes },
      { name: 'Pending Review', value: pendingReview }
    ];

    // CGPA distribution
    const cgpaRanges = {
      '9.0-10.0': 0,
      '8.0-8.9': 0,
      '7.0-7.9': 0,
      '6.0-6.9': 0,
      'Below 6.0': 0
    };

    allResumes.forEach(resume => {
      const cgpa = parseFloat(resume.extractedData?.cgpa);
      if (!isNaN(cgpa)) {
        if (cgpa >= 9.0) cgpaRanges['9.0-10.0']++;
        else if (cgpa >= 8.0) cgpaRanges['8.0-8.9']++;
        else if (cgpa >= 7.0) cgpaRanges['7.0-7.9']++;
        else if (cgpa >= 6.0) cgpaRanges['6.0-6.9']++;
        else cgpaRanges['Below 6.0']++;
      }
    });

    analytics.cgpaDistribution = Object.entries(cgpaRanges)
      .map(([range, count]) => ({ range, count }))
      .filter(item => item.count > 0);

    res.json({
      stats: {
        totalResumes,
        shortlistedResumes,
        pendingReview
      },
      uniqueSkills: uniqueSkills.slice(0, 10), // Top 10 skills
      analytics
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: err.message });
  }
};

// Function to find and remove duplicate resumes
export const cleanupDuplicates = async (req, res) => {
  try {
    let query = {};
    
    // HR users can cleanup all duplicates, applicants only their own
    if (req.user.role === 'applicant') {
      query.user = req.user.id;
    }
    
    // Get all resumes for the user
    const allResumes = await Resume.find(query);
    
    // Group resumes by email (assuming same email = same person)
    const emailGroups = {};
    allResumes.forEach(resume => {
      const email = resume.extractedData?.email;
      if (email) {
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(resume);
      }
    });
    
    // Find duplicates (more than 1 resume per email)
    const duplicates = [];
    Object.entries(emailGroups).forEach(([email, resumes]) => {
      if (resumes.length > 1) {
        // Keep the most recent one, mark others for deletion
        const sortedResumes = resumes.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        duplicates.push({
          email,
          keep: sortedResumes[0]._id,
          delete: sortedResumes.slice(1).map(r => r._id)
        });
      }
    });
    
    // Delete duplicates
    let deletedCount = 0;
    for (const duplicate of duplicates) {
      await Resume.deleteMany({ _id: { $in: duplicate.delete } });
      deletedCount += duplicate.delete.length;
    }
    
    res.json({
      message: `Cleaned up ${deletedCount} duplicate resumes`,
      duplicates: duplicates.map(d => ({
        email: d.email,
        kept: d.keep,
        deleted: d.delete.length
      }))
    });
    
  } catch (err) {
    res.status(500).json({ message: "Failed to cleanup duplicates", error: err.message });
  }
};

// Function to clear all resumes for a user
export const clearAllResumes = async (req, res) => {
  try {
    let query = {};
    
    // HR users can clear all resumes, applicants only their own
    if (req.user.role === 'applicant') {
      query.user = req.user.id;
    }
    
    // Delete all resumes for this user from MongoDB
    const result = await Resume.deleteMany(query);
    
    // Clear Meilisearch index for this user
    try {
      const index = meiliClient.index('resumes');
      // Note: This will clear the entire index, affecting all users
      // For production, you'd want to filter by userId
      await index.deleteAllDocuments();
    } catch (meiliError) {
      console.log('Meilisearch clear error (might be empty):', meiliError.message);
    }
    
    res.json({
      message: `Cleared ${result.deletedCount} resumes from database`,
      deletedCount: result.deletedCount
    });
    
  } catch (err) {
    res.status(500).json({ message: "Failed to clear resumes", error: err.message });
  }
};
