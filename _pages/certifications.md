---
layout: default
title: Certifications
permalink: /certifications/
---

<div class="page-header">
  <span class="eyebrow">CERTIFICATIONS</span>
  <h1>Certifications</h1>
  <p>Certifications and courses I completed.</p>
</div>

<div class="card-grid">
  {% for item in site.certifications %}
  <a class="card" href="{{ item.image | relative_url }}" target="_blank" style="overflow: hidden; padding: 0; display: flex; flex-direction: column;">
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
  <div class="empty-state">No certifications added yet.</div>
  {% endfor %}
</div>