// controlers.js — Eventos de botones y orquestacion general

const UNIDADES_A_DESPACHAR = 3;
const COLOR_PATRULLA = 'blue';
const COLOR_RUTA_OSRM = 'red';
const COLOR_RUTA_GRAFO = 'orange';

let marcadorBanco = null;
let lineasDibujadas = [];
let generacion = 0; // sube en cada reinicio; invalida despachos que aun esperan a OSRM

// ==========================================
// CONSOLA DE EVENTOS (textContent: sin riesgo de inyectar HTML, con autoscroll)
// ==========================================
const consola = document.getElementById("consola");

function log(texto, negrita = false, separar = false) {
    const linea = document.createElement("div");
    if (separar) linea.className = "separador";
    if (negrita) linea.style.fontWeight = "bold";
    linea.textContent = texto;
    consola.appendChild(linea);
    consola.scrollTop = consola.scrollHeight;
}

// ==========================================
// RED VIAL (grafo construido a partir de las rutas de patrullaje)
// ==========================================
const redVial = construirRedVial(sectoresPatrullaje);

consola.textContent = "";
log("> " + escuadron.length + " patrullas activas.");
log("> Red vial: " + redVial.nodos.size + " nodos, " + redVial.puentes.length + " enlaces entre sectores.");

// ==========================================
// BANCO CENTRAL — Click en el mapa
// ==========================================
mapa.on('click', function(evento) {
    if (marcadorBanco !== null) {
        mapa.removeLayer(marcadorBanco);
    }

    marcadorBanco = L.marker([evento.latlng.lat, evento.latlng.lng]).addTo(mapa);
    marcadorBanco.bindPopup("<b>Banco Central</b><br>Alarma lista").openPopup();

    log("> Banco ubicado.");
});

// ==========================================
// HERRAMIENTA DE COPIAR COORDENADAS (click derecho)
// ==========================================
mapa.on('contextmenu', function(evento) {
    const textoCoordenada = "[" + evento.latlng.lat.toFixed(4) + ", " + evento.latlng.lng.toFixed(4) + "]";

    if (!navigator.clipboard) {
        log("> Coordenada: " + textoCoordenada + " (no se pudo copiar automaticamente)");
        return;
    }

    navigator.clipboard.writeText(textoCoordenada).then(function() {
        log("> Coordenada copiada: " + textoCoordenada);
    }).catch(function() {
        log("> Coordenada: " + textoCoordenada + " (el navegador bloqueo el portapapeles)");
    });
});

// ==========================================
// SELECCION DE UNIDADES CON DIJKSTRA
// Un solo Dijkstra desde el banco da la distancia por calles hacia TODAS las
// patrullas; se eligen las mas cercanas por ruta (no por linea recta).
// ==========================================
function seleccionarUnidades(banco) {
    const nodoBanco = redVial.nodoMasCercano(banco.lat, banco.lng);
    const { distancias, previos } = ejecutarDijkstra(redVial, nodoBanco.id);

    const candidatas = escuadron
        .filter(moto => moto.estado === "patrullando")
        .map(function(moto) {
            const pos = moto.marcador.getLatLng();
            const nodoMoto = redVial.nodoMasCercano(pos.lat, pos.lng);
            return {
                moto: moto,
                pos: pos,
                nodoMoto: nodoMoto,
                metros: nodoMoto.distancia + distancias.get(nodoMoto.id) + nodoBanco.distancia
            };
        })
        .sort((a, b) => a.metros - b.metros);

    return { elegidas: candidatas.slice(0, UNIDADES_A_DESPACHAR), nodoBanco, previos };
}

// Ruta unidad -> banco siguiendo el arbol de caminos minimos de Dijkstra
function rutaPorGrafo(candidata, banco, nodoBanco, previos) {
    const ids = reconstruirRuta(previos, nodoBanco.id, candidata.nodoMoto.id);
    const nodos = ids ? ids.reverse().map(function(id) {
        const n = redVial.nodos.get(id);
        return [n.lat, n.lng];
    }) : [];

    return [[candidata.pos.lat, candidata.pos.lng], ...nodos, [banco.lat, banco.lng]];
}

function longitudRuta(ruta) {
    let total = 0;
    for (let i = 1; i < ruta.length; i++) {
        total += calcularDistancia(ruta[i - 1][0], ruta[i - 1][1], ruta[i][0], ruta[i][1]);
    }
    return total;
}

// ==========================================
// DESPACHO (comun a los dos botones)
//   modo "osrm":  ruta por calles reales de OSRM (si falla, usa el grafo)
//   modo "grafo": ruta calculada por nuestro Dijkstra, sin internet
// ==========================================
async function despachar(modo) {
    if (marcadorBanco === null) {
        alert("Comandante, primero debe hacer clic en el mapa para reubicar el Banco Central.");
        return;
    }

    const usaOSRM = modo === "osrm";
    const color = usaOSRM ? COLOR_RUTA_OSRM : COLOR_RUTA_GRAFO;
    const miGeneracion = generacion;
    const banco = marcadorBanco.getLatLng();

    log(usaOSRM ? "DESPACHANDO UNIDADES (OSRM)..." : "DESPACHANDO UNIDADES (DIJKSTRA)...", true, true);
    log("> Ejecutando Dijkstra sobre la red vial (" + redVial.nodos.size + " nodos)...");

    const { elegidas, nodoBanco, previos } = seleccionarUnidades(banco);

    if (elegidas.length === 0) {
        log("> No hay unidades disponibles. Use RESTABLECER PATRULLAS.");
        return;
    }

    // Las unidades dejan de patrullar de inmediato, incluso mientras se espera a OSRM
    elegidas.forEach(function(c) {
        detenerMoto(c.moto);
        c.moto.estado = "emergencia";
        c.moto.marcador.setStyle({ color: color, fillColor: color });
    });

    const resultados = await Promise.all(elegidas.map(async function(c) {
        const respaldo = rutaPorGrafo(c, banco, nodoBanco, previos);
        if (!usaOSRM) return { ruta: respaldo, fuente: "Dijkstra" };

        const osrm = await obtenerRutaGPS(c.pos.lat, c.pos.lng, banco.lat, banco.lng);
        if (osrm === null) return { ruta: respaldo, fuente: "Dijkstra (OSRM no disponible)" };
        return { ruta: [[c.pos.lat, c.pos.lng], ...osrm, [banco.lat, banco.lng]], fuente: "OSRM" };
    }));

    // Si el usuario reinicio mientras esperabamos la red, se descarta este despacho
    if (miGeneracion !== generacion) return;

    elegidas.forEach(function(c, i) {
        const { ruta, fuente } = resultados[i];

        lineasDibujadas.push(
            L.polyline(ruta, { color: color, weight: 4, opacity: 0.6, dashArray: usaOSRM ? '5, 5' : '10, 10' }).addTo(mapa)
        );

        moverPorRuta(c.moto, ruta, MS_POR_METRO_EMERGENCIA, function() {
            c.moto.marcador.setPopupContent("<b>¡Unidad en posicion!</b><br>Perimetro asegurado.");
            c.moto.marcador.openPopup();
        });

        log("> Unidad " + (i + 1) + " (" + c.moto.nombre + ") en camino: " +
            (longitudRuta(ruta) / 1000).toFixed(2) + " km via " + fuente + ".");
    });
}

document.getElementById('btn-alarma').addEventListener('click', function() {
    despachar("osrm");
});

document.getElementById('btn-alarma-grafo').addEventListener('click', function() {
    despachar("grafo");
});

// ==========================================
// BOTON DE REINICIO
// ==========================================
document.getElementById('btn-reiniciar').addEventListener('click', function() {
    generacion++;

    lineasDibujadas.forEach(linea => mapa.removeLayer(linea));
    lineasDibujadas = [];

    escuadron.forEach(function(moto) {
        if (moto.estado !== "emergencia") return;

        detenerMoto(moto);
        moto.marcador.closePopup();
        moto.marcador.setPopupContent("Patrulla " + moto.nombre);
        moto.marcador.setStyle({ color: COLOR_PATRULLA, fillColor: COLOR_PATRULLA });
        moto.estado = "patrullando";
        reanudarPatrulla(moto);
    });

    log("Unidades restablecidas a patrullaje normal.", true, true);
});
