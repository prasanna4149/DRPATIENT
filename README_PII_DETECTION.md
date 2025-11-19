# PII Detection System

A comprehensive Personally Identifiable Information (PII) detection system that integrates with the chat application to prevent sharing of sensitive information.

## Features

- **Real-time PII Detection**: Detects PII patterns as users type
- **20% Threshold Rule**: Blocks messages when 20% or more content is PII
- **Text Masking**: Automatically masks detected PII patterns
- **Multiple Pattern Types**: Detects phone numbers, emails, social media handles, payment info, etc.
- **High Sensitivity**: Uses aggressive pattern matching with obfuscation detection
- **User-Friendly Warnings**: Visual indicators and confirmation dialogs
- **Rate Limiting**: Tracks user violations to prevent abuse

## Architecture

### Backend (`/backend`)
- **Flask API** (`app.py`): REST API for PII detection
- **PII Detection Module** (`pii/pii.py`): Core detection logic with regex patterns
- **Endpoints**:
  - `POST /api/pii/detect` - Detect PII in text
  - `GET /api/pii/stats` - Get system statistics
  - `GET /api/pii/user-violations/<user_id>` - Get user violation count
  - `GET /health` - Health check

### Frontend (`/src`)
- **PII Service** (`services/piiDetectionService.ts`): API communication layer
- **PII Hook** (`hooks/usePIIDetection.ts`): React hook for PII detection
- **Chat Component** (`components/AgentPatientChat.tsx`): Integrated PII protection

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask server**:
   ```bash
   python app.py
   ```

   The server will start on `http://127.0.0.1:5000`

### Frontend Setup

The frontend is already integrated with the PII detection system. No additional setup required beyond the existing React application setup.

## Usage

### In the Chat Interface

1. **Real-time Detection**: As you type, the system checks for PII patterns
2. **Visual Indicators**:
   - 🛡️ Green shield: PII protection is active
   - ⚠️ Yellow warning: Service unavailable
   - ❌ Red warning: PII detected in message
   - ✅ Green check: Message is safe

3. **Message Blocking**:
   - Messages with 20%+ PII content are blocked
   - User receives detailed violation information
   - Must remove PII to send message

4. **Message Masking**:
   - Messages with <20% PII are offered masking option
   - User can choose to send masked or original version
   - Masked version replaces PII with `[TYPE_REDACTED]` placeholders

### API Usage

#### Detect PII in Text
```bash
curl -X POST http://127.0.0.1:5000/api/pii/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Call me at 9876543210 or email john@example.com",
    "user_id": "user123",
    "sensitivity": "high"
  }'
```

#### Response Format
```json
{
  "is_blocked": true,
  "confidence": "high",
  "violation_type": "phone_number",
  "detected_pattern": "9876543210",
  "original_text": "Call me at 9876543210 or email john@example.com",
  "normalized_text": "callmeat9876543210oremailjohatexamplecom",
  "severity_score": 45,
  "all_violations": [
    {"type": "phone_number", "pattern": "9876543210"},
    {"type": "email_address", "pattern": "john@example.com"}
  ],
  "masked_text": "Call me at [PHONE_REDACTED] or email [EMAIL_REDACTED]",
  "detection_threshold_met": true,
  "processing_time_ms": 15.2
}
```

## PII Pattern Types

The system detects the following PII types:

- **Phone Numbers**: Various formats including obfuscated versions
- **Email Addresses**: Standard and obfuscated email patterns
- **Social Media Handles**: @username, Discord tags, etc.
- **Payment Information**: UPI IDs, PayPal, Venmo handles
- **URLs**: Meeting links, social profiles, websites
- **Messaging Apps**: WhatsApp, Telegram, Snapchat links
- **SSN**: US Social Security Numbers (with context validation)

## Configuration

### Sensitivity Levels
- **High** (default): Blocks any PII detection
- **Medium**: Blocks high-risk PII or multiple violations
- **Low**: Only blocks obvious PII with clear intent

### Environment Variables
```bash
FLASK_HOST=127.0.0.1      # Server host
FLASK_PORT=5000           # Server port
FLASK_DEBUG=False         # Debug mode
```

## Testing

### Backend Testing
Run the built-in test suite:
```bash
cd backend
python -c "from pii.pii import run_tests; run_tests()"
```

### Frontend Testing
Test PII detection in the chat interface:
1. Type a phone number (e.g., "9876543210")
2. Observe real-time warning
3. Try to send - should be blocked
4. Type partial PII (e.g., "call me at 98765")
5. Should offer masking option

## Troubleshooting

### Common Issues

1. **PII Service Unavailable**:
   - Check if Flask server is running
   - Verify port 5000 is not blocked
   - Check network connectivity

2. **False Positives**:
   - System uses aggressive detection for safety
   - Adjust sensitivity level if needed
   - Check pattern context validation

3. **Performance Issues**:
   - PII checking is debounced (500ms delay)
   - Large messages are truncated to 10,000 chars
   - Consider adjusting timeout settings

### Logs and Debugging

- Backend logs are written to console
- Frontend errors logged to browser console
- Enable Flask debug mode for detailed error info

## Security Considerations

- PII patterns are processed locally on your server
- No PII data is stored permanently
- Rate limiting prevents abuse
- Service can be disabled if needed
- All API calls are logged for audit purposes

## Performance

- Average detection time: 10-50ms
- Supports concurrent requests
- Memory usage scales with message length
- Regex patterns are pre-compiled for efficiency
