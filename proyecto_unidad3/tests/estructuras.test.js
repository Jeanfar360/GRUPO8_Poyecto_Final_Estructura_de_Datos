const test = require('node:test');
const assert = require('node:assert/strict');
const { Grafo, ColaPrioridad, calcularDistancia } = require('../logic/grafo.js');

test('cola: ver() no extrae y vaciar() la deja vacia', () => {
    const cola = new ColaPrioridad();
    assert.equal(cola.ver(), undefined);

    cola.encolar('b', 5);
    cola.encolar('a', 1);
    assert.equal(cola.ver().elemento, 'a');
    assert.equal(cola.tamano, 2);

    cola.vaciar();
    assert.ok(cola.estaVacia());
    assert.equal(cola.desencolar(), undefined);
});

test('cola: 10000 elementos salen ordenados', () => {
    const cola = new ColaPrioridad();
    const valores = Array.from({ length: 10000 }, () => Math.random() * 1e6);
    valores.forEach((v, i) => cola.encolar(i, v));

    let anterior = -Infinity;
    while (!cola.estaVacia()) {
        const { prioridad } = cola.desencolar();
        assert.ok(prioridad >= anterior);
        anterior = prioridad;
    }
});

test('grafo: cantidadAristas cuenta cada calle una sola vez', () => {
    const g = new Grafo();
    ['A', 'B', 'C'].forEach((id, i) => g.agregarNodo(id, 0, i));
    g.agregarArista('A', 'B', 1);
    g.agregarArista('B', 'C', 1);
    g.agregarArista('B', 'A', 1); // repetida: no debe contarse dos veces
    assert.equal(g.cantidadAristas(), 2);
});

test('haversine es simetrica', () => {
    const ida = calcularDistancia(-3.99, -79.2, -4.03, -79.19);
    const vuelta = calcularDistancia(-4.03, -79.19, -3.99, -79.2);
    assert.ok(Math.abs(ida - vuelta) < 1e-6);
});