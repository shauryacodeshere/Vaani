"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export type UserRole = "citizen" | "admin";

export interface UserProfile {
  name: string;
  email: string;
  department: string;
  role: UserRole;
  badgeId?: string;
}

interface AuthContextType {
  role: UserRole;
  user: UserProfile | null;
  isAdmin: boolean;
  loginAsAdmin: (email?: string, password?: string) => boolean;
  logout: () => void;
  setRole: (role: UserRole) => void;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

const DEFAULT_ADMIN_USER: UserProfile = {
  name: "Dr. Rajesh Sharma",
  email: "admin@vaanireach.gov.in",
  department: "Ministry of Information & Broadcasting",
  role: "admin",
  badgeId: "GOV-IN-88942",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Default to citizen (public mode) when the site opens
  const [role, setRoleState] = useState<UserRole>("citizen");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem("vaanireach_user_role") as UserRole | null;
      const savedUser = localStorage.getItem("vaanireach_user_profile");
      if (savedRole === "admin" && savedUser) {
        setRoleState("admin");
        setUser(JSON.parse(savedUser));
      } else {
        setRoleState("citizen");
        setUser(null);
      }
    } catch {
      setRoleState("citizen");
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const loginAsAdmin = (email = "admin@vaanireach.gov.in", password = ""): boolean => {
    // Default mock officer login
    const adminProfile: UserProfile = {
      name: email.includes("sharma") ? "Dr. Rajesh Sharma" : "Nodal Verification Officer",
      email: email || "admin@vaanireach.gov.in",
      department: "Public Outreach & Information Desk",
      role: "admin",
      badgeId: "GOV-IN-88942",
    };

    setRoleState("admin");
    setUser(adminProfile);
    try {
      localStorage.setItem("vaanireach_user_role", "admin");
      localStorage.setItem("vaanireach_user_profile", JSON.stringify(adminProfile));
    } catch {}

    setIsLoginModalOpen(false);
    toast.success("Welcome, Officer! Admin Pipeline Studio unlocked.", {
      description: "Full access to URL scraper, agentic verification, and human approval gate.",
    });
    return true;
  };

  const logout = () => {
    setRoleState("citizen");
    setUser(null);
    try {
      localStorage.removeItem("vaanireach_user_role");
      localStorage.removeItem("vaanireach_user_profile");
    } catch {}
    toast.info("Switched to Citizen Public Viewer Mode", {
      description: "Browsing verified published outreach videos.",
    });
  };

  const setRole = (newRole: UserRole) => {
    if (newRole === "admin") {
      loginAsAdmin();
    } else {
      logout();
    }
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const value: AuthContextType = {
    role,
    user,
    isAdmin: role === "admin",
    loginAsAdmin,
    logout,
    setRole,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
