import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Code2, GitBranch, Link2, LoaderCircle, Mail } from 'lucide-react';
import emailjs from '@emailjs/browser';
import skillsMarkdown from '../about/skills.md?raw';
import projectsMarkdown from '../about/projects.md?raw';
import experiencesMarkdown from '../about/experiences.md?raw';
import educationMarkdown from '../about/education.md?raw';
import certificatesMarkdown from '../about/certificates.md?raw';
import WebBackground from './components/ui/WebBackground';
import './styles.css';

const BATCH_SIZE = 4;
const ease = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease },
  },
};

const navItems = [
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#experience', label: 'Experience' },
  { href: '#education', label: 'Education' },
  { href: '#certificates', label: 'Certificates' },
  { href: '#contact', label: 'Contact' },
];

const personalDetails = {
  name: 'Akshat Arya',
  role: 'AI/ML Engineer & Backend Developer',
  summary:
    'Computer Science student focused on AI/ML and distributed systems, with experience building deep learning models, LLM-powered applications, and scalable microservices platforms. Skilled in ML pipelines, model optimization, and backend systems for production-grade AI applications. Seeking opportunities in ML engineering, AI systems, or distributed systems.',
  email: 'akshat.arya13@gmail.com',
  github: 'https://github.com/Arya-Akshat',
  linkedin: 'https://www.linkedin.com/in/akshat-arya-82b4b724b/',
  leetcode: 'https://leetcode.com/u/akshat0_fr/',
};

const heroLinks = [
  { label: 'Gmail', href: `mailto:${personalDetails.email}`, icon: Mail },
  { label: 'GitHub', href: personalDetails.github, icon: GitBranch },
  { label: 'LinkedIn', href: personalDetails.linkedin, icon: Link2 },
  { label: 'LeetCode', href: personalDetails.leetcode, icon: Code2 },
];

function stripPrefix(value) {
  return value.replace(/^[^A-Za-z0-9]+/u, '').trim();
}

function cleanMultiline(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function emptyProject() {
  return {
    category: '',
    title: '',
    duration: '',
    description: [],
    techStack: [],
    role: '',
    keyContributions: [],
    outcome: [],
    liveLink: '',
    repositoryLink: '',
  };
}

function emptyExperience() {
  return {
    jobTitle: '',
    company: '',
    location: '',
    employmentType: '',
    startDate: '',
    endDate: '',
    responsibilities: [],
    keyAchievements: [],
    technologiesUsed: [],
  };
}

function emptyEducation() {
  return {
    title: '',
    institution: '',
    duration: '',
    location: '',
    cgpa: '',
    score: '',
    academicYear: '',
    year: '',
    percentile: '',
    highlights: [],
  };
}

function parseKey(rawKey) {
  return rawKey.trim().toLowerCase();
}

function parseMarkdownList(markdown, keyMap, createEntry) {
  const entries = [];
  let current = null;
  let currentArrayKey = null;

  const pushCurrent = () => {
    if (current) {
      entries.push(current);
    }
  };

  markdown.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      pushCurrent();
      current = createEntry(stripPrefix(headingMatch[1]));
      currentArrayKey = null;
      return;
    }

    if (!current) {
      return;
    }

    const fieldMatch = line.match(/^[-*]\s+([^:]+):\s*(.*)$/);
    if (fieldMatch) {
      const key = keyMap[parseKey(fieldMatch[1])];
      const value = fieldMatch[2].trim();
      currentArrayKey = null;

      if (!key) {
        return;
      }

      if (Array.isArray(current[key])) {
        currentArrayKey = key;
        current[key] = value ? [cleanMultiline(value)] : [];
        return;
      }

      current[key] = cleanMultiline(value);

      if (value === '') {
        currentArrayKey = key;
        current[key] = [];
      }

      return;
    }

    const nestedMatch = line.match(/^\s+[-*]\s+(.+)$/);
    if (nestedMatch && currentArrayKey) {
      current[currentArrayKey].push(cleanMultiline(nestedMatch[1]));
    }
  });

  pushCurrent();
  return entries;
}

function parseSkillsMarkdown(markdown) {
  const groups = [];
  let current = null;

  markdown.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        groups.push(current);
      }
      current = { title: stripPrefix(headingMatch[1]), skills: [] };
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && current) {
      current.skills.push(cleanMultiline(bulletMatch[1]));
    }
  });

  if (current) {
    groups.push(current);
  }

  return groups.filter((group) => group.skills.length > 0);
}

function parseProjectsMarkdown(markdown) {
  const projects = [];
  let currentCategory = '';
  let current = null;
  let currentArrayKey = null;

  const pushCurrent = () => {
    if (current?.title) {
      projects.push(current);
    }
  };

  const projectKeyMap = {
    title: 'title',
    duration: 'duration',
    description: 'description',
    'tech stack': 'techStack',
    role: 'role',
    'key contributions': 'keyContributions',
    'outcome / impact': 'outcome',
    'live link': 'liveLink',
    'repository link': 'repositoryLink',
  };

  markdown.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      const heading = stripPrefix(headingMatch[1]);
      if (/^Project\s+\d+/i.test(heading)) {
        pushCurrent();
        current = emptyProject();
        current.category = currentCategory;
        currentArrayKey = null;
      } else {
        currentCategory = heading;
      }
      return;
    }

    if (!current) {
      return;
    }

    const fieldMatch = line.match(/^[-*]\s+([^:]+):\s*(.*)$/);
    if (fieldMatch) {
      const key = projectKeyMap[parseKey(fieldMatch[1])];
      const value = fieldMatch[2].trim();
      currentArrayKey = null;

      if (!key) {
        return;
      }

      if (Array.isArray(current[key])) {
        currentArrayKey = key;
        current[key] = value ? [cleanMultiline(value)] : [];
        return;
      }

      current[key] = cleanMultiline(value);

      if (value === '') {
        currentArrayKey = key;
        current[key] = [];
      }
      return;
    }

    const nestedMatch = line.match(/^\s+[-*]\s+(.+)$/);
    if (nestedMatch && currentArrayKey) {
      current[currentArrayKey].push(cleanMultiline(nestedMatch[1]));
    }
  });

  pushCurrent();
  return projects.filter((project) => project.title);
}

function parseExperienceMarkdown(markdown) {
  return parseMarkdownList(
    markdown,
    {
      'job title': 'jobTitle',
      company: 'company',
      location: 'location',
      'employment type': 'employmentType',
      'start date': 'startDate',
      'end date / present': 'endDate',
      responsibilities: 'responsibilities',
      'key achievements': 'keyAchievements',
      'technologies used': 'technologiesUsed',
    },
    (title) => ({
      title,
      ...emptyExperience(),
      responsibilities: [],
      keyAchievements: [],
      technologiesUsed: [],
    }),
  );
}

function parseEducationMarkdown(markdown) {
  return parseMarkdownList(
    markdown,
    {
      institution: 'institution',
      duration: 'duration',
      location: 'location',
      cgpa: 'cgpa',
      score: 'score',
      highlights: 'highlights',
      'academic year': 'academicYear',
      year: 'year',
      percentile: 'percentile',
    },
    (title) => ({
      ...emptyEducation(),
      title,
      highlights: [],
    }),
  );
}

function parseCertificatesMarkdown(markdown) {
  const groups = [];
  const links = [];
  let current = null;
  let isLinkGroup = false;

  markdown.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        groups.push(current);
      }
      const title = stripPrefix(headingMatch[1]);
      isLinkGroup = title === 'Certificate Links';
      current = {
        title,
        items: [],
      };
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const item = cleanMultiline(bulletMatch[1]);
      if (isLinkGroup) {
        links.push(item);
      } else if (current) {
        current.items.push(item);
      }
    }
  });

  if (current) {
    groups.push(current);
  }

  return {
    groups: groups.filter((group) => group.items.length > 0),
    links,
  };
}

const portfolioData = {
  skills: parseSkillsMarkdown(skillsMarkdown),
  projects: parseProjectsMarkdown(projectsMarkdown),
  experience: parseExperienceMarkdown(experiencesMarkdown),
  education: parseEducationMarkdown(educationMarkdown),
  certificates: parseCertificatesMarkdown(certificatesMarkdown),
};

function joinValues(values) {
  return values.filter(Boolean).join(' · ');
}

function normalizeTextValue(value) {
  if (Array.isArray(value)) {
    const firstText = value.find((item) => typeof item === 'string' && item.trim() !== '');
    return firstText ? firstText.trim() : '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getEducationKey(entry, index) {
  return [
    normalizeTextValue(entry.title),
    normalizeTextValue(entry.institution),
    normalizeTextValue(entry.year),
    normalizeTextValue(entry.duration),
    normalizeTextValue(entry.score),
    normalizeTextValue(entry.percentile),
    index,
  ]
    .filter(Boolean)
    .join('::');
}

function estimateDuration(project, index) {
  const rawDuration = normalizeTextValue(project.duration);
  if (rawDuration !== '' && rawDuration.toLowerCase() !== 'not specified') {
    return rawDuration;
  }

  const title = normalizeTextValue(project.title);
  const seed = title
    ? title.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
    : index;
  const months = (seed % 4) + 1;
  return `${months} month${months > 1 ? 's' : ''}`;
}

function isValidProjectUrl(url) {
  const normalizedUrl = normalizeTextValue(url);
  if (!normalizedUrl) {
    return false;
  }

  if (/not available|not specified/i.test(normalizedUrl)) {
    return false;
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return false;
    }

    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function getProjectKey(project) {
  const id = normalizeTextValue(project.id);
  if (id) {
    return id;
  }

  const title = normalizeTextValue(project.title);
  const repo = normalizeTextValue(project.repositoryLink);
  const live = normalizeTextValue(project.liveLink);
  const category = normalizeTextValue(project.category);

  return [title, repo, live, category].filter(Boolean).join('::') || 'project-card';
}

function validateContactForm(values) {
  const nextErrors = {};

  if (!values.name.trim()) {
    nextErrors.name = 'Name is required.';
  }

  if (!values.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (!values.subject.trim()) {
    nextErrors.subject = 'Subject is required.';
  }

  if (!values.message.trim()) {
    nextErrors.message = 'Message is required.';
  }

  return nextErrors;
}

function SectionTitle({ title }) {
  return (
    <div className="section-title">
      <div className="section-title__bar" />
      <h2 className="section-title__heading">{title}</h2>
    </div>
  );
}

function SkillGroupCard({ group }) {
  return (
    <article className="skill-group-card">
      <h3 className="skill-group-card__title">{group.title}</h3>
      <div className="skill-group-card__chips">
        {group.skills.map((skill) => (
          <span key={`${group.title}-${skill}`} className="chip">
            {skill}
          </span>
        ))}
      </div>
    </article>
  );
}

function ProjectCard({ project, index, featured, reducedMotion, cardRef }) {
  const description = project.description.join(' ');
  const duration = estimateDuration(project, index);
  const liveUrl = normalizeTextValue(project.liveLink);
  const repositoryUrl = normalizeTextValue(project.repositoryLink);
  const hasLiveUrl = isValidProjectUrl(liveUrl);
  const hasRepoUrl = isValidProjectUrl(repositoryUrl);

  return (
    <motion.article
      ref={cardRef}
      className={`project-card ${featured ? 'project-card--featured' : 'project-card--compact'}`}
      variants={reducedMotion ? fadeIn : fadeUp}
      initial="hidden"
      animate="visible"
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, transition: { duration: 0.25, ease: 'easeOut' } }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      layout
    >
      <div className="project-card__body">
        <div className="project-card__header">
          <div>
            <p className="project-card__eyebrow">{project.category}</p>
            <h3 className="project-card__title">{project.title}</h3>
          </div>
          <span className="project-card__duration">{duration}</span>
        </div>

        {project.role ? <p className="project-card__role">{project.role}</p> : null}
        <p className={`project-card__description ${featured ? '' : 'line-clamp-2'}`.trim()}>{description}</p>

        {project.keyContributions.length > 0 ? (
          <div className="project-card__section">
            <p className="project-card__section-label">Highlights</p>
            <ul className="detail-list detail-list--tight">
              {project.keyContributions.slice(0, featured ? project.keyContributions.length : 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {project.outcome.length > 0 ? <p className="project-card__impact">Impact: {project.outcome[0]}</p> : null}
      </div>

      <div className="project-card__footer">
        <div className="chip-row">
          {project.techStack.map((tech) => (
            <span key={tech} className="chip chip--compact">
              {tech}
            </span>
          ))}
        </div>

        {hasRepoUrl || hasLiveUrl ? (
          <div className="project-card__links">
            {hasRepoUrl ? (
              <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                Repo
              </a>
            ) : null}
            {hasLiveUrl ? (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                Live ↗
              </a>
            ) : null}
          </div>
        ) : (
          <p className="project-card__privacy">Private</p>
        )}
      </div>
    </motion.article>
  );
}

function ExperienceTimeline({ entries, reducedMotion }) {
  return (
    <motion.div className="timeline" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
      <span className="timeline__line" />
      {entries.map((entry, index) => {
        const summary = joinValues([entry.location, entry.employmentType, entry.startDate, entry.endDate]);
        return (
          <motion.article key={`${entry.company}-${entry.jobTitle}`} className="timeline__item" variants={reducedMotion ? fadeIn : fadeUp}>
            <span className={`timeline__node ${index === 0 ? 'timeline__node--latest' : ''}`} />
            <div className="timeline__card">
              <div className="timeline__header">
                <div>
                  <h3 className="timeline__title">{entry.jobTitle}</h3>
                  <p className="timeline__meta">
                    {entry.company}
                    {summary ? ` · ${summary}` : ''}
                  </p>
                </div>
              </div>

              {entry.responsibilities.length > 0 ? (
                <div className="timeline__section">
                  <p className="timeline__section-label">Responsibilities</p>
                  <ul className="detail-list">
                    {entry.responsibilities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {entry.keyAchievements.length > 0 ? (
                <div className="timeline__section">
                  <p className="timeline__section-label">Key achievements</p>
                  <ul className="detail-list detail-list--accent">
                    {entry.keyAchievements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {entry.technologiesUsed.length > 0 ? (
                <div className="chip-row">
                  {entry.technologiesUsed.map((tech) => (
                    <span key={tech} className="chip chip--compact">
                      {tech}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}

function EducationTimeline({ entries, reducedMotion }) {
  return (
    <motion.div className="timeline" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
      <span className="timeline__line" />
      {entries.map((entry, index) => {
        const isJeeMains = entry.title.toLowerCase().includes('jee mains');
        let metrics = [entry.duration, entry.location, entry.cgpa, entry.score, entry.academicYear, entry.year].filter(Boolean);
        if (isJeeMains) {
          metrics = [];
          if (entry.year) metrics.push(entry.year);
          if (entry.percentile) metrics.push(`${entry.percentile} percentile`);
        }
        return (
          <motion.article key={getEducationKey(entry, index)} className="timeline__item" variants={reducedMotion ? fadeIn : fadeUp}>
            <span className="timeline__node" />
            <div className="timeline__card">
              <h3 className="timeline__title">{entry.title}</h3>
              {entry.institution ? <p className="timeline__meta">{entry.institution}</p> : null}
              {metrics.length > 0 ? <p className="timeline__meta timeline__meta--spaced">{metrics.join(' · ')}</p> : null}

              {entry.highlights.length > 0 ? (
                <div className="timeline__section">
                  <p className="timeline__section-label">Highlights</p>
                  <ul className="detail-list">
                    {entry.highlights.map((item, highlightIndex) => (
                      <li key={`${getEducationKey(entry, index)}::highlight::${highlightIndex}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
}

function HeroSocialLinks({ reducedMotion }) {
  return (
    <motion.div className="hero__socials" variants={reducedMotion ? fadeIn : fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.18 }}>
      {heroLinks.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          className="hero__social-link"
          aria-label={label}
          target={href.startsWith('mailto:') ? undefined : '_blank'}
          rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
        >
          <Icon className="hero__social-icon" aria-hidden="true" />
        </a>
      ))}
    </motion.div>
  );
}

// .env.local
// VITE_EMAILJS_SERVICE_ID=your_service_id
// VITE_EMAILJS_TEMPLATE_ID=your_template_id
// VITE_EMAILJS_PUBLIC_KEY=your_public_key
function ContactSection({ reducedMotion }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [submitError, setSubmitError] = useState('');

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateContactForm(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setStatus('error');
      setSubmitError(`Something went wrong. Try emailing directly at ${personalDetails.email}`);
      return;
    }

    setStatus('submitting');
    setSubmitError('');

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: formData.name.trim(),
          from_email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          to_email: personalDetails.email,
        },
        publicKey,
      );

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('EmailJS send failed:', error);
      setStatus('error');
      setSubmitError(
        error?.text
          ? `${error.text} Try emailing directly at ${personalDetails.email}`
          : `Something went wrong. Try emailing directly at ${personalDetails.email}`,
      );
    }
  };

  if (status === 'success') {
    return (
      <motion.div className="contact-success" variants={reducedMotion ? fadeIn : scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
        <CheckCircle2 className="contact-success__icon" aria-hidden="true" />
        <h3 className="contact-success__title">Message sent! I&apos;ll get back to you soon.</h3>
      </motion.div>
    );
  }

  return (
    <motion.form className="contact-form" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} onSubmit={handleSubmit} noValidate>
      <motion.div className="form-field" variants={reducedMotion ? fadeIn : fadeUp}>
        <label htmlFor="name">Your Name</label>
        <input id="name" name="name" type="text" value={formData.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
        {errors.name ? <p className="form-field__error">{errors.name}</p> : null}
      </motion.div>

      <motion.div className="form-field" variants={reducedMotion ? fadeIn : fadeUp}>
        <label htmlFor="email">Your Email</label>
        <input id="email" name="email" type="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} />
        {errors.email ? <p className="form-field__error">{errors.email}</p> : null}
      </motion.div>

      <motion.div className="form-field" variants={reducedMotion ? fadeIn : fadeUp}>
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" type="text" value={formData.subject} onChange={(event) => updateField('subject', event.target.value)} aria-invalid={Boolean(errors.subject)} />
        {errors.subject ? <p className="form-field__error">{errors.subject}</p> : null}
      </motion.div>

      <motion.div className="form-field" variants={reducedMotion ? fadeIn : fadeUp}>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows="6" value={formData.message} onChange={(event) => updateField('message', event.target.value)} aria-invalid={Boolean(errors.message)} />
        {errors.message ? <p className="form-field__error">{errors.message}</p> : null}
      </motion.div>

      <motion.button
        type="submit"
        className="button button--primary button--full contact-form__submit"
        variants={reducedMotion ? fadeIn : fadeUp}
        whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? <LoaderCircle className="button__spinner" aria-hidden="true" /> : null}
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </motion.button>

      {submitError ? <p className="contact-form__error">{submitError}</p> : null}
    </motion.form>
  );
}

function CertificateGrid({ groups, links, reducedMotion }) {
  return (
    <motion.div className="certificate-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
      {groups.map((group) => (
        <motion.article key={group.title} className="certificate-card" variants={reducedMotion ? fadeIn : fadeUp}>
          <div className="certificate-card__header">
            <p className="certificate-card__eyebrow">Certification group</p>
            <span className="certificate-card__icon" aria-hidden="true">
              ✓
            </span>
          </div>
          <h3 className="certificate-card__title">{group.title}</h3>
          <ul className="detail-list detail-list--tight">
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </motion.article>
      ))}

      {links.length > 0 ? (
        <motion.article className="certificate-card certificate-card--link" variants={reducedMotion ? fadeIn : fadeUp}>
          <div className="certificate-card__header">
            <p className="certificate-card__eyebrow">Certificate archive</p>
            <span className="certificate-card__icon" aria-hidden="true">
              ↗
            </span>
          </div>
          <h3 className="certificate-card__title">Supporting links</h3>
          <div className="certificate-link-stack">
            {links.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer" className="button button--ghost button--full">
                Open archive
              </a>
            ))}
          </div>
        </motion.article>
      ) : null}
    </motion.div>
  );
}

function App() {
  const reducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(Math.min(BATCH_SIZE, portfolioData.projects.length));
  const [scrollTargetIndex, setScrollTargetIndex] = useState(null);
  const scrollTargetRef = useRef(null);

  const visibleProjects = portfolioData.projects.slice(0, visibleCount);
  const hasMoreProjects = visibleCount < portfolioData.projects.length;
  const canCollapse = visibleCount > BATCH_SIZE && portfolioData.projects.length > BATCH_SIZE;
  const currentButtonLabel = hasMoreProjects ? 'View More Projects' : 'Show Less';

  useEffect(() => {
    if (scrollTargetIndex !== null && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      setScrollTargetIndex(null);
    }
  }, [scrollTargetIndex, reducedMotion, visibleCount]);

  const showMore = () => {
    const nextTarget = visibleCount;
    setScrollTargetIndex(nextTarget);
    setVisibleCount((current) => Math.min(current + BATCH_SIZE, portfolioData.projects.length));
  };

  const showLess = () => {
    setVisibleCount(BATCH_SIZE);
    setScrollTargetIndex(null);
  };

  return (
    <div className="page-shell">
      <WebBackground />

      <header className="site-nav">
        <div className="container site-nav__inner">
          <a className="site-nav__brand" href="#top" aria-label="Back to top">
            <img src="/logo-ak.svg" alt="Akshat Arya logo" className="site-nav__brand-mark" />
            <span>Portfolio</span>
          </a>

          <nav className="site-nav__links" aria-label="Primary">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="site-nav__link">
                {item.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="site-nav__menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <>
              <motion.div
                className="site-nav__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="site-nav__drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} className="site-nav__drawer-link" onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </a>
                ))}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </header>

      <main id="top">
        <section className="hero section">
          <div className="hero__backdrop hero__backdrop--primary" aria-hidden="true" />
          <div className="hero__backdrop hero__backdrop--secondary" aria-hidden="true" />

          <div className="container hero__inner">
            <motion.div className="hero__chip" variants={reducedMotion ? fadeIn : fadeUp} initial="hidden" animate="visible">
              AI/ML · Backend · Systems
            </motion.div>

            <motion.h1 className="hero__title" variants={reducedMotion ? fadeIn : scaleIn} initial="hidden" animate="visible">
              {personalDetails.name}
            </motion.h1>

            <motion.p className="hero__role" variants={reducedMotion ? fadeIn : fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.08 }}>
              {personalDetails.role}
            </motion.p>

            <motion.p className="hero__summary" variants={reducedMotion ? fadeIn : fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.14 }}>
              {personalDetails.summary}
            </motion.p>

            <HeroSocialLinks reducedMotion={reducedMotion} />

            <motion.div className="hero__actions" variants={staggerContainer} initial="hidden" animate="visible">
              <motion.a
                href="#projects"
                className="button button--primary"
                variants={reducedMotion ? fadeIn : fadeUp}
                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              >
                View Projects
              </motion.a>
              <motion.a
                href="#contact"
                className="button button--ghost"
                variants={reducedMotion ? fadeIn : fadeUp}
                whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              >
                Contact Me
              </motion.a>
            </motion.div>
          </div>
        </section>

        <section id="skills" className="section section--base">
          <div className="container">
            <SectionTitle title="Skills" />
            <motion.div className="skills-columns" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
              {portfolioData.skills.map((group) => (
                <motion.div key={group.title} className="skills-columns__item break-inside-avoid mb-5" variants={reducedMotion ? fadeIn : fadeUp}>
                  <SkillGroupCard group={group} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="projects" className="section section--subtle">
          <div className="container">
            <SectionTitle title="Projects" />
            <motion.div className="projects-grid" layout>
              <AnimatePresence>
                {visibleProjects.map((project, index) => (
                  <ProjectCard
                    key={getProjectKey(project)}
                    project={project}
                    index={index}
                    featured={index < BATCH_SIZE}
                    reducedMotion={reducedMotion}
                    cardRef={index === scrollTargetIndex ? scrollTargetRef : null}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {portfolioData.projects.length > BATCH_SIZE ? (
              <div className="projects-actions">
                <motion.button
                  type="button"
                  className="button button--ghost"
                  onClick={hasMoreProjects ? showMore : showLess}
                  whileHover={reducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                >
                  {currentButtonLabel}
                </motion.button>
                {canCollapse ? <p className="projects-actions__hint">Showing {visibleCount} of {portfolioData.projects.length} projects</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <section id="experience" className="section section--base">
          <div className="container">
            <SectionTitle title="Experience" />
            <ExperienceTimeline entries={portfolioData.experience} reducedMotion={reducedMotion} />
          </div>
        </section>

        <section id="education" className="section section--subtle">
          <div className="container">
            <SectionTitle title="Education" />
            <EducationTimeline entries={portfolioData.education} reducedMotion={reducedMotion} />
          </div>
        </section>

        <section id="certificates" className="section section--base">
          <div className="container">
            <SectionTitle title="Certificates" />
            <CertificateGrid
              groups={portfolioData.certificates.groups}
              links={portfolioData.certificates.links}
              reducedMotion={reducedMotion}
            />
          </div>
        </section>

        <section id="contact" className="section section--subtle">
          <div className="container contact-section">
            <SectionTitle title="Get in Touch" />
            <p className="contact-section__subtext">Have an opportunity or want to collaborate? Send a message.</p>
            <ContactSection reducedMotion={reducedMotion} />
          </div>
        </section>

        <footer className="footer">
          <div className="container footer__inner">
            <p>Akshat Arya</p>
            <a className="footer__link" href="#top">
              Back to top
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected runtime error',
    };
  }

  componentDidCatch(error) {
    console.error('Portfolio runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ marginTop: 0 }}>Application Error</h1>
          <p style={{ color: '#8b949e' }}>A runtime error prevented the page from rendering.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#161b22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem' }}>
            {this.state.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);