const navLinks = document.querySelector('.nav-links');
const hamburger = document.querySelector('.hamburger');

function toggleMenu() {
  navLinks.classList.toggle('active');
  hamburger.innerHTML = navLinks.classList.contains('active') ? '&#10005;' : '&#9776;';
}

hamburger.addEventListener('click', toggleMenu);

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    hamburger.innerHTML = '&#9776;';
  });
});

const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

function updateActiveLink() {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 100;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  navAnchors.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

window.addEventListener('scroll', updateActiveLink);

const backToTop = document.createElement('button');
backToTop.innerHTML = '&#8593;';
backToTop.className = 'back-to-top';
backToTop.setAttribute('aria-label', 'Back to top');
document.body.appendChild(backToTop);

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const themeToggle = document.createElement('button');
themeToggle.className = 'theme-toggle';
themeToggle.setAttribute('aria-label', 'Toggle theme');
const nav = document.querySelector('nav');
const logo = nav.querySelector('.logo');
const toggleWrap = document.createElement('div');
toggleWrap.style.cssText = 'display:flex;align-items:center';
nav.insertBefore(toggleWrap, hamburger);
toggleWrap.appendChild(themeToggle);

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeToggle.innerHTML = '&#9790;';
} else {
  themeToggle.innerHTML = '&#9790;';
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

const roles = ['Web Developer', 'UI Designer', 'Problem Solver', 'Creative Thinker'];
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

const typingEl = document.createElement('p');
typingEl.className = 'typing-text';
document.querySelector('.hero-content .subtitle').after(typingEl);

function typeEffect() {
  const current = roles[roleIndex];
  if (!isDeleting) {
    typingEl.textContent = current.slice(0, charIndex++);
    if (charIndex > current.length) {
      isDeleting = true;
      setTimeout(typeEffect, 2000);
      return;
    }
  } else {
    typingEl.textContent = current.slice(0, charIndex--);
    if (charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
    }
  }
  setTimeout(typeEffect, isDeleting ? 50 : 100);
}

typeEffect();

const revealElements = document.querySelectorAll('.section-title, .about-content, .skills-grid, .projects-grid, .contact-intro, #contact-form');

revealElements.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

revealElements.forEach(el => observer.observe(el));

const contactForm = document.getElementById('contact-form');
const feedback = document.createElement('div');
feedback.className = 'form-feedback';
contactForm.parentNode.insertBefore(feedback, contactForm.nextSibling);

contactForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const name = this.querySelector('input[type="text"]').value.trim();
  const email = this.querySelector('input[type="email"]').value.trim();
  const message = this.querySelector('textarea').value.trim();

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
  feedback.textContent = 'Thank you, ' + name + '! Your message has been sent.';
  this.reset();
});

const footerYear = document.querySelector('footer p');
if (footerYear) {
  footerYear.textContent = footerYear.textContent.replace(/\d{4}/, new Date().getFullYear());
}

// Chatbot
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');

const chatbotResponses = [
  { keywords: ['hi', 'hello', 'hey', 'greetings'], response: 'Hello! How can I help you learn more about Ahmad?' },
  { keywords: ['who are you', 'about', 'tell me about'], response: 'I\'m Ahmad Raza, a passionate web developer and designer who loves building things for the web.' },
  { keywords: ['skills', 'technologies', 'tech stack', 'what can you do'], response: 'Ahmad works with HTML5, CSS3, JavaScript, React, Node.js, Git, Databases, and TypeScript.' },
  { keywords: ['projects', 'portfolio', 'work', 'what have you done'], response: 'Check out the Projects section above! Ahmad has built several web projects using various technologies.' },
  { keywords: ['contact', 'email', 'reach', 'hire'], response: 'You can reach Ahmad at ahmadrazaweb7@gmail.com or use the contact form on this page!' },
  { keywords: ['experience', 'background', 'career'], response: 'Ahmad is a web developer based in your city, passionate about creating interactive web applications and exploring new technologies.' },
  { keywords: ['resume', 'cv', 'download'], response: 'You can reach out via the contact section or email Ahmad directly to request a resume.' },
  { keywords: ['thanks', 'thank you', 'appreciate'], response: 'You\'re welcome! Feel free to ask if you have more questions.' },
  { keywords: ['bye', 'goodbye', 'see you'], response: 'Goodbye! Feel free to come back anytime.' }
];

function getBotResponse(msg) {
  const lower = msg.toLowerCase();
  for (const item of chatbotResponses) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) return item.response;
    }
  }
  return 'I\'m not sure about that. Try asking about skills, projects, contact, or about Ahmad!';
}

function addChatMsg(text, isUser) {
  const div = document.createElement('div');
  div.className = 'chatbot-msg ' + (isUser ? 'user' : 'bot');
  div.textContent = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function sendMessage() {
  const text = chatbotInput.value.trim();
  if (!text) return;
  addChatMsg(text, true);
  chatbotInput.value = '';
  setTimeout(() => {
    const reply = getBotResponse(text);
    addChatMsg(reply, false);
  }, 400);
}

chatbotToggle.addEventListener('click', () => {
  chatbotWindow.classList.toggle('open');
  if (chatbotWindow.classList.contains('open')) chatbotInput.focus();
});

chatbotClose.addEventListener('click', () => {
  chatbotWindow.classList.remove('open');
});

chatbotSend.addEventListener('click', sendMessage);

chatbotInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});
