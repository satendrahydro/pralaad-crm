# 📱 Android APK Generation & Client App Guide

Humne aapke project ke andar **Native Android Project** (`client/android`) poori tarah se generate karke configure kar diya hai!

---

## 🔑 1. Client ke alag Login ID aur Password

Admin / Staff aur Client dono ke liye bilkul alag-alag login system hai:

### A. Staff / Admin Login:
- **Portal URL:** `http://localhost:5000`
- **Username:** `admin`
- **Password:** `admin123`

### B. Client / Depositor Mobile App Login:
- **Mobile App Screen:** Header me **`📱 Client Mobile App`** dabayein
- **Client 1 (Rajesh Sharma):**
  - **Login ID / Username:** `CUST-1001` (ya phone `9811122334`)
  - **Password:** `client123`
- **Client 2 (Mahendra Patel):**
  - **Login ID / Username:** `CUST-1002` (ya phone `9822233445`)
  - **Password:** `client123`
- **WhatsApp Share:** CRM ke **Clients / KYC** tab me har customer ke card par **"Share"** button hai, jisse unka Login ID aur Password seedhe unke WhatsApp par chala jata hai!

---

## 📦 2. APK File Kaise Banayein (2 Aasaan Tareeqe)

Project ke andar `client/android` folder Capacitor Android SDK ke sath poori tarah ready hai:

### Tareeqa 1: Android Studio se 1-Minute me APK Build karein (Standard)
1. Free **Android Studio** open karein.
2. **Open Existing Project** par click karein aur choose karein:
   `D:\clients\pralaad ji\client\android`
3. Top Menu me jayein: **Build ➔ Build Bundle(s) / APK(s) ➔ Build APK(s)**
4. 30 second me aapki `.apk` file ready ho jayegi:
   `client/android/app/build/outputs/apk/debug/app-debug.apk`
5. Ye file aap seedhe WhatsApp par client ke phone me bhej sakte hain!

---

### Tareeqa 2: Cloud se bina Android Studio ke APK Download karein (PWABuilder)
1. Website: [https://www.pwabuilder.com](https://www.pwabuilder.com)
2. Jab software live VPS par ho ya ngrok link daalein.
3. **"Generate Android Package"** dabayein aur 1 click me ready-made `.apk` download kar lein!

---

### Tareeqa 3: Bina Download ke Direct Mobile Install (Instant PWA)
Kisi bhi Android ya iPhone me link open karke:
- Chrome me: **"Install App / Add to Home Screen"** dabayein.
- Phone ki screen par app icon aa jayega aur bina browser ke full-screen me chalega!
