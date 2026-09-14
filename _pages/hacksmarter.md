---
layout: default
title: HackSmarter
permalink: /writeups/hacksmarter/
---

<div class="page-header">
  <span class="eyebrow">LAB WRITEUPS</span>
  <h1>HackSmarter</h1>
  <p>Writeups for HackSmarter machines and challenges.</p>
</div>

<div class="card-grid">
  {% assign hs_writeups = site.writeups | where: "platform", "HackSmarter" | sort: 'date' | reverse %}
  {% for item in hs_writeups %}
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
      <p>{{ item.description }}</p>
      <div class="tags">{% for tag in item.tags %}<span>{{ tag }}</span>{% endfor %}</div>
    </div>
  </a>
  {% else %}
  <div class="empty-state">No HackSmarter writeups yet.</div>
  {% endfor %}
</div>