// patrullas.js — Inicializacion de patrullas y sistema de animacion

// Velocidades expresadas en milisegundos por metro recorrido (menor = mas rapido)
const MS_POR_METRO_EMERGENCIA = 30;          // ~33 m/s
const MS_POR_METRO_PATRULLA_MIN = 80;        // ~12 m/s
const MS_POR_METRO_PATRULLA_MAX = 140;       // ~7 m/s
const ESPERA_SEMAFORO_MAX_MS = 1500;

let escuadron = [];

sectoresPatrullaje.forEach(function(sector) {
    const marcador = L.circleMarker(sector.ruta[0], {
        color: 'blue',
        radius: 8
    }).addTo(mapa).bindPopup("Patrulla " + sector.nombre);

    escuadron.push({
        nombre: sector.nombre,
        marcador: marcador,
        rutaAsignada: sector.ruta,
        objetivo: 1 % sector.ruta.length, // indice del siguiente punto de la ruta a alcanzar
        estado: "patrullando",
        animacion: null,                  // id de requestAnimationFrame en curso
        temporizador: null                // id del setTimeout (espera en semaforo)
    });
});

// ==========================================
// ANIMACION A VELOCIDAD CONSTANTE POR UNA POLILINEA
// Se basa en el tiempo real transcurrido (no en un numero fijo de fotogramas),
// asi la velocidad es la misma en tramos cortos y largos, y no se desfasa si
// la pestana se pausa.
// ==========================================
function moverPorRuta(moto, ruta, msPorMetro, alTerminar) {
    detenerMoto(moto);

    const acumulado = [0];
    for (let i = 1; i < ruta.length; i++) {
        acumulado.push(acumulado[i - 1] +
            calcularDistancia(ruta[i - 1][0], ruta[i - 1][1], ruta[i][0], ruta[i][1]));
    }
    const total = acumulado[acumulado.length - 1];

    if (ruta.length < 2 || total === 0) {
        if (ruta.length > 0) moto.marcador.setLatLng(ruta[ruta.length - 1]);
        if (alTerminar) alTerminar();
        return;
    }

    let tramo = 0;
    const inicio = performance.now();

    function fotograma(ahora) {
        const recorrido = Math.min(Math.max(ahora - inicio, 0) / msPorMetro, total);

        while (tramo < ruta.length - 2 && acumulado[tramo + 1] < recorrido) {
            tramo++;
        }

        const largoTramo = acumulado[tramo + 1] - acumulado[tramo];
        const f = largoTramo > 0 ? (recorrido - acumulado[tramo]) / largoTramo : 1;
        moto.marcador.setLatLng([
            ruta[tramo][0] + (ruta[tramo + 1][0] - ruta[tramo][0]) * f,
            ruta[tramo][1] + (ruta[tramo + 1][1] - ruta[tramo][1]) * f
        ]);

        if (recorrido >= total) {
            moto.animacion = null;
            if (alTerminar) alTerminar();
            return;
        }
        moto.animacion = requestAnimationFrame(fotograma);
    }

    moto.animacion = requestAnimationFrame(fotograma);
}

// Cancela cualquier animacion o espera pendiente de la moto
function detenerMoto(moto) {
    if (moto.animacion !== null) {
        cancelAnimationFrame(moto.animacion);
        moto.animacion = null;
    }
    if (moto.temporizador !== null) {
        clearTimeout(moto.temporizador);
        moto.temporizador = null;
    }
}

// ==========================================
// PATRULLAJE NORMAL (ciclo infinito por la ruta asignada)
// ==========================================
function darVidaAMoto(moto) {
    if (moto.estado !== "patrullando") return;

    const ruta = moto.rutaAsignada;
    const posicion = moto.marcador.getLatLng();
    const destino = ruta[moto.objetivo];
    const msPorMetro = MS_POR_METRO_PATRULLA_MIN +
        Math.random() * (MS_POR_METRO_PATRULLA_MAX - MS_POR_METRO_PATRULLA_MIN);

    moverPorRuta(moto, [[posicion.lat, posicion.lng], destino], msPorMetro, function() {
        moto.objetivo = (moto.objetivo + 1) % ruta.length;

        moto.temporizador = setTimeout(function() {
            moto.temporizador = null;
            darVidaAMoto(moto);
        }, Math.random() * ESPERA_SEMAFORO_MAX_MS);
    });
}

// Vuelve al patrullaje desde donde quedo la moto (sin "teletransportarse"):
// continua hacia el punto de su ruta que tenga mas cerca.
function reanudarPatrulla(moto) {
    const posicion = moto.marcador.getLatLng();
    let mejorIndice = 0;
    let mejorDistancia = Infinity;

    moto.rutaAsignada.forEach(function(punto, i) {
        const d = calcularDistancia(posicion.lat, posicion.lng, punto[0], punto[1]);
        if (d < mejorDistancia) {
            mejorDistancia = d;
            mejorIndice = i;
        }
    });

    moto.objetivo = mejorIndice;
    darVidaAMoto(moto);
}

escuadron.forEach(darVidaAMoto);
