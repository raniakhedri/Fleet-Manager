import type { Express } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { generateToken } from "./jwt-auth";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerJWTAuthRoutes(app: Express) {
  app.post("/api/signup", async (req, res) => {
    try {
      const input = SignupSchema.parse(req.body);

      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (existing.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: "user", // Default to user role on signup
        })
        .returning();

      // Generate JWT
      const token = generateToken({
        userId: newUser.id,
        email: newUser.email!,
        role: newUser.role as "admin" | "user",
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
      });

      res.status(201).json({
        message: "User created",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const input = LoginSchema.parse(req.body);

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT
      const token = generateToken({
        userId: user.id,
        email: user.email!,
        role: user.role as "admin" | "user",
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
