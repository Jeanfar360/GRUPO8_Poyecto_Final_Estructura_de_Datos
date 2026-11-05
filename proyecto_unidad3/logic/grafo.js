// grafo.js — Estructura de datos Grafo + Haversine + Dijkstra

class Grafo {
    constructor() {
        this.nodos = {};
    }

    agregarNodo(id, lat, lng) {
        this.nodos[id] = {
            lat: lat,
            lng: lng,
            vecinos: {}
        };
    }

    agregarArista(idOrigen, idDestino, distancia) {
        this.nodos[idOrigen].vecinos[idDestino] = distancia;
        this.nodos[idDestino].vecinos[idOrigen] = distancia;
    }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const radioTierra = 6371000;
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const deltaF = (lat2 - lat1) * Math.PI / 180;
    const deltaL = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaF/2) * Math.sin(deltaF/2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(deltaL/2) * Math.sin(deltaL/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return radioTierra * c;
}

class ColaPrioridad {
    constructor() {
        this.elementos = [];
    }

    encolar(elemento, prioridad) {
        this.elementos.push({elemento, prioridad});
        this.elementos.sort((a, b) => a.prioridad - b.prioridad);
    }

    desencolar() {
        return this.elementos.shift().elemento;
    }

    estaVacia() {
        return this.elementos.length === 0;
    }
}

function ejecutarDijkstra(grafo, nodoInicio) {
    let distancias = {};
    let rutas = {};
    let cola = new ColaPrioridad();

    for (let nodo in grafo.nodos) {
        distancias[nodo] = Infinity;
        rutas[nodo] = null;
    }
    
    distancias[nodoInicio] = 0;
    cola.encolar(nodoInicio, 0);

    while (!cola.estaVacia()) {
        let nodoActual = cola.desencolar();
        let vecinos = grafo.nodos[nodoActual].vecinos;

        for (let vecino in vecinos) {
            let pesoCalle = vecinos[vecino]; 
            let distanciaCalculada = distancias[nodoActual] + pesoCalle;

            if (distanciaCalculada < distancias[vecino]) {
                distancias[vecino] = distanciaCalculada;
                rutas[vecino] = nodoActual;
                cola.encolar(vecino, distanciaCalculada);
            }
        }
    }

    console.log("Dijkstra ejecuto el analisis de rutas exitosamente.");
    return { distancias, rutas };
}

// Red vial de prueba (Parque Central de Loja)
let redVial = new Grafo();

redVial.agregarNodo("Parque_Noroeste", -3.9926, -79.2047);
redVial.agregarNodo("Parque_Noreste", -3.9926, -79.2035);
redVial.agregarNodo("Parque_Suroeste", -3.9938, -79.2047);
redVial.agregarNodo("Parque_Sureste", -3.9938, -79.2035);

function conectarCalles(id1, id2) {
    let nodo1 = redVial.nodos[id1];
    let nodo2 = redVial.nodos[id2];
    let distancia = calcularDistancia(nodo1.lat, nodo1.lng, nodo2.lat, nodo2.lng);
    redVial.agregarArista(id1, id2, distancia);
}

conectarCalles("Parque_Noroeste", "Parque_Noreste");
conectarCalles("Parque_Noreste", "Parque_Sureste");
conectarCalles("Parque_Sureste", "Parque_Suroeste");
conectarCalles("Parque_Suroeste", "Parque_Noroeste");

console.log("Red de prueba estructurada con distancias calculadas.");