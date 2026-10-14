
    const items = document.querySelectorAll('.acc');

    items.forEach((item) => {
      const btn = item.querySelector('.acc__btn');
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        items.forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.acc__btn').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  
