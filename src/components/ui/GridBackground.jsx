import React, { useEffect, useRef } from 'react';

function GridBackground() {
  const backgroundRef = useRef(null);

  useEffect(() => {
    const element = backgroundRef.current;
    if (!element) {
      return;
    }

    const handleMouseMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      element.style.setProperty('--mouse-x', `${x}px`);
      element.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={backgroundRef} className="grid-background" aria-hidden="true">
      <div className="grid-background__cursor-glow" />
      <div className="grid-background__top-glow" />
    </div>
  );
}

export default GridBackground;
