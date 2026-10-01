#pragma once
#include <stdint.h>

// Envío periódico de los datos a cfg().pushUrl (HTTP POST JSON).
// Llamar en cada vuelta de loop(); hace su propia gestión de tiempos.
void pushTick(uint32_t now);

// Fuerza un envío inmediato (por ejemplo, nada más arrancar) si está configurado.
void pushKick();
