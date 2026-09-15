---
title: RentNow Admin UI
emoji: 🖥️
colorFrom: blue
colorTo: gray
sdk: docker
pinned: false
---

# RentNow Admin UI

Vite React console for ops. Firebase Auth login, Bearer token to the Admin API.

## Setup
1. Enable Google sign-in in Firebase Auth.
2. Set build vars from `.env.example` (`VITE_API_URL` points at the API Space).
3. Deploy as a Docker Space. Add ops emails to API `ADMIN_EMAILS`.
