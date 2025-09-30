# GEMINI.md

This file provides guidance to Gemini when working with this repository.

## Directory Overview

This project is a "Non-Code Project" that serves as a toolkit for initializing other code projects. It's a meta-project designed to streamline the setup of new development environments for use with large language models, specifically tailored for "Claude Code" but adaptable for others.

The core of this project is the `claude-project-init.sh` script. This script is a comprehensive installer that configures a new project based on user-selected templates (e.g., Frontend, Backend, Fullstack, Medical, Design System). It sets up a directory structure, creates configuration files, and generates specialized agents and commands.

## Key Files

*   `claude-project-init.sh`: The main script for initializing new projects. It handles dependency checks, project scaffolding, and the creation of configuration files, agents, and commands.
*   `README.md`: Provides a quick start guide for the `claude-project-init.sh` script, including installation and usage instructions, available project types, and key features.
*   `GUIA_COMPLETA.md`: A detailed guide on how to use the generated projects with "Claude Code". It covers fundamental concepts, essential workflows, and advanced techniques.
*   `templates/`: This directory contains templates for various configuration files that are used by the `claude-project-init.sh` script.
*   `scripts/`: Contains utility scripts, including a test script for the main initializer.
*   `docs/`: Contains additional documentation about the project.
*   `brainstorm/`: Contains markdown files with ideas and brainstorming for the project.
*   `ejemplos/`: Contains examples of how to use the generated projects.
*   `investigacion/`: Contains research related to the project.

## Usage

The primary use of this directory is to run the `claude-project-init.sh` script to create new, fully configured projects.

To use this toolkit:

1.  Navigate to the root of this directory.
2.  Run the `claude-project-init.sh` script:
    ```bash
    ./claude-project-init.sh
    ```
3.  Follow the on-screen prompts to enter a project name and select a project type.

The script will then create a new directory with the specified project name, initialized with the selected configuration, agents, and commands.
