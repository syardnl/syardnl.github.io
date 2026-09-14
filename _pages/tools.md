---
layout: default
title: Tools
permalink: /tools/
---

<div class="page-header">
  <span class="eyebrow">TOOLS</span>
  <h1>Tools</h1>
  <p>Tools and scripts I built or use regularly.</p>
</div>

<div class="card-grid">
  {% for item in site.tools %}
  <a class="card" href="{{ item.url | relative_url }}">
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
  </a>
  {% else %}
  <div class="empty-state">No tools added yet.</div>
  {% endfor %}
</div>
