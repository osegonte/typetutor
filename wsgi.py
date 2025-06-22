# Ultra simple WSGI for Railway
from app import app

# Expose app for gunicorn
application = app

if __name__ == "__main__":
    import os
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
