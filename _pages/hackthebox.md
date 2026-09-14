---
layout: default
title: Hack The Box
permalink: /writeups/hackthebox/
---

<div class="page-header">
  <span class="eyebrow">LAB WRITEUPS</span>
  <h1>Hack The Box</h1>
  <p>Writeups for Hack The Box machines and challenges.</p>
</div>

<div class="card-grid">
  {% assign htb_writeups = site.writeups | where: "platform", "Hack The Box" | sort: 'date' | reverse %}
  {% for item in htb_writeups %}
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
  <div class="empty-state">No Hack The Box writeups yet.</div>
  {% endfor %}
</div>