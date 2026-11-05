// navegacion.js — Integracion GPS con OSRM

async function obtenerRutaGPS(origenLat, origenLng, destinoLat, destinoLng) {
    let url = `https://router.project-osrm.org/route/v1/driving/${origenLng},${origenLat};${destinoLng},${destinoLat}?geometries=geojson`;
    
    try {
        let respuesta = await fetch(url);
        let datos = await respuesta.json();
        
        let rutaCalles = datos.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        return rutaCalles;
    } catch (error) {
        console.log("Error en el GPS: ", error);
        return [[origenLat, origenLng], [destinoLat, destinoLng]]; 
    }
}

function conducirRutaGPS(moto, rutaCalles, pasoInicial) {
    if (pasoInicial >= rutaCalles.length - 1) {
        moto.marcador.bindPopup("<b>¡Unidad en posicion!</b><br>Perimetro asegurado.").openPopup();
        return; 
    }

    let origen = rutaCalles[pasoInicial];
    let destino = rutaCalles[pasoInicial + 1];
    
    let distanciaTramo = calcularDistancia(origen[0], origen[1], destino[0], destino[1]);
    let tiempoDeViaje = distanciaTramo * 30; 
    
    if (tiempoDeViaje < 100) {
        tiempoDeViaje = 100;
    }

    moverMotoIndependiente(moto, origen, destino, tiempoDeViaje, function() {
        conducirRutaGPS(moto, rutaCalles, pasoInicial + 1);
    });
}

let lineasDibujadas = [];