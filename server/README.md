# EV CARE server - how to run (Windows + VS Code)

1. In VS Code open the `ev-care` folder, then open a terminal: Terminal -> New Terminal.
2. Go into this folder:        cd server
3. Make a virtual environment: python -m venv venv
4. Turn it on:                 venv\Scripts\activate
   (If PowerShell blocks it, open a "Command Prompt" terminal from the + dropdown and run it there.)
5. Install Flask:              pip install -r requirements.txt
6. Start the server:           python app.py
7. Open http://127.0.0.1:5000 in your browser. You should see: EV CARE server is running
8. Keep this terminal open. In another VS Code window/tab, right-click index.html -> Open with Live Server.

Orders are saved in `evcare.db` (created automatically).
Google Pay is in TEST mode: the payment sheet appears but no money is charged.
For real money, connect a payment gateway inside `charge_token()` in app.py.
