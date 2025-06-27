# Anamorphic API Frontend

This is the frontend application for the Anamorphic API project, which includes message encoding functionality using OpenAI's API.

## Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn package manager
- An OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/test-sum/anamorphic-api
cd anamorphic-api/frontend
```

2. Install dependencies:
```bash
npm install
# or if using yarn
yarn install
```

3. Configure OpenAI API Key:
   - Navigate to `src/config/`
   - Create a copy of `config.example.js` and name it `config.js`
   - Add your OpenAI API key to `config.js`:
   ```javascript
   const config = {
       OPENAI_API_KEY: 'your-openai-api-key-here'
   };
   
   export default config;
   ```

## Running the Application

To start the development server:

```bash
npm start
# or if using yarn
yarn start
```

The application should now be running on [http://localhost:3000](http://localhost:3000) (or your configured port).

## Project Structure

- `src/services/openai.js` - OpenAI service integration
- `src/config/config.js` - Configuration file (not committed to git)
- `src/schema.json` - Schema definition for message encoding
- `src/utils/` - Utility functions

## Security Notes

- Never commit your `config.js` file containing the API key
- The `config.js` file is included in `.gitignore`
- Use environment variables for API keys in production environments

## Features

- Natural language message encoding
- Structured format conversion according to schema
- Real-time message interpretation using OpenAI's GPT-4

## API Integration

The frontend integrates with OpenAI's API to provide message interpretation services. The service:
- Takes natural language input
- Matches it to the closest available options in the schema
- Returns a structured JSON response with matched values and explanations

## Error Handling

The application includes error handling for:
- API connection issues
- Invalid message interpretations
- Schema validation errors

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

[Your License Here] 
