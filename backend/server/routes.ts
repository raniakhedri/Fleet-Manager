import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticatedJWT, requireRole } from "./jwt-auth";
import { registerJWTAuthRoutes } from "./jwt-routes";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, userRoles, vehicles, drivers, gpsTracking } from "@shared/schema";
import { eq, lte, gte, and } from "drizzle-orm";
import { generateRandomPassword, sendDriverCredentialsEmail, sendLicenseExpiryWarningToDriver, sendLicenseExpiryNotificationToAdmin } from "./email-service";
import { broadcastGpsUpdate } from "./websocket";

// Function to check for expiring licenses and send notifications
async function checkExpiringLicenses() {
  console.log('[LICENSE CHECK] Running license expiry check...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check licenses expiring within 10 days
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    
    // Get all drivers with license expiring within 10 days or already expired
    const expiringDrivers = await db.select().from(drivers)
      .where(lte(drivers.licenseExpiry, tenDaysFromNow));
    
    // Get admin emails for notifications
    const adminUsers = await db.select().from(users).where(eq(users.role, 'operateur'));
    const superAdmins = await db.select().from(users).where(eq(users.role, 'superadmin'));
    const adminEmails = [...adminUsers, ...superAdmins].map(u => u.email).filter(Boolean) as string[];
    
    for (const driver of expiringDrivers) {
      if (!driver.licenseExpiry) continue;
      
      const expiryDate = new Date(driver.licenseExpiry);
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Send notification to driver
      await sendLicenseExpiryWarningToDriver(
        driver.email,
        `${driver.firstName} ${driver.lastName}`,
        expiryDate,
        daysRemaining
      );
      
      // Send notification to all admins
      for (const adminEmail of adminEmails) {
        await sendLicenseExpiryNotificationToAdmin(
          adminEmail,
          `${driver.firstName} ${driver.lastName}`,
          driver.email,
          expiryDate,
          daysRemaining
        );
      }
      
      console.log(`[LICENSE CHECK] Sent notifications for ${driver.firstName} ${driver.lastName} (${daysRemaining} days remaining)`);
    }
    
    console.log(`[LICENSE CHECK] Completed. Checked ${expiringDrivers.length} expiring licenses.`);
  } catch (error) {
    console.error('[LICENSE CHECK] Error:', error);
  }
}

// Start the license check scheduler (runs daily)
function startLicenseCheckScheduler() {
  // Run immediately on startup
  setTimeout(() => checkExpiringLicenses(), 5000); // 5 second delay after startup
  
  // Then run every 24 hours
  setInterval(() => checkExpiringLicenses(), 24 * 60 * 60 * 1000);
  
  console.log('[LICENSE CHECK] Scheduler started - will check daily');
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register JWT-based auth routes (signup/login)
  registerJWTAuthRoutes(app);
  
  // Start license expiry check scheduler
  startLicenseCheckScheduler();

  // === User Profile Routes ===
  app.get(api.users.me.path, isAuthenticatedJWT, async (req: any, res) => {
    const userId = req.user.userId;
    
    // Get user from users table
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    // Get additional profile data from userRoles table
    const role = await storage.getUserRole(userId);
    
    // Combine data from both tables
    const profileData = {
      id: role?.id || null,
      userId: userId,
      role: user?.role || role?.role || 'user',
      phoneNumber: role?.phoneNumber || null,
      driverId: role?.driverId || null,
      // Include user data
      email: user?.email || null,
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      profileImageUrl: user?.profileImageUrl || null,
    };
    
    res.json(profileData);
  });

  app.post(api.users.updateProfile.path, isAuthenticatedJWT, async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const input = api.users.updateProfile.input.parse(req.body);
        const role = await storage.upsertUserRole({ ...input, userId });
        res.json(role);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  // === License Expiry Check API (Operateur/Superadmin) ===
  app.get("/api/drivers/expiring-licenses", isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      
      // Get all drivers with license expiring within 10 days or already expired
      const expiringDrivers = await db.select().from(drivers)
        .where(lte(drivers.licenseExpiry, tenDaysFromNow));
      
      const result = expiringDrivers.map(driver => {
        const expiryDate = driver.licenseExpiry ? new Date(driver.licenseExpiry) : null;
        const daysRemaining = expiryDate 
          ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        return {
          ...driver,
          daysRemaining,
          isExpired: daysRemaining !== null && daysRemaining <= 0,
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error('[API] Error fetching expiring licenses:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Trigger license check manually (Operateur/Superadmin)
  app.post("/api/drivers/check-licenses", isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    try {
      await checkExpiringLicenses();
      res.json({ message: "License check completed and notifications sent" });
    } catch (error) {
      console.error('[API] Error running license check:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Vehicle Routes ===
  
  app.get(api.vehicles.list.path, isAuthenticatedJWT, async (req, res) => {
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.get(api.vehicles.get.path, isAuthenticatedJWT, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post(api.vehicles.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.vehicles.create.input.parse(req.body);
      const vehicle = await storage.createVehicle(input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.vehicles.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
        const input = api.vehicles.update.input.parse(req.body);
        const vehicle = await storage.updateVehicle(Number(req.params.id), input);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.json(vehicle);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.vehicles.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    await storage.deleteVehicle(Number(req.params.id));
    res.status(204).send();
  });

  // === Tracking Routes ===
  
  app.post(api.vehicles.updateLocation.path, isAuthenticatedJWT, async (req, res) => {
    try {
        const input = api.vehicles.updateLocation.input.parse(req.body);
        const vehicleId = Number(req.params.id);
        
        // Add to history and update current position
        await storage.addLocation({
            vehicleId,
            ...input
        });

        const updatedVehicle = await storage.getVehicle(vehicleId);
        res.json(updatedVehicle);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.vehicles.history.path, isAuthenticatedJWT, async (req, res) => {
    const history = await storage.getLocationHistory(Number(req.params.id));
    res.json(history);
  });

  // === Driver Routes ===
  
  app.get(api.drivers.list.path, isAuthenticatedJWT, async (req: any, res) => {
    const drivers = await storage.getDrivers();
    // If user is a driver, only return their own profile
    if (req.user.role === 'driver') {
      const userEmail = req.user.email;
      const driver = drivers.find(d => d.email === userEmail);
      res.json(driver ? [driver] : []);
    } else {
      res.json(drivers);
    }
  });

  app.get(api.drivers.get.path, isAuthenticatedJWT, async (req, res) => {
    const driver = await storage.getDriver(Number(req.params.id));
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  });

  app.post(api.drivers.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.drivers.create.input.parse(req.body);
      
      // Check if driver with this email already exists in drivers table
      const existingDriver = await storage.getDriverByEmail(input.email);
      if (existingDriver) {
        return res.status(400).json({ message: 'Un chauffeur avec cet email existe déjà' });
      }
      
      // Check if email already exists in users table (orphaned record)
      const existingUser = await db.select().from(users).where(eq(users.email, input.email));
      if (existingUser.length > 0) {
        // Orphaned user record - delete it before creating new one
        await db.delete(userRoles).where(eq(userRoles.userId, existingUser[0].id));
        await db.delete(users).where(eq(users.id, existingUser[0].id));
        console.log(`[DRIVER] Cleaned up orphaned user record for ${input.email}`);
      }
      
      // Generate random password
      const password = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create auth user for the driver
      const [authUser] = await db.insert(users).values({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: hashedPassword,
      }).returning();
      
      // Create user role as driver
      await db.insert(userRoles).values({
        userId: authUser.id,
        role: 'driver',
      });
      
      // Create driver record linked to auth user
      const driver = await storage.createDriver({
        ...input,
        userId: authUser.id,
      });
      
      // If a vehicle is assigned, update the vehicle's currentDriverId
      if (input.assignedVehicleId) {
        await db.update(vehicles)
          .set({ currentDriverId: driver.id })
          .where(eq(vehicles.id, input.assignedVehicleId));
      }
      
      // Send credentials email
      let emailSent = false;
      try {
        await sendDriverCredentialsEmail(
          input.email,
          `${input.firstName} ${input.lastName}`,
          password
        );
        emailSent = true;
        console.log(`[DRIVER] Created driver and sent credentials to ${input.email}`);
      } catch (emailError) {
        console.error('[DRIVER] Failed to send email:', emailError);
        // Continue anyway - driver is created, admin can manually share credentials
      }
      
      // Return driver with temporary password if email failed (for admin to share manually)
      res.status(201).json({
        ...driver,
        temporaryPassword: emailSent ? undefined : password,
        emailSent
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // Check for duplicate email
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return res.status(400).json({ message: 'A driver with this email already exists' });
      }
      throw err;
    }
  });

  app.put(api.drivers.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.drivers.update.input.parse(req.body);
      const driverId = Number(req.params.id);
      
      // Get current driver to check previous vehicle assignment
      const currentDriver = await storage.getDriver(driverId);
      if (!currentDriver) return res.status(404).json({ message: "Driver not found" });
      
      // Update the driver
      const driver = await storage.updateDriver(driverId, input);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      
      // Handle vehicle assignment changes
      const oldVehicleId = currentDriver.assignedVehicleId;
      const newVehicleId = input.assignedVehicleId;
      
      // If vehicle assignment changed
      if (oldVehicleId !== newVehicleId) {
        // Remove driver from old vehicle
        if (oldVehicleId) {
          await db.update(vehicles)
            .set({ currentDriverId: null })
            .where(eq(vehicles.id, oldVehicleId));
        }
        
        // Assign driver to new vehicle
        if (newVehicleId) {
          await db.update(vehicles)
            .set({ currentDriverId: driverId })
            .where(eq(vehicles.id, newVehicleId));
        }
      }
      
      res.json(driver);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.drivers.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    const driverId = Number(req.params.id);
    
    // Get driver to check vehicle assignment before deletion
    const driver = await storage.getDriver(driverId);
    if (driver?.assignedVehicleId) {
      // Remove driver from assigned vehicle
      await db.update(vehicles)
        .set({ currentDriverId: null })
        .where(eq(vehicles.id, driver.assignedVehicleId));
    }
    
    await storage.deleteDriver(driverId);
    res.status(204).send();
  });

  // === Mission Routes ===
  
  app.get(api.missions.list.path, isAuthenticatedJWT, async (req, res) => {
    const missions = await storage.getMissions();
    res.json(missions);
  });

  app.get(api.missions.get.path, isAuthenticatedJWT, async (req, res) => {
    const mission = await storage.getMission(Number(req.params.id));
    if (!mission) return res.status(404).json({ message: "Mission not found" });
    res.json(mission);
  });

  app.post(api.missions.create.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.missions.create.input.parse(req.body);
      const mission = await storage.createMission(input);
      res.status(201).json(mission);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.missions.update.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    try {
      const input = api.missions.update.input.parse(req.body);
      const mission = await storage.updateMission(Number(req.params.id), input);
      if (!mission) return res.status(404).json({ message: "Mission not found" });
      res.json(mission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.missions.delete.path, isAuthenticatedJWT, requireRole("operateur"), async (req, res) => {
    await storage.deleteMission(Number(req.params.id));
    res.status(204).send();
  });

  app.patch(api.missions.updateStatus.path, isAuthenticatedJWT, async (req, res) => {
    try {
      const input = api.missions.updateStatus.input.parse(req.body);
      const mission = await storage.updateMissionStatus(
        Number(req.params.id), 
        input.status,
        input.notes
      );
      if (!mission) return res.status(404).json({ message: "Mission not found" });
      res.json(mission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === GPS Tracking Routes ===

  // Get all live GPS positions (operateur + superadmin)
  app.get(api.gpsTracking.list.path, isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    const positions = await storage.getGpsPositions();
    res.json(positions);
  });

  // Get GPS position for a specific vehicle
  app.get(api.gpsTracking.get.path, isAuthenticatedJWT, requireRole("operateur", "superadmin"), async (req, res) => {
    const pos = await storage.getGpsPosition(Number(req.params.vehicleId));
    if (!pos) return res.status(404).json({ message: "No GPS data for this vehicle" });
    res.json(pos);
  });

  // Update GPS position (can be called by driver device or operateur)
  app.post(api.gpsTracking.update.path, isAuthenticatedJWT, async (req, res) => {
    try {
      const input = api.gpsTracking.update.input.parse(req.body);
      
      // Get current driver for the vehicle
      const vehicle = await storage.getVehicle(input.vehicleId);
      
      const gpsData = await storage.upsertGpsPosition({
        vehicleId: input.vehicleId,
        driverId: vehicle?.currentDriverId ?? null,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
        engineOn: input.engineOn,
      });
      
      // Also add to location history
      await storage.addLocation({
        vehicleId: input.vehicleId,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
        heading: input.heading,
      });

      // Broadcast to all connected WebSocket clients (operateur/superadmin)
      broadcastGpsUpdate(gpsData);
      
      res.json(gpsData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid GPS data" });
    }
  });

  // === User Management Routes (Superadmin only) ===

  // List all users
  app.get(api.users.list.path, isAuthenticatedJWT, requireRole("superadmin"), async (req, res) => {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    res.json(allUsers);
  });

  // Create a new user (superadmin only)
  app.post(api.users.create.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res: any) => {
    try {
      const input = api.users.create.input.parse(req.body);

      // Check if user already exists
      const existing = await db.select().from(users).where(eq(users.email, input.email));
      if (existing.length > 0) {
        return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const [newUser] = await db.insert(users).values({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
      }).returning();

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        createdAt: newUser.createdAt,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Erreur lors de la création de l'utilisateur" });
    }
  });

  // Update user role
  app.patch(api.users.updateRole.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res) => {
    try {
      const { role } = api.users.updateRole.input.parse(req.body);
      const userId = req.params.id;
      
      // Prevent superadmin from demoting themselves
      if (userId === req.user.userId && role !== 'superadmin') {
        return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
      }
      
      const [updated] = await db.update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Delete user (superadmin only)
  app.delete(api.users.delete.path, isAuthenticatedJWT, requireRole("superadmin"), async (req: any, res) => {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    
    // Delete related records
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    res.status(204).send();
  });

  // ── Nominatim geocoding proxy (avoids CORS issues from GitHub Pages) ──
  // Helper: fetch a URL using Node's built-in https module (works in all Node versions)
  function httpsGet(url: string): Promise<string> {
    const https = require("https");
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { "User-Agent": "FleetManager/1.0 (fleet-manager-backend)" } }, (resp: any) => {
        let data = "";
        resp.on("data", (chunk: string) => { data += chunk; });
        resp.on("end", () => resolve(data));
        resp.on("error", reject);
      }).on("error", reject);
    });
  }

  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) return res.status(400).json({ message: "lat and lon required" });
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
      const raw = await httpsGet(url);
      const data = JSON.parse(raw);
      res.json(data);
    } catch (err: any) {
      console.error("[geocode/reverse] Error:", err?.message || err);
      res.status(502).json({ message: "Geocoding failed" });
    }
  });

  app.get("/api/geocode/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ message: "q required" });
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=5`;
      const raw = await httpsGet(url);
      const data = JSON.parse(raw);
      res.json(data);
    } catch (err: any) {
      console.error("[geocode/search] Error:", err?.message || err);
      res.status(502).json({ message: "Geocoding failed" });
    }
  });

  // Seed Data
  try {
    await seedDatabase();
  } catch (err) {
    console.warn("Warning: Database seeding failed. Server will still run, but vehicles may not be available.");
  }

  return httpServer;
}

async function seedDatabase() {
    // Seed users if they don't exist
    try {
        await seedUsers();
    } catch (err) {
        console.warn("Failed to seed users:", err);
    }

    // Seed vehicles
    const existing = await storage.getVehicles();
    if (existing.length === 0) {
        console.log("Seeding vehicles...");
        await storage.createVehicle({
            name: "Truck 01",
            model: "Volvo FH16",
            licensePlate: "AA-123-BB",
            status: "active",
            fuelLevel: 85,
            lat: 48.8566, // Paris
            lng: 2.3522
        });
        await storage.createVehicle({
            name: "Van 04",
            model: "Mercedes Sprinter",
            licensePlate: "CC-789-DD",
            status: "maintenance",
            fuelLevel: 45,
            lat: 45.7640, // Lyon
            lng: 4.8357
        });
        await storage.createVehicle({
            name: "Truck 02",
            model: "Renault T",
            licensePlate: "EE-456-FF",
            status: "active",
            fuelLevel: 92,
            lat: 43.2965, // Marseille
            lng: 5.3698
        });
    }
}

async function seedUsers() {
    try {
        // Check if rania (admin) exists
        const [raniaUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, "rania@admin.com"));

        if (!raniaUser) {
            console.log("Creating superadmin user: rania@admin.com");
            const raniaHash = await bcrypt.hash("raniakhedri", 10);
            await db.insert(users).values({
                email: "rania@admin.com",
                passwordHash: raniaHash,
                firstName: "Rania",
                lastName: "Admin",
                role: "superadmin",
            });
        }

        // Check if ahmed (driver) exists
        const [ahmedUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, "ahmed@driver.com"));

        if (!ahmedUser) {
            console.log("Creating driver user: ahmed@driver.com");
            const ahmedHash = await bcrypt.hash("ahmedznati", 10);
            const [newAhmedUser] = await db.insert(users).values({
                email: "ahmed@driver.com",
                passwordHash: ahmedHash,
                firstName: "Ahmed",
                lastName: "Znati",
            }).returning();
            
            // Create user role
            await db.insert(userRoles).values({
                userId: newAhmedUser.id,
                role: 'driver',
            });
            
            // Create driver record for Ahmed
            const existingDriver = await storage.getDrivers();
            const ahmedDriver = existingDriver.find(d => d.email === "ahmed@driver.com");
            
            if (!ahmedDriver) {
                await storage.createDriver({
                    userId: newAhmedUser.id,
                    firstName: "Ahmed",
                    lastName: "Znati",
                    email: "ahmed@driver.com",
                    phoneNumber: "+216 12 345 678",
                    licenseNumber: "AZ-12345",
                    licenseExpiry: "2027-12-31",
                    status: "active",
                    assignedVehicleId: null,
                });
                console.log("Created driver record for Ahmed");
            }
        } else {
            // If Ahmed exists, make sure he has a driver record
            const existingDriver = await storage.getDrivers();
            const ahmedDriver = existingDriver.find(d => d.email === "ahmed@driver.com");
            
            if (!ahmedDriver) {
                await storage.createDriver({
                    userId: ahmedUser.id,
                    firstName: "Ahmed",
                    lastName: "Znati",
                    email: "ahmed@driver.com",
                    phoneNumber: "+216 12 345 678",
                    licenseNumber: "AZ-12345",
                    licenseExpiry: "2027-12-31",
                    status: "active",
                    assignedVehicleId: null,
                });
                console.log("Created missing driver record for Ahmed");
            }
        }
    } catch (err) {
        console.error("Error seeding users:", err);
    }
}

