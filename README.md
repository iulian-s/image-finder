# 🔍 MemeFinder

An on-device, privacy-focused meme search and sharing mobile app built with React Native and Expo. It extracts text from your gallery images using ML Kit OCR, indexes keywords into SQLite, and lets you find and share memes instantly.

## ✨ Features
- **100% On-Device OCR:** Google ML Kit extracts text locally with zero server costs or cloud uploads.
- **Fast Search:** SQLite-indexed substring search with real-time query matching.
- **Background Ingestion:** Automatically indexes new photos without freezing the UI.
- **Native Sharing:** One-tap share to WhatsApp, Discord, Telegram, and Messages.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Android Studio / Android SDK (with NDK 27+)
- Expo CLI

### Installation
\`\`\`bash
git clone https://github.com/iulian-s/image-finder.git
cd meme-finder
npm install
\`\`\`

### Run Locally
\`\`\`bash
# Run on Android
npx expo run:android

# Run on iOS (macOS required)
npx expo run:ios
\`\`\`