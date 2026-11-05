// controles.js — Eventos de botones y orquestacion general

// ==========================================
// BANCO CENTRAL — Click en el mapa
// ==========================================
let marcadorBanco = null;

mapa.on('click', function(evento) {
    let coordenadas = evento.latlng;
    
    if (marcadorBanco !== null) {
        mapa.removeLayer(marcadorBanco);
    }
    
    marcadorBanco = L.marker([coordenadas.lat, coordenadas.lng]).addTo(mapa);
    marcadorBanco.bindPopup("<b>Banco Central</b><br>Alarma lista").openPopup();
    
    document.getElementById("consola").innerHTML += "<br>> Banco ubicado.";
});

// ==========================================
// HERRAMIENTA DE COPIAR COORDENADAS
// ==========================================
mapa.on('contextmenu', function(evento) {
    let lat = evento.latlng.lat.toFixed(4);
    let lng = evento.latlng.lng.toFixed(4);
    
    let textoCoordenada = "[" + lat + ", " + lng + "]";
    
    navigator.clipboard.writeText(textoCoordenada).then(function() {
        document.getElementById("consola").innerHTML += "<br>> Coordenada copiada: " + textoCoordenada;
    });
});

// ==========================================
// BOTON ROJO — DESPACHO CON OSRM
// ==========================================
let botonAlarma = document.getElementById('btn-alarma');

botonAlarma.addEventListener('click', function() {
    if (marcadorBanco === null) {
        alert("Comandante, primero debe hacer clic en el mapa para reubicar el Banco Central.");
        return;
    }

    document.getElementById("consola").innerHTML += "<br><br><b> DESPACHANDO UNIDADES...</b>";

    document.getElementById("consola").innerHTML += "<br>> Ejecutando Algoritmo de Dijkstra en sub-grafo matriz...";
    
    let calculoMatematico = ejecutarDijkstra(redVial, "Parque_Noroeste");
    
    console.log("=== RESULTADOS DEL ALGORITMO DE DIJKSTRA ===");
    console.log(calculoMatematico);

    let bancoLat = marcadorBanco.getLatLng().lat;
    let bancoLng = marcadorBanco.getLatLng().lng;

    escuadron.sort(function(a, b) {
        let distA = calcularDistancia(a.marcador.getLatLng().lat, a.marcador.getLatLng().lng, bancoLat, bancoLng);
        let distB = calcularDistancia(b.marcador.getLatLng().lat, b.marcador.getLatLng().lng, bancoLat, bancoLng);
        return distA - distB; 
    });

    let patrullasDespachadas = escuadron.slice(0, 3);

    patrullasDespachadas.forEach(async function(moto, indice) {
        moto.estado = "emergencia"; 
        moto.marcador.setStyle({color: 'red', fillColor: 'red'});
        
        let origenLat = moto.marcador.getLatLng().lat;
        let origenLng = moto.marcador.getLatLng().lng;
        
        let rutaCalles = await obtenerRutaGPS(origenLat, origenLng, bancoLat, bancoLng);
        
        let lineaPoligono = L.polyline(rutaCalles, {color: 'red', weight: 4, opacity: 0.6, dashArray: '5, 5'}).addTo(mapa);
        lineasDibujadas.push(lineaPoligono);
        
        conducirRutaGPS(moto, rutaCalles, 0);
        
        document.getElementById("consola").innerHTML += "<br>> Unidad " + (indice + 1) + " en camino (con OSRM).";
    });
});

// ==========================================
// BOTON DE REINICIO
// ==========================================
let botonReiniciar = document.getElementById('btn-reiniciar'); 

botonReiniciar.addEventListener('click', function() {
    lineasDibujadas.forEach(function(linea) {
        mapa.removeLayer(linea);
    });
    lineasDibujadas = [];

    escuadron.forEach(function(moto) {
        if (moto.estado === "emergencia") {
            if (moto.animacionActual) {
                clearInterval(moto.animacionActual);
            }
            
            moto.marcador.closePopup();
            
            moto.estado = "patrullando";
            moto.marcador.setStyle({color: 'blue', fillColor: 'blue'});
            
            darVidaAMoto(moto);
        }
    });

    document.getElementById("consola").innerHTML += "<br><br><b>Unidades restablecidas a patrullaje normal.</b>";
});

// ==========================================
// BOTON MANUAL — LINEA RECTA CON DIJKSTRA
// ==========================================
let botonAlarmaManual = document.getElementById('btn-alarma-manual'); 

botonAlarmaManual.addEventListener('click', function() {
    if (marcadorBanco === null) {
        alert("Comandante, primero debe hacer clic en el mapa para reubicar el Banco Central.");
        return;
    }

    document.getElementById("consola").innerHTML += "<br><br><b> EN LINEA RECTA CON DIJKTRA...</b>";

    let bancoLat = marcadorBanco.getLatLng().lat;
    let bancoLng = marcadorBanco.getLatLng().lng;

    escuadron.sort(function(a, b) {
        let distA = calcularDistancia(a.marcador.getLatLng().lat, a.marcador.getLatLng().lng, bancoLat, bancoLng);
        let distB = calcularDistancia(b.marcador.getLatLng().lat, b.marcador.getLatLng().lng, bancoLat, bancoLng);
        return distA - distB; 
    });

    let patrullasDespachadas = escuadron.slice(0, 3);

    patrullasDespachadas.forEach(function(moto, indice) {
        moto.estado = "emergencia"; 
        moto.marcador.setStyle({color: 'orange', fillColor: 'orange'}); 
        
        let origenLat = moto.marcador.getLatLng().lat;
        let origenLng = moto.marcador.getLatLng().lng;
        
        let rutaRecta = [
            [origenLat, origenLng],
            [bancoLat, bancoLng]
        ];
        
        let lineaPoligono = L.polyline(rutaRecta, {color: 'orange', weight: 4, opacity: 0.6, dashArray: '10, 10'}).addTo(mapa);
        lineasDibujadas.push(lineaPoligono);
        
        conducirRutaGPS(moto, rutaRecta, 0);
        
        document.getElementById("consola").innerHTML += "<br>> Unidad " + (indice + 1) + " avanzando.";
    });
});