# GitHub Pages Setup Instructions

This document provides instructions for setting up GitHub Pages for the Guitarium repository.

## Overview

GitHub Pages has been configured with a dedicated `gh-pages` branch that contains a professional landing page for the Guitarium project. The site provides information about the open source group lesson booking system.

## Setup Steps

### 1. Create the gh-pages branch (Already completed)

A new orphan branch called `gh-pages` has been created with the following content:
- Professional landing page (`index.html`)
- Modern responsive design
- Comprehensive project information
- Links to repository and issue tracker

### 2. Enable GitHub Pages in Repository Settings

To activate GitHub Pages:

1. Go to your repository on GitHub: https://github.com/4lbertR/guitarium
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **gh-pages** branch
6. Select **/ (root)** as the folder
7. Click **Save**

### 3. Access Your GitHub Pages Site

Once enabled, your site will be available at:
```
https://4lbertr.github.io/guitarium/
```

## Site Features

The GitHub Pages site includes:

- 🎸 Professional branding and modern design
- 📱 Responsive layout for all devices
- 📋 Detailed feature descriptions
- 🔗 Direct links to source code and issues
- 💡 Clear project overview and benefits

## Site Content

The landing page provides:

1. **Project Overview** - Description of Guitarium as a group lesson booking system
2. **Key Features** - Six main features with detailed descriptions:
   - Google Calendar Integration
   - Unlimited Students & Groups
   - Secure Authentication
   - Group-Based Learning
   - Administrative Interface
   - Web-Based Platform
3. **How It Works** - Explanation of the Google Calendar integration
4. **Technology Stack** - Technical details about the implementation
5. **Links** - Direct access to repository and issue tracker

## Maintenance

The `gh-pages` branch is separate from the main development branches and contains only the static site content. To update the site:

1. Switch to the `gh-pages` branch
2. Edit the `index.html` file
3. Commit and push changes
4. GitHub Pages will automatically rebuild and deploy

## Technical Details

- **Branch**: `gh-pages` (orphan branch)
- **Content**: Single `index.html` file with embedded CSS
- **Dependencies**: None (self-contained HTML file)
- **Fonts**: Google Fonts (Source Sans Pro)
- **Design**: Modern CSS Grid and Flexbox layout
- **Compatibility**: All modern browsers and mobile devices