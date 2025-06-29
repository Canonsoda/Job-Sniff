from langchain_community.document_loaders import PyPDFLoader
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from model_loader import load_model
import tempfile

app = FastAPI()
model = load_model()  

def extract_text_from_pdf(file: UploadFile) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
        contents = file.file.read()
        temp.write(contents)
        temp_path = temp.name
    loader = PyPDFLoader(temp_path)
    docs = loader.load()
    resume_text = " ".join([doc.page_content for doc in docs])
    return resume_text

@app.post("/parse-resume/")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return JSONResponse(content={"error": "Please upload a valid PDF file."}, status_code=400)
    
    resume_text = extract_text_from_pdf(file)

    prompt = """
    You are an expert resume parser. Extract structured data from the following resume text and return it in the exact JSON format below. Additionally, based on the skills listed, add a 'suggestions' field that contains:
    - 'commonSkills': widely used industry skills (e.g., Python, SQL)
    - 'uniqueSkills': specialized, niche, or rare skills (e.g., Langchain, Huggingface)

    Respond only with valid JSON in the exact format shown:

    {{
    "extractedData": {{
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "1234567890",
        "skills": ["Skill1", "Skill2"],
        "cgpa": "8.5",
        "shortlisted": false,
        "education": [
        {{
            "level": "Degree",
            "institution": "Institute Name",
            "board": "Board/University",
            "year": "Year",
            "percentage": "Percentage"
        }}
        ],
        "workExperience": [
        {{
            "position": "Intern",
            "company": "Company",
            "duration": "Duration",
            "description": "What the candidate did."
        }}
        ],
        "suggestions": {{
        "commonSkills": ["CommonSkill1", "CommonSkill2"],
        "uniqueSkills": ["UniqueSkill1", "UniqueSkill2"]
        }}
    }}
    }}

    Resume Text:
    {resume_text}
    """

    output = model(prompt, max_new_tokens=1024, do_sample=True)[0]["generated_text"]

    return JSONResponse(content={"result": output})

