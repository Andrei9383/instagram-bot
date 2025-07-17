...existing code...
- DeepSeek AI API key
- Instagram bot account credentials

### 3. Test Your Setup

```bash
npm test
```

### 4. Usage

#### Process a Single URL

```bash
npm start -- --url "https://www.instagram.com/p/XXXX/"
```

#### Start DM Monitoring

```bash
npm run monitor
```

#### Web UI (optional)

```bash
node web-ui.js
```

---


## 📁 Project Structure

- `index.js` - Main entry point (DM monitoring, auto-processing)
- `index_new.js` - Newer version with improved summarization and image analysis
- `setup.js` - Interactive setup wizard for environment variables
- `tests/` - All test scripts (moved from root)
- `archive/` - Legacy, experimental, and integration scripts
- `README.md` - This documentation
- `.env.example` - Example environment file
- `requirements.txt` - Python dependencies (if any)
- `.gitignore` - Git ignore rules
- `LICENSE` - MIT License

---

## 🛡️ Security & Best Practices

- **Never commit your `.env` file or API keys.**
- Use a dedicated Instagram account for automation.
- See `SECURITY_GUIDE.md` for more tips.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT
