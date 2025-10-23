# ChatGIF Discourse Plugin

A GIF picker plugin for Discourse chat that integrates with the Tenor API to allow users to search and insert GIFs directly into the chat composer.

## Features

- Adds a GIF button to the Discourse chat composer
- Search for GIFs using the Tenor API
- Insert GIF URLs directly into the message input
- Responsive design that works on desktop and mobile
- Clean, Discourse-native styling

## Installation

1. Add this plugin to your Discourse plugins directory
2. Restart your Discourse instance
3. Enable the plugin in the admin settings
4. Configure your Tenor API key

## Configuration

### Tenor API Key

To use this plugin, you need a Tenor API key:

1. Go to [Tenor Developer Portal](https://tenor.com/developer/dashboard)
2. Create a new application
3. Get your API key
4. Add the API key in Discourse admin settings under:
   - **Settings** → **Plugins** → **ChatGIF** → **Tenor API Key**

## Usage

1. Open any Discourse chat
2. Click the GIF button (film icon) in the chat composer
3. Search for GIFs using the search box
4. Click any GIF to insert its URL into the message input
5. Send your message as usual

## File Structure

```
chatgif/
├── plugin.rb                                      # Main plugin file
├── assets/
│   ├── javascripts/
│   │   └── discourse/
│   │       └── initializers/
│   │           └── chatgif-initializer.js        # Frontend JavaScript
│   └── stylesheets/
│       └── chatgif.scss                          # Styling
├── config/
│   ├── settings.yml                              # Plugin settings
│   └── locales/
│       └── client.en.yml                         # English translations
└── README.md                                      # This file
```

## API Endpoints

- `GET /chatgif/search?q=query&limit=10` - Search for GIFs

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
