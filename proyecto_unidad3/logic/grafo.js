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

// ==========================================
// DIJKSTRA
// Devuelve { distancias: Map(id -> metros), previos: Map(id -> id | null) }
// Si se indica `destino`, se detiene en cuanto ese nodo queda definitivo.
// ==========================================
function ejecutarDijkstra(grafo, nodoInicio, destino = null) {
    if (!grafo.nodos.has(nodoInicio)) {
        throw new Error(`Nodo de inicio inexistente: ${nodoInicio}`);
    }

    const distancias = new Map();
    const previos = new Map();
    for (const id of grafo.nodos.keys()) {
        distancias.set(id, Infinity);
        previos.set(id, null);
    }

    distancias.set(nodoInicio, 0);
    const cola = new ColaPrioridad();
    cola.encolar(nodoInicio, 0);

    while (!cola.estaVacia()) {
        const { elemento: actual, prioridad: distActual } = cola.desencolar();

        // Entrada obsoleta: ya se encontro un camino mejor a este nodo
        if (distActual > distancias.get(actual)) continue;
        if (actual === destino) break;

        for (const [vecino, pesoCalle] of grafo.nodos.get(actual).vecinos) {
            const candidata = distActual + pesoCalle;
            if (candidata < distancias.get(vecino)) {
                distancias.set(vecino, candidata);
                previos.set(vecino, actual);
                cola.encolar(vecino, candidata);
            }
        }
    }

    return { distancias, previos };
}

// Reconstruye el camino inicio -> destino como lista de ids (o null si no hay camino)
function reconstruirRuta(previos, inicio, destino) {
    const camino = [];
    let actual = destino;
    while (actual !== null && actual !== undefined) {
        camino.push(actual);
        if (actual === inicio) return camino.reverse();
        actual = previos.get(actual);
    }
    return null;
}

// ==========================================
// UNION-FIND (para detectar islas desconectadas)
// ==========================================
class UnionFind {
    constructor(n) {
        this.padre = Array.from({ length: n }, (_, i) => i);
    }

    buscar(x) {
        while (this.padre[x] !== x) {
            this.padre[x] = this.padre[this.padre[x]]; // compresion de caminos
            x = this.padre[x];
        }
        return x;
    }

    unir(a, b) {
        const ra = this.buscar(a);
        const rb = this.buscar(b);
        if (ra === rb) return false;
        this.padre[ra] = rb;
        return true;
    }
}

// ==========================================
// RED VIAL A PARTIR DE LAS RUTAS DE PATRULLAJE
//   1. Cada punto de cada ruta es un nodo ("sector:indice").
//   2. Puntos consecutivos de una ruta se conectan.
//   3. Puntos de rutas distintas a <= umbralCruce metros se conectan (cruces).
//   4. Si quedan islas desconectadas, se unen con el enlace mas corto posible
//      ("puentes"), para que Dijkstra siempre encuentre camino.
// ==========================================
function construirRedVial(sectores, umbralCruce = 30) {
    const grafo = new Grafo();
    const ids = [];

    sectores.forEach(function(sector, s) {
        sector.ruta.forEach(function(punto, i) {
            const id = `${s}:${i}`;
            grafo.agregarNodo(id, punto[0], punto[1]);
            ids.push(id);
        });
    });

    sectores.forEach(function(sector, s) {
        for (let i = 1; i < sector.ruta.length; i++) {
            grafo.conectar(`${s}:${i - 1}`, `${s}:${i}`);
        }
    });

    const n = ids.length;
    const indice = new Map(ids.map((id, i) => [id, i]));
    const nodos = ids.map(id => grafo.nodos.get(id));
    const grados = umbralCruce / 111000; // metros -> grados de latitud (aprox.)
    const uf = new UnionFind(n);

    // Las aristas de las rutas ya unen componentes
    for (const [id, nodo] of grafo.nodos) {
        for (const vecino of nodo.vecinos.keys()) uf.unir(indice.get(id), indice.get(vecino));
    }

    // Cruces entre puntos cercanos (descarte rapido por latitud antes de Haversine)
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(nodos[i].lat - nodos[j].lat) > grados) continue;
            const d = calcularDistancia(nodos[i].lat, nodos[i].lng, nodos[j].lat, nodos[j].lng);
            if (d <= umbralCruce) {
                grafo.agregarArista(ids[i], ids[j], d);
                uf.unir(i, j);
            }
        }
    }

    // Puentes: unir islas con la pareja de nodos mas cercana entre componentes distintas
    grafo.puentes = [];
    let componentes = new Set(ids.map((_, i) => uf.buscar(i))).size;
    while (componentes > 1) {
        let mejor = null;
        for (let i = 0; i < n; i++) {
            const ri = uf.buscar(i);
            for (let j = i + 1; j < n; j++) {
                if (uf.buscar(j) === ri) continue;
                const d = calcularDistancia(nodos[i].lat, nodos[i].lng, nodos[j].lat, nodos[j].lng);
                if (mejor === null || d < mejor.d) mejor = { i, j, d };
            }
        }
        grafo.agregarArista(ids[mejor.i], ids[mejor.j], mejor.d);
        grafo.puentes.push({ desde: ids[mejor.i], hasta: ids[mejor.j], distancia: mejor.d });
        uf.unir(mejor.i, mejor.j);
        componentes--;
    }

    return grafo;
}

// Permite probar este archivo con Node sin afectar al navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcularDistancia, Grafo, ColaPrioridad, ejecutarDijkstra,
        reconstruirRuta, UnionFind, construirRedVial
    };
}
