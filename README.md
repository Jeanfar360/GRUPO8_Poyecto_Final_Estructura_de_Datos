# Sistema de Despacho de Patrullas — ECU-911 Loja

Proyecto final de Estructura de Datos. Simula 10 patrullas recorriendo sectores de Loja y,
ante una alarma bancaria, despacha las 3 unidades más cercanas **por distancia de ruta**.

## Estructuras de datos y algoritmos usados

| Pieza | Dónde | Detalle |
|---|---|---|
| Grafo no dirigido ponderado | `logic/grafo.js` | Lista de adyacencia con `Map`; nodos = puntos de las rutas de patrullaje |
| Cola de prioridad (min-heap binario) | `logic/grafo.js` | `encolar`/`desencolar` en O(log n) |
| Dijkstra | `logic/grafo.js` | Con descarte de entradas obsoletas, parada anticipada opcional y `reconstruirRuta` |
| Union-Find | `logic/grafo.js` | Detecta islas desconectadas y las une con el enlace más corto |
| Haversine | `logic/grafo.js` | Distancia en metros entre coordenadas |

## Cómo funciona el despacho

1. Al cargar, `construirRedVial` convierte las rutas de patrullaje en un grafo (puntos consecutivos y
   puntos a ≤ 30 m de rutas distintas se conectan; las islas restantes se unen con el enlace más corto).
2. Al activar una alarma se ejecuta **un** Dijkstra desde el nodo más cercano al banco; con eso se conoce
   la distancia por calles hacia todas las patrullas y se eligen las 3 disponibles más cercanas.
3. Dos modos:
   - **Despacho por grafo (Dijkstra):** la ruta sale de nuestro propio grafo, funciona sin internet.
   - **OSRM:** ruta por calles reales; si OSRM no responde (6 s) se usa automáticamente la del grafo.

## Uso

Abrir `proyecto_unidad3/view/index.html` en el navegador (requiere internet para Leaflet y los mapas).

- **Clic izquierdo** en el mapa: ubica el Banco Central.
- **Clic derecho**: copia las coordenadas.
- **Restablecer patrullas**: cancela el operativo y las unidades retoman su patrullaje desde donde están.

## Pruebas

```bash
node --test proyecto_unidad3/tests/grafo.test.js
```
