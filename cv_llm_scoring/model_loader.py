import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from transformers.pipelines import pipeline

MODEL_NAME = "microsoft/phi-2"

def load_model():
    LOCAL_MODEL_PATH = "/home/sapien/dev/projects/Job-Sniff/cv_llm_scoring/models/phi-1_5"
    tokenizer = AutoTokenizer.from_pretrained(
        LOCAL_MODEL_PATH,
        local_files_only=True,
        trust_remote_code=True
    )

    model = AutoModelForCausalLM.from_pretrained(
        LOCAL_MODEL_PATH,
        local_files_only=True,
        trust_remote_code=True,
        device_map="cpu"
    )

    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        device_map="cpu",
        torch_dtype=torch.float16 
    )
    print("model loaded successfully")
    return pipe

model_pipe = load_model()


# def generate_json(resume_text: str):
#     prompt = """
# You are a resume parser.

# Extract the following from the text below in **JSON** format:
# - Name
# - Email
# - Phone
# - Education (degree, institute, year)
# - Work Experience (title, company, duration)
# - Skills

# Resume:
# \"\"\"{resume_text}\"\"\"
# Only return JSON.
# """
#     result = model_pipe(prompt, max_new_tokens=1024, do_sample=False)[0]['generated_text']
#     return result
