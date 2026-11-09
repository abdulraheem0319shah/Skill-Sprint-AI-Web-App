# SkillSprint AI — Installation Guide

This guide details step-by-step instructions to set up SkillSprint AI on Windows, macOS, or Linux.

---

## 1. Prerequisites
- **Python:** Python 3.10, 3.11, or 3.12 installed.
- **Git:** Git installed on your system.
- **Gemini API Key:** A valid API key from Google AI Studio.

---

## 2. Environment Setup

### Step 1: Clone the Repository
```powershell
git clone https://github.com/hassan2507b/skillsprint-ai.git
cd skillsprint-ai
```

### Step 2: Create a Virtual Environment
```powershell
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Configure API Credentials
Create a `.env` file in the project root directory (or copy from `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```
