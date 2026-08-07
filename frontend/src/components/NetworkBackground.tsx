import React, { useEffect, useRef } from 'react';

const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles: Particle[] = [];
    // Adjust colors here to match the theme perfectly
    const properties = {
      particleColor: 'rgba(52, 211, 153, 0.4)', // Emerald dots
      particleAmount: 70,
      defaultRadius: 1.5,
      variantRadius: 2,
      defaultSpeed: 0.3,
      variantSpeed: 0.3,
      linkRadius: 160,
    };

    class Particle {
      x: number;
      y: number;
      speed: number;
      directionAngle: number;
      vector: { x: number; y: number };
      radius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.speed = properties.defaultSpeed + Math.random() * properties.variantSpeed;
        this.directionAngle = Math.floor(Math.random() * 360);
        this.vector = {
          x: Math.cos(this.directionAngle) * this.speed,
          y: Math.sin(this.directionAngle) * this.speed
        };
        this.radius = properties.defaultRadius + Math.random() * properties.variantRadius;
      }

      update() {
        this.border();
        this.x += this.vector.x;
        this.y += this.vector.y;
      }

      border() {
        if (this.x >= width || this.x <= 0) {
          this.vector.x *= -1;
        }
        if (this.y >= height || this.y <= 0) {
          this.vector.y *= -1;
        }
        if (this.x > width) this.x = width;
        if (this.y > height) this.y = height;
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = properties.particleColor;
        ctx.fill();
      }
    }

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < properties.particleAmount; i++) {
        particles.push(new Particle());
      }
    };

    const drawLines = () => {
      let x1, y1, x2, y2, length, opacity;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          x1 = particles[i].x;
          y1 = particles[i].y;
          x2 = particles[j].x;
          y2 = particles[j].y;
          length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          if (length < properties.linkRadius) {
            opacity = 1 - length / properties.linkRadius;
            ctx.lineWidth = 0.5;
            // Line color with dynamic opacity
            ctx.strokeStyle = `rgba(52, 211, 153, ${opacity * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
    };

    let animationFrameId: number;
    const loop = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      drawLines();
      animationFrameId = requestAnimationFrame(loop);
    };

    init();
    loop();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default NetworkBackground;
