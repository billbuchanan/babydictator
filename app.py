from flask import Flask, request, jsonify
import subprocess
import json
import os
import logging
from datetime import datetime
from pathlib import Path
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()  # This will also print to console
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS with explicit parameters
CORS(app, resources={
    r"/*": {  # Allow CORS for all routes
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "max_age": 3600
    }
})

# Get the directory where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    """Root endpoint for connection testing"""
    logger.info("Root endpoint accessed")
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    })

@app.route('/api/keygen', methods=['POST'])
def keygen():
    try:
        # Get parameters from request
        data = request.get_json()
        out_file = data.get('out', 'keys.json')
        
        # Ensure we're using the correct path for the executable
        keygen_path = os.path.join(BASE_DIR, 'keygen.exe')
        if not os.path.exists(keygen_path):
            return jsonify({
                'error': 'Setup error',
                'details': f'Executable not found at {keygen_path}'
            }), 500
            
        # Run the keygen command
        result = subprocess.run(
            [keygen_path, f'--out={out_file}'],
            capture_output=True,
            text=True,
            cwd=BASE_DIR  # Set working directory
        )
        
        if result.returncode != 0:
            return jsonify({
                'error': 'Keygen failed',
                'details': result.stderr
            }), 500
            
        # Read the generated keys
        with open(os.path.join(BASE_DIR, out_file), 'r') as f:
            keys = json.load(f)
            
        return jsonify({
            'message': f'Keys generated successfully',
            'keys': keys
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/encrypt', methods=['POST', 'OPTIONS'])
def encrypt():
    """Encryption endpoint"""
    logger.info("Received encrypt request")
    logger.debug("Request Headers: %s", dict(request.headers))
    
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return '', 200
    
    try:
        # Get parameters from request
        data = request.get_json()
        logger.info("Request data: %s", data)
        
        if not data:
            logger.error("No JSON data received")
            return jsonify({
                'error': 'No JSON data received',
                'details': 'Request must include JSON data'
            }), 400
            
        dict_priv = data.get('dict_priv')
        alice_priv = data.get('alice_priv')
        x = data.get('x', '5')
        cm = data.get('cm', '99')
        out_file = data.get('out', 'cipher.json')
        
        logger.info("Processing encryption with params: x=%s, cm=%s", x, cm)
        
        if not dict_priv or not alice_priv:
            logger.error("Missing required parameters")
            return jsonify({
                'error': 'Missing required parameters',
                'details': 'Both dict_priv and alice_priv are required'
            }), 400
            
        # Ensure we're using the correct path for the executable
        encrypt_path = os.path.join(BASE_DIR, 'encrypt.exe')
        if not os.path.exists(encrypt_path):
            logger.error("Executable not found at %s", encrypt_path)
            return jsonify({
                'error': 'Setup error',
                'details': f'Executable not found at {encrypt_path}'
            }), 500
            
        # Run the encrypt command
        logger.info("Running encryption command with executable: %s", encrypt_path)
        cmd = [
            encrypt_path,
            f'--dict-priv={dict_priv}',
            f'--alice-priv={alice_priv}',
            f'--x={x}',
            f'--cm={cm}',
            f'--out={out_file}'
        ]
        logger.debug("Command: %s", ' '.join(cmd))
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
        
        logger.info("Encryption command output: %s", result.stdout)
        if result.stderr:
            logger.error("Encryption command error: %s", result.stderr)
        
        if result.returncode != 0:
            logger.error("Encryption failed with return code %d", result.returncode)
            return jsonify({
                'error': 'Encryption failed',
                'details': result.stderr
            }), 500
            
        # Read the generated cipher
        cipher_path = os.path.join(BASE_DIR, out_file)
        if not os.path.exists(cipher_path):
            logger.error("Cipher file not generated at %s", cipher_path)
            return jsonify({
                'error': 'Encryption failed',
                'details': 'Cipher file was not generated'
            }), 500
            
        with open(cipher_path, 'r') as f:
            cipher = json.load(f)
            
        logger.info("Encryption successful, returning cipher")
        return jsonify({
            'message': 'Encryption successful',
            'cipher': cipher,
            'output': result.stdout
        })
        
    except Exception as e:
        logger.exception("Error during encryption")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/decrypt-alice', methods=['POST', 'OPTIONS'])
def decrypt_alice():
    logger.info("Received decrypt-alice request")
    logger.debug("Request Headers: %s", dict(request.headers))
    
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        logger.info("Handling OPTIONS request")
        return '', 200
        
    try:
        # Get parameters from request
        data = request.get_json()
        logger.info("Request data: %s", data)
        
        alice_priv = data.get('alice_priv')
        cipher_data = data.get('cipher')
        max_search = data.get('max', '-1')
        
        if not alice_priv or not cipher_data:
            logger.error("Missing required parameters")
            return jsonify({
                'error': 'Missing required parameters',
                'details': 'alice_priv and cipher are required'
            }), 400
            
        # Write cipher data to temporary file
        temp_cipher_file = 'temp_cipher.json'
        logger.info("Writing cipher to temporary file: %s", temp_cipher_file)
        with open(os.path.join(BASE_DIR, temp_cipher_file), 'w') as f:
            json.dump(cipher_data, f)
            
        # Ensure we're using the correct path for the executable
        decrypt_alice_path = os.path.join(BASE_DIR, 'decrypt_alice.exe')
        if not os.path.exists(decrypt_alice_path):
            logger.error("Executable not found at %s", decrypt_alice_path)
            return jsonify({
                'error': 'Setup error',
                'details': f'Executable not found at {decrypt_alice_path}'
            }), 500
            
        # Run the decrypt command
        logger.info("Running decryption command with executable: %s", decrypt_alice_path)
        cmd = [
            decrypt_alice_path,
            f'--alice-priv={alice_priv}',
            f'--cipher={temp_cipher_file}',
            f'--max={max_search}'
        ]
        logger.debug("Command: %s", ' '.join(cmd))
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
        
        # Clean up temporary file
        try:
            os.remove(os.path.join(BASE_DIR, temp_cipher_file))
        except Exception as e:
            logger.warning("Failed to remove temporary cipher file: %s", e)
        
        logger.info("Decryption command output: %s", result.stdout)
        if result.stderr:
            logger.error("Decryption command error: %s", result.stderr)
        
        if result.returncode != 0:
            logger.error("Decryption failed with return code %d", result.returncode)
            return jsonify({
                'error': 'Decryption failed',
                'details': result.stderr
            }), 500
            
        return jsonify({
            'message': 'Decryption successful',
            'output': result.stdout
        })
        
    except Exception as e:
        logger.exception("Error during decryption")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/decrypt-dictator', methods=['POST'])
def decrypt_dictator():
    try:
        # Get parameters from request
        data = request.get_json()
        dict_priv = data.get('dict_priv')
        cipher_file = data.get('cipher', 'cipher.json')
        
        if not dict_priv:
            return jsonify({
                'error': 'Missing required parameters',
                'details': 'dict_priv is required'
            }), 400
            
        # Ensure we're using the correct path for the executable
        decrypt_dictator_path = os.path.join(BASE_DIR, 'decrypt_dictator.exe')
        if not os.path.exists(decrypt_dictator_path):
            return jsonify({
                'error': 'Setup error',
                'details': f'Executable not found at {decrypt_dictator_path}'
            }), 500
            
        # Run the decrypt command
        result = subprocess.run([
            decrypt_dictator_path,
            f'--dict-priv={dict_priv}',
            f'--cipher={cipher_file}'
        ], capture_output=True, text=True, cwd=BASE_DIR)
        
        if result.returncode != 0:
            return jsonify({
                'error': 'Decryption failed',
                'details': result.stderr
            }), 500
            
        return jsonify({
            'message': 'Decryption successful',
            'output': result.stdout
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting application")
    logger.info("Working directory: %s", BASE_DIR)
    logger.info("Checking for executables:")
    
    for exe in ['keygen.exe', 'encrypt.exe', 'decrypt_alice.exe', 'decrypt_dictator.exe']:
        path = os.path.join(BASE_DIR, exe)
        exists = os.path.exists(path)
        logger.info("  %s: %s at %s", exe, 'Found' if exists else 'Not found', path)
    
    logger.info("Starting Flask server with CORS enabled...")
    logger.info("Allowed origins: http://localhost:3000")
    logger.info("Allowed methods: GET, POST, OPTIONS")
    
    app.run(host='0.0.0.0', port=5000, debug=True) 