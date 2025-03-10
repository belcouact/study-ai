#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Deploy to Cloudflare Pages using Wrangler
echo "Deploying to Cloudflare Pages..."
npx wrangler pages publish dist

echo "Deployment complete!" 