#pragma once
#include <stddef.h>
#include <stdio.h>
#include <string.h>

// Escapa " y \ para usar un C-string dentro de JSON.
static inline void jsonEsc(const char* in, char* out, size_t n) {
  if (!out || n == 0) return;
  size_t o = 0;
  if (in) {
    for (size_t i = 0; in[i] && o + 2 < n; i++) {
      char c = in[i];
      if (c == '"' || c == '\\') { out[o++] = '\\'; out[o++] = c; }
      else if ((unsigned char)c < 0x20) { /* saltamos controles */ }
      else out[o++] = c;
    }
  }
  out[o] = 0;
}

// Formatea un float con `dec` decimales sin depender de %f de printf.
// NaN → "null".
static inline void fmtNum(char* out, size_t n, float v, int dec) {
  if (v != v) { snprintf(out, n, "null"); return; }
  bool neg = v < 0;
  if (neg) v = -v;
  long ip = (long)v;
  long scale = 1;
  for (int i = 0; i < dec; i++) scale *= 10;
  long frac = (long)((v - (float)ip) * (float)scale + 0.5f);
  if (frac >= scale) { ip++; frac = 0; }
  snprintf(out, n, "%s%ld.%0*ld", neg ? "-" : "", ip, dec, frac);
}
