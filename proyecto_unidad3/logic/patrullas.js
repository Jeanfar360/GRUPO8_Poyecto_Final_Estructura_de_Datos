// patrullas.js — Inicializacion de patrullas y sistema de animacion

let escuadron = [];

sectoresPatrullaje.forEach(function(sector) {
    let moto = L.circleMarker(sector.ruta[0], {
        color: 'blue', 
        radius: 8
    }).addTo(mapa).bindPopup("Patrulla " + sector.nombre);
    
    escuadron.push({
        marcador: moto,
        rutaAsignada: sector.ruta,
        pasoActual: 0,
        estado: "patrullando" 
    });
});

document.getElementById("consola").innerHTML = "> 10 Patrullas activas.";

function moverMotoIndependiente(moto, coordOrigen, coordDestino, velocidad, alTerminar) {
    let fotogramas = 40; 
    let tiempoPorFotograma = velocidad / fotogramas;
    
    let avanceLat = (coordDestino[0] - coordOrigen[0]) / fotogramas;
    let avanceLng = (coordDestino[1] - coordOrigen[1]) / fotogramas;
    
    let latActual = coordOrigen[0];
    let lngActual = coordOrigen[1];
    let fotogramaActual = 0;
    
    if (moto.animacionActual) {
        clearInterval(moto.animacionActual);
    }
    
    moto.animacionActual = setInterval(function() {
        fotogramaActual++;
        latActual += avanceLat;
        lngActual += avanceLng;
        moto.marcador.setLatLng([latActual, lngActual]);
        
        if (fotogramaActual >= fotogramas) {
            clearInterval(moto.animacionActual); 
            if (alTerminar) alTerminar(); 
        }
    }, tiempoPorFotograma);
}

function darVidaAMoto(moto) {
    if(moto.estado !== "patrullando") return;

    let origen = moto.rutaAsignada[moto.pasoActual];
    
    let siguientePaso = moto.pasoActual + 1;
    if (siguientePaso >= moto.rutaAsignada.length) {
        siguientePaso = 0;
    }
    let destino = moto.rutaAsignada[siguientePaso];
    
    let velocidadAleatoria = Math.floor(Math.random() * 5000) + 7000;

    moverMotoIndependiente(moto, origen, destino, velocidadAleatoria, function() {
        moto.pasoActual = siguientePaso;
        
        let esperaSemaforo = Math.floor(Math.random() * 1500);
        
        setTimeout(function() {
            darVidaAMoto(moto); 
        }, esperaSemaforo);
    });
}

escuadron.forEach(function(moto) {
    darVidaAMoto(moto);
});