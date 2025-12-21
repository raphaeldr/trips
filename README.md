# Travel Blog Project

A modern, emotionally rich travel blog built with React, Vite, Supabase, and Shadcn UI.

## Project Structure

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **Maps**: Mapbox GL JS

## Getting Started

1.  **Clone the repository**:
    ```sh
    git clone <YOUR_GIT_URL>
    cd <YOUR_PROJECT_NAME>
    ```

2.  **Install dependencies**:
    ```sh
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory with your Supabase and Mapbox credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_MAPBOX_TOKEN=your_mapbox_token
    ```

4.  **Run locally**:
    ```sh
    npm run dev
    ```

## Deployment

### Vercel
1.  Connect your GitHub repository to Vercel.
2.  Configure the Environment Variables in Vercel project settings (same as above).
3.  Deploy!

### Supabase
-   Database schema and migrations are in `supabase/migrations`.
-   Edge Functions are in `supabase/functions`.

## Features
-   **Moments Capture**: Capture photos, videos, audio, and text notes.
-   **Living Itinerary**: Automatically highlights your current location on the journey.
-   **Interactive Map**: Visualizes your route and visited places.
-   **Weekly Views**: Groups your memories by week.
