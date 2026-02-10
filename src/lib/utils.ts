import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-blue-100 text-blue-800";
    case "SCHEDULED":
      return "bg-amber-100 text-amber-800";
    case "PUBLISHING":
      return "bg-blue-100 text-blue-700";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "DRAFT":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
