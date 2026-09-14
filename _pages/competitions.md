---
layout: default
title: CTF Competitions
permalink: /competitions/
---

<div class="page-header">
  <span class="eyebrow">COMPETITIONS</span>
  <h1>CTF Competitions</h1>
  <p>Some of CTF challenge that I manage to solve. I tried my best to produce good writeup but I have lot of skill issue :(</p>
</div>

<div class="card-grid">
  {% for item in site.competitions %}
  <a class="card" href="{{ item.url | relative_url }}" style="overflow: hidden; padding: 0; display: flex; flex-direction: column;">
    {% if item.image %}
      <div class="card-image" style="width: 100%; height: 160px; overflow: hidden;">
        <img src="{{ item.image | relative_url }}" alt="{{ item.title }}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      </div>
    {% endif %}
    
    <div class="card-body" style="padding: 1.5rem;">
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
    </div>
  </a>
  {% else %}
  <div class="empty-state">No competitions added yet.</div>
  {% endfor %}
</div>