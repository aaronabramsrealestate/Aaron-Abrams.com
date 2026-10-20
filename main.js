// Background scroll lock. Anything that covers the page (photo viewer, booking popup,
// mobile menu) holds a named lock while it is open; the page scrolls again once every
// lock is released. Locks are cleared when the page is restored from the back button.
(function(){
  var held={}, on=false, de=document.documentElement;
  function sync(){
    var want=Object.keys(held).length>0;
    if(want===on) return; on=want;
    if(on){ var sb=window.innerWidth-de.clientWidth; if(sb>0) de.style.setProperty('--sbw',sb+'px'); de.classList.add('scroll-locked'); if(window.__lenis) window.__lenis.stop(); }
    else { de.classList.remove('scroll-locked'); de.style.removeProperty('--sbw'); if(window.__lenis) window.__lenis.start(); }
  }
  window.__scrollLock={
    lock:function(id){ held[id]=1; sync(); },
    unlock:function(id){ delete held[id]; sync(); },
    clear:function(){ held={}; sync(); }
  };
  window.addEventListener('pageshow',function(e){ if(e.persisted) window.__scrollLock.clear(); });
})();

// Analytics and lead tracking. The Google tag (G-7LHDBV3NSV) sits at the top of every page's
// <head>; this sends these actions to it as events, which can be marked as key events
// (conversions) in Google Analytics:
//   generate_lead      a contact or home value form was sent (form_name says which)
//   book_consultation  a consultation was booked in the Calendly calendar
//   open_calendar      a "Schedule a Consultation" style button was clicked
//   click_call, click_text, click_email, click_zillow
window.__track=function(name,params){ if(window.gtag) window.gtag('event',name,params||{}); };
// The lead forms, found by name: Netlify removes data-netlify from the HTML it serves.
var LEAD_FORMS='form[name="contact"],form[name="home-value"]';
(function(){
  var track=window.__track;
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href]'); if(!a) return;
    var h=a.getAttribute('href'), where={link_text:(a.textContent||'').trim().slice(0,80)};
    if(a.hasAttribute('data-calendly')) track('open_calendar',where);
    else if(h.indexOf('tel:')===0) track('click_call',where);
    else if(h.indexOf('sms:')===0) track('click_text',where);
    else if(h.indexOf('mailto:')===0) track('click_email',where);
    else if(/zillow\.com/.test(h)) track('click_zillow',where);
  },true);
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f.matches||!f.matches(LEAD_FORMS)||f.__tracked) return;
    f.__tracked=true;
    var i=f.querySelector('[name="interest"]');
    track('generate_lead',{form_name:f.getAttribute('name'),interest:i?i.value:''});
  },true);
  window.addEventListener('pageshow',function(){ document.querySelectorAll(LEAD_FORMS).forEach(function(f){ f.__tracked=false; }); });
  // Calendly tells the page when a meeting is booked
  window.addEventListener('message',function(e){
    if(e.origin!=='https://calendly.com'||!e.data||e.data.event!=='calendly.event_scheduled') return;
    track('book_consultation',{});
  });
})();

// Mobile menu and small helpers
(function(){
  var t=document.querySelector('.menu-toggle'),m=document.getElementById('menu');
  if(t&&m){
    var wide=window.matchMedia('(min-width: 1141px)'), pushed=false, goTo=null;
    // The open menu holds one history entry, so the back button closes it like the other overlays.
    var set=function(o){
      if(o===m.classList.contains('open')) return;
      m.classList.toggle('open',o); t.setAttribute('aria-expanded',o?'true':'false');
      window.__scrollLock[o?'lock':'unlock']('menu');
      if(o){ try{ history.pushState({menu:1},''); pushed=true; }catch(e){ pushed=false; } }
      else if(pushed){ pushed=false; history.back(); }
    };
    window.addEventListener('popstate',function(){
      if(goTo){ var u=goTo; goTo=null; location.href=u; return; }
      if(m.classList.contains('open')){ pushed=false; set(false); }
    });
    t.addEventListener('click',function(){ set(!m.classList.contains('open')); });
    m.addEventListener('click',function(e){
      var a=e.target.closest('a'); if(!a) return;
      // Following a link: step back off the menu's history entry first, then go, so the
      // back button on the next page returns here in one press.
      if(pushed && a.hash && a.origin===location.origin && a.pathname===location.pathname && !e.ctrlKey && !e.metaKey){
        // A section of this page: swap the menu's history entry for the section and scroll to it.
        e.preventDefault(); pushed=false; history.replaceState(null,'',a.href); set(false);
        var to=document.getElementById(decodeURIComponent(a.hash.slice(1))); if(to) to.scrollIntoView();
        return;
      }
      if(pushed && a.href && !a.target && !e.ctrlKey && !e.metaKey && !e.shiftKey && a.origin===location.origin){
        e.preventDefault(); goTo=a.href; set(false);
        setTimeout(function(){ if(goTo){ var u=goTo; goTo=null; location.href=u; } },400);
        return;
      }
      set(false);
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&m.classList.contains('open')){ set(false); t.focus(); } });
    var drop=function(){ if(wide.matches) set(false); };
    wide.addEventListener?wide.addEventListener('change',drop):wide.addListener(drop);
  }
  document.querySelectorAll('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear();});
  document.querySelectorAll('.portrait img').forEach(function(i){i.addEventListener('error',function(){i.remove();});});
})();

// Calendly: loads only when someone clicks a booking button or scrolls to the calendar
(function(){
  var JS='https://assets.calendly.com/assets/external/widget.js', CSS='https://assets.calendly.com/assets/external/widget.css', p=null;
  function load(){
    if(p) return p;
    p=new Promise(function(res,rej){
      var l=document.createElement('link'); l.rel='stylesheet'; l.href=CSS; document.head.appendChild(l);
      var s=document.createElement('script'); s.src=JS; s.async=true; s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
    return p;
  }
  function url(u){ return u+(u.indexOf('?')<0?'?':'&')+'hide_gdpr_banner=1&primary_color=1a7699&utm_source=website'; }
  var opener=null, pushed=false, wasOpen=false;
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-calendly]'); if(!a) return;
    e.preventDefault(); opener=a;
    load().then(function(){
      window.Calendly.initPopupWidget({url:url(a.getAttribute('data-calendly'))});
    }).catch(function(){ window.open(a.href,'_blank','noopener'); });
  });
  // Hold the page still while the popup is open and release it when it closes. Like the photo
  // viewer, Escape or the browser back button closes it, and focus goes back to the button.
  function popup(){ return document.querySelector('.calendly-overlay'); }
  function closePopup(){ var x=document.querySelector('.calendly-popup-close'), o=popup(); if(x) x.click(); else if(o) o.remove(); }
  new MutationObserver(function(){
    var open=!!popup(); if(open===wasOpen) return; wasOpen=open;
    window.__scrollLock[open?'lock':'unlock']('calendly');
    if(open){
      try{ history.pushState({calendly:1},''); pushed=true; }catch(e){ pushed=false; }
      setTimeout(function(){ var x=document.querySelector('.calendly-popup-close'); if(x){ if(!x.hasAttribute('tabindex')) x.setAttribute('tabindex','0'); x.setAttribute('role','button'); if(!x.getAttribute('aria-label')) x.setAttribute('aria-label','Close the booking calendar'); x.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); x.click(); } }); x.focus(); } },50);
    }
    else{
      if(pushed){ pushed=false; history.back(); }
      if(opener){ try{ opener.focus({preventScroll:true}); }catch(e){} }
    }
  }).observe(document.body,{childList:true});
  window.addEventListener('popstate',function(){ if(popup()){ pushed=false; closePopup(); } });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && popup()) closePopup(); });
  var box=document.querySelector('[data-calendly-inline]');
  if(box){
    var go=function(){
      load().then(function(){
        box.innerHTML='';
        window.Calendly.initInlineWidget({url:url(box.getAttribute('data-calendly-inline')),parentElement:box});
      });
    };
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(en){ if(en[0].isIntersecting){ io.disconnect(); go(); } },{rootMargin:'600px'});
      io.observe(box);
    } else go();
  }
})();

// Recent sales: filter chips and photo lightbox
(function(){
  var chips=document.querySelectorAll('.chip[data-filter]');
  chips.forEach(function(c){ c.addEventListener('click',function(){
    chips.forEach(function(x){x.classList.toggle('on',x===c);});
    var f=c.getAttribute('data-filter');
    var grid=document.querySelector('.sales-grid[data-filterable]')||document.querySelector('.sales-grid'), moreWrap=document.querySelector('.more-wrap');
    // Filtering searches every sale; "All" goes back to the short list unless Show all was pressed.
    if(grid) grid.classList.toggle('open', f!=='all' || grid.getAttribute('data-expanded')==='1');
    if(moreWrap) moreWrap.hidden = f!=='all' || (grid && grid.getAttribute('data-expanded')==='1');
    if(grid) grid.querySelectorAll('.sale').forEach(function(s){
      s.hidden = !(f==='all' || s.getAttribute('data-area')===f || s.getAttribute('data-role')===f);
    });
    if(window.ScrollTrigger) window.ScrollTrigger.refresh();
  });});
  var moreBtn=document.querySelector('[data-more]');
  if(moreBtn) moreBtn.addEventListener('click',function(){
    var grid=document.querySelector('.sales-grid[data-filterable]')||document.querySelector('.sales-grid'); grid.classList.add('open'); grid.setAttribute('data-expanded','1');
    moreBtn.parentNode.hidden=true;
    if(window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  var lb=document.querySelector('.lightbox'); if(!lb) return;
  var img=lb.querySelector('img'), list=[], i=0, opener=null, pushed=false;
  // A modal photo viewer: focus moves in and stays in, Escape or the browser back button closes it,
  // and focus returns to the photo that opened it.
  lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true'); lb.setAttribute('aria-label','Photo viewer');
  function show(){ img.src=list[i]; img.alt='Photo '+(i+1)+' of '+list.length; }
  function open(l,s,from){
    list=l; i=s||0; show(); opener=from||document.activeElement; lb.hidden=false; window.__scrollLock.lock('lightbox');
    try{ history.pushState({lightbox:1},''); pushed=true; }catch(e){ pushed=false; }
    lb.querySelector('.lb-close').focus();
  }
  function shut(){
    if(lb.hidden) return;
    lb.hidden=true; window.__scrollLock.unlock('lightbox');
    if(opener && opener.focus){ try{ opener.focus({preventScroll:true}); }catch(e){} }
  }
  function close(){ if(pushed){ pushed=false; history.back(); } shut(); }
  window.addEventListener('popstate',function(){ if(!lb.hidden){ pushed=false; shut(); } });
  document.querySelectorAll('[data-gallery]').forEach(function(m){
    if(!/^(BUTTON|A)$/.test(m.tagName)){   // photo tiles that are plain boxes still work from the keyboard
      m.setAttribute('role','button'); m.tabIndex=0; if(!m.hasAttribute('aria-label')) m.setAttribute('aria-label','View photo');
      m.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); m.click(); } });
    }
    m.addEventListener('click',function(){ open(m.getAttribute('data-gallery').split('|'), parseInt(m.getAttribute('data-gallery-start')||'0',10), m); });
  });
  // One shared photo list for a whole gallery (instead of repeating it on every tile)
  document.querySelectorAll('[data-gallery-group]').forEach(function(g){
    var list=g.getAttribute('data-gallery-group').split('|');
    g.querySelectorAll('[data-gallery-index]').forEach(function(m){
      m.addEventListener('click',function(){ open(list, parseInt(m.getAttribute('data-gallery-index'),10)||0, m); });
    });
  });
  lb.querySelector('.lb-close').onclick=close;
  lb.querySelector('.lb-prev').onclick=function(){ i=(i-1+list.length)%list.length; show(); };
  lb.querySelector('.lb-next').onclick=function(){ i=(i+1)%list.length; show(); };
  lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
  document.addEventListener('keydown',function(e){
    if(lb.hidden) return;
    if(e.key==='Escape') close();
    else if(e.key==='ArrowRight') lb.querySelector('.lb-next').click();
    else if(e.key==='ArrowLeft') lb.querySelector('.lb-prev').click();
    else if(e.key==='Tab'){
      var f=[].slice.call(lb.querySelectorAll('button')), a=f.indexOf(document.activeElement);
      e.preventDefault(); f[(a+(e.shiftKey?-1:1)+f.length)%f.length].focus();
    }
  });
})();

// The sidebar (booking card and form) stays pinned while the page scrolls, but only when
// the whole sidebar fits on screen. On shorter screens, such as most laptops, it scrolls
// with the page instead, so the Send button is never hidden inside a small inner scroll box.
(function(){
  var boxes=document.querySelectorAll('.sticky');
  if(!boxes.length) return;
  function check(){
    boxes.forEach(function(b){
      b.classList.toggle('sticky-off', b.scrollHeight > window.innerHeight - 116);
      var scrolls=b.scrollHeight>b.clientHeight+1 && getComputedStyle(b).overflowY!=='visible';
      if(scrolls) b.setAttribute('data-lenis-prevent',''); else b.removeAttribute('data-lenis-prevent');
    });
  }
  check();
  window.addEventListener('resize',check);
  window.addEventListener('load',check);
  if('ResizeObserver' in window){ var ro=new ResizeObserver(check); boxes.forEach(function(b){ ro.observe(b); }); }
  document.addEventListener('focusin',function(e){
    var t=e.target, box=t&&t.closest?t.closest('.sticky'):null;
    if(!box||box.scrollHeight<=box.clientHeight+1) return;
    if(t.scrollIntoView) t.scrollIntoView({block:'nearest',inline:'nearest'});
  });
})();

// "See all photos" style toggles. A button with data-more-toggle shows or hides the block
// named in aria-controls. Photos inside it do not load until it is opened.
(function(){
  document.querySelectorAll('[data-more-toggle]').forEach(function(btn){
    var box=document.getElementById(btn.getAttribute('aria-controls')); if(!box) return;
    var lbl=btn.querySelector('.lbl'), more=btn.getAttribute('data-more-label'), less=btn.getAttribute('data-less-label');
    btn.addEventListener('click',function(){
      var open=btn.getAttribute('aria-expanded')==='true';
      box.hidden=open; btn.setAttribute('aria-expanded',open?'false':'true');
      if(lbl) lbl.textContent=open?more:less;
      // The page just changed length. Smooth scrolling still holds the old position and
      // length until it re-measures, which sent "Show fewer photos" to the wrong spot.
      if(window.__lenis) window.__lenis.resize();
      if(window.ScrollTrigger) window.ScrollTrigger.refresh();
      if(open){
        // collapsing from far down the page: bring the top of the gallery back into view
        var top=document.getElementById('gallery');
        if(top){ if(window.__lenis) window.__lenis.scrollTo(top,{offset:-90}); else top.scrollIntoView({behavior:'smooth',block:'start'}); }
      }
    });
  });
})();

(function(){
  var f=document.querySelector('[data-tour-src]');
  if(!f)return;
  var b=f.querySelector('[data-tour-start]');
  if(!b)return;
  b.addEventListener('click',function(){
    var i=document.createElement('iframe');
    i.src=f.getAttribute('data-tour-src');
    i.title='Interactive 3D tour of the property';
    i.allow='fullscreen; xr-spatial-tracking; gyroscope; accelerometer';
    i.setAttribute('allowfullscreen','');
    i.referrerPolicy='strict-origin-when-cross-origin';
    f.appendChild(i);
    f.removeChild(b);
    i.focus();
  });
})();

// Neighborhoods menu: on phones the list folds open from a button next to the link.
(function(){
  var li=document.querySelector('.has-sub'), b=li&&li.querySelector('.sub-toggle');
  if(!b) return;
  b.addEventListener('click',function(){
    var o=li.classList.toggle('open'); b.setAttribute('aria-expanded',o?'true':'false');
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&li.classList.contains('open')){ li.classList.remove('open'); b.setAttribute('aria-expanded','false'); } });
})();

// Neighborhood directory: filter the cards as someone types.
(function(){
  var inp=document.getElementById('dir-q'); if(!inp) return;
  var cards=[].slice.call(document.querySelectorAll('.nb')), groups=[].slice.call(document.querySelectorAll('.dir-group')),
      regions=[].slice.call(document.querySelectorAll('.dir-region')), none=document.querySelector('.dir-empty');
  inp.addEventListener('input',function(){
    var q=inp.value.trim().toLowerCase(), shown=0;
    cards.forEach(function(c){ var ok=!q||c.getAttribute('data-name').indexOf(q)>-1; c.hidden=!ok; if(ok) shown++; });
    groups.forEach(function(g){ g.hidden=!g.querySelector('.nb:not([hidden])'); });
    regions.forEach(function(r){ r.hidden=!r.querySelector('.nb:not([hidden])'); });
    if(none) none.style.display=shown?'none':'block';
    if(window.__lenis) window.__lenis.resize();
    if(window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
})();

// Soft spotlight on cards: a faint glow follows the pointer. Mouse and trackpad only,
// off for reduced motion, and it never changes the layout.
(function(){
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.hood,.nb,.hl,.fcard,.fact').forEach(function(c){
    c.classList.add('glow');
    c.addEventListener('pointermove',function(e){
      var r=c.getBoundingClientRect();
      c.style.setProperty('--mx',(e.clientX-r.left)+'px'); c.style.setProperty('--my',(e.clientY-r.top)+'px');
    });
  });
})();

// Lead forms: once a submit is on its way, a second click does not send the lead twice.
// The button shows that it is sending, and resets if the visitor comes back with the back button.
(function(){
  document.querySelectorAll(LEAD_FORMS).forEach(function(f){
    var b=f.querySelector('[type="submit"]'); if(!b) return;
    var label=b.textContent;
    f.addEventListener('submit',function(e){
      if(f.__sent){ e.preventDefault(); return; }
      f.__sent=true; b.setAttribute('aria-disabled','true'); b.classList.add('is-sending'); b.textContent='Sending...';
    });
    window.addEventListener('pageshow',function(){ f.__sent=false; b.removeAttribute('aria-disabled'); b.classList.remove('is-sending'); b.textContent=label; });
  });
})();

// Performance governor: if this computer cannot keep the page near 40 frames a second for a few seconds in a row,
// switch the decorative motion (scene life and the particle glow) to a lighter 30 frame mode. Machines that keep up
// never see a change.
(function(){
  var perf=window.__perf={lite:false};
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!window.requestAnimationFrame) return;
  var last=0,n=0,sum=0,slow=0;
  function tick(now){
    if(document.hidden){ last=0; n=0; sum=0; return requestAnimationFrame(tick); }
    if(last){ var d=now-last; if(d<250){ sum+=d; n++; if(n===45){ slow=(sum/n>26)?slow+1:0; n=0; sum=0; if(slow>=3){ perf.lite=true; document.documentElement.classList.add('perf-lite'); return; } } } }
    last=now; requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// Team numbers count up when they scroll into view; the final values are already in the HTML
(function () {
  var els = document.querySelectorAll('[data-count]');
  if (!els.length || !('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var run = function (el) {
    var end = +el.getAttribute('data-count'), pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '', t0 = null;
    var step = function (t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = pre + v + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
  }, { threshold: 0.4 });
  els.forEach(function (el) { io.observe(el); });
})();
