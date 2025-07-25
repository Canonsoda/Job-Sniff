from typing import List, Optional
from pydantic import BaseModel, Field

class Education(BaseModel):
    level: Optional[str] = Field(description="The degree or qualification (e.g., B.Tech, 12th Grade).")
    institution: Optional[str] = Field(description="The name of the educational institution.")
    board: Optional[str] = Field(description="The name of the board or university.")
    year: Optional[str] = Field(description="The year of completion or graduation.")
    percentage: Optional[str] = Field(description="The percentage or CGPA obtained.")

class WorkExperience(BaseModel):
    position: Optional[str] = Field(description="The job title or position held.")
    company: Optional[str] = Field(description="The name of the company.")
    duration: Optional[str] = Field(description="The start and end dates of the employment.")
    description: Optional[str] = Field(description="A description of responsibilities and achievements.")

class Suggestions(BaseModel):
    commonSkills: List[str] = Field(description="Widely used industry skills found in the resume (e.g., Python, SQL).")
    uniqueSkills: List[str] = Field(description="Specialized or niche skills found in the resume (e.g., LangChain, Huggingface).")


class ExtractedData(BaseModel):
    name: str = Field(description="The full name of the candidate.")
    email: Optional[str] = Field(description="The email address of the candidate.")
    phone: Optional[str] = Field(description="The phone number of the candidate.")
    skills: List[str] = Field(description="A list of all technical and soft skills mentioned.")
    cgpa: Optional[str] = Field(description="The final cumulative grade point average, if mentioned.")
    shortlisted: bool = Field(default=False, description="Set to false by default.")
    education: List[Education] = Field(description="A list of the candidate's educational qualifications.")
    workExperience: List[WorkExperience] = Field(description="A list of the candidate's previous work experiences.")
    suggestions: Suggestions = Field(description="Categorized list of skills based on their commonality.")

class ParsedResume(BaseModel):
    """The root model for the JSON output, containing all extracted resume data."""
    extractedData: ExtractedData = Field(description="Contains all the extracted information from the resume.")