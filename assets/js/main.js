document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggle = document.getElementById('menuToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  const categoryToggle = document.getElementById('categoryToggle');
  const categoryMenu = document.getElementById('categoryMenu');

  const closeMenu = () => body.classList.remove('sidebar-open');
  toggle?.addEventListener('click', () => body.classList.toggle('sidebar-open'));
  backdrop?.addEventListener('click', closeMenu);
  document.querySelectorAll('.sidebar a').forEach(a => a.addEventListener('click', closeMenu));

  categoryToggle?.addEventListener('click', () => {
    const open = categoryToggle.getAttribute('aria-expanded') === 'true';
    categoryToggle.setAttribute('aria-expanded', String(!open));
    categoryMenu.style.display = open ? 'none' : 'flex';
    categoryToggle.querySelector('b').textContent = open ? '›' : '⌄';
  });

  const search = document.getElementById('writeupSearch');
  const items = [...document.querySelectorAll('.searchable-item')];
  const noResults = document.getElementById('noResults');
  search?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    let visible = 0;
    items.forEach(item => {
      const match = item.dataset.search.toLowerCase().includes(q);
      item.classList.toggle('hidden', !match);
      if (match) visible++;
    });
    noResults?.classList.toggle('hidden', visible !== 0);
  });

  const toc = document.getElementById('toc');
  if (toc) {
    document.querySelectorAll('.prose h2, .prose h3').forEach((heading, i) => {
      if (!heading.id) heading.id = heading.textContent.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const a = document.createElement('a');
      a.href = '#' + heading.id;
      a.textContent = heading.textContent;
      a.style.paddingLeft = heading.tagName === 'H3' ? '10px' : '0';
      toc.appendChild(a);
    });
  }
});
