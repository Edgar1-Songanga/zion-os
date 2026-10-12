'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(process.cwd(), 'api-public');
fs.mkdirSync(outputDirectory, { recursive: true });

// Vercel validates the configured output directory after the build command.
// The HTTP API is served by the serverless function in api/index.ts.
