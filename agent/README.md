# Captor Local Agent
# Python agent that polls the backend for pending work and automates WhatsApp Web conversations

## Setup

1. Install dependencies:
```bash
cd agent
pip install -r requirements.txt
playwright install chromium
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Run the agent:
```bash
python main.py
```

## First Run

On first run, the agent will open WhatsApp Web and wait for you to scan the QR code.
After login, your session will be saved for future runs.

## How it Works

1. Agent polls `GET /api/agent/pending` for new work
2. When work is found, opens WhatsApp and starts conversation with target
3. Uses AI (OpenAI/Gemini) to generate responses based on mission prompt
4. Saves conversation log and reports back via `POST /api/agent/report`
