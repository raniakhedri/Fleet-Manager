import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticatedJWT, requireRole } from "./jwt-auth";
import { registerJWTAuthRoutes } from "./jwt-routes";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, userRoles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateRandomPassword, sendDriverCredentialsEmail } from "./email-service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register JWT-based auth routes (signup/login)
  registerJWTAuthRoutes(app);

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

  app.post(api.vehicles.create.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
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

  app.put(api.vehicles.update.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
    try {
        const input = api.vehicles.update.input.parse(req.body);
        const vehicle = await storage.updateVehicle(Number(req.params.id), input);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.json(vehicle);
    } catch (err) {
        res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.vehicles.delete.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
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

  app.post(api.drivers.create.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
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

  app.put(api.drivers.update.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
    try {
      const input = api.drivers.update.input.parse(req.body);
      const driver = await storage.updateDriver(Number(req.params.id), input);
      if (!driver) return res.status(404).json({ message: "Driver not found" });
      res.json(driver);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.drivers.delete.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
    await storage.deleteDriver(Number(req.params.id));
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

  app.post(api.missions.create.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
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

  app.put(api.missions.update.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
    try {
      const input = api.missions.update.input.parse(req.body);
      const mission = await storage.updateMission(Number(req.params.id), input);
      if (!mission) return res.status(404).json({ message: "Mission not found" });
      res.json(mission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.missions.delete.path, isAuthenticatedJWT, requireRole("admin"), async (req, res) => {
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
            console.log("Creating admin user: rania@admin.com");
            const raniaHash = await bcrypt.hash("raniakhedri", 10);
            await db.insert(users).values({
                email: "rania@admin.com",
                passwordHash: raniaHash,
                firstName: "Rania",
                lastName: "Admin",
                role: "admin",
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
                password: ahmedHash,
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

