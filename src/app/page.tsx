'use client';

import { useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ChatbotWidget from '@/components/ChatbotWidget';
import ThemeProvider from '@/components/ThemeProvider';

const roles = ['Web Developer', 'UI Designer', 'Problem Solver', 'Creative Thinker'];

export default function Home() {
  const typingRef = useRef<HTMLParagraphElement>(null);
  const contactFormRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Typing animation
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
      if (!typingRef.current) return;
      const current = roles[roleIndex];
      if (!isDeleting) {
        typingRef.current.textContent = current.slice(0, charIndex++);
        if (charIndex > current.length) {
          isDeleting = true;
          setTimeout(typeEffect, 2000);
          return;
        }
      } else {
        typingRef.current.textContent = current.slice(0, charIndex--);
        if (charIndex === 0) {
          isDeleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
      }
      setTimeout(typeEffect, isDeleting ? 50 : 100);
    };
    typeEffect();

    // Scroll reveal
    const revealElements = document.querySelectorAll('.section-title, .about-content, .skills-grid, .projects-grid, .contact-intro, #contact-form');
    revealElements.forEach((el) => el.classList.add('reveal'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );
    revealElements.forEach((el) => observer.observe(el));

    // Back to top
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '&#8593;';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTop);

    const handleScroll = () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      backToTop.remove();
    };
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('input[type="text"]') as HTMLInputElement).value.trim();
    const email = (form.querySelector('input[type="email"]') as HTMLInputElement).value.trim();
    const message = (form.querySelector('textarea') as HTMLTextAreaElement).value.trim();
    const feedback = feedbackRef.current;

    if (!feedback) return;

    if (!name || !email || !message) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Please fill in all fields.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      feedback.className = 'form-feedback error';
      feedback.textContent = 'Please enter a valid email address.';
      return;
    }

    feedback.className = 'form-feedback success';
    feedback.textContent = `Thank you, ${name}! Your message has been sent.`;
    form.reset();
  };

  return (
    <ThemeProvider>
      <Navigation />

      <section id="hero">
        <div className="hero-content">
          <h1>Hi, I&apos;m <span className="highlight">Ahmad Raza</span></h1>
          <p className="subtitle">Web Developer & Designer</p>
          <p className="tagline">I build things for the web.</p>
          <p ref={typingRef} className="typing-text"></p>
          <div className="hero-links">
            <a href="#projects" className="btn">View My Work</a>
            <a href="#contact" className="btn btn-outline">Get In Touch</a>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="container">
          <h2 className="section-title">About Me</h2>
          <div className="about-content">
            <div className="about-text">
              <p>Hello! I&apos;m a passionate web developer based in your city. I enjoy creating things that live on the internet — from simple static sites to interactive web applications.</p>
              <p>When I&apos;m not coding, you&apos;ll find me exploring new technologies, contributing to open source, or writing technical blog posts.</p>
            </div>
            <div className="about-image">
              <img src="/profile.jpeg" alt="Ahmad Raza" className="profile-photo" />
            </div>
          </div>
        </div>
      </section>

      <section id="skills">
        <div className="container">
          <h2 className="section-title">Skills</h2>
          <div className="skills-grid">
            {[
              { icon: 'fab fa-html5', name: 'HTML5' },
              { icon: 'fab fa-css3-alt', name: 'CSS3' },
              { icon: 'fab fa-js', name: 'JavaScript' },
              { icon: 'fab fa-react', name: 'React' },
              { icon: 'fab fa-node-js', name: 'Node.js' },
              { icon: 'fab fa-git-alt', name: 'Git' },
              { icon: 'fas fa-database', name: 'Databases' },
              { icon: 'fas fa-code', name: 'TypeScript' },
            ].map((skill) => (
              <div className="skill-card" key={skill.name}>
                <i className={skill.icon}></i>
                <p>{skill.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="projects">
        <div className="container">
          <h2 className="section-title">Projects</h2>
          <div className="projects-grid">
            {[
              { title: 'Project Title', desc: 'A short description of the project and what it does.', tags: ['HTML', 'CSS', 'JS'] },
              { title: 'Project Title', desc: 'A short description of the project and what it does.', tags: ['React', 'Node'] },
              { title: 'Project Title', desc: 'A short description of the project and what it does.', tags: ['Python', 'Flask'] },
            ].map((project, i) => (
              <div className="project-card" key={i}>
                <div className="project-image">Project {i + 1}</div>
                <h3>{project.title}</h3>
                <p>{project.desc}</p>
                <div className="project-tags">
                  {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className="project-links">
                  <a href="#"><i className="fab fa-github"></i> Code</a>
                  <a href="#"><i className="fas fa-external-link-alt"></i> Live</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="container">
          <h2 className="section-title">Get In Touch</h2>
          <p className="contact-intro">I&apos;m currently open to new opportunities. Whether you have a question or just want to say hi, feel free to reach out!</p>
          <p className="contact-email">Or reach me directly at <a href="mailto:ahmadaliraza646@gmail.com">ahmadaliraza646@gmail.com</a></p>
          <form id="contact-form" ref={contactFormRef} onSubmit={handleContactSubmit}>
            <input type="text" placeholder="Your Name" required />
            <input type="email" placeholder="Your Email" required />
            <textarea rows={5} placeholder="Your Message" required></textarea>
            <button type="submit" className="btn">Send Message</button>
          </form>
          <div ref={feedbackRef} className="form-feedback"></div>
        </div>
      </section>

      <Footer />
      <ChatbotWidget />
    </ThemeProvider>
  );
}
