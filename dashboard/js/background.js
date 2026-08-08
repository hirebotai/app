/**
 * Hirebotai Dashboard — Animated Background
 * Generates floating glow particles inside #bg-particles.
 * Pure DOM injection, no dependencies, respects reduced motion.
 */

(function () {
  var container = document.getElementById('bg-particles');
  if (!container) return;

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    container.style.display = 'none';
    return;
  }

  var colors = ['59, 130, 246', '56, 189, 248', '96, 165, 250', '34, 211, 238'];
  var count = 34;

  for (var i = 0; i < count; i++) {
    var p = document.createElement('span');
    p.className = 'bg-particle';
    p.setAttribute('aria-hidden', 'true');

    var size = 2 + Math.random() * 4;
    var color = colors[i % colors.length];
    var opacity = 0.25 + Math.random() * 0.55;

    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.top = (Math.random() * 100) + 'vh';
    p.style.setProperty('--p-op', opacity.toFixed(2));
    p.style.setProperty('--p-drift', ((Math.random() * 80) - 40).toFixed(0) + 'px');
    p.style.animationDuration = (12 + Math.random() * 18).toFixed(1) + 's';
    p.style.animationDelay = (-Math.random() * 22).toFixed(1) + 's';
    p.style.background = 'radial-gradient(circle, rgba(' + color + ', 0.9), rgba(' + color + ', 0))';
    p.style.boxShadow = '0 0 10px rgba(' + color + ', 0.7)';

    container.appendChild(p);
  }
})();
