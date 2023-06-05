FROM node:slim
WORKDIR /app
COPY package*.json ./
COPY . ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgtk-3-0 libasound2 libx11-6 libxcomposite1\
         libxdamage1 libxext6\                                    
         libxfixes3 libxrandr2\                                  
         libxrender1 libxtst6\                                    
         libfreetype6 libfontconfig1\                              
         libpangocairo-1.0-0 libpango-1.0-0\                              
         libatk1.0-0 libcairo-gobject2\                           
         libcairo2\                                   
         libgdk-pixbuf-2.0-0\                         
         libglib2.0-0\                                
         libdbus-glib-1-2\                            
         libdbus-1-3\                                 
         libxcb-shm0\                                 
         libx11-xcb1\                                 
         libxcb1\                                     
         libxcursor1\                                 
         libxi6\   
    && npm ci \
    && npx playwright install firefox \     
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove \
    && apt-get clean\
    && rm -rf /ms-playwright/chromium-1064 \
    && rm -rf /ms-playwright/webkit-1848
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 3000
ENTRYPOINT ["node", "./periodico.js"]