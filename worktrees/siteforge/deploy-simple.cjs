const { execSync } = require('child_process');

console.log('Attempting to deploy to Cloudflare Pages...');

try {
    // Try to deploy without project name to create a new project
    console.log('Creating new Pages project...');
    const output = execSync('wrangler pages project create progeodata --production-branch=main', {
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('Project created successfully');
    console.log(output);
} catch (error) {
    console.error('Error creating project:', error.message);

    try {
        // If project already exists, try to deploy
        console.log('Attempting to deploy to existing project...');
        const output = execSync('wrangler pages deploy ./build/client --project-name=progeodata', {
            encoding: 'utf8',
            stdio: 'inherit'
        });

        console.log('Deployment successful');
        console.log(output);
    } catch (deployError) {
        console.error('Deployment failed:', deployError.message);
    }
}