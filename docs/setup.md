# Setup guide (Supabase + iOS + Admin Web)

This file contains a step-by-step checklist to stand up the backend and the first clients.

## 1) Supabase project (per company instance)
1. Create a new Supabase project for the company.
2. Copy the project URL and anon key.
3. Open the SQL editor and run:
   - backend/schema.sql
   - backend/policies.sql
   - backend/seed.sql (optional example data)

## 2) Create admin user
1. In Supabase Auth, create a user (email/password).
2. Insert an app_users row with role = 'admin' and company_id = the company row.

## 3) iOS (SwiftUI)
1. Create a new Xcode project.
2. Add the Supabase Swift package via SPM (see docs for current URL).
3. Store SUPABASE_URL and SUPABASE_ANON_KEY in an xcconfig or Info.plist.
4. Initialize Supabase client and implement login + package list.

## 4) Admin web (Next.js)
1. Create Next.js app.
2. Install supabase-js.
3. Implement login + tables CRUD for admin.

## 5) Next steps
- Add accounting summaries
- Add statuses and return reasons UI
- Add metrics dashboards
