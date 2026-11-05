// mapa.js — Inicializacion del mapa Leaflet

let mapa = L.map('mapa').setView([-3.9931, -79.2042], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap'
}).addTo(mapa);