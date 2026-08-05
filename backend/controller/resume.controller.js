import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Resume from "../models/resume.model.js";
import path from "path";
import elasticClient, {
  RESUME_INDEX,
  ensureResumeIndex,
  buildResumeDocument,
} from "../config/elasticSearch.js";
import {
  persistUpload,
  openDownload,
  deleteStored,
  discardUpload,
} from "../config/storage.js";

// A single parse takes ~40-55s, and the CV LLM service retries up to 3 times
// on rate limits, so the old 30s timeout cut off nearly every upload.
const CV_LLM_TIMEOUT_MS = Number(process.env.CV_LLM_TIMEOUT_MS) || 180000;

// The CV LLM service returns a JSON object, but older builds double-encoded it
// as a JSON string. Accept either shape.
const normalizeCvResponse = (data) => {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  const extractedData = parsed?.extractedData || parsed;

  if (!extractedData || typeof extractedData !== "object") {
    throw new Error("CV LLM service returned an unexpected payload");
  }
  return extractedData;
};

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
      timeout: CV_LLM_TIMEOUT_MS,
    });

    const extractedData = normalizeCvResponse(response.data);

    // Move the PDF into permanent storage (local disk or S3) now that parsing
    // succeeded, and keep the returned key on the record for downloads.
    const storageKey = await persistUpload(req.file);

    const resume = new Resume({
      user: req.user.id,
      originalFileName: req.file.originalname,
      storedFileName: storageKey,
      extractedData,
    });

    await resume.save();

    // Add to the Elasticsearch index
    await ensureResumeIndex();
    await elasticClient.index({
      index: RESUME_INDEX,
      id: resume._id.toString(),
      document: buildResumeDocument(req.user.id, extractedData),
      refresh: 'wait_for',
    });

    res.status(201).json({
      message: "Resume uploaded and processed",
      resumeId: resume._id,
      extractedData,
    });
  } catch (err) {
    console.error("Resume upload failed:", err);
    // Nothing was saved, so don't leave the uploaded file behind
    await discardUpload(req.file);
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
          timeout: CV_LLM_TIMEOUT_MS,
        });

        const extractedData = normalizeCvResponse(response.data);

        const storageKey = await persistUpload(file);

        const resume = new Resume({
          user: req.user.id,
          originalFileName: file.originalname,
          storedFileName: storageKey,
          extractedData,
        });

        await resume.save();

        // Add to the Elasticsearch index
        await ensureResumeIndex();
        await elasticClient.index({
          index: RESUME_INDEX,
          id: resume._id.toString(),
          document: buildResumeDocument(req.user.id, extractedData),
          refresh: 'wait_for',
        });

        results.push({
          fileName: file.originalname,
          success: true,
          resumeId: resume._id
        });

      } catch (error) {
        await discardUpload(file);
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
    // For HR users: search all resumes. For applicants: only their own.
    const filter = [];
    if (req.user.role === 'applicant') {
      filter.push({ term: { userId: req.user.id } });
    }

    if (minCgpa || maxCgpa) {
      const range = {};
      if (minCgpa) range.gte = parseFloat(minCgpa);
      if (maxCgpa) range.lte = parseFloat(maxCgpa);
      filter.push({ range: { cgpaValue: range } });
    }

    const must = query
      ? [{
          multi_match: {
            query,
            fields: [
              'name^3',
              'skills^2',
              'email',
              'education.level',
              'education.institution',
              'education.board',
              'workExperience.position',
              'workExperience.company',
              'workExperience.description',
            ],
            fuzziness: 'AUTO',
          },
        }]
      : [{ match_all: {} }];

    const result = await elasticClient.search({
      index: RESUME_INDEX,
      size: 100,
      query: { bool: { must, filter } },
    });

    res.json({
      results: result.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source
      }))
    });

  } catch (err) {
    // Nothing has been indexed yet — an empty result set is the honest answer
    if (err?.meta?.statusCode === 404) {
      return res.json({ results: [] });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateShortlist = async (req, res) => {
  const { id } = req.params;
  const shortlisted = req.body.shortlisted === true;

  try {
    // HR can shortlist any resume; applicants only their own
    const filter = { _id: id };
    if (req.user.role === 'applicant') filter.user = req.user.id;

    const resume = await Resume.findOneAndUpdate(
      filter,
      { "extractedData.shortlisted": shortlisted },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // Keep the search index in step, otherwise the Search page star is stale
    try {
      await elasticClient.update({
        index: RESUME_INDEX,
        id: resume._id.toString(),
        doc: { shortlisted },
        refresh: 'wait_for',
      });
    } catch (esError) {
      console.error('Failed to sync shortlist to search index:', esError.message);
    }

    res.json({ message: "Shortlist status updated", resume });
  } catch (err) {
    console.error('Failed to update shortlist:', err);
    res.status(500).json({ message: "Failed to update shortlist", error: err.message });
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

    // HR users can download any resume; applicants only their own
    if (req.user.role === "applicant" && resume.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const file = await openDownload(resume.storedFileName);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const downloadName = resume.originalFileName || path.basename(resume.storedFileName);
    res.setHeader("Content-Type", file.contentType);
    if (file.contentLength) res.setHeader("Content-Length", file.contentLength);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName.replace(/"/g, "")}"`
    );

    file.stream.on("error", (err) => {
      console.error("Resume stream failed:", err);
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    file.stream.pipe(res);
  } catch (err) {
    console.error("Resume download failed:", err);
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
    let filesRemoved = 0;
    for (const duplicate of duplicates) {
      // Collect storage keys before the records are gone, otherwise the files
      // are stranded with nothing left pointing at them.
      const doomed = await Resume.find({ _id: { $in: duplicate.delete } }).select('storedFileName');
      const keys = doomed.map((r) => r.storedFileName).filter(Boolean);

      await Resume.deleteMany({ _id: { $in: duplicate.delete } });
      deletedCount += duplicate.delete.length;

      // Keep the search index in step with MongoDB
      try {
        await elasticClient.deleteByQuery({
          index: RESUME_INDEX,
          query: { ids: { values: duplicate.delete.map(id => id.toString()) } },
          refresh: true,
        });
      } catch (esError) {
        if (esError?.meta?.statusCode !== 404) {
          console.error('Failed to remove duplicates from search index:', esError.message);
        }
      }

      filesRemoved += await deleteStored(keys);
    }
    
    res.json({
      message: `Cleaned up ${deletedCount} duplicate resumes`,
      filesRemoved,
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
    
    // Capture storage keys before deleting, so the files can be reclaimed too
    const doomed = await Resume.find(query).select('storedFileName');
    const keys = doomed.map((r) => r.storedFileName).filter(Boolean);

    // Delete all resumes for this user from MongoDB
    const result = await Resume.deleteMany(query);
    
    // Clear the same set of documents from the Elasticsearch index
    try {
      await elasticClient.deleteByQuery({
        index: RESUME_INDEX,
        query: req.user.role === 'applicant'
          ? { term: { userId: req.user.id } }
          : { match_all: {} },
        refresh: true,
      });
    } catch (esError) {
      if (esError?.meta?.statusCode !== 404) {
        console.log('Elasticsearch clear error (might be empty):', esError.message);
      }
    }
    
    const filesRemoved = await deleteStored(keys);

    res.json({
      message: `Cleared ${result.deletedCount} resumes from database`,
      deletedCount: result.deletedCount,
      filesRemoved
    });
    
  } catch (err) {
    res.status(500).json({ message: "Failed to clear resumes", error: err.message });
  }
};
