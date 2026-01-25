import { z } from 'zod';
import { 
  insertVehicleSchema, 
  vehicles, 
  insertLocationSchema, 
  locations, 
  userRoles, 
  insertUserRoleSchema,
  drivers,
  insertDriverSchema,
  missions,
  insertMissionSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  vehicles: {
    list: {
      method: 'GET' as const,
      path: '/api/vehicles',
      responses: {
        200: z.array(z.custom<typeof vehicles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicles/:id',
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vehicles',
      input: insertVehicleSchema,
      responses: {
        201: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/vehicles/:id',
      input: insertVehicleSchema.partial(),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/vehicles/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    updateLocation: {
      method: 'POST' as const,
      path: '/api/vehicles/:id/location',
      input: z.object({
        lat: z.number(),
        lng: z.number(),
        speed: z.number().optional(),
        heading: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/vehicles/:id/history',
      responses: {
        200: z.array(z.custom<typeof locations.$inferSelect>()),
      },
    }
  },
  drivers: {
    list: {
      method: 'GET' as const,
      path: '/api/drivers',
      responses: {
        200: z.array(z.custom<typeof drivers.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/drivers/:id',
      responses: {
        200: z.custom<typeof drivers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/drivers',
      input: insertDriverSchema,
      responses: {
        201: z.custom<typeof drivers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/drivers/:id',
      input: insertDriverSchema.partial(),
      responses: {
        200: z.custom<typeof drivers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/drivers/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  missions: {
    list: {
      method: 'GET' as const,
      path: '/api/missions',
      responses: {
        200: z.array(z.custom<typeof missions.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/missions/:id',
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/missions',
      input: insertMissionSchema,
      responses: {
        201: z.custom<typeof missions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/missions/:id',
      input: insertMissionSchema.partial(),
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/missions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/missions/:id/status',
      input: z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
        notes: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof missions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    me: {
        method: 'GET' as const,
        path: '/api/user/me',
        responses: {
            200: z.custom<typeof userRoles.$inferSelect>().nullable(),
        }
    },
    updateProfile: {
        method: 'POST' as const,
        path: '/api/user/profile',
        input: insertUserRoleSchema.omit({ userId: true }),
        responses: {
            200: z.custom<typeof userRoles.$inferSelect>(),
        }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertMission = z.infer<typeof insertMissionSchema>;
