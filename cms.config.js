/**
 * LLMCMS Configuration
 * Main configuration file for the LLM-powered Content Management System
 */

export default {
  // Site configuration
  site: {
    name: 'LLMCMS',
    description: 'LLM-powered Content Management System',
    url: 'http://localhost:4321',
    author: 'LLMCMS Team'
  },

  // Content configuration
  content: {
    // Directory where content files are stored
    contentDir: './content',
    // Supported content types
    supportedTypes: ['md', 'mdx', 'txt', 'json'],
    // Default content template
    defaultTemplate: 'default'
  },

  // Export configuration
  export: {
    // Directory for exported content
    exportDir: './export',
    // Export formats
    formats: ['html', 'md', 'json', 'pdf'],
    // Default export format
    defaultFormat: 'html'
  },

  // Templates configuration
  templates: {
    // Directory where templates are stored
    templatesDir: './templates',
    // Default template engine
    engine: 'astro',
    // Available templates
    available: ['default', 'blog', 'page', 'article']
  },

  // LLM configuration
  llm: {
    // Default LLM provider
    provider: 'openai',
    // Model settings
    model: 'gpt-4',
    // Generation settings
    maxTokens: 2000,
    temperature: 0.7
  },

  // Build configuration
  build: {
    // Output directory
    outDir: './dist',
    // Static assets directory
    publicDir: './public'
  },

  // Development configuration
  dev: {
    port: 4321,
    host: 'localhost',
    open: true
  }
}; 