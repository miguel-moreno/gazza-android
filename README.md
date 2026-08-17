# Gazza Club Caddie — V1.0

Aplicación Android privada y 100% offline: introduces una distancia y la app recomienda el palo.

**Nombre visible:** Gazza Club Caddie  
**Package:** `com.gazza.clubcaddie`  
**APK:** `apk/GazzaClubCaddie-1.0.apk`

## Instalar en el teléfono

1. Copia `apk/GazzaClubCaddie-1.0.apk` al teléfono.
2. Abre el archivo e instálalo (permite “orígenes desconocidos” si Android lo pide).
3. No necesita Internet, cuenta ni GPS.

## Uso

- Mueve el slider (40–220 m) o toca el número grande para escribir la distancia.
- El palo central es el seleccionado. A los lados aparecen PREV. y NEXT.
- Menú ☰ → **Settings** para ajustar min/max de cada palo. Se guarda en el teléfono.

## Compilar

Requiere JDK 17+ y Android SDK (platform 35).

```bash
export ANDROID_HOME=/ruta/al/android-sdk
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew assembleRelease
```

El APK firmado queda en `app/build/outputs/apk/release/app-release.apk`.
