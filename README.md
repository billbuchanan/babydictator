# Anamorphic API

This Flask API wraps the anamorphic encryption/decryption functionality, providing HTTP endpoints for key generation, encryption, and decryption operations.

## Prerequisites

### 1. Install Go
1. Download Go from the [official website](https://golang.org/dl/)
2. Follow the installation instructions for your operating system
3. Verify installation by opening a terminal/command prompt and running:
```bash
go version
```

### 2. Install Go Dependencies
The project requires the following Go packages:
```bash
go get github.com/btcsuite/btcd/btcec
go get github.com/coinbase/kryptology/pkg/core/curves
```

### 3. Install Python
1. Download Python 3.8+ from the [official website](https://www.python.org/downloads/)
2. During installation, make sure to check "Add Python to PATH"
3. Verify installation:
```bash
python --version
```

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize Go module and build executables:
```bash
# Initialize Go module
go mod init anamorphic
go mod tidy

# Build executables
go build -o keygen.exe keygen.go
go build -o encrypt.exe encrypt.go
go build -o decrypt_alice.exe decrypt_alice.go
go build -o decrypt_dictator.exe decrypt_dictator.go
```

3. Run the Flask application:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## Troubleshooting

### Common Go Issues
1. If you see "go: command not found":
   - Make sure Go is properly installed
   - Check if Go is added to your PATH
   - Try restarting your terminal/command prompt

2. If you see "go.mod file not found":
   - Make sure you're in the correct directory
   - Run `go mod init anamorphic` first

3. If you see dependency errors:
   - Run `go mod tidy` to resolve dependencies
   - If specific packages are missing, install them manually using `go get`

### Common Python Issues
1. If you see "python: command not found":
   - Make sure Python is properly installed
   - Check if Python is added to your PATH
   - Try using `python3` instead of `python`

2. If you see pip installation errors:
   - Try updating pip: `python -m pip install --upgrade pip`
   - If behind a proxy, configure pip accordingly
   - Try installing dependencies one by one

## API Endpoints

### 1. Generate Keys
```http
POST /api/keygen
```

**Request Body:**
```json
{
    "out": "keys.json"  // Optional, defaults to "keys.json"
}
```

**Response:**
```json
{
    "message": "Keys generated successfully",
    "keys": {
        "dictator": {
            "priv": "...",
            "pub": "..."
        },
        "alice": {
            "priv": "...",
            "pub": "..."
        }
    }
}
```

### 2. Encrypt Message
```http
POST /api/encrypt
```

**Request Body:**
```json
{
    "dict_priv": "...",  // Required
    "alice_priv": "...",  // Required
    "x": "5",            // Optional, defaults to "5"
    "cm": "99",         // Optional, defaults to "99"
    "out": "cipher.json" // Optional, defaults to "cipher.json"
}
```

**Response:**
```json
{
    "message": "Encryption successful",
    "cipher": {
        "c0": "...",
        "c1": "..."
    },
    "output": "..."
}
```

### 3. Decrypt as Alice
```http
POST /api/decrypt-alice
```

**Request Body:**
```json
{
    "alice_priv": "...",     // Required
    "cipher": "cipher.json", // Optional, defaults to "cipher.json"
    "max": "-1"             // Optional, defaults to "-1"
}
```

**Response:**
```json
{
    "message": "Decryption successful",
    "output": "..."
}
```

### 4. Decrypt as Dictator
```http
POST /api/decrypt-dictator
```

**Request Body:**
```json
{
    "dict_priv": "...",     // Required
    "cipher": "cipher.json" // Optional, defaults to "cipher.json"
}
```

**Response:**
```json
{
    "message": "Decryption successful",
    "output": "..."
}
```

## Curl Examples

Here are working examples using actual keys. These examples are ready to use and will work as-is:

### 1. Generate New Keys
```bash
curl -X POST http://localhost:5000/api/keygen -H "Content-Type: application/json" -d "{\"out\": \"new_keys.json\"}"
```

### 2. Encrypt Message
```bash
curl -X POST http://localhost:5000/api/encrypt -H "Content-Type: application/json" -d "{\"dict_priv\": \"37844635569932164303110101931183101546432304758070032583401492615009807617534\", \"alice_priv\": \"59276041772882571688808116591852272397374445415849873197872648746280721585920\", \"x\": \"42\", \"cm\": \"123\", \"out\": \"cipher.json\"}"
```

### 3. Decrypt as Alice
```bash
curl -X POST http://localhost:5000/api/decrypt-alice -H "Content-Type: application/json" -d "{\"alice_priv\": \"59276041772882571688808116591852272397374445415849873197872648746280721585920\", \"cipher\": \"cipher.json\", \"max\": \"1000\"}"
```

### 4. Decrypt as Dictator
```bash
curl -X POST http://localhost:5000/api/decrypt-dictator -H "Content-Type: application/json" -d "{\"dict_priv\": \"37844635569932164303110101931183101546432304758070032583401492615009807617534\", \"cipher\": \"cipher.json\"}"
```

### Complete Flow Example
Here's a complete example flow showing how to use the API:

1. First, generate keys (optional if you already have keys):
```bash
curl -X POST http://localhost:5000/api/keygen -H "Content-Type: application/json" -d "{\"out\": \"keys.json\"}"
```

2. Encrypt a message using the keys:
```bash
curl -X POST http://localhost:5000/api/encrypt -H "Content-Type: application/json" -d "{\"dict_priv\": \"37844635569932164303110101931183101546432304758070032583401492615009807617534\", \"alice_priv\": \"59276041772882571688808116591852272397374445415849873197872648746280721585920\", \"x\": \"Hello\", \"cm\": \"1234567\", \"out\": \"cipher.json\"}"
```

3. Decrypt the message as Alice:
```bash
curl -X POST http://localhost:5000/api/decrypt-alice -H "Content-Type: application/json" -d "{\"alice_priv\": \"59276041772882571688808116591852272397374445415849873197872648746280721585920\", \"cipher\": \"cipher.json\", \"max\": \"9999999\"}"
```

4. Decrypt the message as Dictator:
```bash
curl -X POST http://localhost:5000/api/decrypt-dictator -H "Content-Type: application/json" -d "{\"dict_priv\": \"37844635569932164303110101931183101546432304758070032583401492615009807617534\", \"cipher\": \"cipher.json\"}"
```

## Error Handling

All endpoints return appropriate error messages in case of failures:

```json
{
    "error": "Error type",
    "details": "Detailed error message"
}
```

Common HTTP status codes:
- 200: Success
- 400: Bad Request (missing required parameters)
- 500: Internal Server Error

## Notes for Windows Users

When using curl in Windows Command Prompt or PowerShell, the commands should be on a single line. The examples above are already formatted for Windows use. If you're using PowerShell, the commands will work as-is. If you're using Command Prompt (cmd), they will also work as shown above. 