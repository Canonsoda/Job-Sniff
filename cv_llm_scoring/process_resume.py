import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_community.document_loaders import PyPDFLoader
from dotenv import load_dotenv
from formats import ParsedResume
load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
parser = PydanticOutputParser(pydantic_object=ParsedResume)

def extract_text_from_pdf(pdf_path):
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    resume_text = " ".join([doc.page_content for doc in docs])
    return resume_text

def call_model(doc_text):
    prompt_template = """
    You are an expert HR assistant specializing in parsing resume documents.
    Your task is to accurately extract information from the provided resume text and format it into a JSON object.

    Follow these instructions carefully:
    1.  Extract the information based on the schema provided below.
    2.  If a piece of information is not found in the resume, leave the corresponding field null.
    3.  Be precise and do not invent information.

    {format_instructions}

    Here is the resume text:
    ---
    {doc_text}
    ---
    """

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["resume_text"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    chain = prompt | llm | parser
    parsed_result = chain.invoke({"doc_text": doc_text})
    return parsed_result

def repair_json(json_draft):
    try:
        # For pydantic v1.8.2, use .dict() instead of .model_dump()
        json_output = json.dumps(json_draft.dict(), indent=2)
        print("done.")
    except Exception as e:
        print(f"An error occurred: {e}")

    parsed_data = json.loads(json_output)

    with open("parsed_resume.json", "w") as f:
        json.dump(parsed_data, f, indent=2)

    return json_output

def process_resume(pdf_path):
    doc_text = extract_text_from_pdf(pdf_path)
    json_draft = call_model(doc_text)
    final_json = repair_json(json_draft)
    return final_json
