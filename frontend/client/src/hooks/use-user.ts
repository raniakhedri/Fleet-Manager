import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "user" | "driver";
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  const isAdmin = user?.role === "admin";
  const isDriver = user?.role === "driver" || user?.role === "user"; // non-admin users are treated as drivers

  return {
    user,
    isAdmin,
    isDriver,
  };
}
