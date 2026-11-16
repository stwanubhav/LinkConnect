# Link Connect — 3D Curated Web Directory

An immersive, cinematic 3D sliding cards web directory built by **STW Anubhav** (`@stwanubhav`) using Vite, React, and Three.js.

Featuring a floating title hero, WebGL CRT sliding screens showcase for curated websites (such as `learnfreex.ct.ws`, `lotusstudy.in`, `unite-cbt.kdns.fr`), and a built-in interactive Admin Panel protected by Z+ Security.

---

## 🌟 Key Features

1. **Front Page with Floating 3D Text**:
   - Floating animated typography: **"WELCOME TO LINK CONNECT"** with smooth 3D perspective and neon glow.
   - Interactive 3D orbital network nodes with rotating energy lines in Three.js.
   - Quick navigation buttons to slide into the website showcase.

2. **3D Sliding Cards Showcase for Websites**:
   - High-performance CRT monitor rail with realistic scanlines, barrel curvature, and glitch shaders.
   - Each card represents a curated website (`learnfreex.ct.ws`, `lotusstudy.in`, `unite-cbt.kdns.fr`, `developer.mozilla.org`, `github.com`, `freecodecamp.org`).
   - Displays live browser window chrome, SSL status, ping indicator, category tags, descriptions, and dynamic frequency visualizers.
   - **Click to Launch**: Clicking either the 3D monitor or the `> OPEN WEBSITE ↗` button launches the site directly.
   - Smooth `← PREV` and `NEXT →` sliding controls, plus direct jumping from the website list.

3. **Admin Console (`/admin`)**:
   - **Z+ Defense Security Clearance**: Protected login gateway requiring SHA-256 cryptographic authorization.
   - **Zero Plaintext Storage**: Plaintext passwords are never stored or transmitted; only 256-bit cryptographic hashes are verified.
   - **✨ AI Auto-Card Generator**:
     - Enter any website URL or domain (e.g. `unite-cbt.kdns.fr` or `learnfreex.ct.ws`).
     - AI scrapes the destination and generates complete 3D card structure (brand title, category tag, feature chips, description, and color scheme).
     - Live CRT monitor simulator preview with 1-click addition to the 3D sliding cards.
   - **⚙ AI API Configuration**:
     - Compatible with any OpenAI-compatible provider: OpenAI, OpenRouter, Groq, DeepSeek, or Local Ollama.
     - Built-in "Test Connection" button to verify credentials.
   - **Reorder & Edit Cards**: Move cards Up (▲) or Down (▼) to adjust slide order, test launch sites, edit fields, or delete.
   - **Permanent JSON Storage**: Writes directly to `public/websites.json` and `data/websites.json`.

---

## 🚀 Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run serve
```

- **Showcase (Front Page)**: [http://localhost:5173/](http://localhost:5173/)
- **Admin Control Panel**: [http://localhost:5173/admin](http://localhost:5173/admin)

---

## ☁️ Deployment on Vercel

This repository is optimized for one-click deployment on [Vercel](https://vercel.com):
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Serverless API functions located in `/api`

---

## 👨‍💻 Creator

Developed by **STW Anubhav**  
- GitHub: [@stwanubhav](https://github.com/stwanubhav)  
- LinkedIn: [in/stwanubhav](https://linkedin.com/in/stwanubhav)  
- Instagram: [@stw_anubhav](https://instagram.com/stw_anubhav)  
- Email: [stwanubhavbusiness@gmail.com](mailto:stwanubhavbusiness@gmail.com)
