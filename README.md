[README.md](https://github.com/user-attachments/files/28767508/README.md)
# UCAPS Tools — GitHub Pages Setup

## Folder structure

```
ucaps-tools/              ← your GitHub repository root
│
├── index.html            ← the launcher homepage (this file)
│
├── budget-tracker/
│   └── index.html        ← FY Budget Tracker app
│
├── budget-overview/
│   └── index.html        ← Budget Overview PDF generator
│
├── reader-approver/
│   └── index.html        ← Reader Approver Lookup
│
├── emergency-phones/
│   └── index.html        ← Emergency Phone Testing app
│
├── license-tracker/
│   └── index.html        ← License & Maintenance Renewal Tracker
│
└── vvv-badge/
    └── index.html        ← VVV Badge Review Portal
```

## How to publish on GitHub Pages (free)

1. Go to https://github.com and create a free account if you don't have one
2. Click **New repository** — name it `ucaps-tools`
3. Set visibility to **Private** (keeps your tools internal)
4. Upload all files — drag the folders into the GitHub file browser
5. Go to **Settings → Pages**
6. Under "Source" select **main branch** and click Save
7. Your site will be live at: `https://YOUR-USERNAME.github.io/ucaps-tools/`

## Adding a custom domain (optional, ~$12/year)

1. Buy a domain at namecheap.com (e.g. `ucaps-tools.com`)
2. In GitHub Pages settings, enter your custom domain
3. Follow GitHub's DNS instructions — takes about 10 minutes to set up

## Updating a tool

1. Open the tool's HTML file in any text editor
2. Make your changes
3. Go to GitHub, find the file, click the pencil icon to edit
4. Paste your updated code and click **Commit changes**
5. Site updates automatically within 60 seconds

## Adding a new tool

1. Create a new folder with the tool's name (e.g. `commencement-parking/`)
2. Save your HTML file inside it as `index.html`
3. Add a card for it on the main `index.html` homepage
4. Upload to GitHub

---
*Maintained by UCAPS — UMass Lowell*
