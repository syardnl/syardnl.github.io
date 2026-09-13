---
layout: default
title: CTF Writeups
permalink: /writeups/
---

<div class="page-header">
  <span class="eyebrow">KNOWLEDGE BASE</span>
  <h1>CTF Writeups</h1>
  <p>Machines, rooms, challenges, techniques, and lessons learned.</p>
</div>

<div class="filter-bar">
  <input id="writeupSearch" type="search" placeholder="Search writeups, platforms, or tags..." aria-label="Search writeups">
</div>

<div class="card-grid searchable-list" id="writeupList">
  {% assign all_writeups = site.writeups | sort: 'date' | reverse %}
  {% for item in all_writeups %}
  <a class="card searchable-item" data-search="{{ item.title }} {{ item.platform }} {{ item.tags | join: ' ' }}" href="{{ item.url | relative_url }}">
    <div class="card-top"><span class="platform">{{ item.platform }}</span><span class="difficulty {{ item.difficulty | downcase }}">{{ item.difficulty }}</span></div>
    <h3>{{ item.title }}</h3>
    <p>{{ item.excerpt | strip_html | truncate: 140 }}</p>
    <div class="tags">{% for tag in item.tags %}<span>{{ tag }}</span>{% endfor %}</div>
  </a>
  {% endfor %}
</div>

<div id="noResults" class="empty-state hidden">No matching writeups.</div>
