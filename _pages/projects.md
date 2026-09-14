---
layout: default
title: Projects
permalink: /projects/
---

<div class="page-header">
  <span class="eyebrow">BUILD LOG</span>
  <h1>Projects</h1>
  <p>Practical builds created during hackathons, hands-on lab experiments, and personal projects focused on solving real-world technical problems.</p>
</div>

<div class="card-grid">

  {% for project in site.projects %}

  <div class="card project-card">

    {% if project.image %}
    <div class="project-image">
      <img
        src="{{ project.image | relative_url }}"
        alt="{{ project.title }} project preview"
        loading="lazy">
    </div>
    {% endif %}

    <div class="project-content">

      <h3>{{ project.title }}</h3>

      <p>{{ project.description }}</p>

      {% if project.tech %}
      <div class="tags">
        {% for tech in project.tech %}
          <span>{{ tech }}</span>
        {% endfor %}
      </div>
      {% endif %}

      {% if project.github %}
      <div class="project-actions">
        <a
          class="button primary"
          href="{{ project.github }}"
          target="_blank"
          rel="noopener noreferrer">
          View on GitHub ↗
        </a>
      </div>
      {% endif %}

    </div>

  </div>

  {% endfor %}

</div>