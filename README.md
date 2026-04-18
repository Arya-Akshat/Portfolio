# Akshat Arya Portfolio

Data-driven portfolio website built with React + Vite, rendered from markdown content files.

Live URL: https://portfolio-hazel-two-46.vercel.app/

## About

- Name: Akshat Arya
- Role: AI/ML Engineer and Backend Developer
- Email: akshat.arya13@gmail.com
- GitHub: https://github.com/Arya-Akshat
- LinkedIn: https://www.linkedin.com/in/akshat-arya-82b4b724b/
- LeetCode: https://leetcode.com/u/akshat0_fr/

## Tech Stack

- React (Vite)
- Framer Motion
- Lucide React
- EmailJS (contact form)
- Markdown-driven content pipeline

## Content Management

All portfolio content markdown files are in the about folder:

- about/skills.md
- about/projects.md
- about/experiences.md
- about/education.md
- about/certificates.md

Update these files to update the portfolio sections without changing component code.

## Highlighted Project Themes

- AI agent systems and workflow orchestration
- LLM-powered full-stack applications
- Distributed systems and async processing
- ML and deep learning research
- Production-style backend architecture

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev -- --host 0.0.0.0 --port 3000
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Contact Form Setup (EmailJS)

Create .env.local in the project root:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Template variable names expected by the app:

- from_name
- from_email
- subject
- message
- to_email

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Framework preset: Vite.
4. Add environment variables in Vercel:
	- VITE_EMAILJS_SERVICE_ID
	- VITE_EMAILJS_TEMPLATE_ID
	- VITE_EMAILJS_PUBLIC_KEY
5. Deploy.

## Repository Notes

- Unused legacy background component removed.
- Markdown data moved into about/ for cleaner content management.
- .env.local is ignored via .gitignore and should not be committed.
