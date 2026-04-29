import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("luwis_express.db");
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "luwis-secret-key-123";

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'rider',
    status TEXT NOT NULL DEFAULT 'pending',
    wallet_balance REAL DEFAULT 0,
    bonus_balance REAL DEFAULT 0,
    payment_method TEXT,
    payment_account TEXT,
    profile_image TEXT,
    plate_number TEXT,
    online_status INTEGER DEFAULT 0,
    daily_amount INTEGER DEFAULT 5000,
    rider_id_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER,
    pickup TEXT NOT NULL,
    dropoff TEXT NOT NULL,
    fare REAL NOT NULL,
    company_share REAL NOT NULL,
    rider_share REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'assigned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (rider_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER,
    amount REAL NOT NULL,
    payment_method TEXT,
    payment_account TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    FOREIGN KEY (rider_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS daily_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id INTEGER,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'wallet', -- 'wallet' or 'manual'
    payment_network TEXT,
    transaction_ref TEXT,
    screenshot TEXT,
    status TEXT DEFAULT 'approved', -- 'pending' or 'approved'
    payment_date DATE DEFAULT (DATE('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT UNIQUE NOT NULL,
    model TEXT,
    card_image TEXT,
    insurance_image TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.prepare("ALTER TABLE users ADD COLUMN daily_amount INTEGER DEFAULT 5000").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN rider_id_number TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN bonus_balance REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN profile_image TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN plate_number TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE users ADD COLUMN vehicle_id INTEGER").run(); } catch (e) {}

try { db.prepare("ALTER TABLE daily_payments ADD COLUMN payment_network TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE daily_payments ADD COLUMN screenshot TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE daily_payments ADD COLUMN status TEXT DEFAULT 'approved'").run(); } catch (e) {}

try { db.prepare("ALTER TABLE payouts ADD COLUMN approved_at DATETIME").run(); } catch (e) {}
try { db.prepare("ALTER TABLE payouts ADD COLUMN payment_method TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE payouts ADD COLUMN payment_account TEXT").run(); } catch (e) {}

try { db.prepare("ALTER TABLE vehicles ADD COLUMN model TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE vehicles ADD COLUMN card_image TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE vehicles ADD COLUMN insurance_image TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE vehicles ADD COLUMN assigned_to INTEGER").run(); } catch (e) {}

// Set super admin
const adminEmail = "luwisdiomed@gmail.com";
const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail) as any;
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10); // Default password for setup
  db.prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)").run(
    "Super Admin",
    adminEmail,
    hashedPassword,
    "admin",
    "active"
  );
} else if (existingAdmin.role !== "admin") {
  db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE email = ?").run(adminEmail);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
};

// API Routes

// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(
      name,
      email,
      hashedPassword,
      phone,
      "rider",
      "pending"
    );
    // Assign ID number based on row ID
    const riderIdNumber = `LX-${String(result.lastInsertRowid).padStart(3, '0')}`;
    db.prepare("UPDATE users SET rider_id_number = ? WHERE id = ?").run(riderIdNumber, result.lastInsertRowid);
    
    res.json({ id: result.lastInsertRowid, message: "Usajili umekamilika. Subiri idhini ya Admin." });
  } catch (error) {
    res.status(400).json({ message: "Email tayari imetumika au hitilafu nyingine." });
  }
});

// Forgot Password (Mock)
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user) return res.status(404).json({ message: "Email hii haipo kwenye mfumo wetu." });
  
  res.json({ message: "Ombi lako limepokelewa. Wasiliana na Admin (07XX XXX XXX) kupata nenosiri jipya." });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Email au nenosiri si sahihi." });
  }

  if (user.role === "rider" && user.status !== "active") {
    return res.status(403).json({ message: "Akaunti yako bado haijaidhinishwa au imesitishwa." });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      wallet_balance: user.wallet_balance || 0,
      bonus_balance: user.bonus_balance || 0,
      rider_id_number: user.rider_id_number,
      daily_amount: user.daily_amount
    }
  });
});

// User Info
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const user = db.prepare("SELECT id, name, email, role, status, phone, wallet_balance, bonus_balance, online_status, payment_method, payment_account, daily_amount, rider_id_number FROM users WHERE id = ?").get(req.user.id) as any;
  res.json(user);
});

// --- ADMIN ROUTES ---

// Stats
app.get("/api/admin/stats", authenticateToken, isAdmin, (req: any, res) => {
  try {
    const totalRiders = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'rider'").get() as any;
    const activeRiders = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'rider' AND online_status = 1").get() as any;
    
    const today = new Date().toISOString().split("T")[0];
    const todayTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE DATE(created_at) = ?").get(today) as any;
    
    const riders = db.prepare("SELECT id, created_at, daily_amount FROM users WHERE role = 'rider'").all() as any[];
    let totalDebt = 0;
    riders.forEach(r => {
      const regDate = r.created_at ? new Date(r.created_at) : new Date();
      const diff = new Date().getTime() - regDate.getTime();
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      const expected = days * (r.daily_amount || 5000);
      const paid = (db.prepare("SELECT SUM(amount) as total FROM daily_payments WHERE rider_id = ? AND status = 'approved'").get(r.id) as any).total || 0;
      const d = expected - (paid || 0);
      if (d > 0) totalDebt += d;
    });

    const companyEarnings = (db.prepare("SELECT SUM(fare * 0.15) as total FROM trips WHERE status = 'completed'").get() as any) || { total: 0 };
    const riderBalances = (db.prepare("SELECT SUM(wallet_balance) as total FROM users WHERE role = 'rider'").get() as any) || { total: 0 };

    res.json({
      totalRiders: totalRiders.count || 0,
      activeRiders: activeRiders.count || 0,
      todayTrips: todayTrips.count || 0,
      companyEarnings: companyEarnings.total || 0,
      totalRiderBalance: riderBalances.total || 0,
      totalDebt: totalDebt || 0
    });
  } catch (error) {
    res.status(500).json({ message: "Inashindwa kupata takwimu" });
  }
});

// All Riders
app.get("/api/admin/riders", authenticateToken, isAdmin, (req: any, res) => {
  const riders = db.prepare("SELECT id, name, email, phone, status, online_status, wallet_balance, bonus_balance, daily_amount, rider_id_number, created_at FROM users WHERE role = 'rider'").all();
  res.json(riders);
});

// Update Rider Info (Admin)
app.post("/api/admin/riders/:id/update", authenticateToken, isAdmin, (req: any, res) => {
  const { name, phone, status, daily_amount, rider_id_number } = req.body;
  try {
    db.prepare("UPDATE users SET name = ?, phone = ?, status = ?, daily_amount = ?, rider_id_number = ? WHERE id = ?")
      .run(name, phone, status, daily_amount, rider_id_number, req.params.id);
    res.json({ message: "Taarifa za dereva zimesasishwa." });
  } catch (error) {
    res.status(400).json({ message: "ID Number tayari inatumika na dereva mwingine." });
  }
});

// Approve Rider
app.post("/api/admin/riders/:id/approve", authenticateToken, isAdmin, (req: any, res) => {
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(req.params.id);
  res.json({ message: "Dereva ameidhinishwa." });
});

// Suspend Rider
app.post("/api/admin/riders/:id/suspend", authenticateToken, isAdmin, (req: any, res) => {
  db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(req.params.id);
  res.json({ message: "Dereva amesitishwa." });
});

// Create Trip (Dispatch)
app.post("/api/admin/trips", authenticateToken, isAdmin, (req: any, res) => {
  const { rider_id, pickup, dropoff, fare } = req.body;
  const company_share = fare * 0.15;
  const rider_share = fare * 0.85;

  const result = db.prepare("INSERT INTO trips (rider_id, pickup, dropoff, fare, company_share, rider_share, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    rider_id, pickup, dropoff, fare, company_share, rider_share, "assigned"
  );
  res.json({ id: result.lastInsertRowid, message: "Safari imeundwa na kupewa dereva." });
});

// All Payouts
app.get("/api/admin/payouts", authenticateToken, isAdmin, (req: any, res) => {
  try {
    const payouts = db.prepare(`
      SELECT p.*, u.name as rider_name, u.profile_image as rider_profile_image, u.plate_number as rider_plate_number 
      FROM payouts p 
      JOIN users u ON p.rider_id = u.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: "Inashindwa kupata malipo" });
  }
});

// Approve Payout
app.post("/api/admin/payouts/:id/approve", authenticateToken, isAdmin, (req: any, res) => {
  const payout = db.prepare("SELECT * FROM payouts WHERE id = ?").get(req.params.id) as any;
  if (!payout || payout.status !== "pending") return res.status(400).json({ message: "Malipo hayapo au tayari yameshughulikiwa." });

  db.transaction(() => {
    db.prepare("UPDATE payouts SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(payout.amount, payout.rider_id);
  })();

  res.json({ message: "Malipo yameidhinishwa." });
});

// Reject Payout
app.post("/api/admin/payouts/:id/reject", authenticateToken, isAdmin, (req: any, res) => {
  const payout = db.prepare("SELECT * FROM payouts WHERE id = ?").get(req.params.id) as any;
  if (!payout || payout.status !== "pending") return res.status(400).json({ message: "Malipo hayapo au tayari yameshughulikiwa." });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE payouts SET status = 'rejected', approved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    // Refund the amount to the rider's wallet
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(payout.amount, payout.rider_id);
  });

  transaction();
  res.json({ message: "Malipo yamekataliwa na kiasi kimerudishwa kwa dereva." });
});

// Approve Daily Payment Manual
app.post("/api/admin/approve-daily/:id", authenticateToken, isAdmin, (req, res) => {
  const payment = db.prepare("SELECT * FROM daily_payments WHERE id = ?").get(req.params.id) as any;
  if (!payment || payment.status !== 'pending') return res.status(400).json({ message: "Malipo hayapo au yameshashughulikiwa." });
  
  const user = db.prepare("SELECT daily_amount FROM users WHERE id = ?").get(payment.rider_id) as any;
  const currentDebt = calculateRiderDebt(payment.rider_id);

  db.transaction(() => {
    db.prepare("UPDATE daily_payments SET status = 'approved' WHERE id = ?").run(req.params.id);
    
    // Bonus Logic: if they pay full debt or daily fee
    if (payment.amount >= currentDebt || payment.amount >= (user.daily_amount || 5000)) {
      const bonus = payment.amount * 0.10;
      db.prepare("UPDATE users SET bonus_balance = bonus_balance + ? WHERE id = ?").run(bonus, payment.rider_id);
    }
  })();
  
  res.json({ message: "Malipo yamethibitishwa na bonus imetolewa kama vigezo vimetimia." });
});

// Reject Daily Payment Manual
app.post("/api/admin/reject-daily/:id", authenticateToken, isAdmin, (req, res) => {
  db.prepare("UPDATE daily_payments SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ message: "Malipo yamekataliwa." });
});
// All Daily Payments (Daily Installment)
app.get("/api/admin/daily-payments", authenticateToken, isAdmin, (req: any, res) => {
  const payments = db.prepare(`
    SELECT d.*, u.name as rider_name, u.profile_image as rider_profile_image, u.plate_number as rider_plate_number
    FROM daily_payments d 
    JOIN users u ON d.rider_id = u.id 
    ORDER BY d.created_at DESC
  `).all();
  res.json(payments);
});

// --- RIDER ROUTES ---

// Toggle Online/Offline
app.post("/api/rider/toggle-status", authenticateToken, (req: any, res) => {
  const { status } = req.body; // 1 for online, 0 for offline
  db.prepare("UPDATE users SET online_status = ? WHERE id = ?").run(status, req.user.id);
  res.json({ message: status ? "Upo Hewani (Online)" : "Upo Mapumziko (Offline)" });
});

// Update Profile Info
app.post("/api/rider/profile", authenticateToken, (req: any, res) => {
  const { name, phone, plate_number, profile_image } = req.body;
  db.prepare("UPDATE users SET name = ?, phone = ?, plate_number = ?, profile_image = ? WHERE id = ?").run(
    name, phone, plate_number, profile_image, req.user.id
  );
  res.json({ message: "Profile imesasishwa." });
});

// Update Payment Info
app.post("/api/rider/payment-info", authenticateToken, (req: any, res) => {
  const { method, account } = req.body;
  db.prepare("UPDATE users SET payment_method = ?, payment_account = ? WHERE id = ?").run(method, account, req.user.id);
  res.json({ message: "Taarifa za malipo zimesasishwa." });
});

// My Trips
app.get("/api/rider/trips", authenticateToken, (req: any, res) => {
  const trips = db.prepare("SELECT * FROM trips WHERE rider_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(trips);
});

// My Payouts
app.get("/api/rider/payouts", authenticateToken, (req: any, res) => {
  const payouts = db.prepare("SELECT * FROM payouts WHERE rider_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(payouts);
});

// Start Trip
app.post("/api/rider/trips/:id/start", authenticateToken, (req: any, res) => {
  db.prepare("UPDATE trips SET status = 'started' WHERE id = ? AND rider_id = ?").run(req.params.id, req.user.id);
  res.json({ message: "Safari imeanza." });
});

// Complete Trip
app.post("/api/rider/trips/:id/complete", authenticateToken, (req: any, res) => {
  const trip = db.prepare("SELECT * FROM trips WHERE id = ? AND rider_id = ?").get(req.params.id, req.user.id) as any;
  if (!trip || trip.status !== "started") return res.status(400).json({ message: "Safari haiwezi kukamilishwa." });

  db.transaction(() => {
    db.prepare("UPDATE trips SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?").run(trip.rider_share, req.user.id);
  })();

  res.json({ message: "Safari imekamilika! Mapato yameingizwa kwenye Wallet yako." });
});

// Request Payout
app.post("/api/rider/payout-request", authenticateToken, (req: any, res) => {
  const { amount, payment_method, payment_account } = req.body;
  const user = db.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.user.id) as any;

  if (amount > user.wallet_balance) {
    return res.status(400).json({ message: "Salio halitoshi kutoa kiasi hiki." });
  }

  if (!payment_method || !payment_account || !amount || amount <= 0) {
    return res.status(400).json({ message: "Tafadhali jaza taarifa zote na kiasi sahihi." });
  }

  // Deduct balance and record payout in a transaction
  const transaction = db.transaction(() => {
    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(amount, req.user.id);
    db.prepare("INSERT INTO payouts (rider_id, amount, payment_method, payment_account, status) VALUES (?, ?, ?, ?, ?)").run(
      req.user.id, 
      amount, 
      payment_method, 
      payment_account, 
      "pending"
    );
  });

  transaction();
  res.json({ message: "Ombi la malipo limetumwa. Salio lako limepunguzwa mukisubiri uhakiki." });
});

// Pay Daily Fee (Daily Installment)
app.post("/api/rider/pay-daily", authenticateToken, (req: any, res) => {
  const { amount, method, transaction_ref, network, screenshot } = req.body;
  const user = db.prepare("SELECT wallet_balance, daily_amount FROM users WHERE id = ?").get(req.user.id) as any;
  const currentDebt = calculateRiderDebt(req.user.id);

  try {
    if (method === 'wallet') {
      if (amount > user.wallet_balance) {
        return res.status(400).json({ message: "Salio halitoshi kulipia kiasi hiki." });
      }
      
      db.transaction(() => {
        db.prepare("INSERT INTO daily_payments (rider_id, amount, payment_method, status) VALUES (?, ?, ?, ?)").run(req.user.id, amount, 'wallet', 'approved');
        db.prepare("UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?").run(amount, req.user.id);
        
        // Bonus Logic: If they paid the full debt or at least the daily amount
        if (amount >= currentDebt || amount >= user.daily_amount) {
          const bonus = amount * 0.10;
          db.prepare("UPDATE users SET bonus_balance = bonus_balance + ? WHERE id = ?").run(bonus, req.user.id);
        }
      })();
      res.json({ message: "Malipo yamefanikiwa! Umepata bonus ikiwa umekamilisha deni/ada." });
    } else {
      // Manual payment
      db.prepare("INSERT INTO daily_payments (rider_id, amount, payment_method, payment_network, transaction_ref, screenshot, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        req.user.id, 
        amount, 
        'manual', 
        network || '',
        transaction_ref || '', 
        screenshot || '',
        'pending'
      );
      res.json({ message: "Ombi limetumwa! Subiri Admin athibitishe muamala wako ili kupunguza deni na kupata bonus." });
    }
  } catch (error) {
    res.status(500).json({ message: "Hitilafu imetokea wakati wa kuchakata malipo." });
  }
});

// Calculate debt for a single rider
function calculateRiderDebt(riderId: number) {
  const rider = db.prepare("SELECT created_at, daily_amount FROM users WHERE id = ?").get(riderId) as any;
  if (!rider) return 0;
  
  const regDate = rider.created_at ? new Date(rider.created_at) : new Date();
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - regDate.getTime());
  const daysSinceReg = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  const expectedTotal = daysSinceReg * (rider.daily_amount || 5000);
  const paid = (db.prepare("SELECT SUM(amount) as total FROM daily_payments WHERE rider_id = ? AND status = 'approved'").get(riderId) as any) || { total: 0 };
  const actualPaid = paid.total || 0;
  
  const debt = expectedTotal - actualPaid;
  return debt > 0 ? debt : 0;
}

// Check Today's Payment Status and Debt
app.get("/api/rider/daily-status", authenticateToken, (req: any, res) => {
  const today = new Date().toISOString().split("T")[0];
  const payment = db.prepare("SELECT * FROM daily_payments WHERE rider_id = ? AND payment_date = ?").get(req.user.id, today) as any;
  const debtVisible = calculateRiderDebt(req.user.id);
  res.json({ paid: !!payment, payment, debt: debtVisible });
});

// Convert Bonus to Wallet
app.post("/api/rider/convert-bonus", authenticateToken, (req: any, res) => {
  const { amount } = req.body;
  const user = db.prepare("SELECT bonus_balance FROM users WHERE id = ?").get(req.user.id) as any;

  if (amount > user.bonus_balance) {
    return res.status(400).json({ message: "Bonus haitoshi." });
  }

  try {
    db.transaction(() => {
      db.prepare("UPDATE users SET bonus_balance = bonus_balance - ?, wallet_balance = wallet_balance + ? WHERE id = ?").run(amount, amount, req.user.id);
    })();
    res.json({ message: "Bonus imebadilishwa kuwa pesa kwenye Wallet!" });
  } catch (error) {
    res.status(400).json({ message: "Imefeli kubadili bonus." });
  }
});

// Admin: Award Bonus
app.post("/api/admin/award-bonus", authenticateToken, isAdmin, (req, res) => {
  const { rider_id, amount } = req.body;
  db.prepare("UPDATE users SET bonus_balance = bonus_balance + ? WHERE id = ?").run(amount, rider_id);
  res.json({ message: "Bonus imetolewa kwa dereva." });
});

// Get all vehicles for admin
app.get("/api/admin/vehicles", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const vehicles = db.prepare(`
    SELECT v.*, u.name as rider_name, u.id as rider_id 
    FROM vehicles v 
    LEFT JOIN users u ON v.id = u.vehicle_id
  `).all();
  res.json(vehicles);
});

// Add or Update Vehicle
app.post("/api/admin/vehicles", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const { id, plate_number, model, card_image, insurance_image } = req.body;
  
  if (id) {
    db.prepare("UPDATE vehicles SET plate_number = ?, model = ?, card_image = ?, insurance_image = ? WHERE id = ?")
      .run(plate_number, model, card_image, insurance_image, id);
  } else {
    db.prepare("INSERT INTO vehicles (plate_number, model, card_image, insurance_image) VALUES (?, ?, ?, ?)")
      .run(plate_number, model, card_image, insurance_image);
  }
  res.json({ message: "Chombo kimehifadhiwa." });
});

// Assign Vehicle to Rider (Admin)
app.post("/api/admin/assign-vehicle", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  const { rider_id, vehicle_id } = req.body;
  
  // Clear previous assignments for this rider
  db.prepare("UPDATE users SET vehicle_id = NULL WHERE id = ?").run(rider_id);
  // Clear previous assignments for this vehicle
  db.prepare("UPDATE users SET vehicle_id = NULL WHERE vehicle_id = ?").run(vehicle_id);
  
  if (vehicle_id) {
    db.prepare("UPDATE users SET vehicle_id = ? WHERE id = ?").run(vehicle_id, rider_id);
  }
  res.json({ message: "Mabadiliko yamefanyika." });
});

// Rider: Get My Vehicle
app.get("/api/rider/vehicle", authenticateToken, (req: any, res) => {
  const vehicle = db.prepare(`
    SELECT v.* FROM vehicles v 
    JOIN users u ON v.id = u.vehicle_id 
    WHERE u.id = ?
  `).get(req.user.id);
  res.json(vehicle || null);
});

// Rider: Get Available Vehicles
app.get("/api/rider/available-vehicles", authenticateToken, (req: any, res) => {
  const vehicles = db.prepare(`
    SELECT * FROM vehicles 
    WHERE id NOT IN (SELECT vehicle_id FROM users WHERE vehicle_id IS NOT NULL)
  `).all();
  res.json(vehicles);
});

// Rider: Choose Vehicle
app.post("/api/rider/choose-vehicle", authenticateToken, (req: any, res) => {
  const { vehicle_id } = req.body;
  
  // Check if already taken
  const taken = db.prepare("SELECT id FROM users WHERE vehicle_id = ? AND id != ?").get(vehicle_id, req.user.id);
  if (taken) return res.status(400).json({ error: "Chombo hiki kimeshachukuliwa na dereva mwingine." });

  db.prepare("UPDATE users SET vehicle_id = ? WHERE id = ?").run(vehicle_id, req.user.id);
  res.json({ message: "Umechagua chombo kwa mafanikio!" });
});

// Admin: Debt Inspection (Wadaiwa Report)
app.get("/api/admin/rider-debts", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Unauthorized" });
  
  const riders = db.prepare("SELECT id, name, email, created_at, daily_amount FROM users WHERE role = 'rider'").all() as any[];
  const report = riders.map(r => {
    // Calculate days since registration
    const regDate = r.created_at ? new Date(r.created_at) : new Date();
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - regDate.getTime());
    const daysSinceReg = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Custom amount per day
    const expectedTotal = daysSinceReg * (r.daily_amount || 5000);
    
    // Actual approved daily payments
    const paid = (db.prepare("SELECT SUM(amount) as total FROM daily_payments WHERE rider_id = ? AND status = 'approved'").get(r.id) as any) || { total: 0 };
    const actualPaid = paid.total || 0;
    
    const debt = expectedTotal - actualPaid;
    
    return {
      ...r,
      days_active: daysSinceReg,
      expected: expectedTotal,
      paid: actualPaid,
      debt: debt > 0 ? debt : 0
    };
  });
  
  res.json(report);
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Luwis Express running on http://localhost:${PORT}`);
  });
}

startServer();
