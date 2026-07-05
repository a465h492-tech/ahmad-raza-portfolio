function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('active');
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('active');
  });
});

document.getElementById('contact-form').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Thank you for your message! I will get back to you soon.');
  this.reset();
});
