// Shared icon maps — consolidates duplicate icon definitions from
// page.tsx (homepage), header.tsx, and other components.

import {
  Zap,
  Sparkles,
  Bot,
  Brain,
  Star,
  Settings,
  ShieldAlert,
  PlusCircle,
  Newspaper,
  BookOpen,
  AlertTriangle,
  Search,
  Users,
  Home,
  Ticket,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { createElement, type ReactNode } from "react";

type IconName =
  | "zap" | "sparkles" | "bot" | "brain" | "star"
  | "settings" | "shield" | "plus" | "newspaper" | "book"
  | "alert" | "search" | "users"
  | "home" | "ticket" | "chart" | "message";

const iconComponents: Record<IconName, typeof Zap> = {
  zap: Zap,
  sparkles: Sparkles,
  bot: Bot,
  brain: Brain,
  star: Star,
  settings: Settings,
  shield: ShieldAlert,
  plus: PlusCircle,
  newspaper: Newspaper,
  book: BookOpen,
  alert: AlertTriangle,
  search: Search,
  users: Users,
  home: Home,
  ticket: Ticket,
  chart: BarChart3,
  message: MessageSquare,
};

/** Get a Lucide icon component by name */
export function getIcon(name: string, className?: string): ReactNode {
  const Component = iconComponents[name as IconName];
  if (!Component) return createElement(Zap, { className });
  return createElement(Component, { className });
}

/** Action card color map */
export const actionCardColors: Record<string, string> = {
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  orange: "bg-primary",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-500",
};
