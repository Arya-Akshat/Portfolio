import React, { useEffect, useRef } from 'react';

const NODE_COUNT = 80;
const CONNECTION_DIST = 150;
const NODE_RADIUS = 1.5;
const MOUSE_DIST = 200;
const BASE_SPEED = 0.3;

function WebBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const nodesRef = useRef([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initNodes = () => {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * BASE_SPEED,
        vy: (Math.random() - 0.5) * BASE_SPEED,
      }));
    };

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) {
          node.vx *= -1;
        }

        if (node.y < 0 || node.y > height) {
          node.vy *= -1;
        }

        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_DIST && dist > 0) {
          const force = ((MOUSE_DIST - dist) / MOUSE_DIST) * 0.02;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;

          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > BASE_SPEED * 3) {
            node.vx = (node.vx / speed) * BASE_SPEED * 3;
            node.vy = (node.vy / speed) * BASE_SPEED * 3;
          }
        }
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.25;
            const mouseDist = Math.min(
              Math.hypot(mouse.x - nodes[i].x, mouse.y - nodes[i].y),
              Math.hypot(mouse.x - nodes[j].x, mouse.y - nodes[j].y),
            );
            const nearMouse = mouseDist < MOUSE_DIST;

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = nearMouse
              ? `rgba(59, 130, 246, ${alpha * 1.8})`
              : `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = nearMouse ? 0.8 : 0.5;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        const mouseDist = Math.hypot(mouse.x - node.x, mouse.y - node.y);
        const nearMouse = mouseDist < MOUSE_DIST;
        const alpha = nearMouse ? 0.9 : 0.35;

        ctx.beginPath();
        ctx.arc(node.x, node.y, nearMouse ? NODE_RADIUS * 1.8 : NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = nearMouse ? `rgba(59, 130, 246, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });
    };

    const draw = () => {
      drawFrame();
      rafRef.current = window.requestAnimationFrame(draw);
    };

    resize();
    initNodes();
    window.addEventListener('resize', resize);

    const onMouseMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawFrame();
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMouseMove);
      };
    }

    draw();

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="web-background" aria-hidden="true" />;
}

export default WebBackground;
