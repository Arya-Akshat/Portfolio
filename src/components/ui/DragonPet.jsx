import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, MousePointer, X, Send } from 'lucide-react';

// Spritesheet configuration (scaled natively to 50% size)
const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 104;
const TOTAL_FRAMES = 8;

const STATE_ROWS = {
  idle: 0,
  walk_right: 1,
  walk_left: 2,
  run: 7,        // Row 7 is actually running/flying!
  wave: 4,
  jump: 5,
  spit_fire: 6,
  sit: 3,        // Row 3 is actually sitting!
  idle_alt: 8,
  backflip: 9,   // Row 9 is our new 360 backflip sequence!
  use_laptop: 10,
  eat_snacks: 11,
};

const MOODS = ['calm', 'lazy', 'energetic'];
const IDLE_DISTANCE = 80;
const WALK_SPEED = 3.5;
const FAST_DISTANCE = 180;
const STATE_DEBOUNCE = 800;

export default function DragonPet({ reducedMotion, factsMarkdown }) {
  const [active, setActive] = useState(false);
  const [followCursor, setFollowCursor] = useState(false);
  const [currentState, setCurrentState] = useState('idle');
  const [facingLeft, setFacingLeft] = useState(false);
  const [mood, setMood] = useState('calm');
  const [chatOpen, setChatOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'dragon', text: "Hey, I'm Firefly! 🐉 I can tell you all about Akshat. Ask me anything about his projects, experience, or skills!" },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [particles, setParticles] = useState([]);
  const [factsList, setFactsList] = useState([]);
  
  const petRef = useRef(null);
  
  // Track positions in refs for zero-overhead DOM styling
  const petPos = useRef({ x: window.innerWidth - 180, y: window.innerHeight - 250 });
  const targetPos = useRef({ x: window.innerWidth - 180, y: window.innerHeight - 250 });
  
  const isDragging = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  
  // Physics & Animation internal refs
  const lastStateChange = useRef(Date.now());
  const idleStartTime = useRef(Date.now());
  const lastDistance = useRef(0);
  const jumpEndTime = useRef(0);
  const fireEndTime = useRef(0);
  const backflipEndTime = useRef(0);
  const laptopEndTime = useRef(0);
  const snacksEndTime = useRef(0);
  const currentFrame = useRef(0);
  const animationTick = useRef(0);
  const recoilStart = useRef(0);
  const recoilActive = useRef(false);
  const breathCycle = useRef(0);
  const currentStateRef = useRef('idle');

  // Memory management: tracks the last discussed topic context
  const lastTopic = useRef(null);

  // Debug references
  const distanceRef = useRef(0);

  const isHoveredRef = useRef(false);
  const clickTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // Parse facts dynamically from factsMarkdown prop
  useEffect(() => {
    if (!factsMarkdown) return;
    const lines = factsMarkdown.split('\n');
    const parsed = lines
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.trim().replace(/^-\s*/, ''));
    setFactsList(parsed);
  }, [factsMarkdown]);

  // Auto-scroll chat history to the bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatOpen]);

  // Track global cursor coordinate in page
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging.current) return;
      
      // Adjust offset calculations for a 96x104 size pet (centered on cursor)
      targetPos.current = {
        x: e.clientX - 48,
        y: e.clientY - 52,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Main stable physics follow loop (30ms interval)
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      if (isDragging.current) return;

      const now = Date.now();
      const dx = targetPos.current.x - petPos.current.x;
      const dy = targetPos.current.y - petPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      distanceRef.current = distance;

      const isFastMove = lastDistance.current > 0 && distance > FAST_DISTANCE;
      lastDistance.current = distance;

      let newState = 'idle';
      const timeSinceStateChange = now - lastStateChange.current;

      // Update orientation direction when moving significantly
      if (followCursor && Math.abs(dx) > 15) {
        setFacingLeft(dx < 0);
      }

      // State machine logic
      if (backflipEndTime.current > now) {
        newState = 'backflip';
      } else if (laptopEndTime.current > now) {
        newState = 'use_laptop';
      } else if (snacksEndTime.current > now) {
        newState = 'eat_snacks';
      } else if (fireEndTime.current > now) {
        newState = 'spit_fire';
      } else if (!followCursor || distance < IDLE_DISTANCE) {
        const idleDuration = 48000; // 48s loop cycle (8s per state)
        const idleTime = (now - idleStartTime.current) % idleDuration;

        if (isFastMove && jumpEndTime.current < now && followCursor) {
          newState = 'jump';
          jumpEndTime.current = now + 600;
        } else if (idleTime > 40000) {
          newState = 'eat_snacks'; // Eating snacks (Row 11)
        } else if (idleTime > 32000) {
          newState = 'use_laptop'; // Working on laptop (Row 10)
        } else if (idleTime > 24000) {
          newState = 'idle_alt'; // Idle variation (Row 8)
        } else if (idleTime > 16000) {
          newState = 'sit';      // Sitting down (Row 3)
        } else if (idleTime > 8000) {
          newState = 'wave';     // Friendly waving (Row 4)
        } else {
          newState = 'idle';     // Default breathe (Row 0)
        }
      } else {
        idleStartTime.current = now;
        if (isFastMove) {
          newState = 'run'; // Use fast running/flying state (Row 7)
        } else {
          newState = dx > 0 ? 'walk_right' : 'walk_left';
        }
      }

      // Debounce and trigger state updates
      if (newState !== currentStateRef.current && timeSinceStateChange > STATE_DEBOUNCE) {
        currentStateRef.current = newState;
        setCurrentState(newState);
        lastStateChange.current = now;
      }
      
      // Move coordinates if allowed (follow is active, not hovered)
      const canMove = followCursor && distance >= IDLE_DISTANCE && !isHoveredRef.current;
      if (canMove) {
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        const currentSpeed = distance > FAST_DISTANCE ? WALK_SPEED * 1.5 : WALK_SPEED;
        const nextX = Math.max(10, Math.min(window.innerWidth - 100, petPos.current.x + normalizedDx * currentSpeed));
        const nextY = Math.max(10, Math.min(window.innerHeight - 120, petPos.current.y + normalizedDy * currentSpeed));
        
        petPos.current = { x: nextX, y: nextY };
        
        if (petRef.current) {
          petRef.current.style.left = `${nextX}px`;
          petRef.current.style.top = `${nextY}px`;
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [followCursor, active]);

  // Mood loop
  useEffect(() => {
    const interval = setInterval(() => {
      setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set initial position and reset all tracking states when summoned
  useEffect(() => {
    if (active) {
      const initialX = window.innerWidth - 180;
      const initialY = window.innerHeight - 250;
      petPos.current = { x: initialX, y: initialY };
      targetPos.current = { x: initialX, y: initialY };
      
      setCurrentState('idle');
      currentStateRef.current = 'idle';
      setFollowCursor(false);
      idleStartTime.current = Date.now();
      lastStateChange.current = Date.now();
      
      if (petRef.current) {
        petRef.current.style.left = `${initialX}px`;
        petRef.current.style.top = `${initialY}px`;
      }
    }
  }, [active]);

  // Frame tick updater (Raf based)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    let rAF;
    
    const updateTick = () => {
      animationTick.current += 1;
      breathCycle.current += 0.035;

      let speedDivider = 11;
      if (mood === 'lazy') speedDivider = 15;
      if (mood === 'energetic') speedDivider = 8;

      if (animationTick.current >= speedDivider) {
        currentFrame.current = (currentFrame.current + 1) % TOTAL_FRAMES;
        animationTick.current = 0;
      }
      
      setTick((prev) => prev + 1);
      rAF = requestAnimationFrame(updateTick);
    };

    rAF = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(rAF);
  }, [active, mood]);

  // Recoil offset math
  let recoilOffset = 0;
  if (recoilActive.current) {
    const elapsed = Date.now() - recoilStart.current;
    if (elapsed < 200) {
      recoilOffset = -6 * Math.sin((elapsed / 200) * Math.PI); // Reduced recoil for smaller size
    } else {
      recoilActive.current = false;
    }
  }

  // Mood adjustments
  let moodBreathAmp = 1;
  let moodYOffset = 0;
  if (mood === 'lazy') {
    moodBreathAmp = 0.5;
    moodYOffset = 1.5;
  } else if (mood === 'energetic') {
    moodBreathAmp = 1.3;
    moodYOffset = Math.sin(breathCycle.current * 0.7) * 1.5;
  }

  const breathScale = 1 + Math.sin(breathCycle.current * 0.1) * 0.02 * moodBreathAmp;

  // Particle systems
  useEffect(() => {
    if (particles.length === 0) return;
    let rAF;
    const updateParticles = () => {
      setParticles((prev) =>
        prev
          .map((p) => {
            const elapsed = Date.now() - p.startTime;
            const progress = Math.min(elapsed / 1200, 1);
            const ease = Math.pow(progress, 0.6);
            return {
              ...p,
              x: p.originX + p.vx * ease * 70, // Smaller particle dispersion
              y: p.originY - ease * 60,
              scale: 1 - progress * 0.5,
              opacity: progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2,
              progress,
            };
          })
          .filter((p) => p.progress < 1)
      );
      rAF = requestAnimationFrame(updateParticles);
    };
    rAF = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(rAF);
  }, [particles]);

  const spawnFlames = (e) => {
    e.stopPropagation();
    recoilStart.current = Date.now();
    recoilActive.current = true;
    fireEndTime.current = Date.now() + 800; // Play spit_fire animation for 800ms

    const rect = petRef.current.getBoundingClientRect();
    const flameX = rect.left + rect.width * (facingLeft ? 0.35 : 0.65);
    const flameY = rect.top + rect.height * 0.45;

    const newParticles = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      originX: flameX,
      originY: flameY,
      x: flameX,
      y: flameY,
      vx: (facingLeft ? -1 : 1) * (0.4 + Math.random() * 0.5),
      scale: 0.8, // Slightly smaller fire particles for smaller dragon
      opacity: 1,
      startTime: Date.now() + i * 100,
      progress: 0,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
  };

  const handleContainerClick = (e) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
    } else {
      clickTimeout.current = setTimeout(() => {
        spawnFlames(e);
        clickTimeout.current = null;
      }, 250); // Double click window
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
    }
    recoilStart.current = Date.now();
    recoilActive.current = true;
    backflipEndTime.current = Date.now() + 2400; // 2 backflips (1.2s each)
    setCurrentState('backflip');
  };

  // Drag and Drop
  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStartOffset.current = {
      x: e.clientX - petPos.current.x,
      y: e.clientY - petPos.current.y,
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e) => {
    const nextX = Math.max(10, Math.min(window.innerWidth - 100, e.clientX - dragStartOffset.current.x));
    const nextY = Math.max(10, Math.min(window.innerHeight - 120, e.clientY - dragStartOffset.current.y));
    petPos.current = { x: nextX, y: nextY };
    targetPos.current = { x: nextX, y: nextY };
    
    // Set state to idle while dragging
    setCurrentState('idle');
    
    if (petRef.current) {
      petRef.current.style.left = `${nextX}px`;
      petRef.current.style.top = `${nextY}px`;
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const toggleFollowCursor = () => {
    setFollowCursor((prev) => {
      const next = !prev;
      if (!next) {
        setCurrentState('idle');
        currentStateRef.current = 'idle';
        targetPos.current = { ...petPos.current };
        idleStartTime.current = Date.now();
      } else {
        idleStartTime.current = Date.now();
      }
      return next;
    });
  };

  // QA Conversational responder
  const handleSendMessage = (text = inputValue) => {
    if (!text.trim()) return;
    const userMsg = { sender: 'user', text };
    setChatHistory((prev) => [...prev, userMsg]);
    setInputValue('');

    setTimeout(() => {
      const replyText = getQAAnswer(text);
      setChatHistory((prev) => [...prev, { sender: 'dragon', text: replyText }]);
      
      recoilStart.current = Date.now();
      recoilActive.current = true;
      fireEndTime.current = Date.now() + 850; // Breathe fire when answering!
      setCurrentState('spit_fire');
    }, 500);
  };

  const getQAAnswer = (input) => {
    const query = input.toLowerCase();

    // Check context for conversational follow-ups
    const isFollowUp = query.includes('more') || query.includes('explain') || query.includes('elaborate') || query.includes('detail') || query.includes('further');
    
    if (isFollowUp && lastTopic.current) {
      if (lastTopic.current === 'notion') {
        return "NotionOS was built by Akshat to bridge Notion documents with local CLI tools. It parses Notion commands and runs code execution workflows directly inside the user's workspace. It was awarded 1st place globally by MLH.";
      }
      if (lastTopic.current === 'pytorch') {
        return "For the Meta PyTorch Hackathon, Akshat built deep learning models for audio processing. The project was recognized for its architectural efficiency and scalability among 31,000+ teams worldwide, validating his capabilities in deep learning and PyTorch.";
      }
      if (lastTopic.current === 'samsung') {
        return "At Samsung R&D, Akshat worked on audio deepfake spoofing detection. He fine-tuned XLS-R speech models on ASVspoof datasets, optimizing model layers and inference speeds for real-time edge deployment.";
      }
      if (lastTopic.current === 'amazon') {
        return "The Amazon ML Summer School covered advanced ML concepts (Deep Learning, NLP, CV, and RL) taught by Amazon's Principal Scientists. Selection was based on competitive coding and ML testing (top ~2.2% select rate).";
      }
      if (lastTopic.current === 'adept') {
        return "AdeptAI automates course assessment creation. It features async PDF parsing, question bank generation, and custom rubric grading matching course objectives, utilizing React, FastAPI, BullMQ, and PostgreSQL.";
      }
      if (lastTopic.current === 'clouddash') {
        return "CloudDash deploys a multi-agent network using LangGraph, where tasks are routed between specialized Coder, Researcher, and Evaluator agents under self-correcting validation loops.";
      }
      if (lastTopic.current === 'fileforge') {
        return "FileForge processes files concurrently using a Celery/RabbitMQ worker queue. Uploads are converted, sanitized, and stored securely in MinIO bucket storage.";
      }
      if (lastTopic.current === 'skills') {
        return "Akshat focuses on building secure backend architectures (FastAPI, RabbitMQ, Docker) and robust AI agent coordination workflows (LangGraph, PyTorch, LLMs).";
      }
      if (lastTopic.current === 'education') {
        return "Akshat is pursuing a B.Tech in Computer Science and Engineering. He cleared JEE Mains with a top percentile and maintains a strong academic track record.";
      }
      if (lastTopic.current === 'chess') {
        return "You can find him playing rapid and blitz games on Chess.com under the username `akshat0_fr`!";
      }
      if (lastTopic.current === 'facts') {
        if (factsList.length > 0) {
          const idx = Math.floor(Math.random() * factsList.length);
          return `Here's another random fact about Akshat: \n\n• ${factsList[idx]}`;
        }
        return "Akshat is an avid chess player rated ~1200 on Chess.com, and loves systems programming!";
      }
      if (lastTopic.current === 'laptop') {
        return "I'm currently working on a custom compiler to build my new language, optimizing NotionOS workflows, and managing multiple agentic LLM chains using LangGraph!";
      }
      if (lastTopic.current === 'snacks') {
        return "Warm popcorn, chips, and pixel cookies are my absolute favorite snacks! They give me the energy to write clean code and spit fire.";
      }
    }

    if (query.includes('laptop') || query.includes('code') || query.includes('work') || query.includes('program') || query.includes('compile')) {
      lastTopic.current = 'laptop';
      laptopEndTime.current = Date.now() + 5000; // Code on laptop for 5 seconds
      setCurrentState('use_laptop');
      return "Sure thing! Watch me type away on my miniature laptop. 💻 *clack clack clack* I am currently coding NotionOS!";
    }
    if (query.includes('eat') || query.includes('snack') || query.includes('food') || query.includes('hungry') || query.includes('popcorn') || query.includes('cookie')) {
      lastTopic.current = 'snacks';
      snacksEndTime.current = Date.now() + 5000; // Eat snacks for 5 seconds
      setCurrentState('eat_snacks');
      return "Yum! 🍿 *munch munch munch* These snacks are delicious! Thanks for feeding me.";
    }

    if (query.includes('flip') || query.includes('backflip') || query.includes('spin')) {
      backflipEndTime.current = Date.now() + 1500;
      setCurrentState('backflip');
      return "Watch this! 🌀 *performs a perfect mid-air backflip*";
    }
    if (query.includes('adept')) {
      lastTopic.current = 'adept';
      return "**AdeptAI – Production AI Assessment Platform**:\nTransforms uploads into assessments & flashcards. Built with React, FastAPI, BullMQ, and PostgreSQL. Features async processing.";
    }
    if (query.includes('clouddash')) {
      lastTopic.current = 'clouddash';
      return "**CloudDash – Multi-Agent Support Engine**:\nIntelligent support network using LangGraph, ChromaDB, and FastAPI. Employs semantic routing & self-correcting validation loops.";
    }
    if (query.includes('fileforge') || query.includes('forge')) {
      lastTopic.current = 'fileforge';
      return "**FileForge – Microservice File Platform**:\nHigh-performance engine for async file conversions using RabbitMQ, MinIO, FastAPI, and Docker.";
    }
    if (query.includes('project') || query.includes('work') || query.includes('build') || query.includes('portfolio')) {
      lastTopic.current = 'projects';
      return "Akshat has built some awesome AI & systems projects: \n\n• **AdeptAI**: An AI assessment generator.\n• **CloudDash**: A multi-agent support flow using LangGraph.\n• **FileForge**: A distributed file microservice.\n\nType a project's name to hear details!";
    }
    if (query.includes('notion') || query.includes('winner')) {
      lastTopic.current = 'notion';
      return "🏆 **Notion AI Challenge 2026 Winner**:\nWon the MLH Notion Challenge with **NotionOS** — an agentic workflow tool integrating Notion workspaces with real-time CLI terminal execution tools.";
    }
    if (query.includes('pytorch') || query.includes('meta')) {
      lastTopic.current = 'pytorch';
      return "🔥 **Meta PyTorch Hackathon Finalist**:\nReached global finals out of 31,000+ teams worldwide with deep learning models!";
    }
    if (query.includes('samsung') || query.includes('deepfake')) {
      lastTopic.current = 'samsung';
      return "🏢 **Samsung Research R&D**:\nWorked on audio deepfake detection. Fine-tuned XLS-R speech models on ASVspoof datasets, hitting a SOTA EER of 1.43%!";
    }
    if (query.includes('amazon') || query.includes('ml school') || query.includes('summer')) {
      lastTopic.current = 'amazon';
      return "🎓 **Amazon ML Summer School 2026**:\nSelected for Amazon's highly selective ML scientist training program (top ~2.2% of 17,500+ applicants).";
    }
    if (query.includes('skill') || query.includes('language') || query.includes('tech') || query.includes('python')) {
      lastTopic.current = 'skills';
      return "🛠️ **Akshat's Tech Stack**:\n\n• **Languages**: Python, C++, SQL, JS/TS\n• **AI/ML**: PyTorch, LangGraph, LLM Fine-tuning, Vector DBs\n• **Backend**: FastAPI, RabbitMQ, Docker, PostgreSQL, Redis";
    }
    if (query.includes('chess')) {
      lastTopic.current = 'chess';
      return "♟️ **Chess Hobby**:\nAkshat loves playing chess. He's rated ~1200 on Chess.com!";
    }
    if (query.includes('education') || query.includes('college') || query.includes('cgpa')) {
      lastTopic.current = 'education';
      return "🎓 **Education**:\nAkshat is a Computer Science B.Tech undergraduate (Third-Year) with a strong CGPA, having cleared JEE Mains with a highly competitive percentile.";
    }
    
    // Dynamic Facts/Hobbies QA responder
    if (query.includes('fact') || query.includes('hobby') || query.includes('random') || query.includes('trivia')) {
      lastTopic.current = 'facts';
      if (factsList.length > 0) {
        const idx = Math.floor(Math.random() * factsList.length);
        return `Here's a random fact about Akshat: \n\n• ${factsList[idx]}`;
      }
      return "Akshat is an avid chess player rated ~1200 on Chess.com, and loves systems programming!";
    }

    if (query.includes('contact') || query.includes('email') || query.includes('hire') || query.includes('resume')) {
      lastTopic.current = 'contact';
      return "📩 **Contact details**:\n\n• **Email**: akshat.arya13@gmail.com\n• **GitHub**: github.com/Arya-Akshat\n• **LinkedIn**: linkedin.com/in/akshat-arya-82b4b724b";
    }

    return "Hey, I'm Firefly! Ask me about achievements (Notion winner, PyTorch finalist, Amazon ML School), projects (AdeptAI, CloudDash), work at Samsung, skills, or ask for a random fact!";
  };

  // Helper custom Markdown parser (handles **bold**, [label](url), and list items)
  const renderLineText = (line) => {
    const tokens = [];
    let currentIndex = 0;
    const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
    const matches = [...line.matchAll(regex)];

    if (matches.length === 0) {
      return line;
    }

    matches.forEach((match, matchIndex) => {
      const matchText = match[0];
      const matchStart = match.index;

      if (matchStart > currentIndex) {
        tokens.push(line.substring(currentIndex, matchStart));
      }

      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        const boldText = matchText.slice(2, -2);
        tokens.push(<strong key={`bold-${matchIndex}`}>{boldText}</strong>);
      } else if (matchText.startsWith('[') && matchText.includes('](')) {
        const label = matchText.match(/\[(.*?)\]/)[1];
        const url = matchText.match(/\((.*?)\)/)[1];
        tokens.push(
          <a
            key={`link-${matchIndex}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'underline' }}
          >
            {label}
          </a>
        );
      }

      currentIndex = matchStart + matchText.length;
    });

    if (currentIndex < line.length) {
      tokens.push(line.substring(currentIndex));
    }

    return tokens;
  };

  const renderMessageText = (text) => {
    const lines = text.split('\n');
    const renderedElements = [];
    let inList = false;
    let currentListItems = [];

    lines.forEach((line, index) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');

      if (isBullet) {
        if (!inList) {
          inList = true;
          currentListItems = [];
        }
        const cleanLine = line.trim().replace(/^[•\-]\s*/, '');
        currentListItems.push(
          <li key={`li-${index}`} style={{ listStyleType: 'disc', marginLeft: '1.25rem', marginBottom: '0.25rem' }}>
            {renderLineText(cleanLine)}
          </li>
        );
      } else {
        if (inList) {
          renderedElements.push(
            <ul key={`ul-${index}`} style={{ margin: '0.5rem 0', padding: 0 }}>
              {currentListItems}
            </ul>
          );
          inList = false;
        }

        if (line.trim() === '') {
          renderedElements.push(<div key={`br-${index}`} style={{ height: '0.5rem' }} />);
        } else {
          renderedElements.push(
            <div key={`p-${index}`} style={{ marginBottom: '0.4rem' }}>
              {renderLineText(line)}
            </div>
          );
        }
      }
    });

    if (inList) {
      renderedElements.push(
        <ul key={`ul-final`} style={{ margin: '0.5rem 0', padding: 0 }}>
          {currentListItems}
        </ul>
      );
    }

    return renderedElements;
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="summon-dragon-btn"
      >
        <span className="summon-dragon-text">🐉</span>
        <span className="summon-dragon-tooltip">Summon Firefly</span>
      </button>
    );
  }

  const row = STATE_ROWS[currentState] ?? 0;
  
  // Decide flips: Row 2 and 3 are already facing left or neutral in the spritesheet.
  // All other rows face right by default, so we flip scaleX when facingLeft.
  let flipFactor = facingLeft ? -1 : 1;
  if (currentState === 'walk_left') {
    flipFactor = 1;
  }




  
  const xOffset = currentFrame.current * FRAME_WIDTH;
  const yOffset = row * FRAME_HEIGHT;

  return (
    <>
      {/* Flame particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="dragon-flame-particle"
          style={{
            left: p.x,
            top: p.y,
            opacity: p.opacity,
            transform: `scale(${p.scale}) rotate(${(p.vx > 0 ? 30 : -30) * p.progress}deg)`,
          }}
        >
          🔥
        </span>
      ))}

      {/* Main floating companion wrapper */}
      <div
        ref={petRef}
        className="dragon-fixed-wrapper"
        onMouseEnter={() => {
          isHoveredRef.current = true;
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
          setIsHovered(false);
        }}
      >

        {/* Hover Action Menu */}
        <div className="dragon-controls">
          <button
            onClick={toggleFollowCursor}
            className={`dragon-ctrl-btn ${followCursor ? 'active' : ''}`}
          >
            <MousePointer size={13} />
            <span className="dragon-tooltip">
              {followCursor ? 'Stop Following' : 'Follow Cursor'}
            </span>
          </button>
          <button
            onClick={() => setChatOpen((c) => !c)}
            className={`dragon-ctrl-btn ${chatOpen ? 'active' : ''}`}
          >
            <MessageSquare size={13} />
            <span className="dragon-tooltip">Chat with Firefly</span>
          </button>
          <button
            onClick={() => setActive(false)}
            className="dragon-ctrl-btn close"
          >
            <X size={13} />
            <span className="dragon-tooltip">Dismiss Firefly</span>
          </button>
        </div>

        <div
          onMouseDown={handleDragStart}
          onClick={handleContainerClick}
          onDoubleClick={handleDoubleClick}
          className="dragon-container"
          style={{
            transform: `scale(${breathScale}) scaleX(${flipFactor}) translateY(${recoilOffset + moodYOffset}px)`,
          }}
        >
          <img
            className="dragon-img"
            src="/spritesheet.webp?v=55"
            alt="Companion Dragon"
            style={{
              transform: `translate(${-xOffset}px, ${-yOffset}px)`,
            }}
          />
        </div>

        {/* Local QA Chat Window */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="dragon-chat-window"
            >
              <div className="dragon-chat-header">
                <span>🐉 Firefly</span>
                <button onClick={() => setChatOpen(false)}>
                  <X size={14} />
                </button>
              </div>

              <div className="dragon-chat-messages">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-bubble ${msg.sender}`}>
                    {renderMessageText(msg.text)}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestions panels - only show before conversation begins */}
              {chatHistory.length === 1 && (
                <div className="dragon-chat-suggestions">
                  {['💻 Projects', '🏆 Achievements', '🎲 Random Fact', '🛠️ Skills'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSendMessage(tag.replace(/[^a-zA-Z\s]/g, '').trim())}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat input message bar */}
              <div className="dragon-chat-input-bar">
                <input
                  type="text"
                  placeholder="Ask me something..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={() => handleSendMessage()}>
                  <Send size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
