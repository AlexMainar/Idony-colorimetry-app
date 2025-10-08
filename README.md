# Idony-colorimetry-app
# 🎨 Idony Colorimetry App

The **Idony Colorimetry App** is a web application that analyzes a user’s natural features (skin tone, hair color, and eye color) to determine their ideal color palette according to seasonal color analysis theory.  
It combines **AI-driven face landmark detection** with **Idony’s proprietary colorimetry data** to recommend curated makeup products that match each user’s tone and undertone.

---

## 🚀 Features

- **Real-time camera analysis** using [MediaPipe Face Landmarker](https://developers.google.com/mediapipe).
- **Automatic color extraction** from cheeks, forehead, and chin.
- **Smart classification** into 12 seasonal color categories (e.g., *Warm Spring*, *Cool Summer*, *Deep Autumn*).
- **Refined result** based on user input (eye & hair color).
- **Dynamic palette display** — each color season includes description, comments, swatches, and recommendations.
- **Shopify integration** — one-click button adds the recommended Idony products directly to the user’s shopping cart.

---

## 🧠 How It Works

1. The user allows camera access.
2. The system detects face landmarks and samples color data from specific points.
3. RGB values are converted to OKLab space and normalized.
4. The algorithm classifies the user into one of 12 seasonal profiles.
5. Based on this classification, the app:
   - Displays personalized color palettes.
   - Loads content and descriptions from `/lib/mapping/colorimetry.json`.
   - Provides a direct link to prefilled Shopify carts.

---

## 🧱 Project Structure
