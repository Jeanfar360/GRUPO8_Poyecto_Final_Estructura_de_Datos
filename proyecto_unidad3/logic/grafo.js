// grafo.js — Estructura de datos Grafo + Haversine + Dijkstra
const RADIO_TIERRA_M = 6371000;

// ==========================================
// DISTANCIA (Haversine) en metros
// ==========================================
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const deltaF = (lat2 - lat1) * Math.PI / 180;
    const deltaL = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaF / 2) ** 2 +
              Math.cos(f1) * Math.cos(f2) * Math.sin(deltaL / 2) ** 2;

    return 2 * RADIO_TIERRA_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==========================================
// GRAFO NO DIRIGIDO (lista de adyacencia con Map)
// ==========================================
class Grafo {
    constructor() {
        this.nodos = new Map(); // id -> { lat, lng, vecinos: Map(idVecino -> distancia) }
    }

    agregarNodo(id, lat, lng) {
        if (!this.nodos.has(id)) {
            this.nodos.set(id, { lat: lat, lng: lng, vecinos: new Map() });
        }
    }

    agregarArista(idOrigen, idDestino, distancia) {
        if (idOrigen === idDestino) return;
        const origen = this.nodos.get(idOrigen);
        const destino = this.nodos.get(idDestino);
        if (!origen || !destino) {
            throw new Error(`Arista invalida: ${idOrigen} -> ${idDestino}`);
        }
        // Si la arista ya existe nos quedamos con la mas corta
        const actual = origen.vecinos.get(idDestino);
        if (actual === undefined || distancia < actual) {
            origen.vecinos.set(idDestino, distancia);
            destino.vecinos.set(idOrigen, distancia);
        }
    }

    // Conecta dos nodos usando la distancia Haversine entre sus coordenadas
    conectar(idOrigen, idDestino) {
        const a = this.nodos.get(idOrigen);
        const b = this.nodos.get(idDestino);
        this.agregarArista(idOrigen, idDestino, calcularDistancia(a.lat, a.lng, b.lat, b.lng));
    }

    // Nodo mas cercano (en linea recta) a una coordenada cualquiera
        nodoMasCercano(lat, lng) {
        let mejorId = null;
        let mejorDistancia = Infinity;
        for (const [id, nodo] of this.nodos) {
            const d = calcularDistancia(lat, lng, nodo.lat, nodo.lng);
            if (d < mejorDistancia) {
                mejorDistancia = d;
                mejorId = id;
            }
        }
        return { id: mejorId, distancia: mejorDistancia };
    }

    // Numero de calles (cada arista no dirigida cuenta una sola vez)
    cantidadAristas() {
        let suma = 0;
        for (const nodo of this.nodos.values()) suma += nodo.vecinos.size;
        return suma / 2;
    }
}

// ==========================================
// COLA DE PRIORIDAD — Min-Heap binario
// encolar / desencolar: O(log n)   (antes: sort() en cada encolar = O(n log n))
// ==========================================
class ColaPrioridad {
    constructor() {
        this.heap = [];
    }

    get tamano() {
        return this.heap.length;
    }

    estaVacia() {
        return this.heap.length === 0;
    }
       ver() {
           return this.heap.length > 0 ? this.heap[0] : undefined;
       }

       vaciar() {
           this.heap.length = 0;
       }
    encolar(elemento, prioridad) {
        const heap = this.heap;
        heap.push({ elemento, prioridad });
        let i = heap.length - 1;
        while (i > 0) {
            const padre = (i - 1) >> 1;
            if (heap[padre].prioridad <= heap[i].prioridad) break;
            [heap[padre], heap[i]] = [heap[i], heap[padre]];
            i = padre;
        }
    }

    // Devuelve { elemento, prioridad } del menor, o undefined si esta vacia
    desencolar() {
        const heap = this.heap;
        if (heap.length === 0) return undefined;

        const menor = heap[0];
        const ultimo = heap.pop();
        if (heap.length > 0) {
            heap[0] = ultimo;
            let i = 0;
            for (;;) {
                const izq = 2 * i + 1;
                const der = izq + 1;
                let m = i;
                if (izq < heap.length && heap[izq].prioridad < heap[m].prioridad) m = izq;
                if (der < heap.length && heap[der].prioridad < heap[m].prioridad) m = der;
                if (m === i) break;
                [heap[m], heap[i]] = [heap[i], heap[m]];
                i = m;
            }
        }
        return menor;
    }
}

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
