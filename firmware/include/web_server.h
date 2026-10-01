#pragma once
#include <WiFiS3.h>

// Arranca el servidor web embebido sobre `srv` (ya creado en main.cpp).
// apMode: true si la placa está en modo punto de acceso (portal de config).
void webBegin(WiFiServer* srv, bool apMode);

// Atiende un cliente HTTP si llega (llamar en cada vuelta de loop()).
// También gestiona el reinicio diferido tras guardar credenciales WiFi.
void webLoop();
