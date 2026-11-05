// navegacion.js — Integracion GPS con OSRM

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TIMEOUT_MS = 6000;

// Devuelve la ruta por calles como [[lat, lng], ...] o null si OSRM falla
// (sin internet, tiempo agotado, respuesta invalida...). Quien llama decide el respaldo.
async function obtenerRutaGPS(origenLat, origenLng, destinoLat, destinoLng) {
    const url = `${OSRM_URL}/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;

    const controlador = new AbortController();
    const cortarPorTiempo = setTimeout(function() { controlador.abort(); }, OSRM_TIMEOUT_MS);

    try {
        const respuesta = await fetch(url, { signal: controlador.signal });
        if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

        const datos = await respuesta.json();
        if (datos.code !== "Ok" || !datos.routes || datos.routes.length === 0) {
            throw new Error("Respuesta OSRM: " + datos.code);
        }

        // GeoJSON viene como [lng, lat]; Leaflet usa [lat, lng]
        return datos.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    } catch (error) {
        console.warn("Error en el GPS (OSRM):", error);
        return null;
    } finally {
        clearTimeout(cortarPorTiempo);
    }
}
