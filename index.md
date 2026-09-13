---
layout: default
title: Home
description: Cybersecurity notes, CTF writeups, and projects.
---

<section class="hero">
  <span class="eyebrow">CYBERSECURITY • CTF • PROJECTS</span>
  <h1>Hi, I'm <span>Amsyar.</span></h1>
  <p class="hero-lead">I document my journey through cybersecurity, CTFs, security labs, and the projects I build along the way.</p>
</section>

<!-- LATEST COMPETITIONS SECTION -->
<section class="section">
  <div class="section-heading">
    <div>
      <span class="eyebrow">EVENTS</span>
      <h2>Latest Competitions</h2>
    </div>
    <a class="text-link" href="{{ '/competitions/' | relative_url }}">View all →</a>
  </div>

  <div class="card-grid">
    {% assign recent_competitions = site.competitions | sort: 'date' | reverse %}
    {% for item in recent_competitions limit: 3 %}
    <a class="card" href="{{ item.url | relative_url }}" style="overflow: hidden; padding: 0; display: flex; flex-direction: column;">
      {% if item.image %}
        <div class="card-image" style="width: 100%; height: 160px; overflow: hidden;">
          <img src="{{ item.image | relative_url }}" alt="{{ item.title }}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>
      {% endif %}
      <div class="card-body" style="padding: 1.5rem;">
        <h3>{{ item.title }}</h3>
        <p>{{ item.description | strip_html | truncate: 120 }}</p>
      </div>
    </a>
    {% else %}
    <div class="empty-state">No competitions added yet.</div>
    {% endfor %}
  </div>
</section>

<!-- LATEST LAB WRITEUPS SECTION -->
<section class="section">
  <div class="section-heading">
    <div>
      <span class="eyebrow">RECENT</span>
      <h2>Latest Lab writeups</h2>
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
    <div class="empty-state">No writeups added yet.</div>
    {% endfor %}
  </div>
</section>

<!-- PROJECTS SECTION -->
<section class="section">
  <div class="section-heading">
    <div><span class="eyebrow">BUILDING</span><h2>Latest Projects</h2></div>
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
    <div class="empty-state">No projects added yet.</div>
    {% endfor %}
  </div>
</section>