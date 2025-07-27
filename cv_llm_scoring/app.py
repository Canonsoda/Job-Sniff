from flask import Flask, request, jsonify
import os
from process_resume import process_resume

app = Flask(__name__)

# Folder to store uploaded PDFs
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/parse-resume', methods=['POST'])
def post_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded with key 'resume'"}), 400

    file = request.files['resume']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Save the uploaded file
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        # Process the uploaded resume PDF
        final_json = process_resume(file_path)
        
        # Clean up the file after processing
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f'CV LLM file cleaned up: {file_path}')
        
        return jsonify(final_json)
    except Exception as e:
        # Clean up on error too
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001)