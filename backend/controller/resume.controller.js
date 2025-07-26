import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Resume from "../models/resume.model.js";
import elasticClient from "../config/elasticSearch.js";
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
    });

    const extractedData = JSON.parse(response.data);

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
      name: extractedData.extractedData.name,
      email: extractedData.extractedData.email,
      phone: extractedData.extractedData.phone,
      cgpa: extractedData.extractedData.cgpa,
      skills: extractedData.extractedData.skills ? extractedData.extractedData.skills.join(', ') : '',
      education: extractedData.extractedData.education || [],
      workExperience: extractedData.extractedData.workExperience || []
    }]);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: "Resume uploaded and processed",
      resumeId: resume._id,
      extractedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Resume parsing failed", error: err.message });
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
    
    if (minCgpa || maxCgpa) {
      searchParams.filter = [];
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
    const resumes = await Resume.find({
      user: req.user.id,
      "extractedData.shortlisted": true
    });
    res.json({ resumes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shortlisted resumes" });
  }
};

export const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const filePath = path.join(process.cwd(), "uploads", resume.originalFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.download(filePath, resume.originalFileName);
  } catch (err) {
    res.status(500).json({ message: "Download failed", error: err.message });
  }
};
