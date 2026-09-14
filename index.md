---
layout: default
title: Home
description: Cybersecurity notes, CTF writeups, and projects.
---

<section class="hero">
  <span class="eyebrow">Cybersecurity • Web • Mobile</span>
  <h1><span>Amsyar Daniel</span></h1>
 <p class="hero-lead">
  Welcome to my little corner of the internet. I keep my study journey, projects, and CTF writeups here — because I have a terrible memory and always need somewhere to look back. HAHAHA.
</p>
  
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
      <h2>Latest Lab Writeups</h2>
    </div>
    <a class="text-link" href="{{ '/writeups/' | relative_url }}">View all →</a>
  </div>
  <div class="card-grid">
    {% assign recent = site.writeups | sort: 'date' | reverse %}
    {% for item in recent limit: 6 %}
    <a class="card" href="{{ item.url | relative_url }}" style="overflow: hidden; padding: 0; display: flex; flex-direction: column;">
      {% if item.image %}
      <div class="card-image" style="width: 100%; height: 160px; overflow: hidden;">
        <img src="{{ item.image | relative_url }}" alt="{{ item.title }}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
      {% endif %}
      <div class="card-body" style="padding: 1.5rem;">
        <div class="card-top">
          <span class="platform">{{ item.platform }}</span>
          <span class="difficulty {{ item.difficulty | downcase }}">{{ item.difficulty }}</span>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.description | strip_html | truncate: 120 }}</p>
        <div class="tags">{% for tag in item.tags limit: 3 %}<span>{{ tag }}</span>{% endfor %}</div>
      </div>
    </a>
    {% else %}
    <div class="empty-state">No writeups added yet.</div>
    {% endfor %}
  </div>
</section>

<!-- PROJECTS SECTION -->
<section class="section">
  <div class="section-heading">
    <div>
      <span class="eyebrow">BUILDING</span>
      <h2>Latest Projects</h2>
    </div>
    <a class="text-link" href="{{ '/projects/' | relative_url }}">View all →</a>
  </div>

  <div class="card-grid">

    {% for project in site.projects limit: 3 %}

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
          {% for tech in project.tech limit: 4 %}
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

    {% else %}

    <div class="empty-state">
      No projects added yet.
    </div>

    {% endfor %}

  </div>
</section>