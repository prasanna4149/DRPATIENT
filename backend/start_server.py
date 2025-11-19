#!/usr/bin/env python3
"""
PII Detection Server Startup Script for FastAPI.

This script boots the FastAPI server via uvicorn with health checks and
dependency validation.
"""

import os
import sys
import logging
from datetime import datetime

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def setup_logging():
    """Configure logging for the server."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('pii_server.log')
        ]
    )

def check_dependencies():
    """Check if all required dependencies are installed."""
    required_packages = ['fastapi', 'uvicorn']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("Please install them using: pip install -r requirements.txt")
        return False
    
    return True

def test_pii_module():
    """Test if the PII detection module is working correctly."""
    try:
        from pii.pii import ContactModerationSystem
        
        # Quick test
        moderator = ContactModerationSystem(sensitivity='high')
        result = moderator.moderate_message("test message")
        
        if result is None:
            print("❌ PII module test failed")
            return False
        
        print("✅ PII detection module is working")
        return True
        
    except Exception as e:
        print(f"❌ PII module error: {str(e)}")
        return False

def start_server():
    """Start the FastAPI server using uvicorn."""
    try:
        import uvicorn
        from app import app

        # Get configuration
        host = os.getenv('API_HOST', '127.0.0.1')
        port = int(os.getenv('API_PORT', 8000))
        reload = os.getenv('API_RELOAD', 'False').lower() == 'true'

        print("\n" + "="*60)
        print("🛡️  PII DETECTION SERVER")
        print("="*60)
        print(f"🌐 Server URL: http://{host}:{port}")
        print(f"🔁 Auto Reload: {reload}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        print("\n📋 Available Endpoints:")
        print(f"   GET  http://{host}:{port}/health")
        print(f"   POST http://{host}:{port}/api/pii/detect")
        print(f"   GET  http://{host}:{port}/api/pii/stats")
        print(f"   GET  http://{host}:{port}/api/pii/user-violations/<user_id>")
        print("\n🚀 Server is starting...")
        print("   Press Ctrl+C to stop the server")
        print("="*60)

        uvicorn.run(app, host=host, port=port, reload=reload)
        
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Failed to start server: {str(e)}")
        sys.exit(1)

def main():
    """Main startup function."""
    print("🔍 Starting PII Detection FastAPI Server...")
    
    # Setup logging
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Check dependencies
    print("📦 Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    
    # Test PII module
    print("🧪 Testing PII detection module...")
    if not test_pii_module():
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
