FROM mcr.microsoft.com/playwright:v1.33.0-jammy
WORKDIR /app
COPY package*.json ./
COPY . ./
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm ci 
RUN npx playwright install
EXPOSE 3000
ENTRYPOINT ["node", "./periodico.js"]