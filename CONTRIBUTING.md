# Contributing to WebPush

First off, thank you for considering contributing to WebPush! It's people like you that make WebPush an incredible open-source notification system for everyone.

---

## 🎯 Code of Conduct

- Be respectful and constructive.
- Keep the codebase 100% free of third-party cloud lock-in (Pure WebSocket / Socket.IO).
- Avoid bloated dependencies or external telemetry.

---

## 🛠️ How to Contribute

### 1. Reporting Bugs
- Search existing issues to ensure the bug hasn't already been reported.
- Open a new issue with clear reproduction steps, browser/OS version, and console logs.

### 2. Feature Requests & Enhancements
- Open an issue describing the proposed feature and why it benefits developers.
- Discuss implementation details with the maintainers before creating a massive pull request.

### 3. Pull Request Process
1. Fork the repo: `https://github.com/Shahilali5/web-push`
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request on GitHub.

---

## 💻 Developer Customization API

Developers can customize the look, brand logo, colors, and audio alerts directly via script attributes or JavaScript:

### Method A: HTML Data Attributes
```html
<script 
  src="https://web-push.shahil-codex.xyz/sdk.js" 
  data-site-key="my-brand"
  data-icon="https://mywebsite.com/logo.png"
  data-theme="#6366f1"
  data-sound="true"
  data-widget="true">
</script>
```

### Method B: JavaScript API
```javascript
WebPush.configure({
  icon: 'https://mywebsite.com/custom-logo.png', // Fallback icon for all notifications
  theme: '#10b981',                             // Brand color for launcher & modal
  sound: true                                   // Enable/disable synthesized chimes
});
```

---

## 🏆 Project Leads & Maintainers

- **Shahil Ali** — Lead Architect & Maintainer ([@Shahilali5](https://github.com/Shahilali5))

Thank you for building with us!
