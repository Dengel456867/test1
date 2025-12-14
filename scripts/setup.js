// Script de configuration et d'initialisation du projet
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

// Fonction pour crÃ©er un repository GitHub
async function createGitHubRepo() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: config.github.repoName,
      description: 'Jeu 3D isomÃ©trique - Test 1',
      private: false,
      auto_init: false
    });

    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `token ${config.github.token}`,
        'User-Agent': 'Node.js',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 422) {
          console.log('Repository GitHub crÃ©Ã© ou existe dÃ©jÃ ');
          resolve(JSON.parse(body));
        } else {
          console.error('Erreur crÃ©ation repo GitHub:', res.statusCode, body);
          reject(new Error(`GitHub API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Fonction pour crÃ©er un projet Vercel
async function createVercelProject() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: config.vercel.projectName,
      framework: 'nextjs'
    });

    const options = {
      hostname: 'api.vercel.com',
      path: '/v9/projects',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.vercel.token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 409) {
          console.log('Projet Vercel crÃ©Ã© ou existe dÃ©jÃ ');
          resolve(JSON.parse(body));
        } else {
          console.error('Erreur crÃ©ation projet Vercel:', res.statusCode, body);
          reject(new Error(`Vercel API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ExÃ©cution
async function setup() {
  try {
    console.log('CrÃ©ation du repository GitHub...');
    await createGitHubRepo();
    
    console.log('CrÃ©ation du projet Vercel...');
    await createVercelProject();
    
    console.log('Configuration terminÃ©e!');
    console.log('\nTokens sauvegardÃ©s dans scripts/config.json');
    console.log('Vous pouvez maintenant:');
    console.log('1. Initialiser Git: git init');
    console.log('2. Ajouter le remote: git remote add origin https://github.com/VOTRE_USERNAME/test1.git');
    console.log('3. Faire le premier commit et push');
    console.log('4. Lier le projet Ã  Vercel: vercel link');
  } catch (error) {
    console.error('Erreur lors de la configuration:', error.message);
  }
}

setup();





