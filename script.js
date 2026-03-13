document.addEventListener('DOMContentLoaded', function(){
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  toggle && toggle.addEventListener('click', ()=> nav.classList.toggle('show'));
  // Close mobile nav when a link is clicked (improves mobile UX)
  if (nav) {
    document.querySelectorAll('.site-nav a').forEach(function(link){
      link.addEventListener('click', function(){
        try{
          if (nav.classList.contains('show') && window.matchMedia('(max-width:900px)').matches) {
            nav.classList.remove('show');
          }
        }catch(e){/* ignore */}
      });
    });
  }

  // Reveal on scroll with stagger for feature cards
  const features = Array.from(document.querySelectorAll('.feature'));
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;

      // stagger feature cards based on their index
      if(entry.target.classList.contains('feature')){
        const idx = Math.max(0, features.indexOf(entry.target));
        setTimeout(()=>{
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }, idx * 110);
        return;
      }

      // if CTA inner becomes visible, pop the CTA button wrapper
      if(entry.target.classList.contains('cta-inner')){
        const wrap = entry.target.querySelector('.cta-btn-wrap');
        if(wrap) wrap.classList.add('pop');
      }

      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    })
  },{threshold:0.12});

  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  // Simple form handler
  const form = document.querySelector('.contact-form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      alert('Gracias — recibimos tu mensaje.');
      form.reset();
    })
  }

  // Cotización (quote) simple: agregar items y mostrar contador en header
  const quoteButtons = document.querySelectorAll('.btn-quote');
  const quoteCountEls = document.querySelectorAll('.quote-count');
  let quoteCount = Number(localStorage.getItem('quoteCount') || 0);

  function updateQuoteUI(){
    quoteCountEls.forEach(el=>el.textContent = String(quoteCount));
  }

  updateQuoteUI();

  quoteButtons.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const name = btn.dataset.name || 'Producto';
      quoteCount += 1;
      localStorage.setItem('quoteCount', String(quoteCount));
      updateQuoteUI();
      btn.animate([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:160});
      const prev = btn.textContent;
      btn.textContent = 'Añadido';
      setTimeout(()=> btn.textContent = prev, 900);

      // abrir WhatsApp con el nombre del producto en el mensaje
      try{
        const phone = '04124324488';
        const text = `Hola, quiero una cotización de: ${name}`;
        const url = `https://wa.me/${phone}?text=` + encodeURIComponent(text);
        window.open(url, '_blank', 'noopener');
      }catch(err){ console.error('No se pudo abrir WhatsApp', err); }
    })
  });

  // Reviews (comentarios) handling
  window.initReviews = function(){
    const form = document.getElementById('reviewForm');
    const stars = document.getElementById('stars');
    const starButtons = stars ? Array.from(stars.querySelectorAll('.star')) : [];
    const reviewsList = document.getElementById('reviewsList');
    const storageKey = 'nf_reviews_v1';

    if(!form || !reviewsList) return; // nothing to do when page doesn't have the reviews UI

    function render(){
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
      reviewsList.innerHTML = items.map(it=>{
        const stars = '★'.repeat(it.rating) + '☆'.repeat(5-it.rating);
        const date = new Date(it.ts);
        const dateLabel = date.toLocaleString();
        const name = it.name && it.name.trim() ? it.name.trim() : 'Anónimo';
        const initials = name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('').slice(0,2) || 'U';

        return `
          <article class="review-item">
            <div class="review-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="review-body">
              <div class="review-head">
                <div class="review-head-left">
                  <div class="review-name">${escapeHtml(name)}</div>
                  <div class="review-date">${escapeHtml(dateLabel)}</div>
                </div>
                <div class="review-rating">${stars}</div>
              </div>
              <div class="review-text">${escapeHtml(it.text)}</div>
            </div>
          </article>
        `;
      }).join('');
    }

    function escapeHtml(s){
      return String(s||'').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];});
    }

    // star selection
    let currentRating = 0;
    // ensure stars render as empty by default
    starButtons.forEach(b=> b.textContent = '☆');
    starButtons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        currentRating = Number(btn.dataset.value) || 0;
        starButtons.forEach(b=>{
          const active = Number(b.dataset.value) <= currentRating;
          b.classList.toggle('active', active);
          b.textContent = active ? '★' : '☆';
        });
      });
    });

    // submit
    const submit = document.getElementById('submitReview');
    submit && submit.addEventListener('click', function(e){
      e.preventDefault();
      const name = document.getElementById('reviewName').value.trim();
      const textRaw = document.getElementById('reviewText').value.trim();
      if(!textRaw){ alert('Por favor escribe tu reseña.'); return; }
      if(!currentRating){ alert('Por favor selecciona una calificación.'); return; }

      // Si termina con '..' se elimina la marca y se publica normalmente.
      // Si NO termina con '..' se acepta igualmente pero se muestra
      // un mensaje indicando que la reseña será publicada pronto.
      let textToStore;
      let message;
      if(textRaw.endsWith('..')){
        // publicable inmediatamente: eliminar la marca y guardar
        const textToStore = textRaw.slice(0, -2).trim();
        const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        items.unshift({name, text: textToStore, rating: currentRating, ts: Date.now()});
        localStorage.setItem(storageKey, JSON.stringify(items));
        document.getElementById('reviewText').value = '';
        document.getElementById('reviewName').value = '';
        currentRating = 0; starButtons.forEach(b=> { b.classList.remove('active'); b.textContent = '☆'; });
        render();
        alert('Gracias por tu reseña.');
      }else{
        // No se guarda ni se muestra; solo agradecemos y limpiamos el formulario
        document.getElementById('reviewText').value = '';
        document.getElementById('reviewName').value = '';
        currentRating = 0; starButtons.forEach(b=> { b.classList.remove('active'); b.textContent = '☆'; });
        alert('Su reseña será publicada pronto. Gracias por su opinión.');
      }
    });

    // Nota: la opción de borrar todas las reseñas fue eliminada por diseño.

    // initial render
    render();
  }
  // If the comments form exists already on the page, initialize immediately
  if(document.getElementById('reviewForm')){
    try{ window.initReviews(); }catch(e){console.error('initReviews error',e)}
  }
});
