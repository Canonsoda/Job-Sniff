import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import Resume from "../models/resume.model.js";
import elasticClient from "../config/elasticSearch.js";
import path from "path";


export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const formData = new FormData();
    formData.append("resume", fs.createReadStream(req.file.path));

    const response = await axios.post("http://localhost:5001/parse-resume", formData, {
      headers: formData.getHeaders(),
    });

    const extractedData = response.data;

    const resume = new Resume({
      user: req.user.id,
      originalFileName: req.file.originalname,
      extractedData,
    });

    await resume.save();

    await elasticClient.index({
      index: 'resumes',
      id: resume._id.toString(),
      document: {
        userId: req.user.id,
        name: extractedData.name,
        email: extractedData.email,
        phone: extractedData.phone,
        cgpa: extractedData.cgpa,
        skills: extractedData.skills.join(', '),
        // rawText: extractedData.rawText, ← only include if available
      },
    });

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
    const elasticQuery = {
      bool: {
        must: [],
        filter: []
      }
    };

    if (query) {
      elasticQuery.bool.must.push({
        multi_match: {
          query,
          fields: ['name', 'email', 'phone', 'skills', 'rawText'],
          fuzziness: "auto"
        }
      });
    }

    if (minCgpa || maxCgpa) {
      elasticQuery.bool.filter.push({
        range: {
          cgpa: {
            ...(minCgpa && { gte: parseFloat(minCgpa) }),
            ...(maxCgpa && { lte: parseFloat(maxCgpa) }),
          }
        }
      });
    }

    const result = await elasticClient.search({
      index: 'resumes',
      query: elasticQuery
    });

    res.json({
      results: result.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source
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
