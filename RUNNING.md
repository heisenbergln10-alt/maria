Running the Double-Crux proxy and site (local)

1) Install dependencies for the proxy

   npm install express node-fetch cors

2) Start the proxy with your OpenAI key in the environment

   Linux/macOS:
     OPENAI_API_KEY="sk-..." node server.js

   Windows (PowerShell):
     $env:OPENAI_API_KEY = "sk-..."; node server.js

3) Open `index.html` in your browser (or serve it via any static server).
   The Double-Crux UI will call `http://localhost:3000/api/doublecrux` to reach OpenAI.

Notes:
- Do NOT commit your OpenAI key into the repository. Keep it in environment variables.
- If you deploy the proxy to a host, set the environment variable there and update CORS as appropriate.

