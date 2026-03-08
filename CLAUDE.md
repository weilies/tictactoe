# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tic Tac Toe web game built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. The game logic is to be implemented in `src/app/page.tsx` (currently the default Create Next App boilerplate).

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

- **Framework**: Next.js App Router (`src/app/`)
- **Styling**: Tailwind CSS v4 via PostCSS (configured in `postcss.config.mjs`)
- **Fonts**: Geist Sans + Geist Mono loaded via `next/font/google` in `layout.tsx`
- **Entry point**: `src/app/page.tsx` — the root page component, rendered inside `src/app/layout.tsx`
- **Global styles**: `src/app/globals.css`

All game logic should live in `src/app/page.tsx` as a client component (`'use client'`) since it requires interactivity. Extract into separate files under `src/app/` or `src/components/` only when the file grows significantly.
