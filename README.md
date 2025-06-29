# LLMCMS - LLM-powered Content Management System

A modern content management system powered by Large Language Models, built with Astro.

## 🚀 Project Structure

Inside of your LLMCMS project, you'll see the following folders and files:

```text
/
├── public/          # Static assets (images, fonts, etc.)
├── src/            # Source code
│   └── pages/      # Astro pages and routes
├── content/        # Content storage directory
├── export/         # Exported content directory  
├── templates/      # CMS templates
├── docs/          # Project documentation
├── cms.config.js  # Main CMS configuration
└── package.json   # Dependencies and scripts
```

## 📁 Directory Overview

- **`src/`** - Contains the main application source code and Astro pages
- **`content/`** - Storage for all content files (markdown, JSON, etc.)
- **`export/`** - Generated exports in various formats (HTML, PDF, etc.)
- **`templates/`** - Reusable content templates for different content types
- **`docs/`** - Project documentation and guides
- **`public/`** - Static assets served directly by the web server

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## ⚙️ Configuration

The main configuration is stored in `cms.config.js`. This file contains settings for:
- Site metadata and URLs
- Content management settings
- Export configurations
- Template settings
- LLM integration parameters

## 🤖 LLM Integration

LLMCMS integrates with Large Language Models to provide:
- Automated content generation
- Content optimization suggestions
- Template-based content creation
- Multi-format content export

## 📖 Documentation

Detailed documentation can be found in the `docs/` directory.

## 👀 Want to learn more?

- [Astro Documentation](https://docs.astro.build)
- [LLMCMS Documentation](./docs/)


