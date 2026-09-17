# keremelbasan.dev

Static personal site. No build step: `index.html` + `style.css` + `main.js` + `assets/`.

Local preview: `python3 -m http.server 8787` → http://127.0.0.1:8787/

Deploy: push to GitHub, enable Pages (root), add custom domain `keremelbasan.dev`
and point Porkbun DNS (A records to GitHub Pages IPs + CNAME `www`). Or Cloudflare Pages.

Update CV: replace `assets/Kerem-Elbasan-CV.pdf`.
Update screenshots: `assets/*.webp` are 618×1338 from the Play listing raw captures (en).
