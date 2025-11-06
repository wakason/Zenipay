# CircleCI Setup Guide

## Overview

The CircleCI pipeline is configured to:
1. **Build** - Install dependencies and build the React application
2. **SonarQube Scan** - Analyze code quality and security hotspots
3. **Lint & Test** - Run linting and tests (when database is available)

## Setup Instructions

### Step 1: Connect Repository to CircleCI

1. Go to [CircleCI](https://circleci.com/)
2. Sign in with your GitHub account
3. Click "Add Projects"
4. Find your repository: `wakason/Zenipay`
5. Click "Set Up Project"
6. Select "Use existing config" (since `.circleci/config.yml` is already in the repo)
7. Click "Start Building"

### Step 2: Configure SonarCloud

1. **Create SonarCloud Account:**
   - Go to [SonarCloud](https://sonarcloud.io/)
   - Sign in with GitHub
   - Create a new organization (or use existing)

2. **Create SonarCloud Project:**
   - Click "Create Project"
   - Select "From GitHub"
   - Choose your repository: `wakason/Zenipay`
   - Project key will be auto-generated (or use: `zenipay-payment-portal`)

3. **Get SonarCloud Token:**
   - Go to: Account → Security → Generate Token
   - Name it: `CircleCI`
   - Copy the token

4. **Add Token to CircleCI:**
   - In CircleCI, go to: Project Settings → Environment Variables
   - Add variable:
     - Name: `SONAR_TOKEN`
     - Value: (paste your SonarCloud token)

### Step 3: Configure CircleCI Context (Recommended)

For better security, use CircleCI Contexts:

1. In CircleCI, go to: Organization Settings → Contexts
2. Create a new context: `sonarcloud`
3. Add environment variable:
   - Name: `SONAR_TOKEN`
   - Value: (your SonarCloud token)
4. Update `.circleci/config.yml` to use the context (already configured)

### Step 4: Test the Pipeline

1. **Trigger manually:**
   - Go to your CircleCI project
   - Click "Trigger Pipeline"
   - Select branch: `main`

2. **Or push a commit:**
   ```powershell
   git commit --allow-empty -m "Trigger CI/CD pipeline"
   git push origin main
   ```

## What the Pipeline Does

### Build Job
- ✅ Installs dependencies (`npm ci`)
- ✅ Builds React application (`npm run build`)
- ✅ Runs SonarQube code analysis
- ✅ Reports code quality, security hotspots, and code smells

### Lint & Test Job
- ✅ Installs dependencies
- ✅ Runs linting (if configured)
- ⚠️ API tests are skipped (require database)

## Current Limitations

1. **API Tests:** The `test:api` script requires:
   - Running server
   - MySQL database connection
   - These aren't available in CircleCI by default

2. **Solutions:**
   - Option A: Use a test database service (e.g., CircleCI MySQL service)
   - Option B: Mock the database in tests
   - Option C: Skip API tests in CI (current approach)

## Adding Database to CI/CD (Optional)

To run API tests in CircleCI, add MySQL service:

```yaml
jobs:
  test:
    docker:
      - image: cimg/node:20.0
      - image: circleci/mysql:8.0
        environment:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: payment_portal
    steps:
      - checkout
      - run: npm ci
      - run: npm run setup:db
      - run: npm run test:api
```

## Monitoring

After setup, you can:
- View builds at: `https://circleci.com/gh/wakason/Zenipay`
- View SonarQube results at: `https://sonarcloud.io/project/overview?id=zenipay-payment-portal`
- Get notifications for failed builds

## Troubleshooting

### Build Fails
- Check CircleCI logs for errors
- Verify `package.json` has all required dependencies
- Ensure Node.js version is compatible

### SonarQube Scan Fails
- Verify `SONAR_TOKEN` is set correctly
- Check `sonar-project.properties` has correct project key
- Ensure SonarCloud project exists

### Tests Fail
- Database connection issues (expected if MySQL not configured)
- Missing environment variables
- Check test script compatibility

## Next Steps

1. ✅ Connect repository to CircleCI
2. ✅ Set up SonarCloud account
3. ✅ Add SonarCloud token to CircleCI
4. ✅ Push a commit to trigger pipeline
5. ✅ Verify SonarQube scan runs successfully

The CI/CD pipeline will automatically run on every push to `main` branch!

