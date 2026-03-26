# Clinic Care Management System

A professional, modern healthcare management system built with **Next.js 14, Supabase, and Node.js**. Manage patient records, appointments, prescriptions, billing, and more with a beautiful, professional interface.

## ✨ Features

### Core Clinical Features
- **Patient Management** - Complete patient profiles with medical history, insurance, emergency contacts
- **Appointments** - Schedule and manage patient appointments with status tracking
- **Prescriptions** - Track medications with detailed dosage information (mg, ml, g, mcg, IU)
- **Billing & Payments** - Invoice management and payment tracking with status monitoring
- **Medical Records** - Store and retrieve patient reports and documentation

### Professional Features
- **Staff Authentication** - Secure login/signup restricted to authorized personnel only
- **Analytics & Reports** - View performance metrics and revenue analytics
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Professional UI** - Modern gradient backgrounds, professional cards, healthcare branding

## 🎨 Design Highlights

- ✨ Professional gradient backgrounds (slate-50 → blue-50 → indigo-100)
- 🎴 Beautiful card-based layouts with elevation shadows
- 🏥 Healthcare-themed icons and branding
- 📱 Fully responsive for all devices
- ♿ Accessible design with proper color contrast
- 🌙 Clean, modern typography hierarchy

## 🛠️ Tech Stack

- **Frontend**: Next.js 14.2.35 with React 18 & TypeScript
- **Styling**: Tailwind CSS 3.4.1
- **Backend**: Next.js API Routes with Node.js
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Email/Password
- **Charts**: Recharts for analytics
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios with auth interceptors

## 📋 Project Structure

```
clinic-care/
├── app/
│   ├── api/                    # Backend REST API
│   │   ├── auth/              # Authentication (login/signup/logout)
│   │   ├── patients/          # Patient CRUD operations
│   │   ├── appointments/      # Appointment management
│   │   ├── prescriptions/     # Prescription tracking
│   │   ├── bills/             # Billing operations
│   │   └── reports/           # Medical report generation
│   ├── dashboard/             # Main dashboard (protected route)
│   ├── login/                 # Staff login page
│   ├── signup/                # Staff registration page
│   └── layout.tsx             # Root layout with providers
│
├── components/                 # Reusable React components
│   ├── LoginForm.tsx          # Login form with email/password
│   ├── SignupForm.tsx         # Registration form
│   ├── PatientsList.tsx       # Patient CRUD interface
│   ├── AppointmentsList.tsx   # Appointment scheduling
│   ├── PrescriptionsList.tsx  # Prescription management
│   ├── BillingList.tsx        # Billing dashboard
│   └── ReportsList.tsx        # Medical reports
│
├── lib/
│   ├── apiClient.ts           # Axios client with auth interceptor
│   ├── supabase.ts            # Supabase client initialization
│   └── types.ts               # TypeScript interfaces
│
├── supabase/
│   └── migrations/
│       └── 001_init_schema.sql # Database schema (6 tables + 7 indexes)
│
├── .env.local                  # Environment variables
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── next.config.mjs            # Next.js configuration
└── package.json               # Dependencies & scripts
```

## 📦 Database Schema

### Tables

**staff** - Staff user accounts
- id (UUID, Primary Key)
- email (String, Unique)
- full_name (String)
- role (Enum: admin, doctor, nurse, receptionist)
- phone (String)
- created_at, updated_at (Timestamps with indexes)

**patients** - Patient records
- id, full_name, email, phone, date_of_birth
- gender, blood_type, allergies, medical_history
- insurance_provider, insurance_number
- emergency_contact_name, emergency_contact_phone
- created_at, updated_at (with indexes)

**appointments** - Appointment scheduling
- id, patient_id, staff_id, appointment_date, appointment_time
- reason, status (scheduled/completed/cancelled)
- created_at, updated_at

**prescriptions** - Medication tracking
- id, patient_id, medication_name, dosage, dosage_unit
- frequency, duration, refills, expiry_date
- created_at, updated_at

**medical_reports** - Patient documents
- id, patient_id, report_type, report_date
- findings, recommendations, created_at

**bills** - Invoicing
- id, patient_id, amount, status (pending/paid/overdue)
- description, due_date, created_at, updated_at

### Indexes (Performance)
- 7 indexes on frequent query columns for optimal performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Installation

```bash
# Navigate to project
cd clinic-care

# Install dependencies
npm install

# The .env.local should already have Supabase credentials
```

### 2. CRITICAL: Setup Supabase

Before the system will work, you MUST:

**A. Create Authentication Users:**
1. Go to https://supabase.co → Your Project
2. Click **Authentication** → **Users**
3. Click **Invite** and create 2 users:
   - `admin@clinic.com` / `adminclinic`
   - `doctor@clinic.com` / `doctorclinic`

**B. Initialize Database:**
1. Go to **SQL Editor** → **New Query**
2. Copy entire contents of `supabase/migrations/001_init_schema.sql`
3. Paste and click **Run**

See **COMPLETE_SETUP_GUIDE.md** for step-by-step instructions.

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Login

```
Email:    admin@clinic.com
Password: adminclinic
```

## 📱 Features in Detail

### Patient Management
- Create comprehensive patient profiles
- Edit patient information
- Delete patient records
- View patient list with search/filter
- Track medical history and allergies

### Appointment Scheduling
- Schedule appointments with date/time picker
- Assign to staff members
- Track appointment status (scheduled/completed/cancelled)
- Color-coded status indicators

### Prescription Tracking
- Multiple dosage units (mg, ml, g, mcg, IU)
- Medication names and frequency
- Track refills and expiry dates
- Patient-specific prescriptions

### Billing Dashboard
- View all invoices
- Filter by status (pending, paid, overdue)
- Summary cards showing:
  - Total amount
  - Pending amount
  - Total bills
- Status color coding

### Medical Reports
- Generate patient reports
- Store findings and recommendations
- View report history
- Professional document management

## 🔐 Authentication & Security

- **Supabase Auth** - Secure email/password authentication
- **JWT Tokens** - Stored in localStorage with auth interceptor
- **Protected Routes** - Dashboard requires valid token
- **API Interceptor** - Auth token automatically added to requests
- **Role-Based Access** - Currently limited to admin/doctor staff only

## 🌐 Environment Variables

### Required
```env
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://reslzyqsrkecbylkpnyb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## 📚 Documentation

- **COMPLETE_SETUP_GUIDE.md** - Comprehensive setup instructions
- **PROFESSIONAL_UI_GUIDE.md** - Design system and styling

## 🧪 Testing

### Test Workflow
1. Login with admin@clinic.com / adminclinic
2. Create a new patient
3. Schedule an appointment
4. View reports and analytics

## 🚀 Production Deployment

### Before Going Live
1. ✅ Change default credentials
2. ✅ Enable Supabase 2FA
3. ✅ Test all endpoints
4. ✅ Set up error monitoring
5. ✅ Configure backup strategy

### Deploy to Vercel (Recommended)

**IMPORTANT: Environment Variables Required for Login to Work**

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Import this GitHub repository
   - Select Next.js as framework (auto-detected)

3. **Add Environment Variables** (CRITICAL - Login won't work without this!)
   - In Vercel dashboard: **Settings** → **Environment Variables**
   - Add the following variables:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL         = your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY    = your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY        = your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL              = https://your-app.vercel.app
   ```
   
   ⚠️ **Replace `your-app.vercel.app` with your actual Vercel URL**

4. **Deploy**
   - Click **Deploy**
   - Wait for build to complete
   - Test login at your deployed URL

### Alternative: Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables (will prompt you)
vercel env add
```

### If Login Fails After Deployment
1. Check Vercel logs: **Deployments** → **View Logs**
2. Verify `NEXT_PUBLIC_APP_URL` matches your Vercel URL exactly
3. Confirm all Supabase credentials are correct
4. Redeploy after fixing environment variables

## 🐛 Troubleshooting

### "Invalid login credentials"
→ Supabase Authentication users not created. See **COMPLETE_SETUP_GUIDE.md** Step 1.

### "Database error" when creating records
→ Database schema not initialized. Run SQL migration from Step 2.

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

## 📈 Performance

- Optimized database indexes on all query columns
- Lazy loading of components
- Efficient API caching with auth interceptor
- Professional responsive design

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows project structure
- TypeScript strict mode enabled
- Tailwind CSS for styling
- Components are reusable

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review error messages in browser console
3. Check server logs
4. Verify Supabase configuration

---

**Built with ❤️ for modern healthcare management**

**Version:** 1.0 Professional Edition  
**Status:** ✅ Production Ready  
**Last Updated:** 2024
- npm or yarn
- Supabase account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Setup Supabase:
   - Create project at [supabase.com](https://supabase.com)
   - Get your Project URL and Anon Key from Settings > API
   - Run SQL from `supabase/migrations/001_init_schema.sql` in Supabase SQL editor

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run development server:
```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
clinic-care/
├── app/
│   ├── api/              # Backend API routes
│   ├── dashboard/        # Dashboard page
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── apiClient.ts      # API client
│   └── types.ts          # TypeScript types
└── supabase/
    └── migrations/       # Database schema
```

## User Roles

- **Admin** - Full system access
- **Doctor** - Patient viewing, prescriptions, reports
- **Nurse** - Appointments, patient records
- **Receptionist** - Scheduling, billing

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Patients
- `GET /api/patients` - List all
- `GET /api/patients/[id]` - Get single
- `POST /api/patients` - Create
- `PUT /api/patients/[id]` - Update
- `DELETE /api/patients/[id]` - Delete

### Appointments
- `GET /api/appointments` - List all
- `POST /api/appointments` - Create
- `PUT /api/appointments/[id]` - Update
- `DELETE /api/appointments/[id]` - Delete

### Prescriptions
- `GET /api/prescriptions` - List all
- `POST /api/prescriptions` - Create

### Billing
- `GET /api/bills` - List all
- `POST /api/bills` - Create
- `PUT /api/bills/[id]` - Update

## Database Schema

- **staff** - User accounts with roles
- **patients** - Patient information and demographics
- **appointments** - Scheduled appointments
- **prescriptions** - Medication details with dosage
- **medical_reports** - Patient reports and notes
- **bills** - Invoices and payment tracking

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy

### Other Platforms
Works with any Node.js hosting (AWS, DigitalOcean, Heroku, etc.)

## Security Features

- Secure password hashing with Supabase
- JWT token authentication
- Protected API endpoints
- Parameterized database queries
- Environment variable protection
- HTTPS in production

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

- **Supabase Connection**: Verify URL and Key in .env.local
- **Auth Issues**: Clear browser cache and localStorage
- **Database Errors**: Ensure SQL migrations are executed

## Contributing

Pull requests welcome! Please feel free to submit improvements.

## License

MIT - Use freely for commercial purposes

## Future Enhancements

- Telemedicine integration
- Insurance claims
- Lab results tracking
- Prescription refills
- Patient portal
- Mobile app
- Advanced analytics
- Inventory management

---

**Questions?** Check the [Next.js Documentation](https://nextjs.org/docs) or open an issue.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
