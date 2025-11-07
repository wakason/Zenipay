# CI/CD Setup Guide

## Overview

The CI/CD pipeline is configured with GitHub Actions to:
1. **Build** - Install dependencies and build the React application
2. **SonarQube Scan** - Analyze code quality and security hotspots
3. **Lint & Test** - Run linting and tests (when database is available)

## GitHub Actions Setup

### Step 1: Repository Setup

The GitHub Actions workflow is automatically configured in `.github/workflows/ci.yml`. No additional setup is needed - workflows will run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

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
   - Name it: `GitHub Actions`
   - Copy the token

4. **Add Token to GitHub Secrets:**
   - Go to your GitHub repository
   - Navigate to: Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add secret:
     - Name: `SONAR_TOKEN`
     - Value: (paste your SonarCloud token)
   - Click "Add secret"

### Step 3: Test the Pipeline

1. **Push a commit to trigger the workflow:**
   ```bash
   git commit --allow-empty -m "Trigger CI/CD pipeline"
   git push origin main
   ```

2. **View workflow runs:**
   - Go to your GitHub repository
   - Click on the "Actions" tab
   - You should see the workflow running
   - Click on a workflow run to see detailed logs

3. **Or create a pull request:**
   - Create a new branch
   - Make a change
   - Open a pull request to `main` or `develop`
   - The workflow will automatically run

## What the Pipeline Does

### Build Job
- ✅ Installs dependencies (`npm ci`)
- ✅ Builds React application (`npm run build`)
- ✅ Uses Node.js 20
- ✅ Caches npm dependencies for faster builds

### Lint & Test Job
- ✅ Installs dependencies
- ✅ Runs linting (if configured)
- ⚠️ API tests are skipped (require database)

### SonarQube Analysis Job
- ✅ Runs on pull requests and main branch pushes
- ✅ Analyzes code quality and security
- ✅ Reports code quality metrics, security hotspots, and code smells
- ✅ Integrates with GitHub pull request checks

## Current Limitations

1. **API Tests:** The `test:api` script requires:
   - Running server
   - MySQL database connection
   - These aren't available in GitHub Actions by default (requires service configuration)

2. **Solutions:**
   - Option A: Use a test database service (e.g., GitHub Actions MySQL service)
   - Option B: Mock the database in tests
   - Option C: Skip API tests in CI (current approach)

## Adding Database to CI/CD (Optional)

To run API tests in GitHub Actions, add MySQL service. Update `.github/workflows/ci.yml`:

```yaml
jobs:
  lint-and-test:
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: payment_portal
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    steps:
      # ... existing steps ...
      - name: Setup database
        run: npm run setup:db
        env:
          DB_HOST: localhost
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: payment_portal
      - name: Run API tests with database
        run: npm run test:api
```

## Monitoring

After setup, you can:
- View workflow runs in the GitHub repository's "Actions" tab
- View SonarQube results at: `https://sonarcloud.io/project/overview?id=zenipay-payment-portal`
- Get email notifications for failed workflows (configure in GitHub Settings → Notifications)
- View workflow status badges in the README

## Troubleshooting

### Build Fails
- Check GitHub Actions logs in the "Actions" tab
- Verify `package.json` has all required dependencies
- Ensure Node.js version is compatible (should be 20.x)

### SonarQube Scan Fails
- Verify `SONAR_TOKEN` is set correctly in GitHub Secrets
- Check `sonar-project.properties` has correct project key
- Ensure SonarCloud project exists
- Verify the token has the correct permissions

### Tests Fail
- Database connection issues (expected if MySQL not configured)
- Missing environment variables
- Check test script compatibility
- Review workflow logs for specific error messages

## Next Steps

1. ✅ GitHub Actions workflow is already configured (`.github/workflows/ci.yml`)
2. ✅ Set up SonarCloud account
3. ✅ Add SonarCloud token to GitHub Secrets
4. ✅ Push a commit to trigger pipeline
5. ✅ Verify SonarQube scan runs successfully

The CI/CD pipeline will automatically run on every push to `main` or `develop` branches, and on all pull requests!

## CircleCI (Legacy)

The project previously used CircleCI. The configuration is still available in `.circleci/config.yml` if you prefer to use CircleCI instead of GitHub Actions. However, GitHub Actions is now the recommended CI/CD solution.

