export function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let particles = [];
  const particleCount = window.innerWidth < 768 ? 50 : 120;
  const maxDistance = 150;

  let mouse = { x: -1000, y: -1000 };
  let isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  function getThemeColors() {
    return isDarkMode 
      ? { dot: 'rgba(100, 210, 255, 0.6)', line: 'rgba(100, 210, 255, ' }
      : { dot: 'rgba(0, 122, 255, 0.4)', line: 'rgba(0, 122, 255, ' };
  }

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.size = Math.random() * 2 + 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

      // Mouse interaction
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        this.x -= dx * 0.02;
        this.y -= dy * 0.02;
      }
    }

    draw(colors) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = colors.dot;
      ctx.fill();
    }
  }

  function init() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  let animationId = null;
  let isAnimated = localStorage.getItem('bg-animated') !== 'false';
  document.documentElement.setAttribute('data-bg-animated', isAnimated ? 'true' : 'false');

  function animate() {
    if (!isAnimated) return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = getThemeColors();

    particles.forEach((p) => {
      p.update();
      p.draw(colors);
    });

    // Draw lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        let dx = particles[i].x - particles[j].x;
        let dy = particles[i].y - particles[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          let opacity = 1 - (distance / maxDistance);
          ctx.beginPath();
          ctx.strokeStyle = colors.line + (opacity * 0.5) + ')';
          ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
  });
  window.addEventListener('mouseout', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  // Listen for theme and bg-animation changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      }
      if (mutation.attributeName === 'data-bg-animated') {
        const newAnimated = document.documentElement.getAttribute('data-bg-animated') !== 'false';
        if (newAnimated && !isAnimated) {
          isAnimated = true;
          animate();
        } else if (!newAnimated && isAnimated) {
          isAnimated = false;
          if (animationId) cancelAnimationFrame(animationId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });

  resize();
  init();
  if (isAnimated) {
    animate();
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
