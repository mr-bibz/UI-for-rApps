FROM node:18

# Install Docker CLI
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

#Create the uplods directory
RUN mkdir -p uploads

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
