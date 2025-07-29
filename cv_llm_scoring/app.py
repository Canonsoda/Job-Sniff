from flask import Flask, request, jsonify
import os
from process_resume import process_resume
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Folder to store uploaded PDFs
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'service': 'CV LLM Scoring',
        'version': '1.0.0'
    })

@app.route('/parse-resume', methods=['POST'])
def post_resume():
    """Parse uploaded resume PDF and extract structured data"""
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded with key 'resume'"}), 400
        
        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        # Create unique filename to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        # Save the uploaded file
        file.save(file_path)
        logger.info(f"File saved: {file_path}")
        
        try:
            # Process the uploaded resume PDF
            final_json = process_resume(file_path)
            logger.info(f"Resume processed successfully: {file.filename}")
            
            # Clean up the file after processing
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f'CV LLM file cleaned up: {file_path}')
            except Exception as cleanup_error:
                logger.error(f'Failed to cleanup file {file_path}: {cleanup_error}')
            
            return jsonify(final_json)
            
        except Exception as e:
            logger.error(f"Error processing resume {file.filename}: {str(e)}")
            
            # Clean up on error too
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f'CV LLM file cleaned up on error: {file_path}')
            except Exception as cleanup_error:
                logger.error(f'Failed to cleanup file on error {file_path}: {cleanup_error}')
            
            return jsonify({"error": str(e)}), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in post_resume: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({"error": "Something went wrong"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '0.0.0.0')
    
    logger.info(f"Starting CV LLM Scoring service on {host}:{port}")
    app.run(host=host, port=port, debug=False)