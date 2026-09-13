---
layout: default
title: Projects
permalink: /projects/
---

<div class="page-header">
  <span class="eyebrow">BUILD LOG</span>
  <h1>Projects</h1>
  <p>Things I build, experiment with, and learn from.</p>
</div>

<div class="card-grid">
  {% for project in site.projects %}
  <a class="card project-card" href="{{ project.url | relative_url }}">
    <div class="project-icon">{{ project.icon | default: '⌘' }}</div>
    <h3>{{ project.title }}</h3>
    <p>{{ project.description }}</p>
    <div class="tags">{% for tech in project.tech %}<span>{{ tech }}</span>{% endfor %}</div>
  </a>
  {% endfor %}
</div>
