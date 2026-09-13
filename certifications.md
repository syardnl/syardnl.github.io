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
  <a class="card" href="{{ item.url | relative_url }}">
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
  </a>
  {% else %}
  <div class="empty-state">No certifications added yet.</div>
  {% endfor %}
</div>
