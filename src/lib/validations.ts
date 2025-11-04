import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga"),
  username: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(30, "El nombre de usuario es demasiado largo")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos"),
  city: z.string().trim().min(2, "La ciudad es requerida").max(100),
});

export const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(1, "Este campo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
    .max(30, "El nombre de usuario es demasiado largo"),
  city: z.string().trim().min(2, "La ciudad es requerida").max(100),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      "Formato de teléfono inválido (ej: +1234567890)"
    ),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const CHILEAN_CITIES = [
  "Santiago",
  "Valparaíso",
  "Viña del Mar",
  "Concepción",
  "La Serena",
  "Antofagasta",
  "Temuco",
  "Rancagua",
  "Talca",
  "Arica",
  "Chillán",
  "Iquique",
  "Los Ángeles",
  "Puerto Montt",
  "Coyhaique",
  "Punta Arenas",
  "Valdivia",
  "Osorno",
  "Quillota",
  "Curicó",
];
