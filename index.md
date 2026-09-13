---
layout: default
title: Home
description: Cybersecurity notes, CTF writeups, and projects.
---

<section class="hero">
  <span class="eyebrow">CYBERSECURITY • CTF • PROJECTS</span>
  <h1>Hi, I'm <span>Amsyar.</span></h1>
  <p class="hero-lead">I document my journey through cybersecurity, CTFs, security labs, and the projects I build along the way.</p>
  <div class="hero-actions">
    <a class="button primary" href="{{ '/writeups/' | relative_url }}">Explore Writeups</a>
    <a class="button" href="{{ '/projects/' | relative_url }}">View Projects</a>
  </div>
</section>

<section class="section">
  <div class="section-heading">
    <div>
      <span class="eyebrow">RECENT</span>
      <h2>Latest writeups</h2>
    </div>
    <a class="text-link" href="{{ '/writeups/' | relative_url }}">View all →</a>
  </div>

  <div class="card-grid">
    {% assign recent = site.writeups | sort: 'date' | reverse %}
    {% for item in recent limit: 6 %}
    <a class="card" href="{{ item.url | relative_url }}">
      <div class="card-top"><span class="platform">{{ item.platform }}</span><span class="difficulty {{ item.difficulty | downcase }}">{{ item.difficulty }}</span></div>
      <h3>{{ item.title }}</h3>
      <p>{{ item.excerpt | strip_html | truncate: 120 }}</p>
      <div class="tags">{% for tag in item.tags limit: 3 %}<span>{{ tag }}</span>{% endfor %}</div>
    </a>
    {% else %}
    <div class="empty-state">Your latest writeups will appear here.</div>
    {% endfor %}
  </div>
</section>

<section class="section">
  <div class="section-heading">
    <div><span class="eyebrow">BUILDING</span><h2>Projects</h2></div>
    <a class="text-link" href="{{ '/projects/' | relative_url }}">View all →</a>
  </div>
  <div class="card-grid">
    {% for project in site.projects limit: 3 %}
    <a class="card project-card" href="{{ project.url | relative_url }}">
      <div class="project-icon">{{ project.icon | default: '⌘' }}</div>
      <h3>{{ project.title }}</h3>
      <p>{{ project.description }}</p>
      <div class="tags">{% for tech in project.tech limit: 4 %}<span>{{ tech }}</span>{% endfor %}</div>
    </a>
    {% else %}
    <div class="empty-state">Add project files to <code>_projects/</code>.</div>
    {% endfor %}
  </div>
</section>
