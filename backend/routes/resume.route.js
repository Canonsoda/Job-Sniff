import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadResume, uploadMultipleResumes, searchResumes,shortListed,downloadResume,getDashboardStats,cleanupDuplicates,clearAllResumes } from "../controller/resume.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import Resume from "../models/resume.model.js";


const resumeRoute = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});


resumeRoute.post("/upload", authMiddleware, (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      return res.status(400).json({ message: "File upload error" });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadResume);

resumeRoute.post("/upload-multiple", authMiddleware, (req, res, next) => {
  upload.array("resumes", 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "One or more files too large. Maximum size is 5MB per file." });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: "Too many files. Maximum 10 files allowed." });
      }
      return res.status(400).json({ message: "File upload error" });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadMultipleResumes);

resumeRoute.get("/search", authMiddleware,searchResumes)
resumeRoute.get("/shortlisted",authMiddleware,shortListed)
resumeRoute.get("/dashboard-stats",authMiddleware,getDashboardStats)
resumeRoute.post("/cleanup-duplicates",authMiddleware,cleanupDuplicates)
resumeRoute.delete("/clear-all",authMiddleware,clearAllResumes)
resumeRoute.patch("/:id/shortlist", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { shortlisted } = req.body;

  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { "extractedData.shortlisted": shortlisted },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.json({ message: "Shortlist status updated", resume });
  } catch (err) {
    res.status(500).json({ message: "Failed to update shortlist", error: err.message });
  }
});

resumeRoute.get("/:id/download", authMiddleware, downloadResume)

export default resumeRoute