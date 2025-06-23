import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  extractedData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    cgpa: String,
    shortlisted: { type: Boolean, default: false },
    education: [
      {
        level: String,
        institution: String,
        board: String,    
        year: String,     
        percentage: String
      }
    ],
    workExperience: [
      {
        position: String,
        company: String,
        duration: String,
        description: String
      }
    ],
  },
  originalFileName: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
