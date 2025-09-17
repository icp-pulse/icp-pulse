# Funding Hub Canister

A decentralized crowdfunding platform built on the Internet Computer Protocol (ICP) using Motoko.

## Overview

The Funding Hub canister enables users to create and fund projects in a trustless, decentralized manner. Project creators can set funding goals and deadlines, while contributors can support projects with ICP tokens.

## Features

- **Project Creation**: Users can create funding projects with goals and deadlines
- **Contribution System**: Support projects with ICP token contributions
- **Project Discovery**: Browse and search active funding projects
- **Contribution Tracking**: View contribution history for projects
- **Deadline Management**: Automatic project closure after deadline

## API Methods

### Query Methods

- `getProjects()`: Get all funding projects
- `getProject(id)`: Get a specific project by ID
- `getContributions(projectId)`: Get contribution history for a project

### Update Methods

- `createProject(title, description, goalAmount, deadline)`: Create a new funding project
- `contribute(projectId, amount)`: Contribute to a funding project

## Data Types

### FundingProject
- `id`: Unique project identifier
- `title`: Project title
- `description`: Project description
- `goalAmount`: Target funding amount
- `currentAmount`: Current funded amount
- `creator`: Principal of project creator
- `createdAt`: Project creation timestamp
- `deadline`: Project funding deadline
- `isActive`: Project status

### ContributionRecord
- `projectId`: Associated project ID
- `contributor`: Principal of contributor
- `amount`: Contribution amount
- `timestamp`: Contribution timestamp

## Usage

Deploy the canister using dfx:

```bash
dfx deploy funding_hub
```

Interact with the canister through the IC SDK or frontend applications.