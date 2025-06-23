import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadResume , searchResumes,shortListed,downloadResume } from "../controller/resume.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";


const resumeRoute = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


resumeRoute.post("/upload", authMiddleware, upload.single("resume"), uploadResume);

resumeRoute.get("/search", authMiddleware,searchResumes)
resumeRoute.get("/shortlisted",authMiddleware,shortListed)

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